import { CropType } from '@prisma/client';
import { farmZoneService } from './farm-zone.service';
import { farmZoneRepository } from './farm-zone.repository';
import { farmerRepository } from '../farmer/farmer.repository';
import { getRedisClient } from '../../shared/utils/redis.client';
import { AppError } from '../../shared/utils/app-error';

jest.mock('./farm-zone.repository');
jest.mock('../farmer/farmer.repository');
jest.mock('../../shared/utils/redis.client');

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();

const mockAdmin = {
  userId: 'admin-1',
  role: 'SUPER_ADMIN' as const,
  cooperativeId: null,
  farmerId: null,
  isFirstLogin: false,
};

const mockManager = {
  userId: 'manager-1',
  role: 'HTX_MANAGER' as const,
  cooperativeId: 'coop-1',
  farmerId: null,
  isFirstLogin: false,
};

const mockZone = {
  id: 'zone-1',
  farm_zone_code: 'ZONE-HTX-2026-0001',
  zone_name: 'Cánh đồng A',
  farmer_id: 'farmer-1',
  crop_type: CropType.RICE,
  boundary: {
    type: 'Polygon',
    coordinates: [[[108, 12], [108.001, 12], [108.001, 12.001], [108, 12.001], [108, 12]]],
  },
  area_sqm: 5000,
  description: null,
  is_active: true,
  deleted_at: null,
  farmer: {
    id: 'farmer-1',
    cooperative_id: 'coop-1',
    full_name: 'Nguyen Van A',
    cooperative: { id: 'coop-1', htx_code: 'HTX' },
  },
} as any;

const mockFarmer = {
  id: 'farmer-1',
  cooperative_id: 'coop-1',
  cooperative: { id: 'coop-1', htx_code: 'HTX' },
} as any;

describe('FarmZoneService — cache, area bounds, and delete protection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRedisGet.mockResolvedValue(null);
    mockRedisSet.mockResolvedValue('OK');
    mockRedisDel.mockResolvedValue(1);
    (getRedisClient as jest.Mock).mockResolvedValue({
      get: mockRedisGet,
      set: mockRedisSet,
      del: mockRedisDel,
    });
  });

  // ==================== CACHE TESTS ====================

  describe('getZones (list caching)', () => {
    it('returns cached list for SUPER_ADMIN', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify([mockZone]));

      const result = await farmZoneService.getZones(mockAdmin);

      expect(mockRedisGet).toHaveBeenCalledWith('farm-zones:list:all');
      expect(farmZoneRepository.findAll).not.toHaveBeenCalled();
      expect(result).toEqual([mockZone]);
    });

    it('queries DB and caches on miss for HTX_MANAGER', async () => {
      (farmZoneRepository.findAll as jest.Mock).mockResolvedValue([mockZone]);

      const result = await farmZoneService.getZones(mockManager);

      expect(farmZoneRepository.findAll).toHaveBeenCalledWith({
        cooperativeId: 'coop-1',
      });
      expect(mockRedisSet).toHaveBeenCalledWith(
        'farm-zones:list:coop:coop-1',
        JSON.stringify([mockZone]),
        { EX: 300 }
      );
      expect(result).toEqual([mockZone]);
    });

    it('skips cache when farmerId filter is provided', async () => {
      (farmZoneRepository.findAll as jest.Mock).mockResolvedValue([mockZone]);

      await farmZoneService.getZones(mockManager, 'farmer-1');

      expect(mockRedisGet).not.toHaveBeenCalled();
      expect(mockRedisSet).not.toHaveBeenCalled();
    });

    it('falls back to repository when Redis fails', async () => {
      mockRedisGet.mockRejectedValueOnce(new Error('Redis down'));
      (farmZoneRepository.findAll as jest.Mock).mockResolvedValue([mockZone]);

      const result = await farmZoneService.getZones(mockManager);

      expect(farmZoneRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockZone]);
    });
  });

  describe('getZoneById (detail caching)', () => {
    it('returns cached zone and still enforces RBAC', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(mockZone));

      const result = await farmZoneService.getZoneById('zone-1', mockManager);

      expect(mockRedisGet).toHaveBeenCalledWith('farm-zones:detail:zone-1');
      expect(farmZoneRepository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(mockZone);
    });

    it('throws FORBIDDEN on cached zone from another cooperative', async () => {
      const otherZone = { ...mockZone, farmer: { ...mockZone.farmer, cooperative_id: 'coop-other' } };
      mockRedisGet.mockResolvedValue(JSON.stringify(otherZone));

      await expect(farmZoneService.getZoneById('zone-1', mockManager)).rejects.toThrow(AppError);
    });
  });

  // ==================== BR-002-3: AREA BOUNDS ====================

  describe('createZone — BR-002-3 area bounds', () => {
    it('rejects area smaller than 100 m²', async () => {
      (farmerRepository.findById as jest.Mock).mockResolvedValue(mockFarmer);
      (farmZoneRepository.checkOverlap as jest.Mock).mockResolvedValue(null);
      (farmZoneRepository.calculateArea as jest.Mock).mockResolvedValue(50); // too small

      await expect(
        farmZoneService.createZone(
          { zone_name: 'Test', farmer_id: 'farmer-1', crop_type: CropType.RICE, boundary: mockZone.boundary },
          mockManager
        )
      ).rejects.toThrow('Diện tích vùng trồng quá nhỏ');
    });

    it('rejects area larger than 500 ha', async () => {
      (farmerRepository.findById as jest.Mock).mockResolvedValue(mockFarmer);
      (farmZoneRepository.checkOverlap as jest.Mock).mockResolvedValue(null);
      (farmZoneRepository.calculateArea as jest.Mock).mockResolvedValue(6_000_000); // too large

      await expect(
        farmZoneService.createZone(
          { zone_name: 'Test', farmer_id: 'farmer-1', crop_type: CropType.RICE, boundary: mockZone.boundary },
          mockManager
        )
      ).rejects.toThrow('Diện tích vùng trồng quá lớn');
    });
  });

  // ==================== BR-002-6: DELETE PROTECTION ====================

  describe('deleteZone / toggleZoneStatus — BR-002-6', () => {
    it('rejects delete when active season exists', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(mockZone));
      (farmZoneRepository.hasActiveSeasonOrBatch as jest.Mock).mockResolvedValue({ hasSeason: true, hasBatch: false });

      await expect(farmZoneService.deleteZone('zone-1', mockManager)).rejects.toThrow('Không thể khóa/xóa vùng trồng đang có vụ mùa hoạt động');
      expect(farmZoneRepository.delete).not.toHaveBeenCalled();
    });

    it('rejects deactivate when active batch exists', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(mockZone));
      (farmZoneRepository.hasActiveSeasonOrBatch as jest.Mock).mockResolvedValue({ hasSeason: false, hasBatch: true });

      await expect(farmZoneService.toggleZoneStatus('zone-1', mockManager)).rejects.toThrow('Không thể khóa/xóa vùng trồng đang có lô hàng chưa hoàn tất');
      expect(farmZoneRepository.update).not.toHaveBeenCalled();
    });

    it('allows delete when no active dependencies', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(mockZone));
      (farmZoneRepository.hasActiveSeasonOrBatch as jest.Mock).mockResolvedValue({ hasSeason: false, hasBatch: false });
      (farmZoneRepository.delete as jest.Mock).mockResolvedValue({ id: 'zone-1' });

      await farmZoneService.deleteZone('zone-1', mockManager);

      expect(farmZoneRepository.delete).toHaveBeenCalledWith('zone-1');
      expect(mockRedisDel).toHaveBeenCalledWith('farm-zones:list:all');
    });
  });

  // ==================== CACHE INVALIDATION ====================

  describe('cache invalidation on write', () => {
    it('invalidates caches after successful create', async () => {
      (farmerRepository.findById as jest.Mock).mockResolvedValue(mockFarmer);
      (farmZoneRepository.checkOverlap as jest.Mock).mockResolvedValue(null);
      (farmZoneRepository.calculateArea as jest.Mock).mockResolvedValue(5000);
      (farmZoneRepository.findLastByCodePrefix as jest.Mock).mockResolvedValue(null);
      (farmZoneRepository.create as jest.Mock).mockResolvedValue(mockZone);

      await farmZoneService.createZone(
        { zone_name: 'Cánh đồng A', farmer_id: 'farmer-1', crop_type: CropType.RICE, boundary: mockZone.boundary },
        mockManager
      );

      expect(mockRedisDel).toHaveBeenCalledWith('farm-zones:list:all');
      expect(mockRedisDel).toHaveBeenCalledWith('farm-zones:list:coop:coop-1');
    });
  });
});
