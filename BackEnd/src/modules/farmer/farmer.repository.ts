import prisma from '../../prisma/client';
import { Farmer, Prisma, User, UserRole } from '@prisma/client';

export interface FarmerListOptions {
  cooperativeId?: string;
  isActive?: boolean;
  search?: string;
  skip?: number;
  take?: number;
  sortBy?: 'created_at' | 'updated_at' | 'full_name' | 'farmer_code';
  sortOrder?: 'asc' | 'desc';
}

export class FarmerRepository {
  private buildWhere(options: FarmerListOptions = {}): Prisma.FarmerWhereInput {
    return {
      ...(options.cooperativeId && { cooperative_id: options.cooperativeId }),
      ...(options.isActive !== undefined && { is_active: options.isActive }),
      ...(options.search && {
        OR: [
          { full_name: { contains: options.search, mode: 'insensitive' } },
          { farmer_code: { contains: options.search, mode: 'insensitive' } },
          { phone: { contains: options.search, mode: 'insensitive' } },
        ],
      }),
    };
  }

  async findAll(options: FarmerListOptions = {}): Promise<Farmer[]> {
    return prisma.farmer.findMany({
      where: this.buildWhere(options),
      include: {
        cooperative: true,
      },
      orderBy: { [options.sortBy || 'created_at']: options.sortOrder || 'desc' },
      ...(options.skip !== undefined && { skip: options.skip }),
      ...(options.take !== undefined && { take: options.take }),
    });
  }

  async count(options: FarmerListOptions = {}): Promise<number> {
    return prisma.farmer.count({
      where: this.buildWhere(options),
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

  async findUserByPhone(phone: string): Promise<User | null> {
    return prisma.user.findUnique({
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

  async create(data: Prisma.FarmerUncheckedCreateInput): Promise<Farmer> {
    return prisma.farmer.create({
      data,
    });
  }

  async createWithFarmerUser(data: Prisma.FarmerUncheckedCreateInput): Promise<Farmer> {
    return prisma.$transaction(async (tx) => {
      const farmer = await tx.farmer.create({
        data,
        include: {
          cooperative: true,
        },
      });

      await tx.user.create({
        data: {
          phone: farmer.phone,
          password_hash: null,
          role: UserRole.FARMER,
          cooperative_id: farmer.cooperative_id,
          farmer_id: farmer.id,
          display_name: farmer.full_name, // P0 fix: mirror Farmer.full_name so FARMER users have a display name
          is_first_login: false,
          is_active: farmer.is_active,
        },
      });

      return farmer;
    });
  }

  async update(id: string, data: Prisma.FarmerUncheckedUpdateInput): Promise<Farmer> {
    return prisma.farmer.update({
      where: { id },
      data,
      include: {
        cooperative: true,
      },
    });
  }

  async updateStatusWithUser(id: string, isActive: boolean): Promise<Farmer> {
    return prisma.$transaction(async (tx) => {
      const farmer = await tx.farmer.update({
        where: { id },
        data: {
          is_active: isActive,
          deleted_at: isActive ? null : new Date(),
        },
        include: {
          cooperative: true,
        },
      });

      await tx.user.updateMany({
        where: { farmer_id: id },
        data: { is_active: isActive },
      });

      return farmer;
    });
  }
}

export const farmerRepository = new FarmerRepository();
