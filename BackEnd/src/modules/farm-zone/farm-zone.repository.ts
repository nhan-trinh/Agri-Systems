import prisma from '../../prisma/client';
import { CropType, FarmZone } from '@prisma/client';

export interface CreateFarmZoneInput {
  farm_zone_code: string;
  zone_name: string;
  farmer_id: string;
  crop_type: CropType;
  boundary: any;
  area_sqm: number;
  description?: string;
}

export interface UpdateFarmZoneInput {
  zone_name?: string;
  farmer_id?: string;
  crop_type?: CropType;
  boundary?: any;
  area_sqm?: number;
  description?: string;
  is_active?: boolean;
}

export class FarmZoneRepository {
  public async calculateArea(boundary: any): Promise<number> {
    try {
      const boundaryStr = JSON.stringify(boundary);
      const result = await prisma.$queryRaw<any[]>`
        SELECT ST_Area(ST_GeomFromGeoJSON(${boundaryStr})::geography) AS area;
      `;
      const area = result[0]?.area;
      return area ? parseFloat(area) : 0;
    } catch (error: any) {
      throw new Error(`Lỗi tính toán diện tích vùng trồng: ${error.message}`);
    }
  }

  public async checkOverlap(boundary: any, excludeId?: string): Promise<{ id: string; zone_name: string } | null> {
    try {
      const boundaryStr = JSON.stringify(boundary);
      // Query checks if there is any active farm zone where the intersection area with the new boundary is > 1.0 sqm
      const result = await prisma.$queryRaw<any[]>`
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
    } catch (error: any) {
      throw new Error(`Lỗi kiểm tra chồng lấn ranh giới: ${error.message}`);
    }
  }

  public async create(data: CreateFarmZoneInput): Promise<any> {
    return prisma.farmZone.create({
      data,
      include: {
        farmer: {
          include: {
            cooperative: true,
          },
        },
      },
    });
  }

  public async update(id: string, data: UpdateFarmZoneInput): Promise<any> {
    return prisma.farmZone.update({
      where: { id },
      data,
      include: {
        farmer: {
          include: {
            cooperative: true,
          },
        },
      },
    });
  }

  public async findById(id: string): Promise<any | null> {
    return prisma.farmZone.findFirst({
      where: { 
        id,
        deleted_at: null 
      },
      include: {
        farmer: {
          include: {
            cooperative: true,
          },
        },
      },
    });
  }

  public async findByCode(code: string): Promise<any | null> {
    return prisma.farmZone.findFirst({
      where: {
        farm_zone_code: code,
        deleted_at: null,
      },
      include: {
        farmer: {
          include: {
            cooperative: true,
          },
        },
      },
    });
  }

  public async findAll(filters: { cooperativeId?: string; farmerId?: string }): Promise<any[]> {
    const where: any = { deleted_at: null };
    
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
      include: {
        farmer: {
          include: {
            cooperative: true,
          },
        },
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  public async delete(id: string): Promise<any> {
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
