import prisma from '../../prisma/client';
import { EmissionFactor, Prisma } from '@prisma/client';

export class CarbonRepository {
  async findAll(): Promise<EmissionFactor[]> {
    return prisma.emissionFactor.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string): Promise<EmissionFactor | null> {
    return prisma.emissionFactor.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.EmissionFactorCreateInput): Promise<EmissionFactor> {
    return prisma.emissionFactor.create({
      data,
    });
  }

  async update(id: string, data: Prisma.EmissionFactorUpdateInput): Promise<EmissionFactor> {
    return prisma.emissionFactor.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<EmissionFactor> {
    return prisma.emissionFactor.delete({
      where: { id },
    });
  }
}

export const carbonRepository = new CarbonRepository();
