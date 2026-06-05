import { z } from 'zod';

const PHONE_VN_REGEX = /^0[35789]\d{8}$/;

export const CreateFarmerDto = z.object({
  full_name: z.string().min(2, 'Họ tên phải chứa tối thiểu 2 ký tự'),
  phone: z.string().regex(PHONE_VN_REGEX, 'Số điện thoại không hợp lệ (định dạng VN: 03x, 05x, 07x, 08x, 09x)'),
  national_id: z.string().optional(),
  date_of_birth: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  address: z.string().min(1, 'Địa chỉ không được để trống'),
  cooperative_id: z.string().min(1, 'Mã HTX không được để trống'),
});

export const UpdateFarmerDto = CreateFarmerDto.partial();
