import { z } from 'zod';

const PHONE_VN_REGEX = /^0[35789]\d{8}$/;

const OptionalBooleanQuery = z
  .enum(['true', 'false'])
  .optional()
  .transform((value) => (value === undefined ? undefined : value === 'true'));

const OptionalDate = z
  .union([
    z.string().datetime(),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  ])
  .optional()
  .nullable()
  .transform((value) => (value ? new Date(value) : null));

export const CreateFarmerDto = z.object({
  full_name: z.string().min(2, 'Ho ten phai chua toi thieu 2 ky tu').max(100),
  phone: z.string().regex(PHONE_VN_REGEX, 'Số điện thoại không hợp lệ'),
  national_id: z
    .string()
    .regex(/^\d{9}$|^\d{12}$/, 'CCCD/CMND phai co 9 hoac 12 chu so')
    .optional(),
  date_of_birth: OptionalDate.optional(),
  address: z.string().min(1, 'Dia chi khong duoc de trong').max(500),
  cooperative_id: z.string().min(1, 'Ma HTX khong duoc de trong'),
});

export const UpdateFarmerDto = CreateFarmerDto.omit({
  phone: true,
  cooperative_id: true,
}).partial();

export const FarmerQueryDto = z.object({
  cooperative_id: z.string().optional(),
  is_active: OptionalBooleanQuery,
  search: z.string().trim().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort_by: z.enum(['created_at', 'updated_at', 'full_name', 'farmer_code']).optional().default('created_at'),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateFarmerInput = z.infer<typeof CreateFarmerDto>;
export type UpdateFarmerInput = z.infer<typeof UpdateFarmerDto>;
export type FarmerQueryInput = z.infer<typeof FarmerQueryDto>;
