import { seasonRepository, CreateSeasonInput, UpdateSeasonInput, SeasonWithZoneAndFarmer } from './season.repository';
import { farmZoneRepository } from '../farm-zone/farm-zone.repository';
import { AppError } from '../../shared/utils/app-error';
import { SeasonStatus, UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';
import { carbonCalculationQueue } from '../../shared/queues/carbon.queue';
import { getRedisClient } from '../../shared/utils/redis.client';

// ==================== CONSTANTS ====================

const SEASON_LIST_TTL_SECONDS = 300;     // 5 minutes
const SEASON_DETAIL_TTL_SECONDS = 600;   // 10 minutes

// ==================== SERVICE ====================

export class SeasonService {

  // ==================== CACHE HELPERS ====================

  private async invalidateCache(seasonId?: string, cooperativeId?: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.del('seasons:list:all');
      if (cooperativeId) {
        await redis.del(`seasons:list:coop:${cooperativeId}`);
      }
      if (seasonId) {
        await redis.del(`seasons:detail:${seasonId}`);
      }
    } catch (error) {
      console.error('[Redis Error] Failed to invalidate season cache:', error);
    }
  }

  private getListCacheKey(user: JwtPayload): string {
    if (user.role === UserRole.SUPER_ADMIN) return 'seasons:list:all';
    return `seasons:list:coop:${user.cooperativeId}`;
  }

  // ==================== QUERIES ====================

  public async getSeasons(user: JwtPayload, farmZoneId?: string, status?: SeasonStatus): Promise<SeasonWithZoneAndFarmer[]> {
    const canUseCache = !farmZoneId && !status;

    // Only use cache for unfiltered list queries
    if (canUseCache) {
      try {
        const redis = await getRedisClient();
        const cacheKey = this.getListCacheKey(user);
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (error) {
        console.error('[Redis Error] Failed to get season list cache:', error);
      }
    }

    const filters: { cooperativeId?: string; farmZoneId?: string; status?: SeasonStatus } = {
      farmZoneId,
      status,
    };

    if (user.role === UserRole.HTX_MANAGER) {
      filters.cooperativeId = user.cooperativeId || undefined;
    }

    const seasons = await seasonRepository.findAll(filters);

    // Cache only unfiltered queries
    if (canUseCache) {
      try {
        const redis = await getRedisClient();
        const cacheKey = this.getListCacheKey(user);
        await redis.set(cacheKey, JSON.stringify(seasons), { EX: SEASON_LIST_TTL_SECONDS });
      } catch (error) {
        console.error('[Redis Error] Failed to set season list cache:', error);
      }
    }

    return seasons;
  }

  public async getSeasonById(id: string, user: JwtPayload): Promise<SeasonWithZoneAndFarmer> {
    // Try cache first
    try {
      const redis = await getRedisClient();
      const cached = await redis.get(`seasons:detail:${id}`);
      if (cached) {
        const season = JSON.parse(cached) as SeasonWithZoneAndFarmer;
        // Still enforce RBAC on cached data
        if (user.role === UserRole.HTX_MANAGER && season.farm_zone.farmer.cooperative_id !== user.cooperativeId) {
          throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập vụ mùa này');
        }
        return season;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[Redis Error] Failed to get season detail cache:', error);
    }

    const season = await seasonRepository.findById(id);
    if (!season) {
      throw new AppError('SEASON_NOT_FOUND', 404, 'Không tìm thấy vụ mùa');
    }

    // HTX Manager is only allowed to access seasons in their own cooperative
    if (user.role === UserRole.HTX_MANAGER && season.farm_zone.farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập vụ mùa này');
    }

    // Store in cache
    try {
      const redis = await getRedisClient();
      await redis.set(`seasons:detail:${id}`, JSON.stringify(season), { EX: SEASON_DETAIL_TTL_SECONDS });
    } catch (error) {
      console.error('[Redis Error] Failed to set season detail cache:', error);
    }

    return season;
  }

  // ==================== MUTATIONS ====================

  public async createSeason(data: Record<string, unknown>, user: JwtPayload): Promise<SeasonWithZoneAndFarmer> {
    const { farm_zone_id, season_name, crop_variety, start_date, expected_end_date, planned_yield_kg } = data as {
      farm_zone_id: string;
      season_name: string;
      crop_variety: string;
      start_date: string;
      expected_end_date: string;
      planned_yield_kg: number;
    };

    // 1. Verify farm zone exists
    const zone = await farmZoneRepository.findById(farm_zone_id);
    if (!zone) {
      throw new AppError('FARM_ZONE_NOT_FOUND', 404, 'Không tìm thấy vùng trồng tương ứng');
    }

    // 2. Cooperative restriction checks
    if (user.role === UserRole.HTX_MANAGER && zone.farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn chỉ được phép gán vụ mùa cho các vùng trồng thuộc hợp tác xã của mình');
    }

    // 3. Rule: Check if there is an active season in this farm zone
    const activeSeason = await seasonRepository.findActiveByZoneId(farm_zone_id);
    if (activeSeason) {
      throw new AppError(
        'ACTIVE_SEASON_EXISTS',
        400,
        'Vùng trồng này đã có một vụ mùa đang hoạt động. Vui lòng đóng vụ mùa hiện tại trước khi bắt đầu vụ mùa mới.'
      );
    }

    const input: CreateSeasonInput = {
      farm_zone_id,
      season_name,
      crop_variety,
      start_date: new Date(start_date),
      expected_end_date: new Date(expected_end_date),
      planned_yield_kg,
      created_by: user.userId || 'SYSTEM',
    };

    const season = await seasonRepository.create(input);

    // Invalidate list caches (new record, no detail key yet)
    await this.invalidateCache(undefined, zone.farmer.cooperative_id);

    return season;
  }

  public async updateSeason(id: string, data: Record<string, unknown>, user: JwtPayload): Promise<SeasonWithZoneAndFarmer> {
    const season = await this.getSeasonById(id, user);

    const updatePayload: UpdateSeasonInput = {};

    if (data.season_name !== undefined) {
      updatePayload.season_name = data.season_name as string;
    }

    if (data.crop_variety !== undefined) {
      updatePayload.crop_variety = data.crop_variety as string;
    }

    if (data.start_date !== undefined) {
      updatePayload.start_date = new Date(data.start_date as string);
    }

    if (data.expected_end_date !== undefined) {
      updatePayload.expected_end_date = new Date(data.expected_end_date as string);
    }

    if (data.planned_yield_kg !== undefined) {
      updatePayload.planned_yield_kg = data.planned_yield_kg as number;
    }

    const updated = await seasonRepository.update(id, updatePayload);

    // Invalidate caches
    await this.invalidateCache(id, season.farm_zone.farmer.cooperative_id);

    return updated;
  }

  public async completeSeason(id: string, data: Record<string, unknown>, user: JwtPayload): Promise<SeasonWithZoneAndFarmer> {
    const season = await this.getSeasonById(id, user);

    if (season.status !== SeasonStatus.ACTIVE) {
      throw new AppError('SEASON_NOT_ACTIVE', 400, 'Chỉ có thể kết thúc thu hoạch vụ mùa đang hoạt động');
    }

    const updatePayload: UpdateSeasonInput = {
      status: SeasonStatus.COMPLETED,
      actual_end_date: new Date(data.actual_end_date as string),
      actual_yield_kg: data.actual_yield_kg as number,
    };

    const updated = await seasonRepository.update(id, updatePayload);

    // Trigger asynchronous carbon calculations in background worker
    await carbonCalculationQueue.add('calculate', { seasonId: id });

    // Invalidate caches
    await this.invalidateCache(id, season.farm_zone.farmer.cooperative_id);

    return updated;
  }

  public async cancelSeason(id: string, user: JwtPayload): Promise<SeasonWithZoneAndFarmer> {
    const season = await this.getSeasonById(id, user);

    if (season.status !== SeasonStatus.ACTIVE) {
      throw new AppError('SEASON_NOT_ACTIVE', 400, 'Chỉ có thể hủy bỏ vụ mùa đang hoạt động');
    }

    const updatePayload: UpdateSeasonInput = {
      status: SeasonStatus.CANCELLED,
    };

    const updated = await seasonRepository.update(id, updatePayload);

    // Invalidate caches
    await this.invalidateCache(id, season.farm_zone.farmer.cooperative_id);

    return updated;
  }
}

export const seasonService = new SeasonService();
