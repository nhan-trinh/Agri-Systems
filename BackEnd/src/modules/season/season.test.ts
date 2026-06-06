import { CreateSeasonDto, CompleteSeasonDto } from './season.dto';

describe('Season DTO Validation', () => {
  it('should pass validation with valid create season data', () => {
    const validData = {
      farm_zone_id: 'zone-123',
      season_name: 'Vụ mùa Đông Xuân 2026',
      crop_variety: 'Giống lúa ST25',
      start_date: '2026-01-01',
      expected_end_date: '2026-04-30',
      planned_yield_kg: 5000,
    };

    const result = CreateSeasonDto.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.start_date).toBeInstanceOf(Date);
      expect(result.data.expected_end_date).toBeInstanceOf(Date);
    }
  });

  it('should fail validation if season_name is too short', () => {
    const invalidData = {
      farm_zone_id: 'zone-123',
      season_name: 'V', // too short
      crop_variety: 'Giống lúa ST25',
      start_date: '2026-01-01',
      expected_end_date: '2026-04-30',
      planned_yield_kg: 5000,
    };

    const result = CreateSeasonDto.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Tên vụ mùa phải chứa tối thiểu 2 ký tự');
    }
  });

  it('should fail validation if planned_yield_kg is negative', () => {
    const invalidData = {
      farm_zone_id: 'zone-123',
      season_name: 'Vụ mùa Đông Xuân 2026',
      crop_variety: 'Giống lúa ST25',
      start_date: '2026-01-01',
      expected_end_date: '2026-04-30',
      planned_yield_kg: -100, // negative
    };

    const result = CreateSeasonDto.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should pass validation with valid complete season data', () => {
    const validData = {
      actual_end_date: '2026-04-28',
      actual_yield_kg: 5200,
    };

    const result = CompleteSeasonDto.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail complete validation with negative actual yield', () => {
    const invalidData = {
      actual_end_date: '2026-04-28',
      actual_yield_kg: -5,
    };

    const result = CompleteSeasonDto.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});
