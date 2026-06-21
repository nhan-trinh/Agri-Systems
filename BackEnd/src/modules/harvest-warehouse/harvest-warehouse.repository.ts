import prisma from '../../prisma/client';
import { Prisma, CropType, HarvestEntryType } from '@prisma/client';
import { AppError } from '../../shared/utils/app-error';
import { HarvestStockEntryWithRelations } from './harvest-warehouse.types';
import { EntryQueryDtoType } from './harvest-warehouse.dto';

// ─────────────────────────────────────────────────────
// Repository — chỉ chứa logic truy vấn DB, không chứa business logic.
// Structurally parallel to the Material Warehouse repository.
// ─────────────────────────────────────────────────────

// Postgres SQLSTATE for CHECK constraint violation (23514). Prisma surfaces this as a
// PrismaClientKnownRequestError whose `.code` is the raw SQLSTATE (not a P2xxx Prisma code).
const PG_CHECK_VIOLATION_CODE = '23514';

/**
 * Structural check for a Prisma known-request error carrying a raw DB SQLSTATE code.
 * Avoids importing PrismaClientKnownRequestError (its export path differs across Prisma versions).
 */
function isPrismaKnownErrorWithCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name: string }).name === 'PrismaClientKnownRequestError' &&
    'code' in error &&
    (error as { code: string }).code === code
  );
}

export class HarvestWarehouseRepository {

  // ── STOCK ITEM ─────────────────────────────────

  /**
   * Find an existing stock item by the normalized produce key.
   * Lookup uses produce_name_key (not the display produce_name) so that
   * "Lúa ST25" / "lúa st25" / "Lúa  ST25" all resolve to the same row.
   */
  async findStockItem(cooperativeId: string, cropType: string, produceNameKey: string) {
    return prisma.harvestStockItem.findUnique({
      where: {
        cooperative_id_crop_type_produce_name_key: {
          cooperative_id: cooperativeId,
          crop_type: cropType as CropType,
          produce_name_key: produceNameKey,
        },
      },
    });
  }

  async findAllStock(cooperativeId: string) {
    return prisma.harvestStockItem.findMany({
      where: { cooperative_id: cooperativeId },
      orderBy: [{ crop_type: 'asc' }, { produce_name: 'asc' }],
    });
  }

  // ── ENTRY — atomic stock update (mirrors createTransactionInTx) ──

  /**
   * Create a harvest stock entry and update the stock item atomically inside a transaction.
   *
   * - RECEIVE: upserts the stock item (auto-creating it on first receive per FR note in §9)
   *            and increments current_stock.
   * - SHIP: decrements current_stock; throws INSUFFICIENT_HARVEST_STOCK if it would go negative (FR-05).
   *
   * FR-05 is enforced at TWO layers:
   *   1. Application: this transaction's JS check after the increment (primary, clean error message).
   *   2. Database:    a CHECK (current_stock >= 0) constraint (backstop — catches any path that
   *                   bypasses the service, e.g. raw SQL or a future code path). If it trips,
   *                   we map the violation back to INSUFFICIENT_HARVEST_STOCK.
   *
   * The entry itself is immutable post-creation (no updated_at — mirrors WarehouseTransaction BR-005-5).
   */
  async createEntryInTx(data: {
    cooperative_id: string;
    crop_type: string;
    produce_name: string;       // display name (original casing)
    produce_name_key: string;   // normalized key (trim + lowercase + collapse whitespace)
    unit: string;
    entry_type: HarvestEntryType;
    quantity: number;
    // RECEIVE-only:
    season_id?: string;
    farmer_id?: string;
    quality_notes?: string;
    received_after_close?: boolean;
    // SHIP-only:
    buyer_name?: string;
    buyer_contact?: string;
    unit_price?: number;
    entry_date: Date;
    notes?: string;
    created_by: string;
  }): Promise<{ entry: HarvestStockEntryWithRelations; stockItem: { current_stock: number; unit: string } }> {
    const stockDelta = data.entry_type === 'RECEIVE' ? +data.quantity : -data.quantity;

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Upsert the stock item (auto-create on first RECEIVE; fetch on SHIP)
        //    Lookup + uniqueness use the NORMALIZED key so "Lúa ST25" ≡ "lúa st25".
        const stockItem = await tx.harvestStockItem.upsert({
          where: {
            cooperative_id_crop_type_produce_name_key: {
              cooperative_id: data.cooperative_id,
              crop_type: data.crop_type as CropType,
              produce_name_key: data.produce_name_key,
            },
          },
          create: {
            cooperative_id: data.cooperative_id,
            crop_type: data.crop_type as CropType,
            produce_name: data.produce_name,
            produce_name_key: data.produce_name_key,
            unit: data.unit,
            current_stock: Math.max(0, stockDelta),
          },
          update: {
            current_stock: { increment: stockDelta },
          },
        });

        // 2. Hard validation (primary): shipping cannot drive stock below zero (FR-05)
        if (stockItem.current_stock < 0) {
          throw new AppError(
            'INSUFFICIENT_HARVEST_STOCK',
            422,
            `Tồn kho nông sản không đủ. Hiện có: ${Math.max(0, stockItem.current_stock + data.quantity)} ${stockItem.unit}, yêu cầu xuất: ${data.quantity} ${stockItem.unit}`,
          );
        }

        // 3. Create the immutable entry record
        const entry = await tx.harvestStockEntry.create({
          data: {
            cooperative_id: data.cooperative_id,
            harvest_stock_item_id: stockItem.id,
            entry_type: data.entry_type,
            quantity: data.quantity,
            unit: data.unit,
            season_id: data.season_id ?? null,
            farmer_id: data.farmer_id ?? null,
            quality_notes: data.quality_notes ?? null,
            received_after_close: data.received_after_close ?? false,
            buyer_name: data.buyer_name ?? null,
            buyer_contact: data.buyer_contact ?? null,
            unit_price: data.unit_price ?? null,
            entry_date: data.entry_date,
            notes: data.notes ?? null,
            created_by: data.created_by,
          },
          include: {
            harvest_stock_item: true,
            season: { include: { farm_zone: { include: { farmer: true } } } },
            farmer: true,
          },
        });

        return { entry, stockItem: { current_stock: stockItem.current_stock, unit: stockItem.unit } };
      });
    } catch (error) {
      // Backstop: if the DB CHECK constraint (current_stock >= 0) trips — e.g. via a race that
      // the JS check missed, or a raw-SQL path — map it to the same clean AppError.
      if (isPrismaKnownErrorWithCode(error, PG_CHECK_VIOLATION_CODE)) {
        throw new AppError(
          'INSUFFICIENT_HARVEST_STOCK',
          422,
          'Tồn kho nông sản không đủ để thực hiện giao dịch xuất.',
        );
      }
      throw error;
    }
  }

  // ── ENTRY HISTORY ──────────────────────────────

  async findEntryById(id: string): Promise<HarvestStockEntryWithRelations | null> {
    return prisma.harvestStockEntry.findUnique({
      where: { id },
      include: {
        harvest_stock_item: true,
        season: { include: { farm_zone: { include: { farmer: true } } } },
        farmer: true,
      },
    });
  }

  async findEntries(cooperativeId: string, filters: EntryQueryDtoType): Promise<{ data: HarvestStockEntryWithRelations[]; total: number }> {
    const where: Prisma.HarvestStockEntryWhereInput = {
      cooperative_id: cooperativeId,
      ...(filters.season_id && { season_id: filters.season_id }),
      ...(filters.farmer_id && { farmer_id: filters.farmer_id }),
      ...(filters.crop_type && { harvest_stock_item: { crop_type: filters.crop_type as CropType } }),
      ...(filters.entry_type && { entry_type: filters.entry_type as HarvestEntryType }),
    };

    if (filters.from_date || filters.to_date) {
      where.entry_date = {};
      if (filters.from_date) where.entry_date.gte = new Date(filters.from_date);
      if (filters.to_date) where.entry_date.lte = new Date(filters.to_date);
    }

    const [data, total] = await prisma.$transaction([
      prisma.harvestStockEntry.findMany({
        where,
        include: {
          harvest_stock_item: true,
          season: { include: { farm_zone: { include: { farmer: true } } } },
          farmer: true,
        },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { entry_date: 'desc' },
      }),
      prisma.harvestStockEntry.count({ where }),
    ]);

    return { data, total };
  }

  // ── RECONCILIATION (UC-07) ─────────────────────

  /**
   * Sum all RECEIVE quantities linked to a season.
   */
  async sumReceivedForSeason(seasonId: string): Promise<{ total: number; count: number }> {
    const result = await prisma.harvestStockEntry.aggregate({
      where: { season_id: seasonId, entry_type: 'RECEIVE' },
      _sum: { quantity: true },
      _count: { _all: true },
    });

    return {
      total: result._sum.quantity ?? 0,
      count: result._count._all,
    };
  }

  async hasReceivedAfterClose(seasonId: string): Promise<boolean> {
    const found = await prisma.harvestStockEntry.findFirst({
      where: { season_id: seasonId, received_after_close: true },
      select: { id: true },
    });
    return !!found;
  }
}

export const harvestWarehouseRepository = new HarvestWarehouseRepository();

