import { z } from 'zod';

// ==================== RECEIVE ENTRY (UC-01, UC-02, UC-03) ====================

const CropTypeEnum = z.enum(['RICE', 'COFFEE', 'PEPPER', 'DURIAN', 'VEGETABLE', 'OTHER'], {
  errorMap: () => ({ message: 'Loại cây trồng không hợp lệ' }),
});

export const ReceiveEntryDto = z.object({
  season_id: z.string().min(1, 'Mã vụ mùa không được để trống'),
  farmer_id: z.string().min(1).optional(), // optional — derived from season if omitted
  crop_type: CropTypeEnum,
  // Validate first, then normalize: trim + collapse internal whitespace so the displayed
  // name is clean. Uniqueness additionally uses a lowercased key derived in the service (fix #2).
  produce_name: z.string().trim().min(1, 'Tên nông sản không được để trống').max(200).transform(s => s.replace(/\s+/g, ' ')),
  unit: z.string().min(1, 'Đơn vị tính không được để trống').max(20),
  quantity: z.number().positive('Sản lượng nhận vào phải lớn hơn 0'),
  entry_date: z.string().datetime({ message: 'Ngày nhận không hợp lệ (ISO 8601)' }),
  quality_notes: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
});

// ==================== SHIP ENTRY (UC-05) ====================

export const ShipEntryDto = z.object({
  crop_type: CropTypeEnum,
  produce_name: z.string().trim().min(1, 'Tên nông sản không được để trống').max(200).transform(s => s.replace(/\s+/g, ' ')),
  unit: z.string().min(1, 'Đơn vị tính không được để trống').max(20),
  quantity: z.number().positive('Sản lượng xuất đi phải lớn hơn 0'),
  buyer_name: z.string().trim().min(1, 'Tên người mua không được để trống').max(200),
  buyer_contact: z.string().max(200).optional(),
  unit_price: z.number().positive('Đơn giá phải lớn hơn 0').optional(),
  entry_date: z.string().datetime({ message: 'Ngày xuất không hợp lệ (ISO 8601)' }),
  notes: z.string().max(500).optional(),
});

// ==================== QR LOOKUP (UC-01 fast path) ====================

export const QrLookupDto = z.object({
  qrCode: z.string().min(1, 'Mã QR không hợp lệ'),
});

// ==================== ENTRY HISTORY QUERY (UC-07 supporting data) ====================

export const EntryQueryDto = z.object({
  season_id: z.string().min(1).optional(),
  farmer_id: z.string().min(1).optional(),
  crop_type: CropTypeEnum.optional(),
  entry_type: z.enum(['RECEIVE', 'SHIP']).optional(),
  from_date: z.string().datetime().optional(),
  to_date: z.string().datetime().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ==================== INFERRED TYPES ====================

export type ReceiveEntryDtoType = z.infer<typeof ReceiveEntryDto>;
export type ShipEntryDtoType = z.infer<typeof ShipEntryDto>;
export type EntryQueryDtoType = z.infer<typeof EntryQueryDto>;
export type QrLookupDtoType = z.infer<typeof QrLookupDto>;
