import { CreateFarmZoneDto } from './farm-zone.dto';
import { CropType } from '@prisma/client';

describe('FarmZone DTO Validation', () => {
  const validBoundary = {
    type: 'Polygon' as const,
    coordinates: [
      [
        [108.0, 12.0],
        [109.0, 12.0],
        [109.0, 13.0],
        [108.0, 13.0],
        [108.0, 12.0], // closed ring
      ],
    ],
  };

  it('should pass validation with valid boundary and required fields', () => {
    const validData = {
      zone_name: 'Cánh đồng A',
      farmer_id: 'farmer-123',
      crop_type: CropType.RICE,
      boundary: validBoundary,
      description: 'Mô tả vùng trồng',
    };

    const result = CreateFarmZoneDto.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should pass validation without optional description', () => {
    const validData = {
      zone_name: 'Cánh đồng B',
      farmer_id: 'farmer-123',
      crop_type: CropType.COFFEE,
      boundary: validBoundary,
    };

    const result = CreateFarmZoneDto.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail validation if zone_name is too short', () => {
    const invalidData = {
      zone_name: 'C',
      farmer_id: 'farmer-123',
      crop_type: CropType.RICE,
      boundary: validBoundary,
    };

    const result = CreateFarmZoneDto.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Tên vùng trồng phải chứa tối thiểu 2 ký tự');
    }
  });

  it('should fail validation if crop_type is invalid', () => {
    const invalidData = {
      zone_name: 'Cánh đồng C',
      farmer_id: 'farmer-123',
      crop_type: 'INVALID_CROP',
      boundary: validBoundary,
    };

    const result = CreateFarmZoneDto.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should fail validation if polygon ring is not closed', () => {
    const unclosedBoundary = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [108.0, 12.0],
          [109.0, 12.0],
          [109.0, 13.0],
          [108.0, 13.0],
          [108.0, 12.5], // not closed (first was [108.0, 12.0])
        ],
      ],
    };

    const invalidData = {
      zone_name: 'Cánh đồng D',
      farmer_id: 'farmer-123',
      crop_type: CropType.RICE,
      boundary: unclosedBoundary,
    };

    const result = CreateFarmZoneDto.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Ranh giới đa giác không hợp lệ');
    }
  });

  it('should fail validation if polygon ring has less than 4 points', () => {
    const tooFewPointsBoundary = {
      type: 'Polygon' as const,
      coordinates: [
        [
          [108.0, 12.0],
          [109.0, 12.0],
          [108.0, 12.0], // only 3 points (unclosed or not a polygon)
        ],
      ],
    };

    const invalidData = {
      zone_name: 'Cánh đồng E',
      farmer_id: 'farmer-123',
      crop_type: CropType.RICE,
      boundary: tooFewPointsBoundary,
    };

    const result = CreateFarmZoneDto.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
