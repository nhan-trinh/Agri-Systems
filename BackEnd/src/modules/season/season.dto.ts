import { z } from 'zod';
import { SeasonStatus } from '@prisma/client';

export const CreateSeasonDto = z.object({
  farm_zone_id: z.string().min(1, 'Mã vùng trồng không được để trống'),
  season_name: z.string().min(2, 'Tên vụ mùa phải chứa tối thiểu 2 ký tự'),
  crop_variety: z.string().min(1, 'Giống cây trồng không được để trống'),
  start_date: z.string().min(1, 'Ngày bắt đầu không được để trống').transform((val) => new Date(val)),
  expected_end_date: z.string().min(1, 'Ngày kết thúc dự kiến không được để trống').transform((val) => new Date(val)),
  planned_yield_kg: z.number().positive('Sản lượng dự kiến phải là số dương'),
});

export const UpdateSeasonDto = CreateSeasonDto.partial().extend({
  actual_end_date: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  actual_yield_kg: z.number().positive('Sản lượng thực tế phải là số dương').optional(),
  status: z.nativeEnum(SeasonStatus).optional(),
});

export const CompleteSeasonDto = z.object({
  actual_end_date: z.string().min(1, 'Ngày thu hoạch thực tế không được để trống').transform((val) => new Date(val)),
  actual_yield_kg: z.number().positive('Sản lượng thu hoạch thực tế phải là số dương'),
});
