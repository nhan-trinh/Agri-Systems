import { farmingLogRepository, FarmingLogWithSeason } from './farming-log.repository';
import { seasonRepository } from '../season/season.repository';
import { seasonService } from '../season/season.service';
import { AppError } from '../../shared/utils/app-error';
import { ActivityType, SeasonStatus, UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';
import prisma from '../../prisma/client';

export class FarmingLogService {
  public async getLogs(user: JwtPayload, seasonId?: string): Promise<FarmingLogWithSeason[]> {
    const filters: { cooperativeId?: string; seasonId?: string } = {
      seasonId,
    };

    if (user.role === UserRole.HTX_MANAGER) {
      filters.cooperativeId = user.cooperativeId || undefined;
    }

    return farmingLogRepository.findAll(filters);
  }

  public async getLogById(id: string, user: JwtPayload): Promise<FarmingLogWithSeason> {
    const log = await farmingLogRepository.findById(id);
    if (!log) {
      throw new AppError('FARMING_LOG_NOT_FOUND', 404, 'Không tìm thấy nhật ký canh tác');
    }

    if (user.role === UserRole.HTX_MANAGER && log.season.farm_zone.farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập nhật ký canh tác này');
    }

    return log;
  }

  public async createLog(data: Record<string, unknown>, user: JwtPayload): Promise<FarmingLogWithSeason> {
    const { season_id, activity_date, activity_type, notes, photo_urls, material_id } = data as {
      season_id: string;
      activity_date: Date;
      activity_type: ActivityType;
      notes?: string;
      photo_urls?: string[];
      material_id?: string | null;
    };

    // 1. Verify season exists
    const season = await seasonRepository.findById(season_id);
    if (!season) {
      throw new AppError('SEASON_NOT_FOUND', 404, 'Không tìm thấy vụ mùa tương ứng');
    }

    // 2. Cooperative restriction check
    if (user.role === UserRole.HTX_MANAGER && season.farm_zone.farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn chỉ được phép ghi nhật ký cho nông dân thuộc hợp tác xã của mình');
    }

    // 3. Rule BR-003-1: Can only add logs to ACTIVE seasons
    if (season.status !== SeasonStatus.ACTIVE) {
      throw new AppError('SEASON_NOT_ACTIVE', 400, 'Chỉ được phép ghi nhật ký cho các vụ mùa đang hoạt động');
    }

    // 4. Rule BR-003-3: Validate activity_date within season date range
    const logDate = activity_date instanceof Date ? activity_date : new Date(activity_date as string);
    const seasonStart = new Date(season.start_date);
    const seasonEnd = season.expected_end_date ? new Date(season.expected_end_date) : null;

    if (logDate < seasonStart) {
      throw new AppError(
        'ACTIVITY_DATE_OUT_OF_RANGE',
        400,
        `Ngày hoạt động (${logDate.toLocaleDateString('vi-VN')}) không thể trước ngày bắt đầu vụ mùa (${seasonStart.toLocaleDateString('vi-VN')})`
      );
    }

    if (seasonEnd && logDate > seasonEnd) {
      throw new AppError(
        'ACTIVITY_DATE_OUT_OF_RANGE',
        400,
        `Ngày hoạt động (${logDate.toLocaleDateString('vi-VN')}) không thể sau ngày kết thúc dự kiến (${seasonEnd.toLocaleDateString('vi-VN')})`
      );
    }

    // 5. Rule BR-003-7: Only ONE HARVESTING log per season
    if (activity_type === ActivityType.HARVESTING) {
      const hasExisting = await farmingLogRepository.hasHarvestingLog(season_id);
      if (hasExisting) {
        throw new AppError(
          'DUPLICATE_HARVESTING_LOG',
          409,
          'Vụ mùa này đã có nhật ký thu hoạch. Mỗi vụ mùa chỉ được ghi một lần thu hoạch.'
        );
      }
    }

    // 5.1 Link to Warehouse material (if material_id is provided)
    if (material_id) {
      const material = await prisma.material.findUnique({
        where: { id: material_id },
      });
      if (!material) {
        throw new AppError('MATERIAL_NOT_FOUND', 404, 'Không tìm thấy vật tư trong kho');
      }
      if (user.role === UserRole.HTX_MANAGER && material.cooperative_id !== user.cooperativeId) {
        throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền sử dụng vật tư của HTX khác');
      }

      // Auto-fill
      if (activity_type === ActivityType.FERTILIZING) {
        data.fertilizer_type = material.material_name;
      } else if (activity_type === ActivityType.PESTICIDE) {
        data.product_name = material.material_name;
        data.unit = material.unit;
      }
    }

    // 6. Build input — extract conditional fields based on activity_type
    const input: Record<string, unknown> = {
      season_id,
      activity_date: logDate,
      activity_type,
      notes,
      photo_urls: photo_urls || [],
      created_by: user.userId || 'SYSTEM',
      material_id: material_id || null,
    };

    if (activity_type === ActivityType.FERTILIZING) {
      input.fertilizer_type = data.fertilizer_type;
      input.quantity_kg = data.quantity_kg;
    } else if (activity_type === ActivityType.PESTICIDE) {
      input.product_name = data.product_name;
      input.dosage = data.dosage;
      input.unit = data.unit;
    } else if (activity_type === ActivityType.IRRIGATION) {
      input.water_volume_m3 = data.water_volume_m3;
      input.duration_hours = data.duration_hours;
    } else if (activity_type === ActivityType.HARVESTING) {
      input.yield_kg = data.yield_kg;
      input.harvest_method = data.harvest_method;
    }

    const createdLog = await farmingLogRepository.create(input as Parameters<typeof farmingLogRepository.create>[0]);

    // Auto-complete season on harvesting log
    if (activity_type === ActivityType.HARVESTING) {
      try {
        await seasonService.completeSeason(season_id, {
          actual_end_date: logDate,
          actual_yield_kg: data.yield_kg,
        }, user);
      } catch (err) {
        console.error('Failed to auto-complete season:', err);
      }
    }

    return createdLog;
  }

  public async updateLog(id: string, data: Record<string, unknown>, user: JwtPayload): Promise<FarmingLogWithSeason> {
    const log = await this.getLogById(id, user);

    // Cannot edit logs of non-ACTIVE seasons
    if (log.season.status !== SeasonStatus.ACTIVE) {
      throw new AppError('SEASON_NOT_ACTIVE', 400, 'Không thể chỉnh sửa nhật ký của vụ mùa đã đóng hoặc đã hủy');
    }

    // R-10: Block activity_type change — changing the type corrupts the data model.
    if (data.activity_type !== undefined && data.activity_type !== log.activity_type) {
      throw new AppError(
        'ACTIVITY_TYPE_IMMUTABLE',
        400,
        'Không thể thay đổi loại hoạt động của nhật ký đã tạo. Vui lòng xóa và tạo mới.'
      );
    }

    // BR-003-3: Validate new activity_date if provided
    if (data.activity_date !== undefined) {
      const newDate = data.activity_date instanceof Date ? data.activity_date : new Date(data.activity_date as string);
      const seasonStart = new Date(log.season.start_date);
      const seasonEnd = log.season.expected_end_date ? new Date(log.season.expected_end_date) : null;

      if (newDate < seasonStart) {
        throw new AppError(
          'ACTIVITY_DATE_OUT_OF_RANGE',
          400,
          `Ngày hoạt động (${newDate.toLocaleDateString('vi-VN')}) không thể trước ngày bắt đầu vụ mùa (${seasonStart.toLocaleDateString('vi-VN')})`
        );
      }
      if (seasonEnd && newDate > seasonEnd) {
        throw new AppError(
          'ACTIVITY_DATE_OUT_OF_RANGE',
          400,
          `Ngày hoạt động (${newDate.toLocaleDateString('vi-VN')}) không thể sau ngày kết thúc dự kiến (${seasonEnd.toLocaleDateString('vi-VN')})`
        );
      }
    }

    // Validate new material_id if provided
    if (data.material_id !== undefined) {
      if (data.material_id) {
        const material = await prisma.material.findUnique({
          where: { id: data.material_id as string },
        });
        if (!material) {
          throw new AppError('MATERIAL_NOT_FOUND', 404, 'Không tìm thấy vật tư trong kho');
        }
        if (user.role === UserRole.HTX_MANAGER && material.cooperative_id !== user.cooperativeId) {
          throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền sử dụng vật tư của HTX khác');
        }

        if (log.activity_type === ActivityType.FERTILIZING) {
          data.fertilizer_type = material.material_name;
        } else if (log.activity_type === ActivityType.PESTICIDE) {
          data.product_name = material.material_name;
          data.unit = material.unit;
        }
      }
    }

    // Build update payload scoped to the existing activity_type
    const updatePayload: Record<string, unknown> = {};
    if (data.activity_date !== undefined) updatePayload.activity_date = data.activity_date instanceof Date ? data.activity_date : new Date(data.activity_date as string);
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.photo_urls !== undefined) updatePayload.photo_urls = data.photo_urls;
    if (data.material_id !== undefined) updatePayload.material_id = data.material_id || null;

    if (log.activity_type === ActivityType.FERTILIZING) {
      if (data.fertilizer_type !== undefined) updatePayload.fertilizer_type = data.fertilizer_type;
      if (data.quantity_kg !== undefined) updatePayload.quantity_kg = data.quantity_kg;
    } else if (log.activity_type === ActivityType.PESTICIDE) {
      if (data.product_name !== undefined) updatePayload.product_name = data.product_name;
      if (data.dosage !== undefined) updatePayload.dosage = data.dosage;
      if (data.unit !== undefined) updatePayload.unit = data.unit;
    } else if (log.activity_type === ActivityType.IRRIGATION) {
      if (data.water_volume_m3 !== undefined) updatePayload.water_volume_m3 = data.water_volume_m3;
      if (data.duration_hours !== undefined) updatePayload.duration_hours = data.duration_hours;
    } else if (log.activity_type === ActivityType.HARVESTING) {
      if (data.yield_kg !== undefined) updatePayload.yield_kg = data.yield_kg;
      if (data.harvest_method !== undefined) updatePayload.harvest_method = data.harvest_method;
    }

    return farmingLogRepository.update(id, updatePayload as Parameters<typeof farmingLogRepository.update>[1]);
  }

  public async deleteLog(id: string, user: JwtPayload): Promise<{ id: string }> {
    const log = await this.getLogById(id, user);

    if (log.season.status !== SeasonStatus.ACTIVE) {
      throw new AppError('SEASON_NOT_ACTIVE', 400, 'Không thể xóa nhật ký của vụ mùa đã đóng hoặc đã hủy');
    }

    return farmingLogRepository.delete(id);
  }
}

export const farmingLogService = new FarmingLogService();
