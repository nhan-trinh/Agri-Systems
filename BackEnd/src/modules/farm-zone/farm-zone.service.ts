import { farmZoneRepository, CreateFarmZoneInput, UpdateFarmZoneInput } from './farm-zone.repository';
import { farmerRepository } from '../farmer/farmer.repository';
import { AppError } from '../../shared/utils/app-error';
import prisma from '../../prisma/client';

export class FarmZoneService {
  public async getZones(user: any, farmerId?: string): Promise<any[]> {
    const filters: { cooperativeId?: string; farmerId?: string } = {};
    
    if (farmerId) {
      filters.farmerId = farmerId;
    }
    
    if (user.role === 'HTX_MANAGER') {
      filters.cooperativeId = user.cooperativeId;
    }

    return farmZoneRepository.findAll(filters);
  }

  public async getZoneById(id: string, user: any): Promise<any> {
    const zone = await farmZoneRepository.findById(id);
    if (!zone) {
      throw new AppError('FARM_ZONE_NOT_FOUND', 404, 'Không tìm thấy vùng trồng');
    }

    // Role boundary checks
    if (user.role === 'HTX_MANAGER' && zone.farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập vùng trồng này');
    }

    return zone;
  }

  public async createZone(data: any, user: any): Promise<any> {
    const { zone_name, farmer_id, crop_type, boundary, description } = data;

        // 1. Verify farmer exists and belongs to the manager's cooperative if role is HTX_MANAGER
    const farmer = await farmerRepository.findById(farmer_id) as any;
    if (!farmer) {
      throw new AppError('FARMER_NOT_FOUND', 404, 'Không tìm thấy nông dân tương ứng');
    }

    if (user.role === 'HTX_MANAGER' && farmer.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn chỉ được phép tạo vùng trồng cho nông dân thuộc hợp tác xã của mình');
    }

    // 2. Spatial Overlap Detection
    const overlap = await farmZoneRepository.checkOverlap(boundary);
    if (overlap) {
      throw new AppError(
        'FARM_ZONE_OVERLAP',
        400,
        `Vùng trồng bị chồng lấn ranh giới với vùng trồng "${overlap.zone_name}"`
      );
    }

    // 3. PostGIS Area Calculation
    const areaSqm = await farmZoneRepository.calculateArea(boundary);
    if (areaSqm <= 0) {
      throw new AppError('FARM_ZONE_INVALID_AREA', 400, 'Diện tích vùng trồng không hợp lệ');
    }

    // 4. Generate unique farm_zone_code: ZONE-HTX_CODE-YYYY-NNNN
    const currentYear = new Date().getFullYear();
    const prefix = `ZONE-${farmer.cooperative.htx_code}-${currentYear}-`;
    
    // Find last serial number to avoid collisions
    const lastZone = await prisma.farmZone.findFirst({
      where: {
        farm_zone_code: {
          startsWith: prefix,
        },
      },
      orderBy: {
        farm_zone_code: 'desc',
      },
    });

    let nextSerial = 1;
    if (lastZone) {
      const parts = lastZone.farm_zone_code.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSerial = lastSeq + 1;
      }
    }

    const farmZoneCode = `${prefix}${String(nextSerial).padStart(4, '0')}`;

    const input: CreateFarmZoneInput = {
      farm_zone_code: farmZoneCode,
      zone_name,
      farmer_id,
      crop_type,
      boundary,
      area_sqm: areaSqm,
      description,
    };

    return farmZoneRepository.create(input);
  }

  public async updateZone(id: string, data: any, user: any): Promise<any> {
    const existingZone = await this.getZoneById(id, user);

    const updatePayload: UpdateFarmZoneInput = {};

    if (data.zone_name !== undefined) {
      updatePayload.zone_name = data.zone_name;
    }

    if (data.crop_type !== undefined) {
      updatePayload.crop_type = data.crop_type;
    }

    if (data.description !== undefined) {
      updatePayload.description = data.description;
    }

    if (data.farmer_id !== undefined && data.farmer_id !== existingZone.farmer_id) {
      // Verify new farmer exists and belongs to the same HTX if HTX Manager
      const newFarmer = await farmerRepository.findById(data.farmer_id);
      if (!newFarmer) {
        throw new AppError('FARMER_NOT_FOUND', 404, 'Không tìm thấy nông dân tương ứng');
      }
      if (user.role === 'HTX_MANAGER' && newFarmer.cooperative_id !== user.cooperativeId) {
        throw new AppError('FORBIDDEN', 403, 'Bạn chỉ được phép gán vùng trồng cho nông dân thuộc hợp tác xã của mình');
      }
      updatePayload.farmer_id = data.farmer_id;
    }

    if (data.boundary !== undefined) {
      // 1. Spatial Overlap Detection (excluding this zone itself)
      const overlap = await farmZoneRepository.checkOverlap(data.boundary, id);
      if (overlap) {
        throw new AppError(
          'FARM_ZONE_OVERLAP',
          400,
          `Vùng trồng bị chồng lấn ranh giới với vùng trồng "${overlap.zone_name}"`
        );
      }

      // 2. PostGIS Area Recalculation
      const areaSqm = await farmZoneRepository.calculateArea(data.boundary);
      if (areaSqm <= 0) {
        throw new AppError('FARM_ZONE_INVALID_AREA', 400, 'Diện tích vùng trồng không hợp lệ');
      }

      updatePayload.boundary = data.boundary;
      updatePayload.area_sqm = areaSqm;
    }

    return farmZoneRepository.update(id, updatePayload);
  }

  public async toggleZoneStatus(id: string, user: any): Promise<any> {
    const zone = await this.getZoneById(id, user);
    
    return farmZoneRepository.update(id, {
      is_active: !zone.is_active,
    });
  }

  public async deleteZone(id: string, user: any): Promise<any> {
    await this.getZoneById(id, user);
    return farmZoneRepository.delete(id);
  }

  public async checkOverlapAndCalculate(boundary: any, excludeId?: string): Promise<{ overlaps: boolean; zoneName?: string; areaSqm: number }> {
    const areaSqm = await farmZoneRepository.calculateArea(boundary);
    const overlap = await farmZoneRepository.checkOverlap(boundary, excludeId);
    
    return {
      overlaps: !!overlap,
      zoneName: overlap?.zone_name,
      areaSqm,
    };
  }
}

export const farmZoneService = new FarmZoneService();
