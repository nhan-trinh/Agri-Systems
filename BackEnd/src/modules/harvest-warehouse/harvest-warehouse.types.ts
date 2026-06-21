import { Prisma, CropType } from '@prisma/client';

// ==================== PRISMA PAYLOAD TYPES ====================

const stockItemWithEntries = {
  entries: true,
} satisfies Prisma.HarvestStockItemInclude;

export type HarvestStockItemWithEntries = Prisma.HarvestStockItemGetPayload<{
  include: typeof stockItemWithEntries;
}>;

const entryWithRelations = {
  harvest_stock_item: true,
  season: { include: { farm_zone: { include: { farmer: true } } } },
  farmer: true,
} satisfies Prisma.HarvestStockEntryInclude;

export type HarvestStockEntryWithRelations = Prisma.HarvestStockEntryGetPayload<{
  include: typeof entryWithRelations;
}>;

// ==================== REPOSITORY INPUT TYPES ====================

export interface UpsertStockItemInput {
  cooperative_id: string;
  crop_type: CropType;
  produce_name: string;
  unit: string;
}

export interface ReceiveEntryInput {
  cooperative_id: string;
  crop_type: string;
  produce_name: string;
  unit: string;
  quantity: number;
  season_id: string;
  farmer_id?: string;
  quality_notes?: string;
  received_after_close: boolean;
  entry_date: Date;
  notes?: string;
  created_by: string;
}

export interface ShipEntryInput {
  cooperative_id: string;
  crop_type: string;
  produce_name: string;
  unit: string;
  quantity: number;
  buyer_name: string;
  buyer_contact?: string;
  unit_price?: number;
  entry_date: Date;
  notes?: string;
  created_by: string;
}

// ==================== SERVICE OUTPUT TYPES ====================

export interface ReconciliationResult {
  season_id: string;
  season_name: string;
  crop_variety: string;
  status: string;
  planned_yield_kg: number;
  actual_yield_kg: number | null;
  received_total_kg: number;
  received_entry_count: number;
  discrepancy_kg: number | null; // actual_yield_kg - received_total_kg
  received_after_close: boolean;
}

export interface QrLookupResult {
  type: 'SEASON' | 'FARMER';
  season_id?: string;
  season_name?: string;
  crop_type?: string;
  farmer_id?: string;
  farmer_name?: string;
  cooperative_id: string;
}

// Re-export enums for convenience
export { stockItemWithEntries, entryWithRelations };
