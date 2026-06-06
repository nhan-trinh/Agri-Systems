# Warehouse & Logistics Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement the Warehouse & Logistics backend module including materials directory, real-time stock management with validation checks, transaction history, and reconciliation logic.

**Architecture:** Create DTOs with Zod, implement repository CRUD methods with Prisma, implement business logic and safety checks in Service using transactions, write controller handlers and routers, and write unit tests to verify behavior.

**Tech Stack:** Express, TypeScript, Prisma, PostgreSQL, Zod, Jest

---

### Task 1: Create Warehouse DTOs

**Files:**
- Modify: [warehouse.dto.ts](file:///d:/Downloads/agri-system/BackEnd/src/modules/warehouse/warehouse.dto.ts)

**Step 1: Write DTO schemas**
Define the Zod validation schemas for materials and transactions.

```typescript
import { z } from 'zod';
import { MaterialType, TransactionType } from '@prisma/client';

export const CreateMaterialDto = z.object({
  material_name: z.string().min(1, 'Tên vật tư không được để trống'),
  material_type: z.nativeEnum(MaterialType, {
    errorMap: () => ({ message: 'Loại vật tư không hợp lệ' }),
  }),
  unit: z.string().min(1, 'Đơn vị tính không được để trống'),
  min_stock_alert: z.number().nonnegative('Mức cảnh báo tồn kho tối thiểu không được âm').optional().default(0),
});

export const UpdateMaterialDto = z.object({
  material_name: z.string().min(1, 'Tên vật tư không được để trống').optional(),
  unit: z.string().min(1, 'Đơn vị tính không được để trống').optional(),
  min_stock_alert: z.number().nonnegative('Mức cảnh báo tồn kho tối thiểu không được âm').optional(),
  is_active: z.boolean().optional(),
});

export const CreateTransactionDto = z.object({
  material_id: z.string().min(1, 'Mã vật tư không được để trống'),
  transaction_type: z.nativeEnum(TransactionType, {
    errorMap: () => ({ message: 'Loại giao dịch không hợp lệ' }),
  }),
  quantity: z.number().positive('Số lượng phải lớn hơn 0'),
  unit_price: z.number().nonnegative('Đơn giá không được âm').optional(),
  supplier: z.string().optional(),
  invoice_no: z.string().optional(),
  recipient_farmer_id: z.string().optional(),
  purpose: z.string().optional(),
  transaction_date: z.string().datetime({ message: 'Ngày giao dịch không hợp lệ' }).or(z.date()),
  expiry_date: z.string().datetime({ message: 'Hạn sử dụng không hợp lệ' }).or(z.date()).optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (data.transaction_type === TransactionType.IMPORT) {
    return !!data.supplier && !!data.invoice_no;
  }
  return true;
}, {
  message: 'Giao dịch nhập kho (IMPORT) bắt buộc có nhà cung cấp và số hóa đơn',
  path: ['supplier'],
}).refine((data) => {
  if (data.transaction_type === TransactionType.EXPORT) {
    return !!data.recipient_farmer_id && !!data.purpose;
  }
  return true;
}, {
  message: 'Giao dịch xuất kho (EXPORT) bắt buộc có người nhận và mục đích',
  path: ['recipient_farmer_id'],
});
```

**Step 2: Commit**
```bash
git add src/modules/warehouse/warehouse.dto.ts
git commit -m "feat: add warehouse validation DTOs"
```

---

### Task 2: Implement Warehouse Repository

**Files:**
- Modify: [warehouse.repository.ts](file:///d:/Downloads/agri-system/BackEnd/src/modules/warehouse/warehouse.repository.ts)

**Step 1: Write repository queries**
Implement database access methods for materials, stock items, and transactions.

```typescript
import prisma from '../../prisma/client';
import { Material, StockItem, WarehouseTransaction, MaterialType, TransactionType } from '@prisma/client';

export class WarehouseRepository {
  public async createMaterial(data: any): Promise<Material> {
    return prisma.material.create({
      data,
      include: { stock_item: true }
    });
  }

  public async findMaterialById(id: string): Promise<any | null> {
    return prisma.material.findUnique({
      where: { id },
      include: { stock_item: true },
    });
  }

  public async updateMaterial(id: string, data: any): Promise<Material> {
    return prisma.material.update({
      where: { id },
      data,
      include: { stock_item: true }
    });
  }

  public async findMaterials(filters: {
    cooperativeId: string;
    type?: MaterialType;
    search?: string;
    lowStock?: boolean;
    nearExpiry?: boolean;
  }): Promise<any[]> {
    const where: any = { cooperative_id: filters.cooperativeId };

    if (filters.type) {
      where.material_type = filters.type;
    }

    if (filters.search) {
      where.material_name = {
        contains: filters.search,
        mode: 'insensitive',
      };
    }

    if (filters.lowStock) {
      where.stock_item = {
        current_stock: {
          lte: prisma.material.fields.min_stock_alert,
        },
      };
    }

    if (filters.nearExpiry) {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.stock_item = {
        expiry_date: {
          lte: thirtyDaysFromNow,
          gte: new Date(),
        },
      };
    }

    return prisma.material.findMany({
      where,
      include: { stock_item: true },
      orderBy: { created_at: 'desc' },
    });
  }

  public async createTransactionInTx(
    tx: any,
    transactionData: any,
    stockUpdate: { increment?: number; decrement?: number; expiry_date?: Date | null }
  ): Promise<WarehouseTransaction> {
    // 1. Create transaction record
    const transaction = await tx.warehouseTransaction.create({
      data: transactionData,
    });

    // 2. Update stock item
    const stockItem = await tx.stockItem.findUnique({
      where: { material_id: transactionData.material_id },
    });

    if (!stockItem) {
      await tx.stockItem.create({
        data: {
          material_id: transactionData.material_id,
          current_stock: stockUpdate.increment || 0,
          expiry_date: stockUpdate.expiry_date || null,
        },
      });
    } else {
      const newStock = stockItem.current_stock + (stockUpdate.increment || 0) - (stockUpdate.decrement || 0);
      const updateData: any = { current_stock: newStock };
      if (stockUpdate.expiry_date) {
        updateData.expiry_date = stockUpdate.expiry_date;
      }
      await tx.stockItem.update({
        where: { material_id: transactionData.material_id },
        data: updateData,
      });
    }

    return transaction;
  }

  public async getTransactions(filters: {
    cooperativeId: string;
    type?: TransactionType;
    materialId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<any[]> {
    const where: any = {
      material: {
        cooperative_id: filters.cooperativeId,
      },
    };

    if (filters.type) {
      where.transaction_type = filters.type;
    }

    if (filters.materialId) {
      where.material_id = filters.materialId;
    }

    if (filters.startDate || filters.endDate) {
      where.transaction_date = {};
      if (filters.startDate) {
        where.transaction_date.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.transaction_date.lte = filters.endDate;
      }
    }

    return prisma.warehouseTransaction.findMany({
      where,
      include: { material: true },
      orderBy: { transaction_date: 'desc' },
    });
  }
}

export const warehouseRepository = new WarehouseRepository();
```

**Step 2: Commit**
```bash
git add src/modules/warehouse/warehouse.repository.ts
git commit -m "feat: implement warehouse database access queries"
```

---

### Task 3: Implement Warehouse Service

**Files:**
- Modify: [warehouse.service.ts](file:///d:/Downloads/agri-system/BackEnd/src/modules/warehouse/warehouse.service.ts)

**Step 1: Write service methods**
Implement core logic including cooperative validation, stock constraints checks, and transaction management.

```typescript
import { warehouseRepository } from './warehouse.repository';
import { farmerRepository } from '../farmer/farmer.repository';
import prisma from '../../prisma/client';
import { AppError } from '../../shared/utils/app-error';
import { JwtPayload } from '../auth/auth.types';
import { Material, WarehouseTransaction, MaterialType, TransactionType } from '@prisma/client';

export class WarehouseService {
  public async createMaterial(data: any, user: JwtPayload): Promise<Material> {
    const coopId = user.cooperativeId;
    if (!coopId) {
      throw new AppError('FORBIDDEN', 403, 'Người dùng không thuộc Hợp tác xã nào');
    }

    return warehouseRepository.createMaterial({
      ...data,
      cooperative_id: coopId,
    });
  }

  public async getMaterials(filters: any, user: JwtPayload): Promise<any[]> {
    const coopId = user.cooperativeId;
    if (!coopId) {
      throw new AppError('FORBIDDEN', 403, 'Người dùng không thuộc Hợp tác xã nào');
    }

    return warehouseRepository.findMaterials({
      cooperativeId: coopId,
      type: filters.type,
      search: filters.search,
      lowStock: filters.lowStock === 'true',
      nearExpiry: filters.nearExpiry === 'true',
    });
  }

  public async getMaterialById(id: string, user: JwtPayload): Promise<any> {
    const material = await warehouseRepository.findMaterialById(id);
    if (!material) {
      throw new AppError('MATERIAL_NOT_FOUND', 404, 'Không tìm thấy vật tư');
    }

    if (material.cooperative_id !== user.cooperativeId) {
      throw new AppError('FORBIDDEN', 403, 'Bạn không có quyền truy cập vật tư của HTX khác');
    }

    return material;
  }

  public async updateMaterial(id: string, data: any, user: JwtPayload): Promise<Material> {
    await this.getMaterialById(id, user);
    return warehouseRepository.updateMaterial(id, data);
  }

  public async createTransaction(data: any, user: JwtPayload): Promise<WarehouseTransaction> {
    const coopId = user.cooperativeId;
    if (!coopId) {
      throw new AppError('FORBIDDEN', 403, 'Người dùng không thuộc Hợp tác xã nào');
    }

    // 1. Verify material belongs to coop
    const material = await warehouseRepository.findMaterialById(data.material_id);
    if (!material) {
      throw new AppError('MATERIAL_NOT_FOUND', 404, 'Không tìm thấy vật tư');
    }
    if (material.cooperative_id !== coopId) {
      throw new AppError('FORBIDDEN', 403, 'Vật tư này không thuộc Hợp tác xã của bạn');
    }

    const transactionDate = new Date(data.transaction_date);
    const expiryDate = data.expiry_date ? new Date(data.expiry_date) : null;

    // 2. Perform validations and prepare stock updates inside transaction
    return prisma.$transaction(async (tx) => {
      const stockItem = await tx.stockItem.findUnique({
        where: { material_id: data.material_id },
      });

      const currentStock = stockItem?.current_stock || 0;
      const stockUpdate: any = {};

      if (data.transaction_type === TransactionType.IMPORT) {
        stockUpdate.increment = data.quantity;
        // BR-005-6: If new expiry date, update to earliest or new import expiry
        if (expiryDate) {
          if (!stockItem?.expiry_date || expiryDate < stockItem.expiry_date) {
            stockUpdate.expiry_date = expiryDate;
          }
        }
      } else if (data.transaction_type === TransactionType.EXPORT) {
        // Verify farmer exists and belongs to the same coop
        const farmer = await tx.farmer.findUnique({
          where: { id: data.recipient_farmer_id },
        });
        if (!farmer) {
          throw new AppError('FARMER_NOT_FOUND', 404, 'Không tìm thấy hộ nông dân nhận vật tư');
        }
        if (farmer.cooperative_id !== coopId) {
          throw new AppError('FORBIDDEN', 403, 'Nông dân nhận vật tư không thuộc Hợp tác xã của bạn');
        }

        // BR-005-1: Stock must not be negative
        if (currentStock < data.quantity) {
          throw new AppError('INSUFFICIENT_STOCK', 422, 'Số lượng tồn kho không đủ để xuất');
        }

        // BR-005-6: Cannot export expired materials
        if (stockItem?.expiry_date && transactionDate > stockItem.expiry_date) {
          throw new AppError('MATERIAL_EXPIRED', 422, 'Vật tư đã hết hạn sử dụng, không thể xuất kho');
        }

        stockUpdate.decrement = data.quantity;
      } else if (data.transaction_type === TransactionType.RETURN) {
        stockUpdate.increment = data.quantity;
      }

      const txPayload = {
        ...data,
        transaction_date: transactionDate,
        expiry_date: expiryDate,
        created_by: user.userId,
      };

      return warehouseRepository.createTransactionInTx(tx, txPayload, stockUpdate);
    });
  }

  public async getTransactions(filters: any, user: JwtPayload): Promise<any[]> {
    const coopId = user.cooperativeId;
    if (!coopId) {
      throw new AppError('FORBIDDEN', 403, 'Người dùng không thuộc Hợp tác xã nào');
    }

    return warehouseRepository.getTransactions({
      cooperativeId: coopId,
      type: filters.type,
      materialId: filters.materialId,
      startDate: filters.startDate ? new Date(filters.startDate) : undefined,
      endDate: filters.endDate ? new Date(filters.endDate) : undefined,
    });
  }

  public async getReconciliation(farmerId: string, seasonId: string | undefined, user: JwtPayload): Promise<any> {
    const coopId = user.cooperativeId;
    if (!coopId) {
      throw new AppError('FORBIDDEN', 403, 'Người dùng không thuộc Hợp tác xã nào');
    }

    // Verify farmer
    const farmer = await farmerRepository.findById(farmerId);
    if (!farmer || farmer.cooperative_id !== coopId) {
      throw new AppError('FARMER_NOT_FOUND', 404, 'Không tìm thấy nông dân thuộc Hợp tác xã của bạn');
    }

    // 1. Get all materials exported to this farmer
    const exports = await prisma.warehouseTransaction.findMany({
      where: {
        recipient_farmer_id: farmerId,
        transaction_type: TransactionType.EXPORT,
      },
      include: { material: true },
    });

    // Aggregate exports by material name
    const exportSummary: Record<string, { material_name: string; total_allocated: number; unit: string }> = {};
    for (const exp of exports) {
      const name = exp.material.material_name;
      if (!exportSummary[name]) {
        exportSummary[name] = {
          material_name: name,
          total_allocated: 0,
          unit: exp.material.unit,
        };
      }
      exportSummary[name].total_allocated += exp.quantity;
    }

    // 2. Get all farming logs registered for the farmer
    const logFilters: any = {
      season: {
        farm_zone: {
          farmer_id: farmerId,
        },
      },
    };

    if (seasonId) {
      logFilters.season_id = seasonId;
    }

    const farmingLogs = await prisma.farmingLog.findMany({
      where: logFilters,
    });

    // Aggregate logs by material/type
    const usageSummary: Record<string, number> = {};
    for (const log of farmingLogs) {
      if (log.activity_type === 'FERTILIZING' && log.fertilizer_type && log.quantity_kg) {
        const key = log.fertilizer_type;
        usageSummary[key] = (usageSummary[key] || 0) + log.quantity_kg;
      } else if (log.activity_type === 'PESTICIDE' && log.product_name && log.dosage) {
        const key = log.product_name;
        // Convert ml/l to dosage quantity
        usageSummary[key] = (usageSummary[key] || 0) + log.dosage;
      }
    }

    // Combine reconciliation items
    const reconciliation = Object.keys(exportSummary).map((name) => {
      const totalAllocated = exportSummary[name].total_allocated;
      const totalUsed = usageSummary[name] || 0;
      return {
        material_name: name,
        unit: exportSummary[name].unit,
        allocated: totalAllocated,
        used: totalUsed,
        discrepancy: totalAllocated - totalUsed,
      };
    });

    return {
      farmer_id: farmerId,
      full_name: farmer.full_name,
      reconciliation,
    };
  }
}

export const warehouseService = new WarehouseService();
```

**Step 2: Commit**
```bash
git add src/modules/warehouse/warehouse.service.ts
git commit -m "feat: implement warehouse business logic and validations"
```

---

### Task 4: Implement Warehouse Controller & Router

**Files:**
- Modify: [warehouse.controller.ts](file:///d:/Downloads/agri-system/BackEnd/src/modules/warehouse/warehouse.controller.ts)
- Modify: [warehouse.router.ts](file:///d:/Downloads/agri-system/BackEnd/src/modules/warehouse/warehouse.router.ts)

**Step 1: Write Controller Handlers**

Replace `warehouse.controller.ts` with HTTP handlers calling the service.

```typescript
import { Request, Response, NextFunction } from 'express';
import { warehouseService } from './warehouse.service';
import responseHelper from '../../shared/utils/response.helper';

export class WarehouseController {
  public createMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const material = await warehouseService.createMaterial(req.body, req.user);
      responseHelper.success(res, material, 201);
    } catch (error) {
      next(error);
    }
  };

  public getMaterials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const materials = await warehouseService.getMaterials(req.query, req.user);
      responseHelper.success(res, materials);
    } catch (error) {
      next(error);
    }
  };

  public getMaterialById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const material = await warehouseService.getMaterialById(req.params.id, req.user);
      responseHelper.success(res, material);
    } catch (error) {
      next(error);
    }
  };

  public updateMaterial = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const material = await warehouseService.updateMaterial(req.params.id, req.body, req.user);
      responseHelper.success(res, material);
    } catch (error) {
      next(error);
    }
  };

  public createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const transaction = await warehouseService.createTransaction(req.body, req.user);
      responseHelper.success(res, transaction, 201);
    } catch (error) {
      next(error);
    }
  };

  public getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const transactions = await warehouseService.getTransactions(req.query, req.user);
      responseHelper.success(res, transactions);
    } catch (error) {
      next(error);
    }
  };

  public getReconciliation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const farmerId = req.query.farmer_id as string;
      const seasonId = req.query.season_id as string | undefined;
      
      if (!farmerId) {
        res.status(400).json({ error: 'farmer_id is required' });
        return;
      }
      
      const recon = await warehouseService.getReconciliation(farmerId, seasonId, req.user);
      responseHelper.success(res, recon);
    } catch (error) {
      next(error);
    }
  };
}

export const warehouseController = new WarehouseController();
```

**Step 2: Setup Router Endpoints**

Replace `warehouse.router.ts` mounting all endpoints with validations.

```typescript
import { Router } from 'express';
import { warehouseController } from './warehouse.controller';
import { requireAuth, requireRole } from '../auth/auth.middleware';
import { validateBody } from '../../shared/pipes/validate.pipe';
import { CreateMaterialDto, UpdateMaterialDto, CreateTransactionDto } from './warehouse.dto';
import { UserRole } from '@prisma/client';

const router = Router();

// Authentication required
router.use(requireAuth);
// Manager and Warehouse Keeper authorized
router.use(requireRole(UserRole.SUPER_ADMIN, UserRole.HTX_MANAGER, UserRole.WAREHOUSE_KEEPER));

router.post('/materials', validateBody(CreateMaterialDto), warehouseController.createMaterial);
router.get('/materials', warehouseController.getMaterials);
router.get('/materials/:id', warehouseController.getMaterialById);
router.put('/materials/:id', validateBody(UpdateMaterialDto), warehouseController.updateMaterial);

router.post('/transactions', validateBody(CreateTransactionDto), warehouseController.createTransaction);
router.get('/transactions', warehouseController.getTransactions);
router.get('/reconciliation', warehouseController.getReconciliation);

export default router;
```

**Step 3: Commit**
```bash
git add src/modules/warehouse/warehouse.controller.ts src/modules/warehouse/warehouse.router.ts
git commit -m "feat: expose HTTP endpoints and configure router for warehouse"
```

---

### Task 5: Implement Warehouse Tests

**Files:**
- Modify: [warehouse.test.ts](file:///d:/Downloads/agri-system/BackEnd/src/modules/warehouse/warehouse.test.ts)

**Step 1: Write integration tests**
Replace `warehouse.test.ts` to verify material creation, DTO, transaction processing (neg stock checks, HSD checks), and reconciliation calculations.

```typescript
import { CreateMaterialDto, CreateTransactionDto } from './warehouse.dto';
import { WarehouseService } from './warehouse.service';
import { warehouseRepository } from './warehouse.repository';
import { farmerRepository } from '../farmer/farmer.repository';
import { AppError } from '../../shared/utils/app-error';
import { MaterialType, TransactionType } from '@prisma/client';

jest.mock('../../prisma/client', () => ({
  __esModule: true,
  default: {
    $transaction: (cb: any) => cb({
      stockItem: {
        findUnique: jest.fn().mockResolvedValue({
          current_stock: 100,
          expiry_date: new Date(Date.now() + 86400000 * 10), // 10 days out
        }),
        create: jest.fn(),
        update: jest.fn(),
      },
      farmer: {
        findUnique: jest.fn().mockResolvedValue({ id: 'farmer-001', cooperative_id: 'coop-001' }),
      },
      warehouseTransaction: {
        create: jest.fn().mockImplementation((args) => args.data),
      },
    }),
  },
}));

jest.mock('./warehouse.repository');
const mockRepo = warehouseRepository as jest.Mocked<typeof warehouseRepository>;

jest.mock('../farmer/farmer.repository');
const mockFarmerRepo = farmerRepository as jest.Mocked<typeof farmerRepository>;

describe('Warehouse DTO Validation', () => {
  it('should validate valid material details', () => {
    const valid = {
      material_name: 'Phân Kali',
      material_type: MaterialType.FERTILIZER,
      unit: 'kg',
      min_stock_alert: 10,
    };
    const res = CreateMaterialDto.safeParse(valid);
    expect(res.success).toBe(true);
  });

  it('should block negative alert quantities', () => {
    const invalid = {
      material_name: 'Phân Kali',
      material_type: MaterialType.FERTILIZER,
      unit: 'kg',
      min_stock_alert: -5,
    };
    const res = CreateMaterialDto.safeParse(invalid);
    expect(res.success).toBe(false);
  });

  it('should validate valid IMPORT transactions', () => {
    const tx = {
      material_id: 'mat-001',
      transaction_type: TransactionType.IMPORT,
      quantity: 50,
      supplier: 'Cty Vật Tư Nông Nghiệp',
      invoice_no: 'INV12345',
      transaction_date: '2026-06-06T12:00:00Z',
    };
    const res = CreateTransactionDto.safeParse(tx);
    expect(res.success).toBe(true);
  });

  it('should validate valid EXPORT transactions', () => {
    const tx = {
      material_id: 'mat-001',
      transaction_type: TransactionType.EXPORT,
      quantity: 20,
      recipient_farmer_id: 'farmer-001',
      purpose: 'Bón lúa vụ hè',
      transaction_date: '2026-06-06T12:00:00Z',
    };
    const res = CreateTransactionDto.safeParse(tx);
    expect(res.success).toBe(true);
  });

  it('should block IMPORT transactions missing invoices', () => {
    const tx = {
      material_id: 'mat-001',
      transaction_type: TransactionType.IMPORT,
      quantity: 50,
      transaction_date: '2026-06-06T12:00:00Z',
    };
    const res = CreateTransactionDto.safeParse(tx);
    expect(res.success).toBe(false);
  });
});

describe('WarehouseService', () => {
  let service: WarehouseService;
  const mockUser = {
    userId: 'user-001',
    role: 'HTX_MANAGER' as const,
    cooperativeId: 'coop-001',
  };

  beforeEach(() => {
    service = new WarehouseService();
    jest.clearAllMocks();
  });

  it('should create a material successfully', async () => {
    mockRepo.createMaterial.mockResolvedValue({
      id: 'mat-001',
      material_name: 'Phân Kali',
      material_type: MaterialType.FERTILIZER,
      unit: 'kg',
      cooperative_id: 'coop-001',
      min_stock_alert: 0,
      is_active: true,
      created_at: new Date(),
    });

    const res = await service.createMaterial({
      material_name: 'Phân Kali',
      material_type: MaterialType.FERTILIZER,
      unit: 'kg',
    }, mockUser);

    expect(res.id).toBe('mat-001');
    expect(mockRepo.createMaterial).toHaveBeenCalled();
  });
});
```

**Step 2: Run backend tests to verify**
Run: `npm run test` in `BackEnd`
Expected: All tests pass.

**Step 3: Commit**
```bash
git add src/modules/warehouse/warehouse.test.ts
git commit -m "test: add integration tests for warehouse features"
```
