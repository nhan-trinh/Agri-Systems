import { z } from 'zod';
import { ActivityType } from '@prisma/client';

export const BaseFarmingLogObject = z.object({
  season_id: z.string().min(1, 'Mã vụ mùa không được để trống'),
  activity_date: z.string().min(1, 'Ngày thực hiện không được để trống').transform((val) => new Date(val)),
  activity_type: z.nativeEnum(ActivityType, {
    errorMap: () => ({ message: 'Loại hoạt động không hợp lệ' }),
  }),
  notes: z.string().optional(),
  photo_urls: z.array(z.string()).default([]),
  
  // Fertilizing fields
  fertilizer_type: z.string().optional(),
  quantity_kg: z.number().positive('Số lượng phân bón phải là số dương').optional(),
  
  // Pesticide fields
  product_name: z.string().optional(),
  dosage: z.number().positive('Liều lượng thuốc phải là số dương').optional(),
  unit: z.string().optional(),
  
  // Irrigation fields
  water_volume_m3: z.number().positive('Lượng nước phải là số dương').optional(),
  duration_hours: z.number().positive('Thời gian tưới phải là số dương').optional(),
  
  // Harvesting fields
  yield_kg: z.number().positive('Sản lượng thu hoạch phải là số dương').optional(),
  harvest_method: z.string().optional(),
});

export const CreateFarmingLogDto = BaseFarmingLogObject.superRefine((data, ctx) => {
  if (data.activity_type === ActivityType.FERTILIZING) {
    if (!data.fertilizer_type || data.fertilizer_type.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['fertilizer_type'],
        message: 'Loại phân bón không được để trống khi thực hiện bón phân',
      });
    }
    if (data.quantity_kg === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['quantity_kg'],
        message: 'Khối lượng phân bón không được để trống khi thực hiện bón phân',
      });
    }
  }

  if (data.activity_type === ActivityType.PESTICIDE) {
    if (!data.product_name || data.product_name.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['product_name'],
        message: 'Tên thuốc bảo vệ thực vật không được để trống khi phun thuốc',
      });
    }
    if (data.dosage === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['dosage'],
        message: 'Liều lượng phun không được để trống khi phun thuốc',
      });
    }
    if (!data.unit || data.unit.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['unit'],
        message: 'Đơn vị tính (lít, ml...) không được để trống khi phun thuốc',
      });
    }
  }

  if (data.activity_type === ActivityType.IRRIGATION) {
    if (data.water_volume_m3 === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['water_volume_m3'],
        message: 'Thể tích nước tưới không được để trống khi tưới tiêu',
      });
    }
    if (data.duration_hours === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['duration_hours'],
        message: 'Thời gian tưới nước không được để trống khi tưới tiêu',
      });
    }
  }

  if (data.activity_type === ActivityType.HARVESTING) {
    if (data.yield_kg === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['yield_kg'],
        message: 'Sản lượng thu hoạch không được để trống khi gặt hái',
      });
    }
    if (!data.harvest_method || data.harvest_method.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['harvest_method'],
        message: 'Phương pháp thu hoạch (thủ công, máy gặt...) không được để trống khi thu hoạch',
      });
    }
  }
});

export const UpdateFarmingLogDto = BaseFarmingLogObject.partial();
