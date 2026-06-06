import { z } from 'zod';

// ── Material ──────────────────────────────────────

export const CreateMaterialDto = z.object({
  material_name:   z.string().min(1, 'Tên vật tư không được để trống').max(200),
  material_type:   z.enum(['SEED', 'FERTILIZER', 'PESTICIDE', 'EQUIPMENT', 'OTHER'], {
    errorMap: () => ({ message: 'Loại vật tư không hợp lệ. Chỉ chấp nhận: SEED, FERTILIZER, PESTICIDE, EQUIPMENT, OTHER' }),
  }),
  unit:            z.string().min(1, 'Đơn vị tính không được để trống').max(20),
  min_stock_alert: z.number().min(0, 'Ngưỡng cảnh báo không được âm').default(0),
});

export const UpdateMaterialDto = CreateMaterialDto.partial();

// ── Transaction ───────────────────────────────────

const BaseTransactionDto = z.object({
  material_id:      z.string().cuid('Mã vật tư không hợp lệ'),
  quantity:         z.number().positive('Số lượng phải lớn hơn 0'),
  transaction_date: z.string().datetime({ message: 'Ngày giao dịch không hợp lệ (ISO 8601)' }),
  notes:            z.string().max(500).optional(),
});

export const ImportTransactionDto = BaseTransactionDto.extend({
  transaction_type: z.literal('IMPORT'),
  unit_price:       z.number().positive('Đơn giá phải lớn hơn 0').optional(),
  supplier:         z.string().min(2, 'Nhà cung cấp phải có ít nhất 2 ký tự').max(200),   // BR-005-3
  invoice_no:       z.string().min(1, 'Số hóa đơn không được để trống').max(100),          // BR-005-3
  expiry_date:      z.string().datetime({ message: 'Hạn sử dụng không hợp lệ (ISO 8601)' }).optional(),
});

export const ExportTransactionDto = BaseTransactionDto.extend({
  transaction_type:    z.literal('EXPORT'),
  recipient_farmer_id: z.string().cuid('Mã nông dân không hợp lệ'),                       // BR-005-4
  purpose:             z.string().min(5, 'Mục đích xuất phải có ít nhất 5 ký tự').max(500), // BR-005-4
});

export const ReturnTransactionDto = BaseTransactionDto.extend({
  transaction_type:    z.literal('RETURN'),
  recipient_farmer_id: z.string().cuid('Mã nông dân không hợp lệ').optional(),
  return_reason:       z.string().min(5, 'Lý do hoàn trả phải có ít nhất 5 ký tự').max(500),
});

// Union — controller dùng discriminatedUnion để parse tự động theo transaction_type
export const CreateTransactionDto = z.discriminatedUnion('transaction_type', [
  ImportTransactionDto,
  ExportTransactionDto,
  ReturnTransactionDto,
]);

// ── Query filters ─────────────────────────────────

export const TransactionQueryDto = z.object({
  material_id:      z.string().cuid().optional(),
  transaction_type: z.enum(['IMPORT', 'EXPORT', 'RETURN']).optional(),
  farmer_id:        z.string().cuid().optional(),
  from_date:        z.string().datetime().optional(),
  to_date:          z.string().datetime().optional(),
  page:             z.coerce.number().min(1).default(1),
  limit:            z.coerce.number().min(1).max(100).default(20),
});

export const ReconciliationQueryDto = z.object({
  farmer_id: z.string().cuid().optional(),
  from_date: z.string().datetime().optional(),
  to_date:   z.string().datetime().optional(),
});

// ── Inferred types ────────────────────────────────

export type CreateMaterialDtoType       = z.infer<typeof CreateMaterialDto>;
export type UpdateMaterialDtoType       = z.infer<typeof UpdateMaterialDto>;
export type ImportTransactionDtoType    = z.infer<typeof ImportTransactionDto>;
export type ExportTransactionDtoType    = z.infer<typeof ExportTransactionDto>;
export type ReturnTransactionDtoType    = z.infer<typeof ReturnTransactionDto>;
export type CreateTransactionDtoType    = z.infer<typeof CreateTransactionDto>;
export type TransactionQueryDtoType     = z.infer<typeof TransactionQueryDto>;
export type ReconciliationQueryDtoType  = z.infer<typeof ReconciliationQueryDto>;
