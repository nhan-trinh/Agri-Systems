import { farmerService } from './farmer.service';
import { farmerRepository } from './farmer.repository';
import { cooperativeRepository } from '../cooperative/cooperative.repository';
import { getRedisClient } from '../../shared/utils/redis.client';
import { AppError } from '../../shared/utils/app-error';

jest.mock('./farmer.repository');
jest.mock('../cooperative/cooperative.repository');
jest.mock('../../shared/utils/redis.client');

const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();

describe('Farmer Service Caching', () => {
  const mockUserAdmin = { id: 'admin-1', role: 'SUPER_ADMIN' };
  const mockUserCoop = { id: 'manager-1', role: 'HTX_MANAGER', cooperativeId: 'coop-1' };
  
  const mockFarmer = {
    id: 'farmer-1',
    full_name: 'Nguyen Van A',
    phone: '0987654321',
    farmer_code: 'HTX-2026-0001',
    cooperative_id: 'coop-1',
    is_active: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getRedisClient as jest.Mock).mockResolvedValue({
      get: mockRedisGet,
      set: mockRedisSet,
      del: mockRedisDel,
    });
  });

  describe('getAllFarmers', () => {
    it('should return cached list if available (SUPER_ADMIN)', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify([mockFarmer]));
      
      const result = await farmerService.getAllFarmers(mockUserAdmin);
      
      expect(mockRedisGet).toHaveBeenCalledWith('farmers:list:all');
      expect(farmerRepository.findAll).not.toHaveBeenCalled();
      expect(result).toEqual([mockFarmer]);
    });

    it('should query DB and set cache if cache miss (HTX_MANAGER)', async () => {
      mockRedisGet.mockResolvedValue(null);
      (farmerRepository.findAll as jest.Mock).mockResolvedValue([mockFarmer]);

      const result = await farmerService.getAllFarmers(mockUserCoop);

      expect(mockRedisGet).toHaveBeenCalledWith('farmers:list:coop:coop-1');
      expect(farmerRepository.findAll).toHaveBeenCalledWith('coop-1');
      expect(mockRedisSet).toHaveBeenCalledWith(
        'farmers:list:coop:coop-1',
        JSON.stringify([mockFarmer]),
        { EX: 300 }
      );
      expect(result).toEqual([mockFarmer]);
    });

    it('should fallback to DB if Redis fails', async () => {
      mockRedisGet.mockRejectedValue(new Error('Redis Down'));
      (farmerRepository.findAll as jest.Mock).mockResolvedValue([mockFarmer]);

      const result = await farmerService.getAllFarmers(mockUserAdmin);

      expect(farmerRepository.findAll).toHaveBeenCalled();
      expect(result).toEqual([mockFarmer]);
    });
  });

  describe('getFarmerById', () => {
    it('should return cached detail and enforce RBAC validation', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(mockFarmer));

      const result = await farmerService.getFarmerById('farmer-1', mockUserCoop);

      expect(mockRedisGet).toHaveBeenCalledWith('farmers:detail:farmer-1');
      expect(farmerRepository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(mockFarmer);
    });

    it('should query DB, set cache and check RBAC if cache miss', async () => {
      mockRedisGet.mockResolvedValue(null);
      (farmerRepository.findById as jest.Mock).mockResolvedValue(mockFarmer);

      const result = await farmerService.getFarmerById('farmer-1', mockUserCoop);

      expect(farmerRepository.findById).toHaveBeenCalledWith('farmer-1');
      expect(mockRedisSet).toHaveBeenCalledWith(
        'farmers:detail:farmer-1',
        JSON.stringify(mockFarmer),
        { EX: 300 }
      );
      expect(result).toEqual(mockFarmer);
    });

    it('should throw FORBIDDEN if manager accesses farmer from another coop', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify({ ...mockFarmer, cooperative_id: 'coop-other' }));

      await expect(farmerService.getFarmerById('farmer-1', mockUserCoop)).rejects.toThrow(AppError);
    });
  });

  describe('createFarmer / updateFarmer / toggleFarmerStatus', () => {
    it('should invalidate list cache when creating farmer', async () => {
      (cooperativeRepository.findById as jest.Mock).mockResolvedValue({ htx_code: 'HTX' });
      (farmerRepository.findByPhone as jest.Mock).mockResolvedValue(null);
      (farmerRepository.countByCooperativeAndYear as jest.Mock).mockResolvedValue(0);
      (farmerRepository.create as jest.Mock).mockResolvedValue(mockFarmer);

      await farmerService.createFarmer(
        { full_name: 'A', phone: '0987654321', cooperative_id: 'coop-1', address: 'XYZ' },
        mockUserCoop
      );

      expect(mockRedisDel).toHaveBeenCalledWith('farmers:list:all');
      expect(mockRedisDel).toHaveBeenCalledWith('farmers:list:coop:coop-1');
    });

    it('should invalidate list and detail cache when updating farmer', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(mockFarmer)); // getFarmerById
      (farmerRepository.update as jest.Mock).mockResolvedValue(mockFarmer);

      await farmerService.updateFarmer('farmer-1', { full_name: 'New Name' }, mockUserCoop);

      expect(mockRedisDel).toHaveBeenCalledWith('farmers:detail:farmer-1');
      expect(mockRedisDel).toHaveBeenCalledWith('farmers:list:all');
      expect(mockRedisDel).toHaveBeenCalledWith('farmers:list:coop:coop-1');
    });
  });
});
