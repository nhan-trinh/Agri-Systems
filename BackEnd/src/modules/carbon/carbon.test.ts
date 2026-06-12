import { carbonCalculationService } from './carbon.calculation.service';
import { carbonRecordService } from './carbon.record.service';
import { carbonRepository } from './carbon.repository';
import { carbonCertificateQueue } from '../../shared/queues/carbon.queue';
import { CarbonStatus, UserRole, CropType, EmissionMaterialType } from '@prisma/client';
import { AppError } from '../../shared/utils/app-error';

// Mock dependencies
jest.mock('./carbon.repository');
jest.mock('../../shared/queues/carbon.queue', () => ({
  carbonCertificateQueue: {
    add: jest.fn().mockResolvedValue({}),
  },
}));
jest.mock('../dashboard/dashboard.cache', () => ({
  dashboardCache: {
    invalidateCooperativeCache: jest.fn().mockResolvedValue({}),
  },
}));

const mockCarbonRepository = carbonRepository as jest.Mocked<typeof carbonRepository>;

const mockFactors: any[] = [
  { material_type: 'FERTILIZER', material_name: 'Urea', factor_value: 1.974, unit: 'kgCO2e/kg', crop_type: null },
  { material_type: 'FERTILIZER', material_name: 'NPK 16-16-8', factor_value: 0.688, unit: 'kgCO2e/kg', crop_type: null },
  { material_type: 'HARVEST', material_name: 'Lúa', factor_value: 0.189, unit: 'kgCO2/kg', crop_type: CropType.RICE },
];

const mockSeason = {
  id: 'season-123',
  farm_zone: { crop_type: CropType.RICE },
  farming_logs: [
    { id: 'log-1', activity_type: 'FERTILIZING', fertilizer_type: 'Urea', quantity_kg: 100, activity_date: new Date() },
    { id: 'log-2', activity_type: 'FERTILIZING', fertilizer_type: 'NPK 16-16-8', quantity_kg: 50, activity_date: new Date() },
    { id: 'log-3', activity_type: 'HARVESTING', yield_kg: 500, activity_date: new Date() },
  ],
};

const mockUser: any = {
  userId: 'user-admin-123',
  role: UserRole.SUPER_ADMIN,
  cooperativeId: null,
};

describe('CarbonCalculationService', () => {
  it('✅ Tính đúng emission từ Urea: 100kg × 1.974 = 197.4 kgCO2e', () => {
    const singleSeason = {
      ...mockSeason,
      farming_logs: [mockSeason.farming_logs[0]],
    };
    const result = carbonCalculationService.calculateSeasonEmissions(singleSeason, mockFactors);
    expect(result.totalEmittedKg).toBe(197.4);
    expect(result.totalSequesteredKg).toBe(0);
  });

  it('✅ Tính đúng emission từ NPK: 50kg × 0.688 = 34.4 kgCO2e', () => {
    const singleSeason = {
      ...mockSeason,
      farming_logs: [mockSeason.farming_logs[1]],
    };
    const result = carbonCalculationService.calculateSeasonEmissions(singleSeason, mockFactors);
    expect(result.totalEmittedKg).toBe(34.4);
    expect(result.totalSequesteredKg).toBe(0);
  });

  it('✅ Tính đúng sequestration lúa: 500kg × 0.189 = 94.5 kgCO2', () => {
    const singleSeason = {
      ...mockSeason,
      farming_logs: [mockSeason.farming_logs[2]],
    };
    const result = carbonCalculationService.calculateSeasonEmissions(singleSeason, mockFactors);
    expect(result.totalEmittedKg).toBe(0);
    expect(result.totalSequesteredKg).toBe(94.5);
  });

  it('✅ Net = (emitted - sequestered) / 1000', () => {
    const result = carbonCalculationService.calculateSeasonEmissions(mockSeason, mockFactors);
    // Emitted = 197.4 + 34.4 = 231.8
    // Sequestered = 94.5
    // Net = (231.8 - 94.5) / 1000 = 137.3 / 1000 = 0.137
    expect(result.netCarbonTCO2e).toBe(0.137);
  });

  it('✅ Net âm → can_issue_credit = true', () => {
    const highHarvestSeason = {
      ...mockSeason,
      farming_logs: [
        { id: 'log-3', activity_type: 'HARVESTING', yield_kg: 2000, activity_date: new Date() }, // sequestered = 378
      ],
    };
    const result = carbonCalculationService.calculateSeasonEmissions(highHarvestSeason, mockFactors);
    // Net = (0 - 378) / 1000 = -0.378
    expect(result.netCarbonTCO2e).toBeLessThan(0);
  });

  it('✅ Net dương → can_issue_credit = false', () => {
    const result = carbonCalculationService.calculateSeasonEmissions(mockSeason, mockFactors);
    expect(result.netCarbonTCO2e).toBeGreaterThan(0);
  });

  it('✅ Fallback factor khi không tìm thấy fertilizer_type', () => {
    const unknownFertSeason = {
      ...mockSeason,
      farming_logs: [
        { id: 'log-1', activity_type: 'FERTILIZING', fertilizer_type: 'UnknownFertilizer', quantity_kg: 100, activity_date: new Date() },
      ],
    };
    const result = carbonCalculationService.calculateSeasonEmissions(unknownFertSeason, mockFactors);
    // Fallback is 0.114
    expect(result.totalEmittedKg).toBe(11.4);
  });

  it('✅ calculation_details chứa đủ breakdown và factor_version', () => {
    const result = carbonCalculationService.calculateSeasonEmissions(mockSeason, mockFactors);
    expect(result.calculationDetails).toHaveProperty('factor_version');
    expect(result.calculationDetails.fertilizers).toHaveLength(2);
    expect(result.calculationDetails.harvest).toHaveLength(1);
  });
});

describe('CarbonRecordService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('✅ verify: DRAFT → VERIFIED', async () => {
    const mockRecord = {
      id: 'record-123',
      status: CarbonStatus.DRAFT,
      season: { farm_zone: { farmer: { cooperative_id: 'coop-123' } } },
    };
    mockCarbonRepository.findCarbonRecordById.mockResolvedValue(mockRecord as any);
    mockCarbonRepository.updateCarbonRecordStatus.mockResolvedValue({
      ...mockRecord,
      status: CarbonStatus.VERIFIED,
    } as any);

    const result = await carbonRecordService.verifyCarbonRecord('record-123', mockUser);
    expect(result.status).toBe(CarbonStatus.VERIFIED);
    expect(mockCarbonRepository.updateCarbonRecordStatus).toHaveBeenCalledWith('record-123', CarbonStatus.VERIFIED, expect.any(Object));
  });

  it('❌ verify: VERIFIED → 422 INVALID_CARBON_STATUS', async () => {
    const mockRecord = {
      id: 'record-123',
      status: CarbonStatus.VERIFIED,
      season: { farm_zone: { farmer: { cooperative_id: 'coop-123' } } },
    };
    mockCarbonRepository.findCarbonRecordById.mockResolvedValue(mockRecord as any);

    await expect(carbonRecordService.verifyCarbonRecord('record-123', mockUser)).rejects.toThrow(
      'Chỉ bản ghi ở trạng thái DRAFT mới có thể xác minh'
    );
  });

  it('❌ verify: ISSUED → 422 INVALID_CARBON_STATUS', async () => {
    const mockRecord = {
      id: 'record-123',
      status: CarbonStatus.ISSUED,
      season: { farm_zone: { farmer: { cooperative_id: 'coop-123' } } },
    };
    mockCarbonRepository.findCarbonRecordById.mockResolvedValue(mockRecord as any);

    await expect(carbonRecordService.verifyCarbonRecord('record-123', mockUser)).rejects.toThrow(
      'Chỉ bản ghi ở trạng thái DRAFT mới có thể xác minh'
    );
  });

  it('✅ issue: VERIFIED + net âm → ISSUED + certificate_no', async () => {
    const mockRecord = {
      id: 'record-123',
      status: CarbonStatus.VERIFIED,
      net_carbon_tCO2e: -2.35,
      season: { farm_zone: { farmer: { cooperative_id: 'coop-123' } } },
    };
    mockCarbonRepository.findCarbonRecordById.mockResolvedValue(mockRecord as any);
    mockCarbonRepository.updateCarbonRecordStatus.mockResolvedValue({
      ...mockRecord,
      status: CarbonStatus.ISSUED,
      certificate_no: 'CARBON-2026-ABC123',
    } as any);
    mockCarbonRepository.createExportJob.mockResolvedValue({ id: 'export-job-123' } as any);

    const result = await carbonRecordService.issueCarbonCredits('record-123', mockUser);
    expect(result.record.status).toBe(CarbonStatus.ISSUED);
    expect(result.exportJobId).toBe('export-job-123');
    expect(carbonCertificateQueue.add).toHaveBeenCalled();
  });

  it('❌ issue: DRAFT → 422 INVALID_CARBON_STATUS', async () => {
    const mockRecord = {
      id: 'record-123',
      status: CarbonStatus.DRAFT,
      net_carbon_tCO2e: -2.35,
      season: { farm_zone: { farmer: { cooperative_id: 'coop-123' } } },
    };
    mockCarbonRepository.findCarbonRecordById.mockResolvedValue(mockRecord as any);

    await expect(carbonRecordService.issueCarbonCredits('record-123', mockUser)).rejects.toThrow(
      'Chỉ bản ghi ở trạng thái VERIFIED mới có thể phát hành tín chỉ'
    );
  });

  it('❌ issue: net dương → 422 CARBON_NOT_ELIGIBLE', async () => {
    const mockRecord = {
      id: 'record-123',
      status: CarbonStatus.VERIFIED,
      net_carbon_tCO2e: 1.25,
      season: { farm_zone: { farmer: { cooperative_id: 'coop-123' } } },
    };
    mockCarbonRepository.findCarbonRecordById.mockResolvedValue(mockRecord as any);

    await expect(carbonRecordService.issueCarbonCredits('record-123', mockUser)).rejects.toThrow(
      'Vụ mùa này không đạt hấp thụ ròng để phát hành tín chỉ carbon'
    );
  });

  it('✅ certificate_no format: CARBON-YYYY-XXXXXX', async () => {
    const mockRecord = {
      id: 'record-123',
      status: CarbonStatus.VERIFIED,
      net_carbon_tCO2e: -2.35,
      season: { farm_zone: { farmer: { cooperative_id: 'coop-123' } } },
    };
    mockCarbonRepository.findCarbonRecordById.mockResolvedValue(mockRecord as any);
    mockCarbonRepository.updateCarbonRecordStatus.mockImplementation(async (id, status, data: any) => {
      return {
        ...mockRecord,
        status,
        ...data,
      } as any;
    });
    mockCarbonRepository.createExportJob.mockResolvedValue({ id: 'export-job-123' } as any);

    const result = await carbonRecordService.issueCarbonCredits('record-123', mockUser);
    expect(result.record.certificate_no).toMatch(/^CARBON-\d{4}-[A-Z0-9]{12}$/);
    expect(result.record.credit_amount_tCO2e).toBe(2.35);
  });

  it('✅ getCarbonRecords: supports pagination and filters correctly', async () => {
    const mockRecords = [
      { id: 'record-1', status: CarbonStatus.VERIFIED },
      { id: 'record-2', status: CarbonStatus.VERIFIED },
    ];
    mockCarbonRepository.findAllCarbonRecords.mockResolvedValue({
      data: mockRecords,
      total: 2,
    } as any);

    const result = await carbonRecordService.getCarbonRecords(mockUser, CarbonStatus.VERIFIED, 1, 10);
    expect(result.data).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(mockCarbonRepository.findAllCarbonRecords).toHaveBeenCalledWith(
      { status: CarbonStatus.VERIFIED },
      1,
      10
    );
  });
});
