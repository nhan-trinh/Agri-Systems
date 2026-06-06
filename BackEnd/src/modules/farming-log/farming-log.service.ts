import { farmingLogRepository } from './farming-log.repository';
import { seasonRepository } from '../season/season.repository';
import { AppError } from '../../shared/utils/app-error';
import { SeasonStatus, UserRole } from '@prisma/client';
import { JwtPayload } from '../auth/auth.types';

export class FarmingLogService {
  public async getLogs(user: JwtPayload, seasonId?: string): Promise<any[]> {
    const filters: { cooperativeId?: string; seasonId?: string } = {
      seasonId,
    };

    if (user.role === UserRole.HTX_MANAGER) {
      filters.cooperativeId = user.cooperativeId || undefined;
    }

    return farmingLogRepository.findAll(filters);
  }

  public async getLogById(id: string, user: JwtPayload): Promise<any> {
    const log = await farmingLogRepository.findById(id);
    if (!log) {
      throw new AppError('FARMING_LOG_NOT_FOUND', 404, 'Không tìm thấy nhật ký canh tác');
    }

    if (user.role === UserRole.HTX_MANAGER && log.season.farm_zone.farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập nhật ký canh tác này');
    }

    return log;
  }

  public async createLog(data: any, user: JwtPayload): Promise<any> {
    const { season_id, activity_date, activity_type, notes, photo_urls } = data;

    // 1. Verify season exists
    const season = await seasonRepository.findById(season_id);
    if (!season) {
      throw new AppError('SEASON_NOT_FOUND', 404, 'Không tìm thấy vụ mùa tương ứng');
    }

    // 2. Cooperative restriction check
    if (user.role === UserRole.HTX_MANAGER && season.farm_zone.farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn chỉ được phép ghi nhật ký cho nông dân thuộc hợp tác xã của mình');
    }

    // 3. Rule: Can only add logs to ACTIVE seasons
    if (season.status !== SeasonStatus.ACTIVE) {
      throw new AppError('SEASON_NOT_ACTIVE', 400, 'Chỉ được phép ghi nhật ký cho các vụ mùa đang hoạt động');
    }

    // Extract conditional inputs based on activity_type to prevent garbage data
    const input: any = {
      season_id,
      activity_date: new Date(activity_date),
      activity_type,
      notes,
      photo_urls: photo_urls || [],
      created_by: user.userId || 'SYSTEM',
    };

    if (activity_type === 'FERTILIZING') {
      input.fertilizer_type = data.fertilizer_type;
      input.quantity_kg = data.quantity_kg;
    } else if (activity_type === 'PESTICIDE') {
      input.product_name = data.product_name;
      input.dosage = data.dosage;
      input.unit = data.unit;
    } else if (activity_type === 'IRRIGATION') {
      input.water_volume_m3 = data.water_volume_m3;
      input.duration_hours = data.duration_hours;
    } else if (activity_type === 'HARVESTING') {
      input.yield_kg = data.yield_kg;
      input.harvest_method = data.harvest_method;
    }

    return farmingLogRepository.create(input);
  }

  public async updateLog(id: string, data: any, user: JwtPayload): Promise<any> {
    const log = await this.getLogById(id, user);

    if (log.season.status !== SeasonStatus.ACTIVE) {
      throw new AppError('SEASON_NOT_ACTIVE', 400, 'Không thể chỉnh sửa nhật ký của vụ mùa đã đóng hoặc đã hủy');
    }

    // Extract allowed fields for update
    const updatePayload: any = {};
    if (data.activity_date !== undefined) updatePayload.activity_date = new Date(data.activity_date);
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.photo_urls !== undefined) updatePayload.photo_urls = data.photo_urls;

    if (log.activity_type === 'FERTILIZING') {
      if (data.fertilizer_type !== undefined) updatePayload.fertilizer_type = data.fertilizer_type;
      if (data.quantity_kg !== undefined) updatePayload.quantity_kg = data.quantity_kg;
    } else if (log.activity_type === 'PESTICIDE') {
      if (data.product_name !== undefined) updatePayload.product_name = data.product_name;
      if (data.dosage !== undefined) updatePayload.dosage = data.dosage;
      if (data.unit !== undefined) updatePayload.unit = data.unit;
    } else if (log.activity_type === 'IRRIGATION') {
      if (data.water_volume_m3 !== undefined) updatePayload.water_volume_m3 = data.water_volume_m3;
      if (data.duration_hours !== undefined) updatePayload.duration_hours = data.duration_hours;
    } else if (log.activity_type === 'HARVESTING') {
      if (data.yield_kg !== undefined) updatePayload.yield_kg = data.yield_kg;
      if (data.harvest_method !== undefined) updatePayload.harvest_method = data.harvest_method;
    }

    return farmingLogRepository.update(id, updatePayload);
  }

  public async deleteLog(id: string, user: JwtPayload): Promise<any> {
    const log = await this.getLogById(id, user);

    if (log.season.status !== SeasonStatus.ACTIVE) {
      throw new AppError('SEASON_NOT_ACTIVE', 400, 'Không thể xóa nhật ký của vụ mùa đã đóng hoặc đã hủy');
    }

    return farmingLogRepository.delete(id);
  }
}

export const farmingLogService = new FarmingLogService();
