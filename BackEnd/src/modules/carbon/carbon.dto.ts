import { z } from 'zod';
import { EmissionMaterialType, CropType } from '@prisma/client';

export const CreateEmissionFactorDto = z.object({
  material_type: z.nativeEnum(EmissionMaterialType, {
    errorMap: () => ({ message: 'Loại vật tư phải là FERTILIZER, PESTICIDE, hoặc HARVEST' }),
  }),
  material_name: z.string().min(1, 'Tên vật tư không được để trống'),
  crop_type: z.nativeEnum(CropType).nullable().optional(),
  factor_value: z.number({ required_error: 'Hệ số phát thải không được để trống' }),
  unit: z.string().min(1, 'Đơn vị tính không được để trống'),
  description: z.string().min(1, 'Mô tả không được để trống'),
  source: z.string().min(1, 'Nguồn tài liệu không được để trống'),
  is_active: z.boolean().optional(),
});

export const UpdateEmissionFactorDto = CreateEmissionFactorDto.partial();
