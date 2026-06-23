import { z } from 'zod';

// ==================== CREATE ====================

export const CreateCooperativeDto = z.object({
  // Trim + uppercase so " bmt01 " and "BMT01" collide at the DB unique constraint,
  // not just at the app-level check (fixes garbage-input drift).
  htx_code: z.string().trim().min(2, 'Mã HTX phải chứa tối thiểu 2 ký tự').max(20).toUpperCase(),
  name: z.string().trim().min(3, 'Tên HTX phải chứa tối thiểu 3 ký tự').max(200),
  province: z.string().trim().min(1, 'Tỉnh/Thành phố không được để trống').max(100),
  district: z.string().trim().min(1, 'Quận/Huyện không được để trống').max(100),
  address: z.string().trim().min(1, 'Địa chỉ không được để trống').max(300),
  // Vietnamese phone format: optional but, when present, must look like a phone number
  // (10-11 digits, optional leading +84 / 0). Kept loose to avoid rejecting valid landlines.
  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)[\d\s-]{8,14}$/, 'Số điện thoại không hợp lệ')
    .optional(),
});

// ==================== UPDATE ====================

export const UpdateCooperativeDto = CreateCooperativeDto.partial();

// ==================== LIST QUERY ====================

export const ListCooperativeQueryDto = z.object({
  search: z.string().trim().optional(), // matches name or htx_code (case-insensitive)
  is_active: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ==================== INFERRED TYPES ====================

export type CreateCooperativeDtoType = z.infer<typeof CreateCooperativeDto>;
export type UpdateCooperativeDtoType = z.infer<typeof UpdateCooperativeDto>;
export type ListCooperativeQueryDtoType = z.infer<typeof ListCooperativeQueryDto>;
