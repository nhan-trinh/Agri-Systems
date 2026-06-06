import { CreateFarmingLogDto } from './farming-log.dto';
import { ActivityType } from '@prisma/client';

describe('FarmingLog DTO Validation', () => {
  it('should pass with a valid SEEDING activity', () => {
    const validData = {
      season_id: 'season-cuid-123',
      activity_date: '2026-06-04',
      activity_type: ActivityType.SEEDING,
      notes: 'Gieo giống lúa ST25',
    };

    const result = CreateFarmingLogDto.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail FERTILIZING activity if fertilizer fields are missing', () => {
    const invalidData = {
      season_id: 'season-cuid-123',
      activity_date: '2026-06-04',
      activity_type: ActivityType.FERTILIZING,
      notes: 'Bón phân đợt 1',
    };

    const result = CreateFarmingLogDto.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map(e => e.message);
      expect(messages).toContain('Loại phân bón không được để trống khi thực hiện bón phân');
      expect(messages).toContain('Khối lượng phân bón không được để trống khi thực hiện bón phân');
    }
  });

  it('should pass FERTILIZING activity with valid fields', () => {
    const validData = {
      season_id: 'season-cuid-123',
      activity_date: '2026-06-04',
      activity_type: ActivityType.FERTILIZING,
      fertilizer_type: 'Phân đạm Ure',
      quantity_kg: 50,
      notes: 'Bón phân đợt 1',
    };

    const result = CreateFarmingLogDto.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail PESTICIDE activity if pesticide fields are missing', () => {
    const invalidData = {
      season_id: 'season-cuid-123',
      activity_date: '2026-06-04',
      activity_type: ActivityType.PESTICIDE,
    };

    const result = CreateFarmingLogDto.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map(e => e.message);
      expect(messages).toContain('Tên thuốc bảo vệ thực vật không được để trống khi phun thuốc');
      expect(messages).toContain('Liều lượng phun không được để trống khi phun thuốc');
      expect(messages).toContain('Đơn vị tính (lít, ml...) không được để trống khi phun thuốc');
    }
  });

  it('should pass PESTICIDE activity with valid fields', () => {
    const validData = {
      season_id: 'season-cuid-123',
      activity_date: '2026-06-04',
      activity_type: ActivityType.PESTICIDE,
      product_name: 'Anvil 5SC',
      dosage: 500,
      unit: 'ml',
    };

    const result = CreateFarmingLogDto.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail IRRIGATION activity if irrigation fields are missing', () => {
    const invalidData = {
      season_id: 'season-cuid-123',
      activity_date: '2026-06-04',
      activity_type: ActivityType.IRRIGATION,
    };

    const result = CreateFarmingLogDto.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map(e => e.message);
      expect(messages).toContain('Thể tích nước tưới không được để trống khi tưới tiêu');
      expect(messages).toContain('Thời gian tưới nước không được để trống khi tưới tiêu');
    }
  });

  it('should fail HARVESTING activity if harvest fields are missing', () => {
    const invalidData = {
      season_id: 'season-cuid-123',
      activity_date: '2026-06-04',
      activity_type: ActivityType.HARVESTING,
    };

    const result = CreateFarmingLogDto.safeParse(invalidData);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.errors.map(e => e.message);
      expect(messages).toContain('Sản lượng thu hoạch không được để trống khi gặt hái');
      expect(messages).toContain('Phương pháp thu hoạch (thủ công, máy gặt...) không được để trống khi thu hoạch');
    }
  });
});
