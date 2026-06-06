import prisma from '../../prisma/client';

export class FarmingLogRepository {
  public async create(data: any): Promise<any> {
    return prisma.farmingLog.create({
      data,
      include: {
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
      },
    });
  }

  public async update(id: string, data: any): Promise<any> {
    return prisma.farmingLog.update({
      where: { id },
      data,
      include: {
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
      },
    });
  }

  public async findById(id: string): Promise<any | null> {
    return prisma.farmingLog.findUnique({
      where: { id },
      include: {
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
      },
    });
  }

  public async findAll(filters: { cooperativeId?: string; seasonId?: string }): Promise<any[]> {
    const where: any = {};

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
      include: {
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
      },
      orderBy: {
        activity_date: 'desc',
      },
    });
  }

  public async delete(id: string): Promise<any> {
    return prisma.farmingLog.delete({
      where: { id },
    });
  }
}

export const farmingLogRepository = new FarmingLogRepository();
