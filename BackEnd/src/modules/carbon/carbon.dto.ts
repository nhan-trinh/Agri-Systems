import { z } from 'zod';

export const CreateEmissionFactorDto = z.object({
  material_type: z.string().min(1, 'Loại vật tư không được để trống'),
  factor_value: z.number({ required_error: 'Hệ số phát thải không được để trống' }),
  unit: z.string().min(1, 'Đơn vị tính không được để trống'),
  description: z.string().min(1, 'Mô tả không được để trống'),
  source: z.string().min(1, 'Nguồn tài liệu không được để trống'),
  effective_from: z.string().transform((val) => new Date(val)),
  is_active: z.boolean().optional(),
});

export const UpdateEmissionFactorDto = CreateEmissionFactorDto.partial();
