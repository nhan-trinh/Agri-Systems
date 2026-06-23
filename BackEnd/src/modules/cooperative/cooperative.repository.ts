import prisma from '../../prisma/client';
import { Cooperative, Prisma } from '@prisma/client';
import { FindAllFilters } from './cooperative.types';

// ─────────────────────────────────────────────────────
// Repository — chỉ chứa logic truy vấn DB, không chứa business logic.
// Follows the soft-delete convention: `is_active = false` + `deleted_at` timestamp,
// matching farmer / farm-zone. Reads default to non-deleted records.
// ─────────────────────────────────────────────────────

export class CooperativeRepository {

  /**
   * Paginated, searchable list of cooperatives. Excludes soft-deleted records by default;
   * pass `includeDeleted: true` to include them (SUPER_ADMIN audit use).
   */
  async findAll(filters: FindAllFilters): Promise<Cooperative[]> {
    const where: Prisma.CooperativeWhereInput = {};

    if (!filters.includeDeleted) {
      where.deleted_at = null;
    }

    if (filters.isActive !== undefined) {
      where.is_active = filters.isActive;
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { htx_code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.cooperative.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: filters.skip,
      take: filters.take,
    });
  }

  async count(filters: FindAllFilters): Promise<number> {
    const where: Prisma.CooperativeWhereInput = {};

    if (!filters.includeDeleted) {
      where.deleted_at = null;
    }
    if (filters.isActive !== undefined) {
      where.is_active = filters.isActive;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { htx_code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.cooperative.count({ where });
  }

  /**
   * Find by id WITHOUT the soft-delete filter. Used by other modules (e.g. farmer.service)
   * that need to resolve a cooperative reference even after deactivation, and by the
   * service layer to distinguish "not found" from "soft-deleted".
   */
  async findById(id: string): Promise<Cooperative | null> {
    return prisma.cooperative.findUnique({ where: { id } });
  }

  /**
   * Find by id, excluding soft-deleted records. Use this in the cooperative service's
   * own business logic where a deleted record should be treated as "not found".
   */
  async findActiveById(id: string): Promise<Cooperative | null> {
    return prisma.cooperative.findFirst({
      where: { id, deleted_at: null },
    });
  }

  async findByHtxCode(htxCode: string): Promise<Cooperative | null> {
    return prisma.cooperative.findUnique({ where: { htx_code: htxCode } });
  }

  async create(data: Prisma.CooperativeUncheckedCreateInput): Promise<Cooperative> {
    return prisma.cooperative.create({ data });
  }

  async update(id: string, data: Prisma.CooperativeUncheckedUpdateInput): Promise<Cooperative> {
    return prisma.cooperative.update({ where: { id }, data });
  }

  /**
   * Soft delete: mark is_active = false + record the timestamp. Mirrors the
   * farmer / farm-zone convention. Does NOT check for active dependencies — that
   * is the service layer's responsibility (BR equivalent of BR-002-6).
   */
  async softDelete(id: string): Promise<Cooperative> {
    return prisma.cooperative.update({
      where: { id },
      data: { is_active: false, deleted_at: new Date() },
    });
  }

  /**
   * Reactivate a previously soft-deleted cooperative (clears deleted_at, sets active).
   * Exposed so the status-toggle flow can restore a deactivated HTX.
   */
  async restore(id: string): Promise<Cooperative> {
    return prisma.cooperative.update({
      where: { id },
      data: { is_active: true, deleted_at: null },
    });
  }

  /**
   * Count active dependents that block deletion/deactivation of a cooperative
   * (the cooperative equivalent of BR-002-6). Returns counts for each dependent type
   * so the service can produce a precise error message.
   */
  async countActiveDependents(id: string): Promise<{ farmers: number; users: number }> {
    const [farmers, users] = await Promise.all([
      prisma.farmer.count({
        where: { cooperative_id: id, is_active: true, deleted_at: null },
      }),
      prisma.user.count({
        where: { cooperative_id: id, is_active: true },
      }),
    ]);
    return { farmers, users };
  }
}

export const cooperativeRepository = new CooperativeRepository();
