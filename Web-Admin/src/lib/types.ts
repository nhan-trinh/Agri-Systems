export type MaterialType = 'SEED' | 'FERTILIZER' | 'PESTICIDE' | 'EQUIPMENT' | 'OTHER';

export type TransactionType = 'IMPORT' | 'EXPORT' | 'RETURN';

export type BatchStatus = 'DRAFT' | 'PENDING_QR' | 'QR_RECEIVED' | 'ACTIVE' | 'RECALLED';
export type QrStatus = 'INACTIVE' | 'ACTIVE' | 'RECALLED';

export interface Batch {
  id: string;
  batch_code: string;
  season_id: string;
  batch_name: string;
  total_weight_kg: number;
  quantity_qr_requested: number;
  packaging_unit: string;
  product_description?: string;
  status: BatchStatus;
  checkvn_batch_id?: string;
  activated_at?: string;
  activation_note?: string;
  recalled_at?: string;
  recall_reason?: string;
  created_by: string;
  created_at: string;
  season?: {
    season_name: string;
    actual_yield_kg?: number;
  };
}

export interface QrCode {
  id: string;
  code: string;
  batch_id: string;
  status: QrStatus;
  scan_count: number;
  last_scanned_at?: string;
  created_at: string;
}

export interface Season {
  id: string;
  season_name: string;
  actual_yield_kg: number | null;
  status: string;
}

export interface ActivityLog {
  activity_date: string;
  activity_type: 'SEEDING' | 'FERTILIZING' | 'PESTICIDE' | 'IRRIGATION' | 'HARVESTING' | 'OTHER';
  notes?: string;
  photo_urls?: string[];
  fertilizer_type?: string;
  quantity_kg?: number;
  product_name?: string;
  dosage?: number;
  unit?: string;
  water_volume_m3?: number;
  duration_hours?: number;
  yield_kg?: number;
  harvest_method?: string;
}

export interface TracingData {
  status: string;
  recall_reason?: string;
  recalled_at?: string;
  cooperative?: {
    name: string;
    phone?: string;
  };
  batch: Batch;
  farm_zone?: {
    zone_name: string;
    area_sqm: number;
    boundary?: {
      type: string;
      coordinates: number[][][];
    };
  };
  farmer: {
    full_name: string;
    address: string;
  };
  farming_logs?: ActivityLog[];
  carbon_record?: {
    status: string;
    net_carbon_tCO2e: number;
    certificate_no: string;
    credit_amount_tCO2e: number;
  } | null;
}


