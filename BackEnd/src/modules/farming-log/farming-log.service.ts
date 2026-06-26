import { farmingLogRepository, FarmingLogWithSeason } from './farming-log.repository';
import { seasonRepository } from '../season/season.repository';
import { seasonService } from '../season/season.service';
import { warehouseRepository } from '../warehouse/warehouse.repository';
import { AppError } from '../../shared/utils/app-error';
import { ActivityType, Prisma, SeasonStatus, UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';

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
    // Auto-fills fertilizer_type / product_name / unit from the linked material.
    // Resolved here (not by mutating the caller's `data`) and folded into `input` below.
    let materialName: string | undefined;
    let materialUnit: string | undefined;
    if (material_id) {
      const material = await warehouseRepository.findMaterialById(material_id);
      if (!material) {
        throw new AppError('MATERIAL_NOT_FOUND', 404, 'Không tìm thấy vật tư trong kho');
      }
      if (user.role === UserRole.HTX_MANAGER && material.cooperative_id !== user.cooperativeId) {
        throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền sử dụng vật tư của HTX khác');
      }

      materialName = material.material_name;
      materialUnit = material.unit;
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
      input.fertilizer_type = materialName ?? data.fertilizer_type;
      input.quantity_kg = data.quantity_kg;
    } else if (activity_type === ActivityType.PESTICIDE) {
      input.product_name = materialName ?? data.product_name;
      input.dosage = data.dosage;
      input.unit = materialUnit ?? data.unit;
    } else if (activity_type === ActivityType.IRRIGATION) {
      input.water_volume_m3 = data.water_volume_m3;
      input.duration_hours = data.duration_hours;
    } else if (activity_type === ActivityType.HARVESTING) {
      input.yield_kg = data.yield_kg;
      input.harvest_method = data.harvest_method;
    }

    let createdLog: FarmingLogWithSeason;
    try {
      createdLog = await farmingLogRepository.create(input as Parameters<typeof farmingLogRepository.create>[0]);
    } catch (err) {
      // The partial unique index (farming_log_single_harvest_per_season) makes the
      // single-harvest rule race-proof. A P2002 on a HARVESTING insert means a concurrent
      // request already created the harvest log — translate it to the domain error.
      if (
        activity_type === ActivityType.HARVESTING &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        throw new AppError(
          'DUPLICATE_HARVESTING_LOG',
          409,
          'Vụ mùa này đã có nhật ký thu hoạch. Mỗi vụ mùa chỉ được ghi một lần thu hoạch.'
        );
      }
      throw err;
    }

    // Auto-complete season on harvesting log.
    // If completion fails, the harvest log is inconsistent with the (still-ACTIVE) season,
    // so we compensate by soft-deleting the just-created log and rethrowing — the client
    // must learn the operation failed rather than receive a silent 201.
    if (activity_type === ActivityType.HARVESTING) {
      try {
        await seasonService.completeSeason(season_id, {
          actual_end_date: logDate,
          actual_yield_kg: data.yield_kg,
        }, user);
      } catch (err) {
        await farmingLogRepository.delete(createdLog.id).catch((cleanupErr) =>
          console.error('Failed to roll back harvest log after season-completion failure:', cleanupErr)
        );
        throw err;
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

    // Resolve new material_id if provided — validate ownership and capture
    // auto-fill values locally (do not mutate the caller's `data`).
    let newMaterialName: string | undefined;
    let newMaterialUnit: string | undefined;
    if (data.material_id !== undefined) {
      if (data.material_id) {
        const material = await warehouseRepository.findMaterialById(data.material_id as string);
        if (!material) {
          throw new AppError('MATERIAL_NOT_FOUND', 404, 'Không tìm thấy vật tư trong kho');
        }
        if (user.role === UserRole.HTX_MANAGER && material.cooperative_id !== user.cooperativeId) {
          throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền sử dụng vật tư của HTX khác');
        }

        newMaterialName = material.material_name;
        newMaterialUnit = material.unit;
      }
    }

    // Build update payload scoped to the existing activity_type
    const updatePayload: Record<string, unknown> = {};
    if (data.activity_date !== undefined) updatePayload.activity_date = data.activity_date instanceof Date ? data.activity_date : new Date(data.activity_date as string);
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.photo_urls !== undefined) updatePayload.photo_urls = data.photo_urls;
    if (data.material_id !== undefined) updatePayload.material_id = data.material_id || null;

    // If a material was (re)linked, auto-fill the name/unit from it; otherwise honor the body.
    if (log.activity_type === ActivityType.FERTILIZING) {
      if (newMaterialName !== undefined) updatePayload.fertilizer_type = newMaterialName;
      else if (data.fertilizer_type !== undefined) updatePayload.fertilizer_type = data.fertilizer_type;
      if (data.quantity_kg !== undefined) updatePayload.quantity_kg = data.quantity_kg;
    } else if (log.activity_type === ActivityType.PESTICIDE) {
      if (newMaterialName !== undefined) updatePayload.product_name = newMaterialName;
      else if (data.product_name !== undefined) updatePayload.product_name = data.product_name;
      if (newMaterialUnit !== undefined) updatePayload.unit = newMaterialUnit;
      else if (data.unit !== undefined) updatePayload.unit = data.unit;
      if (data.dosage !== undefined) updatePayload.dosage = data.dosage;
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
