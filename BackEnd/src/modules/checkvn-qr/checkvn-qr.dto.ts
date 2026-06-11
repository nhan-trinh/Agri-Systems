import { z } from 'zod';

export const CreateBatchDto = z.object({
  season_id: z.string().min(1, 'Mã vụ mùa không được để trống'),
  batch_name: z.string().min(2, 'Tên lô hàng phải chứa tối thiểu 2 ký tự'),
  total_weight_kg: z.number().positive('Tổng khối lượng phải là số dương'),
  quantity_qr: z.number().int().min(1, 'Số lượng QR tối thiểu là 1').max(10000, 'Số lượng QR tối đa là 10,000'),
  packaging_unit: z.string().min(1, 'Đơn vị đóng gói không được để trống'),
  product_description: z.string().optional(),
});

export const ActivateBatchDto = z.object({
  activation_note: z.string().optional(),
});

export const RecallBatchDto = z.object({
  recall_reason: z.string().min(5, 'Lý do thu hồi phải có ít nhất 5 ký tự'),
});

export const WebhookQrDto = z.object({
  checkvn_batch_id: z.string().min(1, 'Mã lô hàng CheckVN không được để trống'),
  qr_codes: z.array(z.string().url('Đường dẫn mã QR không hợp lệ')).min(1, 'Danh sách mã QR không được để trống'),
});

export type CreateBatchInput = z.infer<typeof CreateBatchDto>;
export type ActivateBatchInput = z.infer<typeof ActivateBatchDto>;
export type RecallBatchInput = z.infer<typeof RecallBatchDto>;
export type WebhookQrInput = z.infer<typeof WebhookQrDto>;
