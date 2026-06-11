import { checkvnQrService } from './checkvn-qr.service';
import { checkvnQrRepository } from './checkvn-qr.repository';
import { seasonRepository } from '../season/season.repository';
import prisma from '../../prisma/client';
import { AppError } from '../../shared/utils/app-error';
import { BatchStatus, QrStatus } from '@prisma/client';
import crypto from 'crypto';
import axios from 'axios';

// Mock Prisma
jest.mock('../../prisma/client', () => ({
  __esModule: true,
  default: {
    batch: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  },
}));

// Mock Redis
const mockRedisGet = jest.fn();
const mockRedisSet = jest.fn();
const mockRedisDel = jest.fn();
jest.mock('../../shared/utils/redis.client', () => ({
  getRedisClient: jest.fn().mockResolvedValue({
    get: (...args: any[]) => mockRedisGet(...args),
    set: (...args: any[]) => mockRedisSet(...args),
    del: (...args: any[]) => mockRedisDel(...args),
  }),
}));

// Mock repositories
jest.mock('./checkvn-qr.repository');
jest.mock('../season/season.repository');
jest.mock('axios');

const mockCheckvnQrRepo = checkvnQrRepository as jest.Mocked<typeof checkvnQrRepository>;
const mockSeasonRepo = seasonRepository as jest.Mocked<typeof seasonRepository>;
const mockAxios = axios as jest.Mocked<typeof axios>;

describe('CheckvnQr Service Tests', () => {
  const mockUser = {
    id: 'user-manager-001',
    role: 'HTX_MANAGER',
    cooperative_id: 'coop-001',
  };

  const mockSeason = {
    id: 'season-001',
    status: 'COMPLETED',
    actual_yield_kg: 5000,
    farm_zone: {
      farm_zone_code: 'ZONE001',
      farmer: {
        cooperative_id: 'coop-001',
        full_name: 'Nguyen Van A',
        address: 'Dong Thap',
        cooperative: {
          name: 'HTX Dong Thap',
          address: 'Dong Thap',
          phone: '0901234567',
        },
      },
    },
  };

  const mockBatch = {
    id: 'batch-001',
    batch_code: 'ZONE001-20260611-001',
    season_id: 'season-001',
    batch_name: 'Gạo ST25',
    total_weight_kg: 4000,
    quantity_qr_requested: 10,
    packaging_unit: 'Túi 5kg',
    product_description: 'Mô tả',
    status: BatchStatus.DRAFT,
    checkvn_batch_id: null,
    activated_at: null,
    activation_note: null,
    recalled_at: null,
    recall_reason: null,
    created_by: 'user-manager-001',
    created_at: new Date(),
    updated_at: new Date(),
    season: mockSeason,
    qr_codes: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(checkvnQrService as any, 'triggerMockCheckvnWebhook').mockImplementation(() => {});
    jest.spyOn(checkvnQrService as any, 'incrementScanInBackground').mockImplementation(() => {});
  });

  describe('createBatch', () => {
    it('should create batch successfully', async () => {
      mockSeasonRepo.findById.mockResolvedValue(mockSeason);
      mockCheckvnQrRepo.findBatchBySeasonId.mockResolvedValue(null);
      (prisma.batch.findMany as jest.Mock).mockResolvedValue([]);
      mockCheckvnQrRepo.createBatch.mockResolvedValue(mockBatch);

      const data = {
        season_id: 'season-001',
        batch_name: 'Gạo ST25',
        total_weight_kg: 4000,
        quantity_qr: 10,
        packaging_unit: 'Túi 5kg',
        product_description: 'Mô tả',
      };

      const result = await checkvnQrService.createBatch(data, mockUser);
      expect(result).toBeDefined();
      expect(mockSeasonRepo.findById).toHaveBeenCalledWith('season-001');
      expect(mockCheckvnQrRepo.createBatch).toHaveBeenCalled();
    });

    it('should throw error if season not found', async () => {
      mockSeasonRepo.findById.mockResolvedValue(null);

      const data = {
        season_id: 'season-invalid',
        batch_name: 'Gạo ST25',
        total_weight_kg: 4000,
        quantity_qr: 10,
        packaging_unit: 'Túi 5kg',
      };

      await expect(checkvnQrService.createBatch(data, mockUser)).rejects.toThrow(
        'Không tìm thấy vụ mùa'
      );
    });

    it('should throw error if season is not completed', async () => {
      mockSeasonRepo.findById.mockResolvedValue({ ...mockSeason, status: 'ACTIVE' });

      const data = {
        season_id: 'season-001',
        batch_name: 'Gạo ST25',
        total_weight_kg: 4000,
        quantity_qr: 10,
        packaging_unit: 'Túi 5kg',
      };

      await expect(checkvnQrService.createBatch(data, mockUser)).rejects.toThrow(
        'Vụ mùa chưa hoàn thành (COMPLETED)'
      );
    });

    it('should throw error if weight exceeds actual yield', async () => {
      mockSeasonRepo.findById.mockResolvedValue(mockSeason);

      const data = {
        season_id: 'season-001',
        batch_name: 'Gạo ST25',
        total_weight_kg: 6000, // exceeds 5000
        quantity_qr: 10,
        packaging_unit: 'Túi 5kg',
      };

      await expect(checkvnQrService.createBatch(data, mockUser)).rejects.toThrow(
        'Khối lượng lô hàng vượt quá sản lượng thu hoạch thực tế'
      );
    });
  });

  describe('requestQrCode', () => {
    it('should request QR code successfully and update status to PENDING_QR', async () => {
      mockCheckvnQrRepo.findBatchById.mockResolvedValue(mockBatch as any);
      mockCheckvnQrRepo.updateBatchStatus.mockResolvedValue({
        ...mockBatch,
        status: BatchStatus.PENDING_QR,
      } as any);

      const result = await checkvnQrService.requestQrCode('batch-001', mockUser);
      expect(result).toHaveProperty('checkvn_batch_id');
      expect(mockCheckvnQrRepo.updateBatchStatus).toHaveBeenCalledWith('batch-001', BatchStatus.PENDING_QR, expect.any(Object));
    });

    it('should throw error if user belongs to different cooperative', async () => {
      mockCheckvnQrRepo.findBatchById.mockResolvedValue(mockBatch as any);
      const invalidUser = { ...mockUser, cooperative_id: 'coop-different' };

      await expect(checkvnQrService.requestQrCode('batch-001', invalidUser)).rejects.toThrow(
        'Bạn không có quyền thực hiện yêu cầu cấp QR cho lô hàng này'
      );
    });

    it('should throw error if batch status is not DRAFT', async () => {
      mockCheckvnQrRepo.findBatchById.mockResolvedValue({
        ...mockBatch,
        status: BatchStatus.PENDING_QR,
      } as any);

      await expect(checkvnQrService.requestQrCode('batch-001', mockUser)).rejects.toThrow(
        'Chỉ có thể yêu cầu cấp QR cho lô hàng ở trạng thái DRAFT'
      );
    });
  });

  describe('processWebhook', () => {
    const webhookSecret = 'your_checkvn_webhook_secret';
    const payload = {
      checkvn_batch_id: 'CVN-12345',
      qr_codes: ['https://check.gov.vn/qr/v2/ZONE-0001', 'https://check.gov.vn/qr/v2/ZONE-0002'],
    };
    const signature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');

    it('should process webhook and save qr codes successfully', async () => {
      mockCheckvnQrRepo.findBatchByCheckvnId.mockResolvedValue({
        ...mockBatch,
        status: BatchStatus.PENDING_QR,
      } as any);

      const result = await checkvnQrService.processWebhook(payload, signature);
      expect(result.message).toBe('Webhook processed successfully');
      expect(mockCheckvnQrRepo.saveQrCodesTransaction).toHaveBeenCalledWith(expect.any(String), payload.qr_codes);
    });

    it('should throw 401 if signature is invalid', async () => {
      await expect(checkvnQrService.processWebhook(payload, 'invalid_sig')).rejects.toThrow(
        'Chữ ký webhook không hợp lệ'
      );
    });
  });

  describe('activateBatch', () => {
    it('should activate batch successfully', async () => {
      const qrReceivedBatch = { ...mockBatch, status: BatchStatus.QR_RECEIVED };
      mockCheckvnQrRepo.findBatchById.mockResolvedValue(qrReceivedBatch as any);
      mockCheckvnQrRepo.getBatchQrCodes.mockResolvedValue([
        { code: 'QR-001' },
        { code: 'QR-002' },
      ] as any);

      await checkvnQrService.activateBatch('batch-001', 'note', mockUser);
      expect(mockCheckvnQrRepo.activateBatchTransaction).toHaveBeenCalledWith('batch-001', 'note');
      expect(mockRedisDel).toHaveBeenCalled();
    });
  });

  describe('recallBatch', () => {
    it('should recall batch successfully', async () => {
      const activeBatch = { ...mockBatch, status: BatchStatus.ACTIVE };
      mockCheckvnQrRepo.findBatchById.mockResolvedValue(activeBatch as any);
      mockCheckvnQrRepo.getBatchQrCodes.mockResolvedValue([
        { code: 'QR-001' },
      ] as any);

      await checkvnQrService.recallBatch('batch-001', 'reason details', mockUser);
      expect(mockCheckvnQrRepo.recallBatchTransaction).toHaveBeenCalledWith('batch-001', 'reason details');
      expect(mockRedisDel).toHaveBeenCalled();
    });
  });

  describe('publicTrace', () => {
    const mockQrCode = {
      id: 'qr-001',
      code: 'https://check.gov.vn/qr/v2/ZONE-0001',
      status: QrStatus.ACTIVE,
      batch: {
        batch_code: 'ZONE001-20260611-001',
        batch_name: 'Gạo ST25',
        total_weight_kg: 4000,
        packaging_unit: 'Túi 5kg',
        product_description: 'Mô tả',
        created_at: new Date(),
        activated_at: new Date(),
        season: {
          season_name: 'Mùa Vụ ST25',
          crop_variety: 'ST25',
          start_date: new Date(),
          actual_end_date: new Date(),
          actual_yield_kg: 5000,
          farm_zone: {
            zone_name: 'Vùng 1',
            farm_zone_code: 'ZONE001',
            area_sqm: 1000,
            boundary: {},
            farmer: {
              full_name: 'Farmer A',
              address: 'Dong Thap',
              cooperative: {
                name: 'HTX A',
                address: 'Dong Thap',
                phone: '123',
              },
            },
          },
          farming_logs: [],
        },
      },
    };

    it('should return trace data from cache if present', async () => {
      const cachedValue = {
        qrCodeId: 'qr-001',
        traceData: { status: 'ACTIVE', batch: { batch_code: 'ZONE001-20260611-001' } },
      };
      mockRedisGet.mockResolvedValue(JSON.stringify(cachedValue));
      mockCheckvnQrRepo.incrementQrScanCount.mockResolvedValue(undefined);

      const result = await checkvnQrService.publicTrace('ZONE-0001');
      expect(result.status).toBe('ACTIVE');
      expect(mockRedisGet).toHaveBeenCalled();
      expect(mockCheckvnQrRepo.findQrCodeWithTrace).not.toHaveBeenCalled();
    });

    it('should return trace data from DB if cache is missing and save to cache', async () => {
      mockRedisGet.mockResolvedValue(null);
      mockCheckvnQrRepo.findQrCodeWithTrace.mockResolvedValue(mockQrCode as any);

      const result = await checkvnQrService.publicTrace('ZONE-0001');
      expect(result.status).toBe('ACTIVE');
      expect(result.batch.batch_code).toBe('ZONE001-20260611-001');
      expect(mockRedisSet).toHaveBeenCalled();
    });
  });
});
