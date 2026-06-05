import prisma from '../../prisma/client';
import { Farmer, Prisma } from '@prisma/client';

export class FarmerRepository {
  async findAll(cooperativeId?: string): Promise<Farmer[]> {
    return prisma.farmer.findMany({
      where: {
        cooperative_id: cooperativeId,
      },
      include: {
        cooperative: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string): Promise<Farmer | null> {
    return prisma.farmer.findUnique({
      where: { id },
      include: {
        cooperative: true,
      },
    });
  }

  async findByPhone(phone: string): Promise<Farmer | null> {
    return prisma.farmer.findUnique({
      where: { phone },
    });
  }

  async findByFarmerCode(farmer_code: string): Promise<Farmer | null> {
    return prisma.farmer.findUnique({
      where: { farmer_code },
    });
  }

  async countByCooperativeAndYear(cooperativeId: string, year: number): Promise<number> {
    const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59.999Z`);
    return prisma.farmer.count({
      where: {
        cooperative_id: cooperativeId,
        created_at: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
    });
  }

  async create(data: Prisma.FarmerCreateInput): Promise<Farmer> {
    return prisma.farmer.create({
      data,
    });
  }

  async update(id: string, data: Prisma.FarmerUpdateInput): Promise<Farmer> {
    return prisma.farmer.update({
      where: { id },
      data,
    });
  }
}

export const farmerRepository = new FarmerRepository();
