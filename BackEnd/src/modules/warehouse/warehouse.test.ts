import {
  CreateMaterialDto,
  ImportTransactionDto,
  ExportTransactionDto,
  ReturnTransactionDto,
} from './warehouse.dto';
import { WarehouseService } from './warehouse.service';
import { warehouseRepository } from './warehouse.repository';
import { farmerRepository } from '../farmer/farmer.repository';
import { AppError } from '../../shared/utils/app-error';
import { MaterialType, TransactionType } from '@prisma/client';

// ==================== Mocks ====================

jest.mock('../../prisma/client', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('./warehouse.repository');
const mockRepo = warehouseRepository as jest.Mocked<typeof warehouseRepository>;

jest.mock('../farmer/farmer.repository');
const mockFarmerRepo = farmerRepository as jest.Mocked<typeof farmerRepository>;

// ==================== Test Data ====================

const mockUser = {
  userId: 'user-htx-001',
  role: 'HTX_MANAGER' as const,
  cooperativeId: 'coop-001',
  farmerId: null,
  isFirstLogin: false,
};

const mockUserOtherCoop = {
  ...mockUser,
  userId: 'user-htx-002',
  cooperativeId: 'coop-002',
};

const mockMaterial = {
  id: 'mat-001',
  cooperative_id: 'coop-001',
  material_name: 'Phân NPK 16-16-8',
  material_type: 'FERTILIZER' as MaterialType,
  unit: 'kg',
  min_stock_alert: 50,
  is_active: true,
  created_at: new Date(),
  stock_item: {
    id: 'stock-001',
    material_id: 'mat-001',
    current_stock: 200,
    expiry_date: new Date(Date.now() + 86400000 * 60), // 60 ngày
    updated_at: new Date(),
  },
};

const mockMaterialNoStock = {
  ...mockMaterial,
  id: 'mat-002',
  stock_item: null,
};

const mockMaterialExpired = {
  ...mockMaterial,
  id: 'mat-003',
  stock_item: {
    ...mockMaterial.stock_item!,
    id: 'stock-003',
    material_id: 'mat-003',
    expiry_date: new Date(Date.now() - 86400000), // hết hạn hôm qua
  },
};

const mockMaterialOtherCoop = {
  ...mockMaterial,
  id: 'mat-other',
  cooperative_id: 'coop-999',
};

const mockFarmer = {
  id: 'farmer-001',
  farmer_code: 'BMT01-2026-0001',
  full_name: 'Nguyễn Văn A',
  phone: '0987654321',
  national_id: null,
  date_of_birth: null,
  address: 'Thôn 3',
  cooperative_id: 'coop-001',
  is_active: true,
  deleted_at: null,
  created_at: new Date(),
  updated_at: new Date(),
};

const mockFarmerOtherCoop = {
  ...mockFarmer,
  id: 'farmer-other',
  cooperative_id: 'coop-999',
};

const mockTransactionResult = {
  transaction: {
    id: 'tx-001',
    material_id: 'mat-001',
    transaction_type: 'IMPORT' as TransactionType,
    quantity: 100,
    supplier: 'Cty ABC',
    invoice_no: 'INV-001',
    transaction_date: new Date(),
    created_by: 'user-htx-001',
    created_at: new Date(),
    unit_price: null,
    recipient_farmer_id: null,
    purpose: null,
    expiry_date: null,
    notes: null,
    material: mockMaterial,
  },
  stockItem: {
    id: 'stock-001',
    material_id: 'mat-001',
    current_stock: 300,
    expiry_date: null,
    updated_at: new Date(),
  },
};

// ==================== Tests ====================

describe('Warehouse DTO Validation', () => {

  // ── Material ──────────────────────────────────

  describe('CreateMaterialDto', () => {
    it('✅ Validates valid material data', () => {
      const valid = {
        material_name: 'Phân Kali',
        material_type: 'FERTILIZER',
        unit: 'kg',
        min_stock_alert: 10,
      };
      expect(CreateMaterialDto.safeParse(valid).success).toBe(true);
    });

    it('❌ Rejects invalid material_type', () => {
      const invalid = {
        material_name: 'Test',
        material_type: 'INVALID_TYPE',
        unit: 'kg',
      };
      const result = CreateMaterialDto.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('❌ Rejects negative min_stock_alert', () => {
      const invalid = {
        material_name: 'Test',
        material_type: 'SEED',
        unit: 'gói',
        min_stock_alert: -5,
      };
      const result = CreateMaterialDto.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('❌ Rejects empty material_name', () => {
      const invalid = {
        material_name: '',
        material_type: 'SEED',
        unit: 'kg',
      };
      const result = CreateMaterialDto.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  // ── Import Transaction ────────────────────────

  describe('ImportTransactionDto', () => {
    it('✅ Validates valid IMPORT with supplier & invoice', () => {
      const valid = {
        material_id: 'clxxxxxxxxxxxxxxxxxx001',
        transaction_type: 'IMPORT' as const,
        quantity: 100,
        supplier: 'Cty Phân Bón ABC',
        invoice_no: 'INV-2026-001',
        transaction_date: '2026-06-06T12:00:00.000Z',
      };
      expect(ImportTransactionDto.safeParse(valid).success).toBe(true);
    });

    it('❌ Rejects IMPORT missing supplier (BR-005-3)', () => {
      const invalid = {
        material_id: 'clxxxxxxxxxxxxxxxxxx001',
        transaction_type: 'IMPORT' as const,
        quantity: 100,
        invoice_no: 'INV-001',
        transaction_date: '2026-06-06T12:00:00.000Z',
      };
      const result = ImportTransactionDto.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('❌ Rejects IMPORT missing invoice_no (BR-005-3)', () => {
      const invalid = {
        material_id: 'clxxxxxxxxxxxxxxxxxx001',
        transaction_type: 'IMPORT' as const,
        quantity: 100,
        supplier: 'Cty ABC',
        transaction_date: '2026-06-06T12:00:00.000Z',
      };
      const result = ImportTransactionDto.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('❌ Rejects quantity <= 0', () => {
      const invalid = {
        material_id: 'clxxxxxxxxxxxxxxxxxx001',
        transaction_type: 'IMPORT' as const,
        quantity: 0,
        supplier: 'Cty ABC',
        invoice_no: 'INV-001',
        transaction_date: '2026-06-06T12:00:00.000Z',
      };
      const result = ImportTransactionDto.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  // ── Export Transaction ────────────────────────

  describe('ExportTransactionDto', () => {
    it('✅ Validates valid EXPORT with farmer & purpose', () => {
      const valid = {
        material_id: 'clxxxxxxxxxxxxxxxxxx001',
        transaction_type: 'EXPORT' as const,
        quantity: 50,
        recipient_farmer_id: 'clxxxxxxxxxxxxxxxxxx002',
        purpose: 'Bón phân vụ Đông Xuân 2026',
        transaction_date: '2026-06-06T12:00:00.000Z',
      };
      expect(ExportTransactionDto.safeParse(valid).success).toBe(true);
    });

    it('❌ Rejects EXPORT missing recipient_farmer_id (BR-005-4)', () => {
      const invalid = {
        material_id: 'clxxxxxxxxxxxxxxxxxx001',
        transaction_type: 'EXPORT' as const,
        quantity: 50,
        purpose: 'Bón phân vụ Đông Xuân',
        transaction_date: '2026-06-06T12:00:00.000Z',
      };
      const result = ExportTransactionDto.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('❌ Rejects EXPORT missing purpose (BR-005-4)', () => {
      const invalid = {
        material_id: 'clxxxxxxxxxxxxxxxxxx001',
        transaction_type: 'EXPORT' as const,
        quantity: 50,
        recipient_farmer_id: 'clxxxxxxxxxxxxxxxxxx002',
        transaction_date: '2026-06-06T12:00:00.000Z',
      };
      const result = ExportTransactionDto.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  // ── Return Transaction ────────────────────────

  describe('ReturnTransactionDto', () => {
    it('✅ Validates valid RETURN with reason', () => {
      const valid = {
        material_id: 'clxxxxxxxxxxxxxxxxxx001',
        transaction_type: 'RETURN' as const,
        quantity: 10,
        return_reason: 'Nông dân trả lại phân bón không đúng loại',
        transaction_date: '2026-06-06T12:00:00.000Z',
      };
      expect(ReturnTransactionDto.safeParse(valid).success).toBe(true);
    });

    it('❌ Rejects RETURN missing return_reason', () => {
      const invalid = {
        material_id: 'clxxxxxxxxxxxxxxxxxx001',
        transaction_type: 'RETURN' as const,
        quantity: 10,
        transaction_date: '2026-06-06T12:00:00.000Z',
      };
      const result = ReturnTransactionDto.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});

// ──────────────────────────────────────────────────
// Service Tests
// ──────────────────────────────────────────────────

describe('WarehouseService', () => {
  let service: WarehouseService;

  beforeEach(() => {
    service = new WarehouseService();
    jest.clearAllMocks();
  });

  // ── Material ──────────────────────────────────

  describe('Material CRUD', () => {
    it('✅ HTX_MANAGER tạo vật tư mới thành công', async () => {
      mockRepo.createMaterial.mockResolvedValue(mockMaterial as any);

      const result = await service.createMaterial({
        material_name: 'Phân NPK 16-16-8',
        material_type: 'FERTILIZER',
        unit: 'kg',
        min_stock_alert: 50,
      }, mockUser);

      expect(result.id).toBe('mat-001');
      expect(mockRepo.createMaterial).toHaveBeenCalledWith(
        expect.objectContaining({ cooperative_id: 'coop-001' })
      );
    });

    it('❌ HTX_MANAGER xem vật tư HTX khác → 403 FORBIDDEN', async () => {
      mockRepo.findMaterialById.mockResolvedValue(mockMaterialOtherCoop as any);

      await expect(
        service.getMaterialById('mat-other', mockUser)
      ).rejects.toThrow(AppError);

      try {
        await service.getMaterialById('mat-other', mockUser);
      } catch (e: any) {
        expect(e.code).toBe('FORBIDDEN');
        expect(e.statusCode).toBe(403);
      }
    });

    it('❌ Vật tư không tồn tại → 404 MATERIAL_NOT_FOUND', async () => {
      mockRepo.findMaterialById.mockResolvedValue(null);

      await expect(
        service.getMaterialById('non-existent', mockUser)
      ).rejects.toThrow(AppError);

      try {
        await service.getMaterialById('non-existent', mockUser);
      } catch (e: any) {
        expect(e.code).toBe('MATERIAL_NOT_FOUND');
      }
    });
  });

  // ── Import Stock ──────────────────────────────

  describe('Import Stock', () => {
    it('✅ Nhập kho hợp lệ → tạo transaction + tăng tồn kho', async () => {
      mockRepo.findMaterialById.mockResolvedValue(mockMaterial as any);
      mockRepo.createTransactionInTx.mockResolvedValue(mockTransactionResult as any);

      const result = await service.importStock({
        material_id: 'mat-001',
        transaction_type: 'IMPORT',
        quantity: 100,
        supplier: 'Cty ABC',
        invoice_no: 'INV-001',
        transaction_date: '2026-06-06T12:00:00.000Z',
      }, mockUser);

      expect(result.stockItem.current_stock).toBe(300);
      expect(mockRepo.createTransactionInTx).toHaveBeenCalledWith(
        expect.objectContaining({ stockDelta: 100 })
      );
    });
  });

  // ── Export Stock ──────────────────────────────

  describe('Export Stock', () => {
    it('✅ Xuất kho hợp lệ → trừ tồn kho', async () => {
      mockRepo.findMaterialById.mockResolvedValue(mockMaterial as any);
      mockFarmerRepo.findById.mockResolvedValue(mockFarmer as any);
      mockRepo.createTransactionInTx.mockResolvedValue({
        ...mockTransactionResult,
        stockItem: { ...mockTransactionResult.stockItem, current_stock: 150 },
      } as any);

      const result = await service.exportStock({
        material_id: 'mat-001',
        transaction_type: 'EXPORT',
        quantity: 50,
        recipient_farmer_id: 'farmer-001',
        purpose: 'Bón phân vụ Đông Xuân 2026',
        transaction_date: '2026-06-06T12:00:00.000Z',
      }, mockUser);

      expect(result.stockItem.current_stock).toBe(150);
      expect(mockRepo.createTransactionInTx).toHaveBeenCalledWith(
        expect.objectContaining({ stockDelta: -50 })
      );
    });

    it('❌ Xuất nhiều hơn tồn kho → 422 INSUFFICIENT_STOCK (BR-005-1)', async () => {
      mockRepo.findMaterialById.mockResolvedValue(mockMaterial as any);

      await expect(
        service.exportStock({
          material_id: 'mat-001',
          transaction_type: 'EXPORT',
          quantity: 999,
          recipient_farmer_id: 'farmer-001',
          purpose: 'Test xuất vượt tồn kho',
          transaction_date: '2026-06-06T12:00:00.000Z',
        }, mockUser)
      ).rejects.toThrow(AppError);

      try {
        await service.exportStock({
          material_id: 'mat-001',
          transaction_type: 'EXPORT',
          quantity: 999,
          recipient_farmer_id: 'farmer-001',
          purpose: 'Test',
          transaction_date: '2026-06-06T12:00:00.000Z',
        }, mockUser);
      } catch (e: any) {
        expect(e.code).toBe('INSUFFICIENT_STOCK');
        expect(e.statusCode).toBe(422);
      }
    });

    it('❌ Xuất kho khi chưa có StockItem → 422 INSUFFICIENT_STOCK', async () => {
      mockRepo.findMaterialById.mockResolvedValue(mockMaterialNoStock as any);

      await expect(
        service.exportStock({
          material_id: 'mat-002',
          transaction_type: 'EXPORT',
          quantity: 1,
          recipient_farmer_id: 'farmer-001',
          purpose: 'Test không có stock',
          transaction_date: '2026-06-06T12:00:00.000Z',
        }, mockUser)
      ).rejects.toThrow(AppError);

      try {
        await service.exportStock({
          material_id: 'mat-002',
          transaction_type: 'EXPORT',
          quantity: 1,
          recipient_farmer_id: 'farmer-001',
          purpose: 'Test',
          transaction_date: '2026-06-06T12:00:00.000Z',
        }, mockUser);
      } catch (e: any) {
        expect(e.code).toBe('INSUFFICIENT_STOCK');
      }
    });

    it('❌ Xuất vật tư đã hết hạn → 422 MATERIAL_EXPIRED (BR-005-6)', async () => {
      mockRepo.findMaterialById.mockResolvedValue(mockMaterialExpired as any);

      await expect(
        service.exportStock({
          material_id: 'mat-003',
          transaction_type: 'EXPORT',
          quantity: 10,
          recipient_farmer_id: 'farmer-001',
          purpose: 'Test hết hạn',
          transaction_date: '2026-06-06T12:00:00.000Z',
        }, mockUser)
      ).rejects.toThrow(AppError);

      try {
        await service.exportStock({
          material_id: 'mat-003',
          transaction_type: 'EXPORT',
          quantity: 10,
          recipient_farmer_id: 'farmer-001',
          purpose: 'Test',
          transaction_date: '2026-06-06T12:00:00.000Z',
        }, mockUser);
      } catch (e: any) {
        expect(e.code).toBe('MATERIAL_EXPIRED');
        expect(e.statusCode).toBe(422);
      }
    });

    it('❌ Nông dân không thuộc HTX → 403 FARMER_NOT_IN_COOPERATIVE', async () => {
      mockRepo.findMaterialById.mockResolvedValue(mockMaterial as any);
      mockFarmerRepo.findById.mockResolvedValue(mockFarmerOtherCoop as any);

      await expect(
        service.exportStock({
          material_id: 'mat-001',
          transaction_type: 'EXPORT',
          quantity: 10,
          recipient_farmer_id: 'farmer-other',
          purpose: 'Test nông dân HTX khác',
          transaction_date: '2026-06-06T12:00:00.000Z',
        }, mockUser)
      ).rejects.toThrow(AppError);

      try {
        await service.exportStock({
          material_id: 'mat-001',
          transaction_type: 'EXPORT',
          quantity: 10,
          recipient_farmer_id: 'farmer-other',
          purpose: 'Test',
          transaction_date: '2026-06-06T12:00:00.000Z',
        }, mockUser);
      } catch (e: any) {
        expect(e.code).toBe('FARMER_NOT_IN_COOPERATIVE');
        expect(e.statusCode).toBe(403);
      }
    });

    it('❌ Nông dân không tồn tại → 404 FARMER_NOT_FOUND', async () => {
      mockRepo.findMaterialById.mockResolvedValue(mockMaterial as any);
      mockFarmerRepo.findById.mockResolvedValue(null);

      await expect(
        service.exportStock({
          material_id: 'mat-001',
          transaction_type: 'EXPORT',
          quantity: 10,
          recipient_farmer_id: 'farmer-ghost',
          purpose: 'Test farmer không tồn tại',
          transaction_date: '2026-06-06T12:00:00.000Z',
        }, mockUser)
      ).rejects.toThrow(AppError);

      try {
        await service.exportStock({
          material_id: 'mat-001',
          transaction_type: 'EXPORT',
          quantity: 10,
          recipient_farmer_id: 'farmer-ghost',
          purpose: 'Test',
          transaction_date: '2026-06-06T12:00:00.000Z',
        }, mockUser);
      } catch (e: any) {
        expect(e.code).toBe('FARMER_NOT_FOUND');
        expect(e.statusCode).toBe(404);
      }
    });
  });

  // ── Return Stock ──────────────────────────────

  describe('Return Stock', () => {
    it('✅ Hoàn trả vật tư → tồn kho cộng lại', async () => {
      mockRepo.findMaterialById.mockResolvedValue(mockMaterial as any);
      mockRepo.createTransactionInTx.mockResolvedValue({
        ...mockTransactionResult,
        stockItem: { ...mockTransactionResult.stockItem, current_stock: 210 },
      } as any);

      const result = await service.returnStock({
        material_id: 'mat-001',
        transaction_type: 'RETURN',
        quantity: 10,
        return_reason: 'Nông dân trả lại phân bón không đúng loại',
        transaction_date: '2026-06-06T12:00:00.000Z',
      }, mockUser);

      expect(result.stockItem.current_stock).toBe(210);
      expect(mockRepo.createTransactionInTx).toHaveBeenCalledWith(
        expect.objectContaining({ stockDelta: 10 })
      );
    });
  });

  // ── Ownership ─────────────────────────────────

  describe('Ownership (BR-OWN)', () => {
    it('✅ HTX_MANAGER chỉ thao tác vật tư trong HTX mình', async () => {
      mockRepo.findMaterialById.mockResolvedValue(mockMaterialOtherCoop as any);

      await expect(
        service.importStock({
          material_id: 'mat-other',
          transaction_type: 'IMPORT',
          quantity: 100,
          supplier: 'Cty XYZ',
          invoice_no: 'INV-999',
          transaction_date: '2026-06-06T12:00:00.000Z',
        }, mockUser)
      ).rejects.toThrow(AppError);

      try {
        await service.importStock({
          material_id: 'mat-other',
          transaction_type: 'IMPORT',
          quantity: 100,
          supplier: 'Cty XYZ',
          invoice_no: 'INV-999',
          transaction_date: '2026-06-06T12:00:00.000Z',
        }, mockUser);
      } catch (e: any) {
        expect(e.code).toBe('FORBIDDEN');
      }
    });
  });
});
