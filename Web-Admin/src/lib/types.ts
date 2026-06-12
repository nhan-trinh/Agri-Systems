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
