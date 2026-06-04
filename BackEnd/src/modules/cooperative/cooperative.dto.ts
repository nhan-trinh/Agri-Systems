import { z } from 'zod';

export const CreateCooperativeDto = z.object({
  htx_code: z.string().min(2, 'Mã HTX phải chứa tối thiểu 2 ký tự').toUpperCase(),
  name: z.string().min(3, 'Tên HTX phải chứa tối thiểu 3 ký tự'),
  province: z.string().min(1, 'Tỉnh/Thành phố không được để trống'),
  district: z.string().min(1, 'Quận/Huyện không được để trống'),
  address: z.string().min(1, 'Địa chỉ không được để trống'),
  phone: z.string().optional(),
});

export const UpdateCooperativeDto = CreateCooperativeDto.partial();
