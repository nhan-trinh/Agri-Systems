import prisma from '../../prisma/client';
import { CropType, FarmZone, Prisma } from '@prisma/client';

// ==================== TYPES ====================

const farmZoneWithFarmer = {
  farmer: {
    include: {
      cooperative: true,
    },
  },
} satisfies Prisma.FarmZoneInclude;

export type FarmZoneWithFarmer = Prisma.FarmZoneGetPayload<{
  include: typeof farmZoneWithFarmer;
}>;

export interface CreateFarmZoneInput {
  farm_zone_code: string;
  zone_name: string;
  farmer_id: string;
  crop_type: CropType;
  boundary: Prisma.InputJsonValue;
  area_sqm: number;
  description?: string;
}

export interface UpdateFarmZoneInput {
  zone_name?: string;
  farmer_id?: string;
  crop_type?: CropType;
  boundary?: Prisma.InputJsonValue;
  area_sqm?: number;
  description?: string;
  is_active?: boolean;
}

// ==================== REPOSITORY ====================

export class FarmZoneRepository {
  public async calculateArea(boundary: Prisma.InputJsonValue): Promise<number> {
    try {
      const boundaryStr = JSON.stringify(boundary);
      const result = await prisma.$queryRaw<{ area: number }[]>`
        SELECT ST_Area(ST_GeomFromGeoJSON(${boundaryStr})::geography) AS area;
      `;
      const area = result[0]?.area;
      return area ? parseFloat(String(area)) : 0;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Lỗi tính toán diện tích vùng trồng: ${message}`);
    }
  }

  public async checkOverlap(boundary: Prisma.InputJsonValue, excludeId?: string): Promise<{ id: string; zone_name: string } | null> {
    try {
      const boundaryStr = JSON.stringify(boundary);
      const result = await prisma.$queryRaw<{ id: string; zone_name: string }[]>`
        SELECT id, zone_name 
        FROM "FarmZone"
        WHERE is_active = true
          AND deleted_at IS NULL
          AND id != ${excludeId || ''}
          AND ST_Area(
            ST_Intersection(
              ST_GeomFromGeoJSON(boundary::text),
              ST_GeomFromGeoJSON(${boundaryStr})
            )::geography
          ) > 1.0
        LIMIT 1;
      `;
      return result.length > 0 ? { id: result[0].id, zone_name: result[0].zone_name } : null;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Lỗi kiểm tra chồng lấn ranh giới: ${message}`);
    }
  }

  public async findLastByCodePrefix(prefix: string): Promise<FarmZone | null> {
    return prisma.farmZone.findFirst({
      where: {
        farm_zone_code: { startsWith: prefix },
      },
      orderBy: { farm_zone_code: 'desc' },
    });
  }

  public async hasActiveSeasonOrBatch(farmZoneId: string): Promise<{ hasSeason: boolean; hasBatch: boolean }> {
    const [activeSeason, activeBatch] = await Promise.all([
      prisma.season.findFirst({
        where: { farm_zone_id: farmZoneId, status: 'ACTIVE' },
        select: { id: true },
      }),
      prisma.batch.findFirst({
        where: {
          season: { farm_zone_id: farmZoneId },
          status: { in: ['DRAFT', 'PENDING_QR', 'QR_RECEIVED', 'ACTIVATING', 'ACTIVE'] },
        },
        select: { id: true },
      }),
    ]);

    return {
      hasSeason: !!activeSeason,
      hasBatch: !!activeBatch,
    };
  }

  public async create(data: CreateFarmZoneInput): Promise<FarmZoneWithFarmer> {
    return prisma.farmZone.create({
      data,
      include: farmZoneWithFarmer,
    });
  }

  public async update(id: string, data: UpdateFarmZoneInput): Promise<FarmZoneWithFarmer> {
    return prisma.farmZone.update({
      where: { id },
      data,
      include: farmZoneWithFarmer,
    });
  }

  public async findById(id: string): Promise<FarmZoneWithFarmer | null> {
    return prisma.farmZone.findFirst({
      where: { 
        id,
        deleted_at: null 
      },
      include: farmZoneWithFarmer,
    });
  }

  public async findByCode(code: string): Promise<FarmZoneWithFarmer | null> {
    return prisma.farmZone.findFirst({
      where: {
        farm_zone_code: code,
        deleted_at: null,
      },
      include: farmZoneWithFarmer,
    });
  }

  public async findAll(filters: { cooperativeId?: string; farmerId?: string }): Promise<FarmZoneWithFarmer[]> {
    const where: Prisma.FarmZoneWhereInput = { deleted_at: null };
    
    if (filters.farmerId) {
      where.farmer_id = filters.farmerId;
    }
    
    if (filters.cooperativeId) {
      where.farmer = {
        cooperative_id: filters.cooperativeId,
      };
    }

    return prisma.farmZone.findMany({
      where,
      include: farmZoneWithFarmer,
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  public async delete(id: string): Promise<FarmZone> {
    return prisma.farmZone.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        is_active: false,
      },
    });
  }
}

export const farmZoneRepository = new FarmZoneRepository();
