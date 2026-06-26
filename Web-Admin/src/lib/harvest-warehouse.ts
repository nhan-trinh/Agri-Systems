// ==================== HARVEST WAREHOUSE — SHARED TYPES & LABELS ====================
// Single source of truth for the Harvest Warehouse frontend module.
// Mirrors the backend enums (HarvestEntryType, CropType) and request DTOs.

export type CropType = 'RICE' | 'COFFEE' | 'PEPPER' | 'DURIAN' | 'VEGETABLE' | 'OTHER';

export type HarvestEntryType = 'RECEIVE' | 'SHIP';

export interface HarvestStockItem {
  id: string;
  cooperative_id: string;
  crop_type: CropType;
  produce_name: string;
  unit: string;
  current_stock: number;
  updated_at: string;
}

export interface HarvestStockEntry {
  id: string;
  cooperative_id: string;
  harvest_stock_item_id: string;
  entry_type: HarvestEntryType;
  quantity: number;
  unit: string;
  // RECEIVE-specific
  season_id?: string | null;
  farmer_id?: string | null;
  quality_notes?: string | null;
  received_after_close?: boolean;
  // SHIP-specific
  buyer_name?: string | null;
  buyer_contact?: string | null;
  unit_price?: number | null;
  entry_date: string;
  notes?: string | null;
  created_by: string;
  created_at: string;
}

/** POST /receive body — matches backend ReceiveEntryDto. */
export interface ReceivePayload {
  season_id: string;
  farmer_id?: string;
  crop_type: CropType;
  produce_name: string;
  unit: string;
  quantity: number;
  entry_date: string; // ISO 8601
  quality_notes?: string;
  notes?: string;
}

/** POST /ship body — matches backend ShipEntryDto. */
export interface ShipPayload {
  crop_type: CropType;
  produce_name: string;
  unit: string;
  quantity: number;
  buyer_name: string;
  buyer_contact?: string;
  unit_price?: number;
  entry_date: string; // ISO 8601
  notes?: string;
}

/** GET /reconciliation/:seasonId response. */
export interface ReconciliationData {
  season_id: string;
  season_name: string;
  crop_type?: CropType;
  planned_yield_kg: number | null;
  received_total_kg: number;
  declared_actual_yield_kg: number | null;
  discrepancy_kg: number;
}

/** GET /qr-lookup/:qrCode response — pre-fills the receive form. */
export interface QrLookupResult {
  season_id: string;
  season_name?: string;
  crop_type?: CropType;
  farmer_id?: string;
  farmer_name?: string;
}

// ==================== ENUM LABEL MAPS (Vietnamese) ====================

export const CROP_TYPE_LABELS: Record<CropType, string> = {
  RICE: 'Lúa gạo',
  COFFEE: 'Cà phê',
  PEPPER: 'Tiêu',
  DURIAN: 'Sầu riêng',
  VEGETABLE: 'Rau củ',
  OTHER: 'Khác',
};

export const CROP_TYPE_OPTIONS: { value: CropType; label: string }[] = (
  Object.keys(CROP_TYPE_LABELS) as CropType[]
).map((value) => ({ value, label: CROP_TYPE_LABELS[value] }));

export const ENTRY_TYPE_LABELS: Record<HarvestEntryType, string> = {
  RECEIVE: 'Nhận vào kho',
  SHIP: 'Xuất đi bán',
};
