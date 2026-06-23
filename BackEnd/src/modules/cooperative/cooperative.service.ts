import { cooperativeRepository } from './cooperative.repository';
import { AppError } from '../../shared/utils/app-error';
import { getRedisClient } from '../../shared/utils/redis.client';
import { Cooperative } from '@prisma/client';
import {
  CreateCooperativeDtoType,
  UpdateCooperativeDtoType,
  ListCooperativeQueryDtoType,
} from './cooperative.dto';
import { CooperativeListResult, FindAllFilters } from './cooperative.types';

// ─────────────────────────────────────────────────────
// Service — business logic, soft-delete guards, Redis caching.
// Cache-Aside pattern mirrors the farmer module.
// ─────────────────────────────────────────────────────

const COOP_LIST_TTL_SECONDS = 300;   // 5 minutes
const COOP_DETAIL_TTL_SECONDS = 600; // 10 minutes

// Prisma unique-constraint violation code (P2002). Surfaces from the DB @unique
// on htx_code when a concurrent create beats the app-level check.
const PRISMA_UNIQUE_VIOLATION_CODE = 'P2002';

export class CooperativeService {

  // ── Cache helpers ─────────────────────────────────

  private async invalidateCache(coopId?: string): Promise<void> {
    try {
      const redis = await getRedisClient();
      await redis.del('cooperatives:list'); // unfiltered list cache
      if (coopId) {
        await redis.del(`cooperatives:detail:${coopId}`);
      }
    } catch (error) {
      console.error('[Redis Error] Failed to invalidate cooperative cache:', error);
    }
  }

  /**
   * Only the unfiltered, default-ordered list query is cached. Any search / is_active /
   * pagination variant bypasses cache (results are small and rare for SUPER_ADMIN).
   */
  private canUseListCache(query: ListCooperativeQueryDtoType): boolean {
    return (
      !query.search &&
      query.is_active === undefined &&
      query.page === 1 &&
      query.limit === 20
    );
  }

  // ── LIST ──────────────────────────────────────────

  async listCooperatives(query: ListCooperativeQueryDtoType): Promise<CooperativeListResult> {
    const useCache = this.canUseListCache(query);

    if (useCache) {
      try {
        const redis = await getRedisClient();
        const cached = await redis.get('cooperatives:list');
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error('[Redis Error] Failed to get cooperative list cache:', error);
      }
    }

    const filters: FindAllFilters = {
      search: query.search,
      isActive: query.is_active === undefined ? undefined : query.is_active === 'true',
      includeDeleted: false,
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    };

    const [data, total] = await Promise.all([
      cooperativeRepository.findAll(filters),
      cooperativeRepository.count(filters),
    ]);

    const result: CooperativeListResult = {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        total_pages: Math.ceil(total / query.limit),
      },
    };

    if (useCache) {
      try {
        const redis = await getRedisClient();
        await redis.set('cooperatives:list', JSON.stringify(result), { EX: COOP_LIST_TTL_SECONDS });
      } catch (error) {
        console.error('[Redis Error] Failed to set cooperative list cache:', error);
      }
    }

    return result;
  }

  // ── GET BY ID ─────────────────────────────────────

  async getCooperativeById(id: string): Promise<Cooperative> {
    // Try cache first
    try {
      const redis = await getRedisClient();
      const cached = await redis.get(`cooperatives:detail:${id}`);
      if (cached) {
        return JSON.parse(cached) as Cooperative;
      }
    } catch (error) {
      console.error('[Redis Error] Failed to get cooperative detail cache:', error);
    }

    // findActiveById excludes soft-deleted records — a deleted HTX is "not found" here.
    const coop = await cooperativeRepository.findActiveById(id);
    if (!coop) {
      throw new AppError('COOPERATIVE_NOT_FOUND', 404, 'Không tìm thấy Hợp tác xã');
    }

    try {
      const redis = await getRedisClient();
      await redis.set(`cooperatives:detail:${id}`, JSON.stringify(coop), { EX: COOP_DETAIL_TTL_SECONDS });
    } catch (error) {
      console.error('[Redis Error] Failed to set cooperative detail cache:', error);
    }

    return coop;
  }

  // ── CREATE ────────────────────────────────────────

  async createCooperative(data: CreateCooperativeDtoType): Promise<Cooperative> {
    // The DB @unique on htx_code is the authoritative guard. The app-level check here
    // gives a friendly 409 in the common case; if a concurrent insert slips through,
    // we catch Prisma P2002 and map it to the same error.
    const existing = await cooperativeRepository.findByHtxCode(data.htx_code);
    if (existing) {
      throw new AppError('COOPERATIVE_CODE_DUPLICATE', 409, 'Mã Hợp tác xã đã tồn tại trên hệ thống');
    }

    try {
      const created = await cooperativeRepository.create({
        htx_code: data.htx_code,
        name: data.name,
        province: data.province,
        district: data.district,
        address: data.address,
        phone: data.phone,
      });

      await this.invalidateCache();
      return created;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new AppError('COOPERATIVE_CODE_DUPLICATE', 409, 'Mã Hợp tác xã đã tồn tại trên hệ thống');
      }
      throw error;
    }
  }

  // ── UPDATE ────────────────────────────────────────

  async updateCooperative(id: string, data: UpdateCooperativeDtoType): Promise<Cooperative> {
    const existing = await this.getCooperativeById(id); // also enforces soft-delete visibility

    // If renaming the htx_code, check the new code isn't taken by another HTX.
    if (data.htx_code && data.htx_code !== existing.htx_code) {
      const conflict = await cooperativeRepository.findByHtxCode(data.htx_code);
      if (conflict && conflict.id !== id) {
        throw new AppError('COOPERATIVE_CODE_DUPLICATE', 409, 'Mã Hợp tác xã đã tồn tại trên hệ thống');
      }
    }

    try {
      const updated = await cooperativeRepository.update(id, {
        ...(data.htx_code !== undefined && { htx_code: data.htx_code }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.province !== undefined && { province: data.province }),
        ...(data.district !== undefined && { district: data.district }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.phone !== undefined && { phone: data.phone }),
      });

      await this.invalidateCache(id);
      return updated;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new AppError('COOPERATIVE_CODE_DUPLICATE', 409, 'Mã Hợp tác xã đã tồn tại trên hệ thống');
      }
      throw error;
    }
  }

  // ── TOGGLE STATUS (activate / deactivate) ─────────

  /**
   * Toggles is_active. Deactivating a cooperative with active farmers or users is blocked
   * (the cooperative equivalent of BR-002-6), since an inactive HTX silently breaks
   * downstream code generation and member management.
   */
  async toggleStatus(id: string): Promise<Cooperative> {
    const coop = await this.getCooperativeById(id);

    if (coop.is_active) {
      // Deactivating — enforce the dependency guard.
      const { farmers, users } = await cooperativeRepository.countActiveDependents(id);
      if (farmers > 0 || users > 0) {
        const parts: string[] = [];
        if (farmers > 0) parts.push(`${farmers} nông dân`);
        if (users > 0) parts.push(`${users} tài khoản`);
        throw new AppError(
          'COOPERATIVE_HAS_ACTIVE_DEPENDENTS',
          409,
          `Không thể khóa Hợp tác xã đang còn ${parts.join(' và ')} hoạt động. Vui lòng xử lý trước.`,
        );
      }
      const updated = await cooperativeRepository.update(id, { is_active: false });
      await this.invalidateCache(id);
      return updated;
    }

    // Reactivating — restore clears deleted_at too (idempotent if already active).
    const restored = await cooperativeRepository.restore(id);
    await this.invalidateCache(id);
    return restored;
  }

  // ── DELETE (soft) ─────────────────────────────────

  /**
   * Soft delete: same dependency guard as deactivation, then sets is_active=false + deleted_at.
   * Records remain in the DB for audit; reads (findActiveById / findAll) exclude them.
   */
  async deleteCooperative(id: string): Promise<Cooperative> {
    await this.getCooperativeById(id);

    const { farmers, users } = await cooperativeRepository.countActiveDependents(id);
    if (farmers > 0 || users > 0) {
      const parts: string[] = [];
      if (farmers > 0) parts.push(`${farmers} nông dân`);
      if (users > 0) parts.push(`${users} tài khoản`);
      throw new AppError(
        'COOPERATIVE_HAS_ACTIVE_DEPENDENTS',
        409,
        `Không thể xóa Hợp tác xã đang còn ${parts.join(' và ')} hoạt động. Vui lòng xử lý trước.`,
      );
    }

    const deleted = await cooperativeRepository.softDelete(id);
    await this.invalidateCache(id);
    return deleted;
  }

  // ── Helpers ───────────────────────────────────────

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === PRISMA_UNIQUE_VIOLATION_CODE
    );
  }
}

export const cooperativeService = new CooperativeService();
