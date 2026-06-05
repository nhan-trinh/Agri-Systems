import prisma from '../../prisma/client';
import { Cooperative, Prisma } from '@prisma/client';

export class CooperativeRepository {
  async findAll(): Promise<Cooperative[]> {
    return prisma.cooperative.findMany({
      orderBy: { created_at: 'desc' },
    });
  }

  async findById(id: string): Promise<Cooperative | null> {
    return prisma.cooperative.findUnique({
      where: { id },
    });
  }

  async findByHtxCode(htx_code: string): Promise<Cooperative | null> {
    return prisma.cooperative.findUnique({
      where: { htx_code },
    });
  }

  async create(data: Prisma.CooperativeCreateInput): Promise<Cooperative> {
    return prisma.cooperative.create({
      data,
    });
  }

  async update(id: string, data: Prisma.CooperativeUpdateInput): Promise<Cooperative> {
    return prisma.cooperative.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Cooperative> {
    return prisma.cooperative.update({
      where: { id },
      data: { is_active: false },
    });
  }
}

export const cooperativeRepository = new CooperativeRepository();
