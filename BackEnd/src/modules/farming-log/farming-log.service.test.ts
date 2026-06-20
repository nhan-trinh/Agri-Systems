import { farmingLogService } from './farming-log.service';
import { farmingLogRepository } from './farming-log.repository';
import { seasonRepository } from '../season/season.repository';
import { seasonService } from '../season/season.service';
import { AppError } from '../../shared/utils/app-error';
import { ActivityType, SeasonStatus } from '@prisma/client';
import prisma from '../../prisma/client';

jest.mock('./farming-log.repository');
jest.mock('../season/season.repository');
jest.mock('../season/season.service');
jest.mock('../../prisma/client', () => ({
  __esModule: true,
  default: {
    material: {
      findUnique: jest.fn(),
    },
  },
}));

const mockUser = {
  userId: 'user-1',
  role: 'HTX_MANAGER' as const,
  cooperativeId: 'coop-1',
  farmerId: null,
  isFirstLogin: false,
};

const mockSeason = {
  id: 'season-1',
  farm_zone_id: 'zone-1',
  season_name: 'Vụ lúa 2026',
  crop_variety: 'ST25',
  start_date: new Date('2026-01-01'),
  expected_end_date: new Date('2026-06-01'),
  status: SeasonStatus.ACTIVE,
  farm_zone: {
    farmer: {
      cooperative_id: 'coop-1',
    },
  },
} as any;

const mockMaterial = {
  id: 'mat-1',
  cooperative_id: 'coop-1',
  material_name: 'Phân đạm Ure chuẩn',
  material_type: 'FERTILIZER',
  unit: 'kg',
} as any;

describe('FarmingLogService — material linkage and auto-completion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createLog with material_id', () => {
    it('successfully links a material and auto-fills fertilizer_type', async () => {
      (seasonRepository.findById as jest.Mock).mockResolvedValue(mockSeason);
      (prisma.material.findUnique as jest.Mock).mockResolvedValue(mockMaterial);
      (farmingLogRepository.create as jest.Mock).mockResolvedValue({ id: 'log-1' });

      const logData = {
        season_id: 'season-1',
        activity_date: '2026-03-01',
        activity_type: ActivityType.FERTILIZING,
        material_id: 'mat-1',
        quantity_kg: 50,
      };

      await farmingLogService.createLog(logData, mockUser);

      // Verify material lookup
      expect(prisma.material.findUnique).toHaveBeenCalledWith({
        where: { id: 'mat-1' },
      });

      // Verify farmingLogRepository.create was called with auto-filled fertilizer_type
      expect(farmingLogRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          material_id: 'mat-1',
          fertilizer_type: 'Phân đạm Ure chuẩn',
          quantity_kg: 50,
        })
      );
    });

    it('rejects if material belongs to another cooperative', async () => {
      (seasonRepository.findById as jest.Mock).mockResolvedValue(mockSeason);
      (prisma.material.findUnique as jest.Mock).mockResolvedValue({
        ...mockMaterial,
        cooperative_id: 'coop-other',
      });

      const logData = {
        season_id: 'season-1',
        activity_date: '2026-03-01',
        activity_type: ActivityType.FERTILIZING,
        material_id: 'mat-1',
        quantity_kg: 50,
      };

      await expect(
        farmingLogService.createLog(logData, mockUser)
      ).rejects.toThrow('Bạn không có quyền sử dụng vật tư của HTX khác');
    });
  });

  describe('createLog — auto-complete season on harvesting log', () => {
    it('automatically completes the season and triggers calculations', async () => {
      (seasonRepository.findById as jest.Mock).mockResolvedValue(mockSeason);
      (farmingLogRepository.hasHarvestingLog as jest.Mock).mockResolvedValue(false);
      (farmingLogRepository.create as jest.Mock).mockResolvedValue({ id: 'log-harvest' });

      const logData = {
        season_id: 'season-1',
        activity_date: '2026-05-15',
        activity_type: ActivityType.HARVESTING,
        yield_kg: 4500,
        harvest_method: 'Máy gặt đập',
      };

      await farmingLogService.createLog(logData, mockUser);

      // Verify season completion was triggered
      expect(seasonService.completeSeason).toHaveBeenCalledWith(
        'season-1',
        {
          actual_end_date: new Date('2026-05-15'),
          actual_yield_kg: 4500,
        },
        mockUser
      );
    });
  });

  describe('deleteLog — soft delete', () => {
    it('marks the log as deleted instead of hard delete', async () => {
      const mockLog = {
        id: 'log-1',
        season: {
          status: SeasonStatus.ACTIVE,
          farm_zone: {
            farmer: {
              cooperative_id: 'coop-1',
            },
          },
        },
      } as any;

      (farmingLogRepository.findById as jest.Mock).mockResolvedValue(mockLog);
      (farmingLogRepository.delete as jest.Mock).mockResolvedValue({ id: 'log-1' });

      await farmingLogService.deleteLog('log-1', mockUser);

      // Verify repository delete was called (which is implemented as soft delete)
      expect(farmingLogRepository.delete).toHaveBeenCalledWith('log-1');
    });
  });
});
