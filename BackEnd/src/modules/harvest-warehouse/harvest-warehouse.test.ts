import { harvestWarehouseService } from './harvest-warehouse.service';
import { harvestWarehouseRepository } from './harvest-warehouse.repository';
import prisma from '../../prisma/client';
import { UserRole, SeasonStatus } from '@prisma/client';
import { AppError } from '../../shared/utils/app-error';

// ── Mock dependencies ────────────────────────────────────────────
jest.mock('./harvest-warehouse.repository');

// jest.mock factories are hoisted above imports, so the mock fns must be created
// inside the factory itself. They are then accessed via the imported prisma module.
jest.mock('../../prisma/client', () => ({
  __esModule: true,
  default: {
    season: { findUnique: jest.fn() },
    farmer: { findUnique: jest.fn() },
  },
}));

const mockRepo = harvestWarehouseRepository as jest.Mocked<typeof harvestWarehouseRepository>;
const mockPrisma = prisma as unknown as {
  season: { findUnique: jest.Mock };
  farmer: { findUnique: jest.Mock };
};

// ── Shared fixtures ──────────────────────────────────────────────

const mockManager = {
  userId: 'mgr-1',
  role: UserRole.HTX_MANAGER,
  cooperativeId: 'coop-1',
  farmerId: null,
  isFirstLogin: false,
};

const mockWarehouseKeeper = {
  userId: 'wk-1',
  role: UserRole.WAREHOUSE_KEEPER,
  cooperativeId: 'coop-1',
  farmerId: null,
  isFirstLogin: false,
};

const mockSeason = {
  id: 'season-1',
  season_name: 'Đông Xuân 2026',
  crop_variety: 'ST25',
  planned_yield_kg: 5000,
  actual_yield_kg: 4800,
  status: SeasonStatus.ACTIVE,
  farm_zone: {
    id: 'zone-1',
    farmer: {
      id: 'farmer-1',
      full_name: 'Nguyễn Văn A',
      cooperative_id: 'coop-1',
    },
  },
};

const baseReceiveDto = {
  season_id: 'season-1',
  crop_type: 'RICE' as const,
  produce_name: 'Lúa ST25',
  unit: 'kg',
  quantity: 500,
  entry_date: '2026-06-21T08:00:00.000Z',
};

const baseShipDto = {
  crop_type: 'RICE' as const,
  produce_name: 'Lúa ST25',
  unit: 'kg',
  quantity: 200,
  buyer_name: 'Công ty Gạo Việt',
  entry_date: '2026-06-21T10:00:00.000Z',
};

// ═══════════════════════════════════════════════════════════════
// RECEIVE
// ═══════════════════════════════════════════════════════════════

describe('HarvestWarehouseService — receive', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a RECEIVE entry and defaults farmer to the season owner', async () => {
    mockPrisma.season.findUnique.mockResolvedValue(mockSeason as never);
    mockRepo.createEntryInTx.mockResolvedValue({
      entry: { id: 'entry-1', entry_type: 'RECEIVE' } as never,
      stockItem: { current_stock: 500, unit: 'kg' },
    });

    const result = await harvestWarehouseService.receive(baseReceiveDto, mockWarehouseKeeper);

    expect(mockRepo.createEntryInTx).toHaveBeenCalledWith(expect.objectContaining({
      entry_type: 'RECEIVE',
      quantity: 500,
      season_id: 'season-1',
      farmer_id: 'farmer-1', // defaulted from season's farmer
      received_after_close: false,
    }));
    expect(result.entry.id).toBe('entry-1');
  });

  it('flags received_after_close=true when season is COMPLETED (FR-12)', async () => {
    mockPrisma.season.findUnique.mockResolvedValue({ ...mockSeason, status: SeasonStatus.COMPLETED } as never);
    mockRepo.createEntryInTx.mockResolvedValue({
      entry: { id: 'entry-2' } as never,
      stockItem: { current_stock: 100, unit: 'kg' },
    });

    await harvestWarehouseService.receive(baseReceiveDto, mockWarehouseKeeper);

    expect(mockRepo.createEntryInTx).toHaveBeenCalledWith(expect.objectContaining({
      received_after_close: true,
    }));
  });

  it('throws 404 when season does not exist', async () => {
    mockPrisma.season.findUnique.mockResolvedValue(null);

    await expect(
      harvestWarehouseService.receive(baseReceiveDto, mockWarehouseKeeper),
    ).rejects.toThrow('Không tìm thấy vụ mùa');
  });

  it('enforces cooperative isolation (403 on cross-coop season)', async () => {
    mockPrisma.season.findUnique.mockResolvedValue({
      ...mockSeason,
      farm_zone: { id: 'z', farmer: { id: 'f', full_name: 'X', cooperative_id: 'coop-other' } },
    } as never);

    await expect(
      harvestWarehouseService.receive(baseReceiveDto, mockManager),
    ).rejects.toThrow('không thuộc Hợp tác xã');
  });

  it('requires cooperative_id on the JWT (403 if null)', async () => {
    const noCoop = { ...mockManager, cooperativeId: null };
    await expect(
      harvestWarehouseService.receive(baseReceiveDto, noCoop),
    ).rejects.toThrow('không thuộc Hợp tác xã nào');
  });

  it('normalizes produce_name variants to the same key (fix #2 — no inventory fragmentation)', async () => {
    // Three visually-different variants that SHOULD map to ONE stock item:
    // case + surrounding whitespace + duplicated internal whitespace all collapse identically.
    const variants = ['Lúa ST25', '  lúa   ST25 ', 'LÚA st25'];
    for (const produceName of variants) {
      jest.clearAllMocks();
      mockPrisma.season.findUnique.mockResolvedValue(mockSeason as never);
      mockRepo.createEntryInTx.mockResolvedValue({
        entry: { id: 'entry-n' } as never,
        stockItem: { current_stock: 100, unit: 'kg' },
      });

      await harvestWarehouseService.receive(
        { ...baseReceiveDto, produce_name: produceName },
        mockWarehouseKeeper,
      );

      // All three must pass the SAME normalized key to the repository.
      const callArg = mockRepo.createEntryInTx.mock.calls[0][0];
      expect(callArg.produce_name_key).toBe('lúa st25');
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// SHIP
// ═══════════════════════════════════════════════════════════════

describe('HarvestWarehouseService — ship', () => {
  beforeEach(() => jest.clearAllMocks());

  it('ships produce when sufficient stock exists', async () => {
    mockRepo.findStockItem.mockResolvedValue({
      id: 'si-1',
      cooperative_id: 'coop-1',
      crop_type: 'RICE',
      produce_name: 'Lúa ST25',
      unit: 'kg',
      current_stock: 1000,
      updated_at: new Date(),
    } as never);
    mockRepo.createEntryInTx.mockResolvedValue({
      entry: { id: 'entry-3', entry_type: 'SHIP' } as never,
      stockItem: { current_stock: 800, unit: 'kg' },
    });

    const result = await harvestWarehouseService.ship(baseShipDto, mockWarehouseKeeper);

    expect(mockRepo.createEntryInTx).toHaveBeenCalledWith(expect.objectContaining({
      entry_type: 'SHIP',
      quantity: 200,
      buyer_name: 'Công ty Gạo Việt',
    }));
    expect(result.entry.id).toBe('entry-3');
  });

  it('blocks shipping more than on-hand stock (FR-05 hard validation)', async () => {
    mockRepo.findStockItem.mockResolvedValue({
      id: 'si-1',
      cooperative_id: 'coop-1',
      crop_type: 'RICE',
      produce_name: 'Lúa ST25',
      unit: 'kg',
      current_stock: 100,
      updated_at: new Date(),
    } as never);

    await expect(
      harvestWarehouseService.ship({ ...baseShipDto, quantity: 500 }, mockWarehouseKeeper),
    ).rejects.toThrow('Tồn kho nông sản không đủ');
    expect(mockRepo.createEntryInTx).not.toHaveBeenCalled();
  });

  it('blocks shipping when stock item does not exist yet (onHand=0)', async () => {
    mockRepo.findStockItem.mockResolvedValue(null);

    await expect(
      harvestWarehouseService.ship(baseShipDto, mockWarehouseKeeper),
    ).rejects.toThrow('Tồn kho nông sản không đủ');
  });
});

// ═══════════════════════════════════════════════════════════════
// RECONCILIATION
// ═══════════════════════════════════════════════════════════════

describe('HarvestWarehouseService — reconciliation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('compares planned vs received vs declared actual yield (UC-07)', async () => {
    mockPrisma.season.findUnique.mockResolvedValue(mockSeason as never);
    mockRepo.sumReceivedForSeason.mockResolvedValue({ total: 4600, count: 5 });
    mockRepo.hasReceivedAfterClose.mockResolvedValue(false);

    const result = await harvestWarehouseService.getReconciliation('season-1', mockManager);

    expect(result.planned_yield_kg).toBe(5000);
    expect(result.actual_yield_kg).toBe(4800);
    expect(result.received_total_kg).toBe(4600);
    expect(result.discrepancy_kg).toBe(200); // 4800 declared − 4600 received
    expect(result.received_entry_count).toBe(5);
  });

  it('returns null discrepancy when actual_yield_kg is null (season not closed)', async () => {
    mockPrisma.season.findUnique.mockResolvedValue({ ...mockSeason, actual_yield_kg: null } as never);
    mockRepo.sumReceivedForSeason.mockResolvedValue({ total: 1000, count: 2 });
    mockRepo.hasReceivedAfterClose.mockResolvedValue(false);

    const result = await harvestWarehouseService.getReconciliation('season-1', mockManager);
    expect(result.discrepancy_kg).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// QR LOOKUP
// ═══════════════════════════════════════════════════════════════

describe('HarvestWarehouseService — qrLookup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves a SEASON QR code to season + farmer context', async () => {
    mockPrisma.season.findUnique.mockResolvedValue(mockSeason as never);

    const result = await harvestWarehouseService.qrLookup('SEASON:season-1', mockWarehouseKeeper);

    expect(result.type).toBe('SEASON');
    expect(result.season_id).toBe('season-1');
    expect(result.farmer_name).toBe('Nguyễn Văn A');
  });

  it('resolves a FARMER QR code to farmer context', async () => {
    mockPrisma.farmer.findUnique.mockResolvedValue({
      id: 'farmer-1',
      full_name: 'Nguyễn Văn A',
      cooperative_id: 'coop-1',
    } as never);

    const result = await harvestWarehouseService.qrLookup('FARMER:farmer-1', mockWarehouseKeeper);
    expect(result.type).toBe('FARMER');
    expect(result.farmer_id).toBe('farmer-1');
  });

  it('rejects QR codes with an unsupported prefix', async () => {
    await expect(
      harvestWarehouseService.qrLookup('OTHER:abc-123', mockWarehouseKeeper),
    ).rejects.toThrow('không được hỗ trợ');
  });

  it('rejects QR codes with no id after the prefix', async () => {
    await expect(
      harvestWarehouseService.qrLookup('SEASON:', mockWarehouseKeeper),
    ).rejects.toThrow('không hợp lệ');
  });

  it('enforces cooperative isolation on QR lookup', async () => {
    mockPrisma.season.findUnique.mockResolvedValue({
      ...mockSeason,
      farm_zone: { id: 'z', farmer: { id: 'f', full_name: 'X', cooperative_id: 'coop-other' } },
    } as never);

    await expect(
      harvestWarehouseService.qrLookup('SEASON:season-1', mockManager),
    ).rejects.toThrow('không thuộc Hợp tác xã');
  });
});

// ═══════════════════════════════════════════════════════════════
// BATCH GATE (FR-09)
// ═══════════════════════════════════════════════════════════════

describe('HarvestWarehouseService — assertSeasonHasReceivedStock (FR-09)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('passes when the season has received stock', async () => {
    mockPrisma.season.findUnique.mockResolvedValue(mockSeason as never);
    mockRepo.sumReceivedForSeason.mockResolvedValue({ total: 1000, count: 2 });

    await expect(
      harvestWarehouseService.assertSeasonHasReceivedStock('season-1', 'coop-1'),
    ).resolves.toBeUndefined();
  });

  it('blocks batch creation when no produce has been received', async () => {
    mockPrisma.season.findUnique.mockResolvedValue(mockSeason as never);
    mockRepo.sumReceivedForSeason.mockResolvedValue({ total: 0, count: 0 });

    await expect(
      harvestWarehouseService.assertSeasonHasReceivedStock('season-1', 'coop-1'),
    ).rejects.toThrow('chưa có nông sản nhận vào kho');
  });
});
