import { seasonRepository, CreateSeasonInput, UpdateSeasonInput } from './season.repository';
import { farmZoneRepository } from '../farm-zone/farm-zone.repository';
import { AppError } from '../../shared/utils/app-error';
import { SeasonStatus, UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';
import { carbonCalculationQueue } from '../../shared/queues/carbon.queue';

export class SeasonService {
  public async getSeasons(user: JwtPayload, farmZoneId?: string, status?: SeasonStatus): Promise<any[]> {
    const filters: { cooperativeId?: string; farmZoneId?: string; status?: SeasonStatus } = {
      farmZoneId,
      status,
    };

    if (user.role === UserRole.HTX_MANAGER) {
      filters.cooperativeId = user.cooperativeId || undefined;
    }

    return seasonRepository.findAll(filters);
  }

  public async getSeasonById(id: string, user: JwtPayload): Promise<any> {
    const season = await seasonRepository.findById(id);
    if (!season) {
      throw new AppError('SEASON_NOT_FOUND', 404, 'Không tìm thấy vụ mùa');
    }

    // HTX Manager is only allowed to access seasons in their own cooperative
    if (user.role === UserRole.HTX_MANAGER && season.farm_zone.farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập vụ mùa này');
    }

    return season;
  }

  public async createSeason(data: any, user: JwtPayload): Promise<any> {
    const { farm_zone_id, season_name, crop_variety, start_date, expected_end_date, planned_yield_kg } = data;

    // 1. Verify farm zone exists
    const zone = await farmZoneRepository.findById(farm_zone_id) as any;
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

    return seasonRepository.create(input);
  }

  public async updateSeason(id: string, data: any, user: JwtPayload): Promise<any> {
    const season = await this.getSeasonById(id, user);

    const updatePayload: UpdateSeasonInput = {};

    if (data.season_name !== undefined) {
      updatePayload.season_name = data.season_name;
    }

    if (data.crop_variety !== undefined) {
      updatePayload.crop_variety = data.crop_variety;
    }

    if (data.start_date !== undefined) {
      updatePayload.start_date = new Date(data.start_date);
    }

    if (data.expected_end_date !== undefined) {
      updatePayload.expected_end_date = new Date(data.expected_end_date);
    }

    if (data.planned_yield_kg !== undefined) {
      updatePayload.planned_yield_kg = data.planned_yield_kg;
    }

    return seasonRepository.update(id, updatePayload);
  }

  public async completeSeason(id: string, data: any, user: JwtPayload): Promise<any> {
    const season = await this.getSeasonById(id, user);

    if (season.status !== SeasonStatus.ACTIVE) {
      throw new AppError('SEASON_NOT_ACTIVE', 400, 'Chỉ có thể kết thúc thu hoạch vụ mùa đang hoạt động');
    }

    const updatePayload: UpdateSeasonInput = {
      status: SeasonStatus.COMPLETED,
      actual_end_date: new Date(data.actual_end_date),
      actual_yield_kg: data.actual_yield_kg,
    };

    const updated = await seasonRepository.update(id, updatePayload);

    // Trigger asynchronous carbon calculations in background worker
    await carbonCalculationQueue.add('calculate', { seasonId: id });

    return updated;
  }

  public async cancelSeason(id: string, user: JwtPayload): Promise<any> {
    const season = await this.getSeasonById(id, user);

    if (season.status !== SeasonStatus.ACTIVE) {
      throw new AppError('SEASON_NOT_ACTIVE', 400, 'Chỉ có thể hủy bỏ vụ mùa đang hoạt động');
    }

    const updatePayload: UpdateSeasonInput = {
      status: SeasonStatus.CANCELLED,
    };

    return seasonRepository.update(id, updatePayload);
  }
}

export const seasonService = new SeasonService();
