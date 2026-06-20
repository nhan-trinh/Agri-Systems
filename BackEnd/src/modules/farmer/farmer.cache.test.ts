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

describe('Farmer Service Caching and Onboarding', () => {
  const mockUserAdmin = {
    userId: 'admin-1',
    role: 'SUPER_ADMIN' as const,
    cooperativeId: null,
    farmerId: null,
    isFirstLogin: false,
  };
  const mockUserCoop = {
    userId: 'manager-1',
    role: 'HTX_MANAGER' as const,
    cooperativeId: 'coop-1',
    farmerId: null,
    isFirstLogin: false,
  };
  const mockUserFarmer = {
    userId: 'farmer-user-1',
    role: 'FARMER' as const,
    cooperativeId: 'coop-1',
    farmerId: 'farmer-1',
    isFirstLogin: false,
  };

  const mockFarmer = {
    id: 'farmer-1',
    full_name: 'Nguyen Van A',
    phone: '0987654321',
    farmer_code: 'HTX-2026-0001',
    cooperative_id: 'coop-1',
    is_active: true,
    national_id: null,
    address: 'XYZ',
  } as any;

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

  describe('getAllFarmers', () => {
    it('returns cached list if available for SUPER_ADMIN', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify([mockFarmer]));

      const result = await farmerService.getAllFarmers(mockUserAdmin);

      expect(mockRedisGet).toHaveBeenCalledWith('farmers:list:all');
      expect(farmerRepository.findAll).not.toHaveBeenCalled();
      expect(result.data).toEqual([mockFarmer]);
    });

    it('queries DB and sets cache if cache miss for HTX_MANAGER', async () => {
      (farmerRepository.findAll as jest.Mock).mockResolvedValue([mockFarmer]);

      const result = await farmerService.getAllFarmers(mockUserCoop);

      expect(farmerRepository.findAll).toHaveBeenCalledWith({
        cooperativeId: 'coop-1',
        isActive: undefined,
        search: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });
      expect(mockRedisSet).toHaveBeenCalledWith(
        'farmers:list:coop:coop-1',
        JSON.stringify([mockFarmer]),
        { EX: 300 }
      );
      expect(result.data).toEqual([mockFarmer]);
    });

    it('returns paginated metadata when page or limit is requested', async () => {
      (farmerRepository.findAll as jest.Mock).mockResolvedValue([mockFarmer]);
      (farmerRepository.count as jest.Mock).mockResolvedValue(21);

      const result = await farmerService.getAllFarmers(mockUserAdmin, { page: 2, limit: 10 });

      expect(farmerRepository.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 })
      );
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 21,
        total_pages: 3,
      });
    });

    it('redacts sensitive fields for GOV_VIEWER', async () => {
      const govUser = { ...mockUserAdmin, role: 'GOV_VIEWER' as const };
      (farmerRepository.findAll as jest.Mock).mockResolvedValue([mockFarmer]);

      const result = await farmerService.getAllFarmers(govUser);

      expect(result.data[0].phone).toBe('');
      expect(result.data[0].national_id).toBeNull();
      expect(result.data[0].address).toBe('');
    });
  });

  describe('getFarmerById', () => {
    it('returns cached detail and enforces RBAC validation', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(mockFarmer));

      const result = await farmerService.getFarmerById('farmer-1', mockUserCoop);

      expect(mockRedisGet).toHaveBeenCalledWith('farmers:detail:farmer-1');
      expect(farmerRepository.findById).not.toHaveBeenCalled();
      expect(result).toEqual(mockFarmer);
    });

    it('throws FORBIDDEN if manager accesses farmer from another coop', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify({ ...mockFarmer, cooperative_id: 'coop-other' }));

      await expect(farmerService.getFarmerById('farmer-1', mockUserCoop)).rejects.toThrow(AppError);
    });

    it('allows a FARMER user to access only their own profile', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(mockFarmer));

      const result = await farmerService.getFarmerById('farmer-1', mockUserFarmer);

      expect(result).toEqual(mockFarmer);
    });
  });

  describe('createFarmer / updateFarmer / toggleFarmerStatus', () => {
    it('creates farmer and linked FARMER user through repository transaction', async () => {
      (cooperativeRepository.findById as jest.Mock).mockResolvedValue({
        id: 'coop-1',
        htx_code: 'HTX',
        is_active: true,
      });
      (farmerRepository.findByPhone as jest.Mock).mockResolvedValue(null);
      (farmerRepository.findUserByPhone as jest.Mock).mockResolvedValue(null);
      (farmerRepository.countByCooperativeAndYear as jest.Mock).mockResolvedValue(0);
      (farmerRepository.createWithFarmerUser as jest.Mock).mockResolvedValue(mockFarmer);

      await farmerService.createFarmer(
        { full_name: 'A', phone: '0987654321', cooperative_id: 'coop-1', address: 'XYZ' },
        mockUserCoop
      );

      expect(farmerRepository.createWithFarmerUser).toHaveBeenCalledWith(
        expect.objectContaining({
          farmer_code: expect.stringMatching(/^HTX-\d{4}-0001$/),
          phone: '0987654321',
          cooperative_id: 'coop-1',
        })
      );
      expect(mockRedisDel).toHaveBeenCalledWith('farmers:list:all');
      expect(mockRedisDel).toHaveBeenCalledWith('farmers:list:coop:coop-1');
    });

    it('rejects duplicate phone already used by a User account', async () => {
      (cooperativeRepository.findById as jest.Mock).mockResolvedValue({
        id: 'coop-1',
        htx_code: 'HTX',
        is_active: true,
      });
      (farmerRepository.findByPhone as jest.Mock).mockResolvedValue(null);
      (farmerRepository.findUserByPhone as jest.Mock).mockResolvedValue({ id: 'user-existing' });

      await expect(
        farmerService.createFarmer(
          { full_name: 'A', phone: '0987654321', cooperative_id: 'coop-1', address: 'XYZ' },
          mockUserCoop
        )
      ).rejects.toThrow(AppError);
    });

    it('invalidates list and detail cache when updating farmer profile', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(mockFarmer));
      (farmerRepository.update as jest.Mock).mockResolvedValue(mockFarmer);

      await farmerService.updateFarmer('farmer-1', { full_name: 'New Name' }, mockUserCoop);

      expect(mockRedisDel).toHaveBeenCalledWith('farmers:detail:farmer-1');
      expect(mockRedisDel).toHaveBeenCalledWith('farmers:list:all');
      expect(mockRedisDel).toHaveBeenCalledWith('farmers:list:coop:coop-1');
    });

    it('syncs linked user status when toggling farmer status', async () => {
      mockRedisGet.mockResolvedValue(JSON.stringify(mockFarmer));
      (farmerRepository.updateStatusWithUser as jest.Mock).mockResolvedValue({
        ...mockFarmer,
        is_active: false,
      });

      const result = await farmerService.toggleFarmerStatus('farmer-1', mockUserCoop);

      expect(farmerRepository.updateStatusWithUser).toHaveBeenCalledWith('farmer-1', false);
      expect(result.is_active).toBe(false);
    });
  });
});
