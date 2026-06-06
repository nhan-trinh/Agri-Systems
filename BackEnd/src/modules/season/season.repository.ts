import prisma from '../../prisma/client';
import { SeasonStatus } from '@prisma/client';

export interface CreateSeasonInput {
  farm_zone_id: string;
  season_name: string;
  crop_variety: string;
  start_date: Date;
  expected_end_date: Date;
  planned_yield_kg: number;
  created_by: string;
}

export interface UpdateSeasonInput {
  season_name?: string;
  crop_variety?: string;
  start_date?: Date;
  expected_end_date?: Date;
  actual_end_date?: Date;
  planned_yield_kg?: number;
  actual_yield_kg?: number;
  status?: SeasonStatus;
}

export class SeasonRepository {
  public async create(data: CreateSeasonInput): Promise<any> {
    return prisma.season.create({
      data,
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
    });
  }

  public async update(id: string, data: UpdateSeasonInput): Promise<any> {
    return prisma.season.update({
      where: { id },
      data,
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
    });
  }

  public async findById(id: string): Promise<any | null> {
    return prisma.season.findUnique({
      where: { id },
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
    });
  }

  public async findActiveByZoneId(farmZoneId: string): Promise<any | null> {
    return prisma.season.findFirst({
      where: {
        farm_zone_id: farmZoneId,
        status: SeasonStatus.ACTIVE,
      },
    });
  }

  public async findAll(filters: { cooperativeId?: string; farmZoneId?: string; status?: SeasonStatus }): Promise<any[]> {
    const where: any = {};

    if (filters.farmZoneId) {
      where.farm_zone_id = filters.farmZoneId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.cooperativeId) {
      where.farm_zone = {
        farmer: {
          cooperative_id: filters.cooperativeId,
        },
      };
    }

    return prisma.season.findMany({
      where,
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
      orderBy: {
        created_at: 'desc',
      },
    });
  }
}

export const seasonRepository = new SeasonRepository();
