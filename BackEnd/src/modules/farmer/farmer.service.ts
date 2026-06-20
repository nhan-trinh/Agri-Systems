import { farmerRepository, FarmerListOptions } from './farmer.repository';
import { cooperativeRepository } from '../cooperative/cooperative.repository';
import { AppError } from '../../shared/utils/app-error';
import { Farmer } from '@prisma/client';
import { getRedisClient } from '../../shared/utils/redis.client';
import { PaginationMeta } from '../../shared/utils/response.helper';
import { CreateFarmerInput, FarmerQueryInput, UpdateFarmerInput } from './farmer.dto';
import { JwtPayload } from '../auth/auth.types';

type FarmerListResult = {
  data: Farmer[];
  meta?: PaginationMeta;
};

const FARMER_CODE_RETRY_LIMIT = 5;
const FARMER_LIST_TTL_SECONDS = 300;

export class FarmerService {
  private async invalidateCache(farmerId?: string, cooperativeId?: string) {
    try {
      const redis = await getRedisClient();
      await redis.del('farmers:list:all');
      await redis.del('farmers:list:gov');
      if (cooperativeId) {
        await redis.del(`farmers:list:coop:${cooperativeId}`);
      }
      if (farmerId) {
        await redis.del(`farmers:detail:${farmerId}`);
      }
    } catch (error) {
      console.error('[Redis Error] Failed to invalidate farmer cache:', error);
    }
  }

  private canUseSimpleListCache(user: JwtPayload, query: Partial<FarmerQueryInput>): boolean {
    return (
      !query.cooperative_id &&
      query.is_active === undefined &&
      !query.search &&
      !query.page &&
      !query.limit &&
      (!query.sort_by || query.sort_by === 'created_at') &&
      (!query.sort_order || query.sort_order === 'desc') &&
      user.role !== 'GOV_VIEWER'
    );
  }

  private getListCacheKey(user: JwtPayload): string {
    if (user.role === 'SUPER_ADMIN') return 'farmers:list:all';
    return `farmers:list:coop:${user.cooperativeId}`;
  }

  private buildListOptions(user: JwtPayload, query: Partial<FarmerQueryInput>): FarmerListOptions {
    const options: FarmerListOptions = {
      isActive: query.is_active,
      search: query.search,
      sortBy: query.sort_by,
      sortOrder: query.sort_order,
    };

    if (user.role === 'HTX_MANAGER') {
      options.cooperativeId = user.cooperativeId || undefined;
    } else if (query.cooperative_id) {
      options.cooperativeId = query.cooperative_id;
    }

    return options;
  }

  private redactForGovernment(farmers: Farmer[]): Farmer[] {
    return farmers.map((farmer) => ({
      ...farmer,
      phone: '',
      national_id: null,
      address: '',
    }));
  }

  private assertCanReadFarmer(farmer: Farmer, user: JwtPayload): void {
    if (user.role === 'SUPER_ADMIN') return;

    if (user.role === 'FARMER') {
      if (farmer.id !== user.farmerId) {
        throw new AppError('FORBIDDEN', 403, 'Ban khong co quyen xem thong tin nong dan nay');
      }
      return;
    }

    if (farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Ban khong co quyen xem thong tin nong dan nay');
    }
  }

  private isFarmerCodeConflict(error: any): boolean {
    return error?.code === 'P2002' && String(error?.meta?.target || '').includes('farmer_code');
  }

  async getAllFarmers(user: JwtPayload, query: Partial<FarmerQueryInput> = {}): Promise<FarmerListResult> {
    const useCache = this.canUseSimpleListCache(user, query);
    const cacheKey = this.getListCacheKey(user);

    if (useCache) {
      try {
        const redis = await getRedisClient();
        const cached = await redis.get(cacheKey);
        if (cached) {
          return { data: JSON.parse(cached) };
        }
      } catch (error) {
        console.error('[Redis Error] Failed to get farmers list cache:', error);
      }
    }

    const options = this.buildListOptions(user, query);
    const shouldPaginate = Boolean(query.page || query.limit);
    const page = query.page || 1;
    const limit = query.limit || 20;

    if (shouldPaginate) {
      options.skip = (page - 1) * limit;
      options.take = limit;
    }

    const [farmers, total] = shouldPaginate
      ? await Promise.all([
          farmerRepository.findAll(options),
          farmerRepository.count(options),
        ])
      : [await farmerRepository.findAll(options), 0];

    const data = user.role === 'GOV_VIEWER' ? this.redactForGovernment(farmers) : farmers;

    if (useCache) {
      try {
        const redis = await getRedisClient();
        await redis.set(cacheKey, JSON.stringify(data), { EX: FARMER_LIST_TTL_SECONDS });
      } catch (error) {
        console.error('[Redis Error] Failed to set farmers list cache:', error);
      }
    }

    if (!shouldPaginate) {
      return { data };
    }

    return {
      data,
      meta: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  async getFarmerById(id: string, user: JwtPayload): Promise<Farmer> {
    const cacheKey = `farmers:detail:${id}`;
    let farmer: Farmer | null = null;

    try {
      const redis = await getRedisClient();
      const cached = await redis.get(cacheKey);
      if (cached) {
        farmer = JSON.parse(cached);
      }
    } catch (error) {
      console.error('[Redis Error] Failed to get farmer detail cache:', error);
    }

    if (!farmer) {
      farmer = await farmerRepository.findById(id);
      if (farmer) {
        try {
          const redis = await getRedisClient();
          await redis.set(cacheKey, JSON.stringify(farmer), { EX: FARMER_LIST_TTL_SECONDS });
        } catch (error) {
          console.error('[Redis Error] Failed to set farmer detail cache:', error);
        }
      }
    }

    if (!farmer) {
      throw new AppError('FARMER_NOT_FOUND', 404, 'Khong tim thay nong dan');
    }

    this.assertCanReadFarmer(farmer, user);
    return farmer;
  }

  async createFarmer(data: CreateFarmerInput, user: JwtPayload): Promise<Farmer> {
    if (user.role !== 'SUPER_ADMIN' && data.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Ban chi duoc phep them nong dan vao HTX cua minh');
    }

    const coop = await cooperativeRepository.findById(data.cooperative_id);
    if (!coop) {
      throw new AppError('COOPERATIVE_NOT_FOUND', 404, 'Khong tim thay HTX tuong ung');
    }
    if (!coop.is_active) {
      throw new AppError('COOPERATIVE_INACTIVE', 422, 'HTX dang bi khoa, khong the them nong dan');
    }

    const existingPhone = await farmerRepository.findByPhone(data.phone);
    if (existingPhone) {
      throw new AppError('FARMER_PHONE_DUPLICATE', 409, 'So dien thoai nay da duoc su dung cho nong dan khac');
    }

    const existingUserPhone = await farmerRepository.findUserByPhone(data.phone);
    if (existingUserPhone) {
      throw new AppError('USER_PHONE_DUPLICATE', 409, 'So dien thoai nay da duoc su dung cho tai khoan khac');
    }

    const currentYear = new Date().getFullYear();
    let lastError: unknown;

    for (let attempt = 0; attempt < FARMER_CODE_RETRY_LIMIT; attempt += 1) {
      const countThisYear = await farmerRepository.countByCooperativeAndYear(data.cooperative_id, currentYear);
      const nextSerial = String(countThisYear + 1 + attempt).padStart(4, '0');
      const farmerCode = `${coop.htx_code}-${currentYear}-${nextSerial}`;

      try {
        const farmer = await farmerRepository.createWithFarmerUser({
          ...data,
          date_of_birth: data.date_of_birth || undefined,
          national_id: data.national_id || undefined,
          farmer_code: farmerCode,
          cooperative_id: data.cooperative_id,
        });

        await this.invalidateCache(undefined, data.cooperative_id);
        return farmer;
      } catch (error) {
        lastError = error;
        if (!this.isFarmerCodeConflict(error)) {
          throw error;
        }
      }
    }

    throw lastError || new AppError('FARMER_CODE_CONFLICT', 409, 'Khong the sinh ma nong dan duy nhat');
  }

  async updateFarmer(id: string, data: UpdateFarmerInput & Record<string, unknown>, user: JwtPayload): Promise<Farmer> {
    if (data.phone || data.cooperative_id) {
      throw new AppError('IMMUTABLE_FARMER_IDENTITY', 422, 'Khong the thay doi so dien thoai hoac HTX qua API cap nhat ho so');
    }

    const farmer = await this.getFarmerById(id, user);
    const updatedFarmer = await farmerRepository.update(id, {
      ...data,
      date_of_birth: data.date_of_birth === null ? null : data.date_of_birth || undefined,
      national_id: data.national_id === null ? null : data.national_id || undefined,
    });

    await this.invalidateCache(id, farmer.cooperative_id);
    return updatedFarmer;
  }

  async toggleFarmerStatus(id: string, user: JwtPayload): Promise<Farmer> {
    const farmer = await this.getFarmerById(id, user);
    const nextStatus = !farmer.is_active;
    const updatedFarmer = await farmerRepository.updateStatusWithUser(id, nextStatus);

    await this.invalidateCache(id, farmer.cooperative_id);
    return updatedFarmer;
  }
}

export const farmerService = new FarmerService();
