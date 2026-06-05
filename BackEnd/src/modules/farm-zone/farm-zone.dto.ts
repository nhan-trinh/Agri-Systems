import { z } from 'zod';
import { CropType } from '@prisma/client';

// Position: [longitude, latitude]
const PositionSchema = z.array(z.number()).min(2).max(3);

// LinearRing: array of positions, minimum 4 elements (first and last must match)
const LinearRingSchema = z.array(PositionSchema).min(4);

// Polygon: array of linear rings
const PolygonCoordinatesSchema = z.array(LinearRingSchema);

export const GeoJsonPolygonSchema = z.object({
  type: z.literal('Polygon'),
  coordinates: PolygonCoordinatesSchema,
}).refine((data) => {
  for (const ring of data.coordinates) {
    if (ring.length < 4) return false;
    const first = ring[0];
    const last = ring[ring.length - 1];
    // Check if the ring is closed (first point equals last point)
    // allowing minor floating point comparison tolerance
    const lonDiff = Math.abs(first[0] - last[0]);
    const latDiff = Math.abs(first[1] - last[1]);
    if (lonDiff > 0.000001 || latDiff > 0.000001) {
      return false;
    }
  }
  return true;
}, {
  message: 'Ranh giới đa giác không hợp lệ (điểm đầu và điểm cuối phải trùng khớp để khép kín vùng).',
});

export const CreateFarmZoneDto = z.object({
  zone_name: z.string().min(2, 'Tên vùng trồng phải chứa tối thiểu 2 ký tự'),
  farmer_id: z.string().min(1, 'Mã nông dân không được để trống'),
  crop_type: z.nativeEnum(CropType, {
    errorMap: () => ({ message: 'Loại cây trồng không hợp lệ' }),
  }),
  boundary: GeoJsonPolygonSchema,
  description: z.string().optional(),
});

export const UpdateFarmZoneDto = CreateFarmZoneDto.partial();

export const CheckOverlapDto = z.object({
  boundary: GeoJsonPolygonSchema,
  exclude_id: z.string().optional(),
});
