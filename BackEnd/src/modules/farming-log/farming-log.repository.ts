import prisma from '../../prisma/client';
import { ActivityType, Prisma } from '@prisma/client';

// ==================== TYPES ====================

const farmingLogWithSeason = {
  material: true,
  season: {
    include: {
      farm_zone: {
        include: {
          farmer: {
            include: {
              cooperative: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.FarmingLogInclude;

export type FarmingLogWithSeason = Prisma.FarmingLogGetPayload<{
  include: typeof farmingLogWithSeason;
}>;

// ==================== REPOSITORY ====================

export class FarmingLogRepository {
  public async create(data: Prisma.FarmingLogUncheckedCreateInput): Promise<FarmingLogWithSeason> {
    return prisma.farmingLog.create({
      data,
      include: farmingLogWithSeason,
    });
  }

  public async update(id: string, data: Prisma.FarmingLogUncheckedUpdateInput): Promise<FarmingLogWithSeason> {
    return prisma.farmingLog.update({
      where: { id },
      data,
      include: farmingLogWithSeason,
    });
  }

  public async findById(id: string): Promise<FarmingLogWithSeason | null> {
    return prisma.farmingLog.findFirst({
      where: { id, deleted_at: null },
      include: farmingLogWithSeason,
    });
  }

  /**
   * BR-003-7: Check if a HARVESTING log already exists for a given season.
   */
  public async hasHarvestingLog(seasonId: string, excludeLogId?: string): Promise<boolean> {
    const existing = await prisma.farmingLog.findFirst({
      where: {
        season_id: seasonId,
        activity_type: ActivityType.HARVESTING,
        deleted_at: null,
        ...(excludeLogId ? { id: { not: excludeLogId } } : {}),
      },
      select: { id: true },
    });
    return !!existing;
  }

  public async findAll(filters: { cooperativeId?: string; seasonId?: string }): Promise<FarmingLogWithSeason[]> {
    const where: Prisma.FarmingLogWhereInput = {
      deleted_at: null,
    };

    if (filters.seasonId) {
      where.season_id = filters.seasonId;
    }

    if (filters.cooperativeId) {
      where.season = {
        farm_zone: {
          farmer: {
            cooperative_id: filters.cooperativeId,
          },
        },
      };
    }

    return prisma.farmingLog.findMany({
      where,
      include: farmingLogWithSeason,
      orderBy: {
        activity_date: 'desc',
      },
    });
  }

  // R-11: Soft delete — mark as deleted instead of destroying the record.
  // This preserves farming log data for carbon audit trail and traceability.
  public async delete(id: string): Promise<{ id: string }> {
    await prisma.farmingLog.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
    return { id };
  }
}

export const farmingLogRepository = new FarmingLogRepository();
