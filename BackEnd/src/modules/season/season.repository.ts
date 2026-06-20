import prisma from '../../prisma/client';
import { SeasonStatus, Prisma, Season } from '@prisma/client';

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

const seasonWithZoneAndFarmer = {
  farm_zone: {
    include: {
      farmer: {
        include: {
          cooperative: true,
        },
      },
    },
  },
} satisfies Prisma.SeasonInclude;

export type SeasonWithZoneAndFarmer = Prisma.SeasonGetPayload<{
  include: typeof seasonWithZoneAndFarmer;
}>;

export class SeasonRepository {
  public async create(data: CreateSeasonInput): Promise<SeasonWithZoneAndFarmer> {
    return prisma.season.create({
      data,
      include: seasonWithZoneAndFarmer,
    });
  }

  public async update(id: string, data: UpdateSeasonInput): Promise<SeasonWithZoneAndFarmer> {
    return prisma.season.update({
      where: { id },
      data,
      include: seasonWithZoneAndFarmer,
    });
  }

  public async findById(id: string): Promise<SeasonWithZoneAndFarmer | null> {
    return prisma.season.findUnique({
      where: { id },
      include: seasonWithZoneAndFarmer,
    });
  }

  public async findActiveByZoneId(farmZoneId: string): Promise<Season | null> {
    return prisma.season.findFirst({
      where: {
        farm_zone_id: farmZoneId,
        status: SeasonStatus.ACTIVE,
      },
    });
  }

  public async findAll(filters: { cooperativeId?: string; farmZoneId?: string; status?: SeasonStatus }): Promise<SeasonWithZoneAndFarmer[]> {
    const where: Prisma.SeasonWhereInput = {};

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
      include: seasonWithZoneAndFarmer,
      orderBy: {
        created_at: 'desc',
      },
    });
  }
}

export const seasonRepository = new SeasonRepository();
