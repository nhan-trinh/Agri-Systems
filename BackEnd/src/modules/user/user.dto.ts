import { z } from 'zod';

// Vietnamese mobile number: 10 digits, leading 0, prefix 03x/05x/07x/08x/09x.
const PHONE_VN_REGEX = /^0[35789]\d{8}$/;

// ==================== CREATE MANAGER ====================

export const CreateManagerDto = z.object({
  phone: z
    .string()
    .trim()
    .regex(PHONE_VN_REGEX, 'Số điện thoại không hợp lệ (định dạng VN: 03x, 05x, 07x, 08x, 09x)'),
  full_name: z
    .string()
    .trim()
    .min(2, 'Họ tên phải có tối thiểu 2 ký tự')
    .max(200),
  cooperative_id: z
    .string()
    .min(1, 'Mã HTX không được để trống'),

  // NOTE: `role` is intentionally NOT accepted from the client. It is hardcoded
  // to HTX_MANAGER in the service to prevent privilege escalation — see user.service.ts.
  // Even if a caller includes `role: 'SUPER_ADMIN'` in the body, zod's default behavior
  // (strip unknown keys on .parse) drops it before it reaches the service.
});

// ==================== UPDATE STATUS ====================

export const UpdateStatusDto = z.object({
  is_active: z.boolean(),
});

// ==================== LIST USERS QUERY ====================

// is_active comes in as a query string ("true"/"false"), NOT a real boolean.
// z.coerce.boolean() would coerce ANY non-empty string (incl. "false") to true,
// which is a latent bug. Parse the string explicitly instead.
export const ListUsersQueryDto = z.object({
  role: z.enum(['HTX_MANAGER', 'FARMER', 'WAREHOUSE_KEEPER', 'GOV_VIEWER']).optional(),
  cooperative_id: z.string().min(1).optional(),
  is_active: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => (v === undefined ? undefined : v === 'true')),
  search: z.string().trim().optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

// ==================== INFERRED TYPES ====================

export type CreateManagerDtoType = z.infer<typeof CreateManagerDto>;
export type UpdateStatusDtoType = z.infer<typeof UpdateStatusDto>;
export type ListUsersQueryDtoType = z.infer<typeof ListUsersQueryDto>;
