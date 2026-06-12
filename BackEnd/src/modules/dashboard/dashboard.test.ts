import { dashboardService } from './dashboard.service';
import { dashboardCache } from './dashboard.cache';
import prisma from '../../prisma/client';
import { UserRole, CropType } from '@prisma/client';

// Mock dependencies
jest.mock('../../prisma/client', () => ({
  __esModule: true,
  default: {
    farmer: { count: jest.fn().mockResolvedValue(10) },
    farmZone: { count: jest.fn().mockResolvedValue(5), findMany: jest.fn() },
    season: { count: jest.fn().mockResolvedValue(3), aggregate: jest.fn().mockResolvedValue({ _sum: { actual_yield_kg: 5000 } }) },
    batch: { count: jest.fn().mockResolvedValue(2), aggregate: jest.fn().mockResolvedValue({ _sum: { quantity_qr_requested: 1000 } }) },
    carbonRecord: { count: jest.fn().mockResolvedValue(1), aggregate: jest.fn().mockResolvedValue({ _sum: { credit_amount_tCO2e: 15.5 } }) },
    stockItem: { findMany: jest.fn().mockResolvedValue([]) },
    farmingLog: { findMany: jest.fn().mockResolvedValue([]) },
  },
}));

// Mock Redis client cache
const mockCache = new Map<string, string>();
jest.mock('../../shared/utils/redis.client', () => ({
  getRedisClient: jest.fn().mockResolvedValue({
    get: jest.fn().mockImplementation(async (key: string) => mockCache.get(key) || null),
    set: jest.fn().mockImplementation(async (key: string, val: string) => {
      mockCache.set(key, val);
      return 'OK';
    }),
    del: jest.fn().mockImplementation(async (keys: string | string[]) => {
      const keysArray = Array.isArray(keys) ? keys : [keys];
      for (const k of keysArray) {
        mockCache.delete(k);
      }
      return 1;
    }),
    keys: jest.fn().mockImplementation(async (pattern: string) => {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return Array.from(mockCache.keys()).filter((k) => regex.test(k));
    }),
    scanIterator: jest.fn().mockImplementation((options?: { MATCH?: string }) => {
      const pattern = options?.MATCH || '*';
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      const matchedKeys = Array.from(mockCache.keys()).filter((k) => regex.test(k));
      return {
        async *[Symbol.asyncIterator]() {
          for (const key of matchedKeys) {
            yield key;
          }
        }
      };
    }),
  }),
}));

const mockUserHtx: any = {
  userId: 'user-manager-123',
  role: UserRole.HTX_MANAGER,
  cooperativeId: 'coop-123',
};

const mockUserAdmin: any = {
  userId: 'user-admin-123',
  role: UserRole.SUPER_ADMIN,
  cooperativeId: null,
};

const mockUserGov: any = {
  userId: 'user-gov-123',
  role: UserRole.GOV_VIEWER,
  cooperativeId: null,
};

describe('DashboardService', () => {
  beforeEach(() => {
    mockCache.clear();
    jest.clearAllMocks();
  });

  it('✅ Stats: queries run in parallel and return formatted results', async () => {
    const stats = await dashboardService.getStats(mockUserHtx);
    expect(stats.total_farmers).toBe(10);
    expect(stats.total_farm_zones).toBe(5);
    expect(stats.active_seasons).toBe(3);
    expect(stats.completed_seasons_ytd).toBe(3);
    expect(stats.total_yield_kg_ytd).toBe(5000);
    expect(stats.active_batches).toBe(2);
    expect(stats.total_qr_issued).toBe(1000);
    expect(stats.carbon.draft).toBe(1);
    expect(stats.carbon.issued).toBe(1);
    expect(stats.carbon.total_credits_tCO2e).toBe(15.5);

    // Verify Prisma count queries were executed
    expect(prisma.farmer.count).toHaveBeenCalled();
    expect(prisma.farmZone.count).toHaveBeenCalled();
  });

  it('✅ Cache hit lần 2 → không query DB', async () => {
    // 1st request -> DB query
    await dashboardService.getStats(mockUserHtx);
    expect(prisma.farmer.count).toHaveBeenCalledTimes(1);

    // Reset calls
    jest.clearAllMocks();

    // 2nd request -> Cache Hit (no DB query)
    const statsCached = await dashboardService.getStats(mockUserHtx);
    expect(statsCached.total_farmers).toBe(10);
    expect(prisma.farmer.count).not.toHaveBeenCalled();
  });

  it('✅ Invalidate sau farming_log mới → stats query lại DB', async () => {
    // 1st request -> cached
    await dashboardService.getStats(mockUserHtx);
    expect(prisma.farmer.count).toHaveBeenCalledTimes(1);

    jest.clearAllMocks();

    // Simulate invalidation on log change
    await dashboardCache.invalidateCooperativeCache('coop-123');

    // 2nd request -> Cache Miss (queries DB again)
    await dashboardService.getStats(mockUserHtx);
    expect(prisma.farmer.count).toHaveBeenCalledTimes(1);
  });

  it('✅ GOV_VIEWER: response không chứa farmer_id, phone, và farmer_name được ẩn danh', async () => {
    const mockZones = [
      {
        id: 'zone-123',
        zone_name: 'Vùng Trồng Lúa ST25',
        boundary: {},
        crop_type: CropType.RICE,
        farmer: {
          id: 'farmer-999',
          full_name: 'Nguyễn Văn A',
          phone: '0987654321',
        },
        seasons: [],
      },
    ];
    (prisma.farmZone.findMany as jest.Mock).mockResolvedValue(mockZones);

    const zones = await dashboardService.getFarmZones(mockUserGov);
    expect(zones).toHaveLength(1);
    expect(zones[0].farmer_name).toBe('Nông dân HTX');
    expect(zones[0]).not.toHaveProperty('farmer_id');
    expect(zones[0]).not.toHaveProperty('phone');
  });

  it('✅ SUPER_ADMIN: xem tất cả cooperatives', async () => {
    await dashboardService.getStats(mockUserAdmin);
    expect(prisma.farmer.count).toHaveBeenCalledWith({
      where: { deleted_at: null },
    });
  });

  it('✅ HTX_MANAGER: chỉ xem cooperative của mình', async () => {
    await dashboardService.getStats(mockUserHtx);
    expect(prisma.farmer.count).toHaveBeenCalledWith({
      where: { cooperative_id: 'coop-123', deleted_at: null },
    });
  });
});
