import { farmZoneRepository, CreateFarmZoneInput, UpdateFarmZoneInput, FarmZoneWithFarmer } from './farm-zone.repository';
import { farmerRepository } from '../farmer/farmer.repository';
import { AppError } from '../../shared/utils/app-error';
import { JwtPayload } from '../auth/auth.types';
import { getRedisClient } from '../../shared/utils/redis.client';
import { CreateFarmZoneDto, UpdateFarmZoneDto } from './farm-zone.dto';
import { z } from 'zod';
import { FarmZone } from '@prisma/client';

// ==================== TYPES ====================

type CreateZoneInput = z.infer<typeof CreateFarmZoneDto>;
type UpdateZoneInput = z.infer<typeof UpdateFarmZoneDto>;

// ==================== CONSTANTS ====================

const MIN_AREA_SQM = 100;        // BR-002-3: Minimum 100 m²
const MAX_AREA_SQM = 5_000_000;  // BR-002-3: Maximum 500 ha = 5,000,000 m²

const ZONE_LIST_TTL_SECONDS = 300;     // 5 minutes
const ZONE_DETAIL_TTL_SECONDS = 600;   // 10 minutes

// ==================== SERVICE ====================

export class FarmZoneService {

  // ==================== CACHE HELPERS ====================

  private async invalidateCache(zoneId?: string, cooperativeId?: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.del('farm-zones:list:all');
      if (cooperativeId) {
        await redis.del(`farm-zones:list:coop:${cooperativeId}`);
      }
      if (zoneId) {
        await redis.del(`farm-zones:detail:${zoneId}`);
      }
    } catch (error) {
      console.error('[Redis Error] Failed to invalidate farm-zone cache:', error);
    }
  }

  private getListCacheKey(user: JwtPayload): string {
    if (user.role === 'SUPER_ADMIN') return 'farm-zones:list:all';
    return `farm-zones:list:coop:${user.cooperativeId}`;
  }

  // ==================== VALIDATION HELPERS ====================

  /**
   * BR-002-3: Validate area within 100 m² – 500 ha bounds.
   */
  private validateAreaBounds(areaSqm: number): void {
    if (areaSqm < MIN_AREA_SQM) {
      throw new AppError(
        'FARM_ZONE_TOO_SMALL',
        400,
        `Diện tích vùng trồng quá nhỏ (${areaSqm.toFixed(1)} m²). Tối thiểu ${MIN_AREA_SQM} m².`
      );
    }
    if (areaSqm > MAX_AREA_SQM) {
      throw new AppError(
        'FARM_ZONE_TOO_LARGE',
        400,
        `Diện tích vùng trồng quá lớn (${(areaSqm / 10000).toFixed(1)} ha). Tối đa 500 ha.`
      );
    }
  }

  /**
   * BR-002-6: Check for active seasons or pending batches before delete/deactivate.
   */
  private async validateNoActiveDependencies(zoneId: string): Promise<void> {
    const { hasSeason, hasBatch } = await farmZoneRepository.hasActiveSeasonOrBatch(zoneId);

    if (hasSeason) {
      throw new AppError(
        'FARM_ZONE_HAS_ACTIVE_SEASON',
        409,
        'Không thể khóa/xóa vùng trồng đang có vụ mùa hoạt động. Vui lòng kết thúc vụ mùa trước.'
      );
    }

    if (hasBatch) {
      throw new AppError(
        'FARM_ZONE_HAS_ACTIVE_BATCH',
        409,
        'Không thể khóa/xóa vùng trồng đang có lô hàng chưa hoàn tất. Vui lòng xử lý lô hàng trước.'
      );
    }
  }

  // ==================== QUERIES ====================

  public async getZones(user: JwtPayload, farmerId?: string): Promise<FarmZoneWithFarmer[]> {
    // Only use cache for unfiltered list queries
    if (!farmerId) {
      try {
        const redis = await getRedisClient();
        const cacheKey = this.getListCacheKey(user);
        const cached = await redis.get(cacheKey);
        if (cached) return JSON.parse(cached);
      } catch (error) {
        console.error('[Redis Error] Failed to get farm-zone list cache:', error);
      }
    }

    const filters: { cooperativeId?: string; farmerId?: string } = {};
    
    if (farmerId) {
      filters.farmerId = farmerId;
    }
    
    if (user.role === 'HTX_MANAGER') {
      filters.cooperativeId = user.cooperativeId || undefined;
    }

    const zones = await farmZoneRepository.findAll(filters);

    // Cache only unfiltered queries
    if (!farmerId) {
      try {
        const redis = await getRedisClient();
        const cacheKey = this.getListCacheKey(user);
        await redis.set(cacheKey, JSON.stringify(zones), { EX: ZONE_LIST_TTL_SECONDS });
      } catch (error) {
        console.error('[Redis Error] Failed to set farm-zone list cache:', error);
      }
    }

    return zones;
  }

  public async getZoneById(id: string, user: JwtPayload): Promise<FarmZoneWithFarmer> {
    // Try cache first
    try {
      const redis = await getRedisClient();
      const cached = await redis.get(`farm-zones:detail:${id}`);
      if (cached) {
        const zone = JSON.parse(cached) as FarmZoneWithFarmer;
        // Still enforce RBAC on cached data
        if (user.role === 'HTX_MANAGER' && zone.farmer.cooperative_id !== user.cooperativeId) {
          throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập vùng trồng của nông dân này');
        }
        return zone;
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      console.error('[Redis Error] Failed to get farm-zone detail cache:', error);
    }

    const zone = await farmZoneRepository.findById(id);
    if (!zone) {
      throw new AppError('FARM_ZONE_NOT_FOUND', 404, 'Không tìm thấy vùng trồng tương ứng');
    }

    // RBAC check
    if (user.role === 'HTX_MANAGER' && zone.farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập vùng trồng của nông dân này');
    }

    // Store in cache
    try {
      const redis = await getRedisClient();
      await redis.set(`farm-zones:detail:${id}`, JSON.stringify(zone), { EX: ZONE_DETAIL_TTL_SECONDS });
    } catch (error) {
      console.error('[Redis Error] Failed to set farm-zone detail cache:', error);
    }

    return zone;
  }

  // ==================== MUTATIONS ====================

  public async createZone(data: CreateZoneInput, user: JwtPayload): Promise<FarmZoneWithFarmer> {
    const { zone_name, farmer_id, crop_type, boundary, description } = data;

    // 1. Verify farmer exists and belongs to the manager's cooperative
    const farmer = await farmerRepository.findById(farmer_id);
    if (!farmer) {
      throw new AppError('FARMER_NOT_FOUND', 404, 'Không tìm thấy nông dân tương ứng');
    }

    if (user.role === 'HTX_MANAGER' && farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn chỉ được phép tạo vùng trồng cho nông dân thuộc hợp tác xã của mình');
    }

    // 2. Spatial Overlap Detection
    const overlap = await farmZoneRepository.checkOverlap(boundary);
    if (overlap) {
      throw new AppError(
        'FARM_ZONE_OVERLAP',
        400,
        `Vùng trồng bị chồng lấn ranh giới với vùng trồng "${overlap.zone_name}"`
      );
    }

    // 3. PostGIS Area Calculation + BR-002-3 Bounds Validation
    const areaSqm = await farmZoneRepository.calculateArea(boundary);
    this.validateAreaBounds(areaSqm);

    // 4. Generate unique farm_zone_code: ZONE-HTX_CODE-YYYY-NNNN
    const currentYear = new Date().getFullYear();
    // farmer.findById includes cooperative relation at runtime
    const farmerWithCoop = farmer as unknown as { cooperative: { htx_code: string }; cooperative_id: string };
    const prefix = `ZONE-${farmerWithCoop.cooperative.htx_code}-${currentYear}-`;
    
    const lastZone = await farmZoneRepository.findLastByCodePrefix(prefix);

    let nextSerial = 1;
    if (lastZone) {
      const parts = lastZone.farm_zone_code.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSerial = lastSeq + 1;
      }
    }

    const farmZoneCode = `${prefix}${String(nextSerial).padStart(4, '0')}`;

    const input: CreateFarmZoneInput = {
      farm_zone_code: farmZoneCode,
      zone_name,
      farmer_id,
      crop_type,
      boundary,
      area_sqm: areaSqm,
      description,
    };

    const zone = await farmZoneRepository.create(input);

    // Invalidate list caches
    await this.invalidateCache(undefined, farmer.cooperative_id);

    return zone;
  }

  public async updateZone(id: string, data: UpdateZoneInput, user: JwtPayload): Promise<FarmZoneWithFarmer> {
    const existingZone = await this.getZoneById(id, user);

    const updatePayload: UpdateFarmZoneInput = {};

    if (data.zone_name !== undefined) {
      updatePayload.zone_name = data.zone_name;
    }

    if (data.crop_type !== undefined) {
      updatePayload.crop_type = data.crop_type;
    }

    if (data.description !== undefined) {
      updatePayload.description = data.description;
    }

    if (data.farmer_id !== undefined && data.farmer_id !== existingZone.farmer_id) {
      const newFarmer = await farmerRepository.findById(data.farmer_id);
      if (!newFarmer) {
        throw new AppError('FARMER_NOT_FOUND', 404, 'Không tìm thấy nông dân tương ứng');
      }
      if (user.role === 'HTX_MANAGER' && newFarmer.cooperative_id !== user.cooperativeId) {
        throw new AppError('FORBIDDEN', 403, 'Bạn chỉ được phép tạo vùng trồng cho nông dân thuộc hợp tác xã của mình');
      }
      updatePayload.farmer_id = data.farmer_id;
    }

    if (data.boundary !== undefined) {
      // Spatial Overlap Detection (excluding this zone itself)
      const overlap = await farmZoneRepository.checkOverlap(data.boundary, id);
      if (overlap) {
        throw new AppError(
          'FARM_ZONE_OVERLAP',
          400,
          `Vùng trồng bị chồng lấn ranh giới với vùng trồng "${overlap.zone_name}"`
        );
      }

      // PostGIS Area Recalculation + BR-002-3 Bounds Validation
      const areaSqm = await farmZoneRepository.calculateArea(data.boundary);
      this.validateAreaBounds(areaSqm);

      updatePayload.boundary = data.boundary;
      updatePayload.area_sqm = areaSqm;
    }

    const zone = await farmZoneRepository.update(id, updatePayload);

    // Invalidate caches
    await this.invalidateCache(id, existingZone.farmer.cooperative_id);

    return zone;
  }

  public async toggleZoneStatus(id: string, user: JwtPayload): Promise<FarmZoneWithFarmer> {
    const zone = await this.getZoneById(id, user);

    // BR-002-6: If deactivating, check for active dependencies
    if (zone.is_active) {
      await this.validateNoActiveDependencies(id);
    }
    
    const updated = await farmZoneRepository.update(id, {
      is_active: !zone.is_active,
    });

    await this.invalidateCache(id, zone.farmer.cooperative_id);

    return updated;
  }

  public async deleteZone(id: string, user: JwtPayload): Promise<FarmZone> {
    const zone = await this.getZoneById(id, user);

    // BR-002-6: Check for active dependencies before soft delete
    await this.validateNoActiveDependencies(id);

    const deleted = await farmZoneRepository.delete(id);

    await this.invalidateCache(id, zone.farmer.cooperative_id);

    return deleted;
  }

  public async checkOverlapAndCalculate(boundary: CreateZoneInput['boundary'], excludeId?: string): Promise<{ overlaps: boolean; zoneName?: string; areaSqm: number }> {
    const areaSqm = await farmZoneRepository.calculateArea(boundary);
    const overlap = await farmZoneRepository.checkOverlap(boundary, excludeId);
    
    return {
      overlaps: !!overlap,
      zoneName: overlap?.zone_name,
      areaSqm,
    };
  }
}

export const farmZoneService = new FarmZoneService();
