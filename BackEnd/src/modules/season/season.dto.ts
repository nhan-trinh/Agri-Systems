import { z } from 'zod';

export const CreateSeasonDto = z.object({
  farm_zone_id: z.string().min(1, 'Mã vùng trồng không được để trống'),
  season_name: z.string().min(2, 'Tên vụ mùa phải chứa tối thiểu 2 ký tự'),
  crop_variety: z.string().min(1, 'Giống cây trồng không được để trống'),
  start_date: z.string().min(1, 'Ngày bắt đầu không được để trống').transform((val) => new Date(val)),
  expected_end_date: z.string().min(1, 'Ngày kết thúc dự kiến không được để trống').transform((val) => new Date(val)),
  planned_yield_kg: z.number().positive('Sản lượng dự kiến phải là số dương'),
}).refine((data) => {
  return data.start_date < data.expected_end_date;
}, {
  message: 'Ngày bắt đầu phải trước ngày kết thúc dự kiến',
  path: ['start_date'],
});

// R-06: Removed `status` from UpdateSeasonDto — status transitions must go through
// dedicated endpoints (completeSeason / cancelSeason) to ensure carbon queue is triggered.
export const UpdateSeasonDto = z.object({
  season_name: z.string().min(2, 'Tên vụ mùa phải chứa tối thiểu 2 ký tự').optional(),
  crop_variety: z.string().min(1, 'Giống cây trồng không được để trống').optional(),
  start_date: z.string().transform((val) => new Date(val)).optional(),
  expected_end_date: z.string().transform((val) => new Date(val)).optional(),
  planned_yield_kg: z.number().positive('Sản lượng dự kiến phải là số dương').optional(),
});

export const CompleteSeasonDto = z.object({
  actual_end_date: z.string().min(1, 'Ngày thu hoạch thực tế không được để trống').transform((val) => new Date(val)),
  actual_yield_kg: z.number().positive('Sản lượng thu hoạch thực tế phải là số dương'),
});
