# Kế Hoạch Triển Khai Phase 3: Kho Vật Tư & Logistics

> **Phiên bản:** 2.0 — đã bổ sung endpoints, schema, reconciliation logic, test cases  
> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

Hệ thống sẽ được triển khai phần quản lý kho vật tư (Import, Export, Return) của Hợp tác xã, đảm bảo an toàn tồn kho (không xuất âm) và kiểm soát hạn sử dụng vật tư.

---

## 1. Ràng Buộc Nghiệp Vụ (BR-005)

| ID | Ràng buộc | Xử lý |
|---|---|---|
| BR-005-1 | Tồn kho không được âm | Kiểm tra `current_stock >= quantity` trước khi xuất → `422 INSUFFICIENT_STOCK` |
| BR-005-2 | 5 loại vật tư | Enum: `SEED`, `FERTILIZER`, `PESTICIDE`, `EQUIPMENT`, `OTHER` |
| BR-005-3 | Phiếu IMPORT bắt buộc | `supplier`, `invoice_no`, `transaction_date` không được null |
| BR-005-4 | Phiếu EXPORT bắt buộc | `recipient_farmer_id`, `purpose` không được null |
| BR-005-5 | Không sửa/xóa phiếu đã tạo | Bảng `WarehouseTransaction` không có `updated_at`. Sai sót → tạo phiếu đối nghịch (RETURN) |
| BR-005-6 | Kiểm tra hạn sử dụng | Cảnh báo khi còn ≤ 30 ngày. Từ chối xuất kho nếu đã hết hạn → `422 MATERIAL_EXPIRED` |
| BR-OWN | Ownership HTX | `HTX_MANAGER` chỉ xem/thao tác vật tư thuộc `cooperative_id` của mình → `403` nếu vi phạm |

---

## 2. Danh Sách Endpoints Đầy Đủ

### Danh mục vật tư

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/api/v1/warehouse/materials` | HTX_MANAGER | Tạo vật tư mới vào danh mục |
| GET | `/api/v1/warehouse/materials` | HTX_MANAGER, WAREHOUSE_KEEPER | Danh sách vật tư (filter, search, paginate) |
| GET | `/api/v1/warehouse/materials/:id` | HTX_MANAGER, WAREHOUSE_KEEPER | Chi tiết vật tư |
| PUT | `/api/v1/warehouse/materials/:id` | HTX_MANAGER | Cập nhật thông tin vật tư |
| DELETE | `/api/v1/warehouse/materials/:id` | HTX_MANAGER | Soft delete (`is_active = false`) |

### Tồn kho

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/warehouse/stock` | HTX_MANAGER, WAREHOUSE_KEEPER | Tồn kho hiện tại tất cả vật tư |
| GET | `/api/v1/warehouse/stock/alerts` | HTX_MANAGER, WAREHOUSE_KEEPER | Vật tư sắp hết / sắp hết hạn (≤ 30 ngày) |

### Giao dịch

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/api/v1/warehouse/transactions/import` | HTX_MANAGER, WAREHOUSE_KEEPER | Phiếu nhập kho |
| POST | `/api/v1/warehouse/transactions/export` | HTX_MANAGER, WAREHOUSE_KEEPER | Phiếu xuất kho (cấp phát cho nông dân) |
| POST | `/api/v1/warehouse/transactions/return` | HTX_MANAGER, WAREHOUSE_KEEPER | Phiếu hoàn trả (thay thế việc sửa/xóa) |
| GET | `/api/v1/warehouse/transactions` | HTX_MANAGER, WAREHOUSE_KEEPER | Lịch sử giao dịch (filter, paginate) |
| GET | `/api/v1/warehouse/transactions/:id` | HTX_MANAGER, WAREHOUSE_KEEPER | Chi tiết phiếu giao dịch |

### Đối chiếu (Reconciliation)

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/warehouse/reconciliation` | HTX_MANAGER | Đối chiếu xuất kho vs nhật ký canh tác |

**Query params cho GET /transactions:**
```
?material_id=&transaction_type=&farmer_id=&from_date=&to_date=&page=&limit=
```

---

## 3. Prisma Schema

```prisma
// Thêm vào schema.prisma

model Material {
  id              String       @id @default(cuid())
  cooperative_id  String
  material_name   String
  material_type   MaterialType
  unit            String       // "kg", "lít", "gói", "bao"
  min_stock_alert Float        @default(0)
  is_active       Boolean      @default(true)
  created_at      DateTime     @default(now())

  cooperative     Cooperative  @relation(fields: [cooperative_id], references: [id])
  stock_item      StockItem?
  transactions    WarehouseTransaction[]

  @@index([cooperative_id, is_active])
}

model StockItem {
  id            String    @id @default(cuid())
  material_id   String    @unique
  current_stock Float     @default(0)
  expiry_date   DateTime?
  updated_at    DateTime  @updatedAt

  material      Material  @relation(fields: [material_id], references: [id])
}

model WarehouseTransaction {
  id                  String          @id @default(cuid())
  material_id         String
  transaction_type    TransactionType

  quantity            Float           // luôn dương — service tự trừ/cộng theo type
  unit_price          Float?

  // Bắt buộc khi IMPORT (BR-005-3)
  supplier            String?
  invoice_no          String?

  // Bắt buộc khi EXPORT (BR-005-4)
  recipient_farmer_id String?
  purpose             String?

  transaction_date    DateTime
  expiry_date         DateTime?       // hạn sử dụng lô hàng nhập
  notes               String?
  created_by          String          // userId

  // KHÔNG có updated_at — BR-005-5: phiếu đã tạo là bất biến
  created_at          DateTime        @default(now())

  material            Material        @relation(fields: [material_id], references: [id])

  @@index([material_id, transaction_type])
  @@index([recipient_farmer_id])
  @@index([transaction_date])
}

enum MaterialType    { SEED FERTILIZER PESTICIDE EQUIPMENT OTHER }
enum TransactionType { IMPORT EXPORT RETURN }
```

**Lưu ý migration:**
```bash
npx prisma migrate dev --name add_warehouse_module
```

---

## 4. DTOs — Zod Schemas

```typescript
// warehouse.dto.ts

import { z } from 'zod'

// ── Material ──────────────────────────────────────

export const CreateMaterialDto = z.object({
  material_name:   z.string().min(1).max(200),
  material_type:   z.enum(['SEED', 'FERTILIZER', 'PESTICIDE', 'EQUIPMENT', 'OTHER']),
  unit:            z.string().min(1).max(20),
  min_stock_alert: z.number().min(0).default(0),
})

export const UpdateMaterialDto = CreateMaterialDto.partial()

// ── Transaction ───────────────────────────────────

const BaseTransactionDto = z.object({
  material_id:      z.string().cuid(),
  quantity:         z.number().positive('Số lượng phải lớn hơn 0'),
  transaction_date: z.string().datetime(),
  notes:            z.string().max(500).optional(),
})

export const ImportTransactionDto = BaseTransactionDto.extend({
  transaction_type: z.literal('IMPORT'),
  unit_price:       z.number().positive().optional(),
  supplier:         z.string().min(2).max(200),   // BR-005-3: bắt buộc
  invoice_no:       z.string().min(1).max(100),   // BR-005-3: bắt buộc
  expiry_date:      z.string().datetime().optional(),
})

export const ExportTransactionDto = BaseTransactionDto.extend({
  transaction_type:    z.literal('EXPORT'),
  recipient_farmer_id: z.string().cuid(),         // BR-005-4: bắt buộc
  purpose:             z.string().min(5).max(500), // BR-005-4: bắt buộc
})

export const ReturnTransactionDto = BaseTransactionDto.extend({
  transaction_type:    z.literal('RETURN'),
  recipient_farmer_id: z.string().cuid().optional(), // hoàn trả từ nông dân nào
  return_reason:       z.string().min(5).max(500),
})

// Union — controller dùng cái này để parse
export const CreateTransactionDto = z.discriminatedUnion('transaction_type', [
  ImportTransactionDto,
  ExportTransactionDto,
  ReturnTransactionDto,
])

// ── Query filters ─────────────────────────────────

export const TransactionQueryDto = z.object({
  material_id:      z.string().cuid().optional(),
  transaction_type: z.enum(['IMPORT', 'EXPORT', 'RETURN']).optional(),
  farmer_id:        z.string().cuid().optional(),
  from_date:        z.string().datetime().optional(),
  to_date:          z.string().datetime().optional(),
  page:             z.coerce.number().min(1).default(1),
  limit:            z.coerce.number().min(1).max(100).default(20),
})

export const ReconciliationQueryDto = z.object({
  farmer_id: z.string().cuid().optional(),
  from_date: z.string().datetime().optional(),
  to_date:   z.string().datetime().optional(),
})
```

---

## 5. Repository

```typescript
// warehouse.repository.ts

export class WarehouseRepository {

  // ── Material ──────────────────────────────────

  async findMaterials(cooperativeId: string, filters: {
    search?: string
    material_type?: string
    page: number
    limit: number
  }) {
    const where: Prisma.MaterialWhereInput = {
      cooperative_id: cooperativeId,
      is_active: true,
      ...(filters.search && {
        material_name: { contains: filters.search, mode: 'insensitive' }
      }),
      ...(filters.material_type && { material_type: filters.material_type as MaterialType }),
    }
    const [data, total] = await prisma.$transaction([
      prisma.material.findMany({
        where,
        include: { stock_item: true },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { created_at: 'desc' },
      }),
      prisma.material.count({ where }),
    ])
    return { data, total }
  }

  async findById(id: string) {
    return prisma.material.findUnique({
      where: { id },
      include: { stock_item: true },
    })
  }

  // ── Stock ─────────────────────────────────────

  async findStockAlerts(cooperativeId: string) {
    const thirtyDaysLater = new Date()
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30)

    return prisma.material.findMany({
      where: {
        cooperative_id: cooperativeId,
        is_active: true,
        OR: [
          // Tồn kho dưới ngưỡng cảnh báo
          { stock_item: { current_stock: { lte: prisma.material.fields.min_stock_alert } } },
          // Hết hạn trong 30 ngày
          { stock_item: { expiry_date: { lte: thirtyDaysLater } } },
        ]
      },
      include: { stock_item: true },
    })
  }

  // ── Transaction (Prisma Transaction — atomic) ─

  async createTransactionInTx(data: {
    transaction: Prisma.WarehouseTransactionCreateInput
    stockDelta: number  // + nhập/hoàn, - xuất
    materialId: string
    expiryDate?: Date
  }) {
    return prisma.$transaction(async (tx) => {
      // 1. Tạo phiếu giao dịch
      const transaction = await tx.warehouseTransaction.create({
        data: data.transaction,
      })

      // 2. Cập nhật tồn kho (upsert — có thể chưa có StockItem)
      const stockItem = await tx.stockItem.upsert({
        where: { material_id: data.materialId },
        create: {
          material_id: data.materialId,
          current_stock: Math.max(0, data.stockDelta),
          expiry_date: data.expiryDate,
        },
        update: {
          current_stock: { increment: data.stockDelta },
          ...(data.expiryDate && { expiry_date: data.expiryDate }),
        },
      })

      // 3. Kiểm tra không âm sau khi cập nhật (double-check)
      if (stockItem.current_stock < 0) {
        throw new AppError('INSUFFICIENT_STOCK', 422)
      }

      return { transaction, stockItem }
    })
  }

  async findTransactions(cooperativeId: string, filters: TransactionQueryDtoType) {
    // join qua material để filter cooperative_id
    const where: Prisma.WarehouseTransactionWhereInput = {
      material: { cooperative_id: cooperativeId },
      ...(filters.material_id && { material_id: filters.material_id }),
      ...(filters.transaction_type && { transaction_type: filters.transaction_type }),
      ...(filters.farmer_id && { recipient_farmer_id: filters.farmer_id }),
      ...(filters.from_date && { transaction_date: { gte: new Date(filters.from_date) } }),
      ...(filters.to_date && { transaction_date: { lte: new Date(filters.to_date) } }),
    }
    const [data, total] = await prisma.$transaction([
      prisma.warehouseTransaction.findMany({
        where,
        include: { material: true },
        skip: (filters.page - 1) * filters.limit,
        take: filters.limit,
        orderBy: { transaction_date: 'desc' },
      }),
      prisma.warehouseTransaction.count({ where }),
    ])
    return { data, total }
  }
}
```

---

## 6. Service — Business Logic

```typescript
// warehouse.service.ts

export class WarehouseService {

  async importStock(dto: ImportTransactionDtoType, currentUser: AuthUser) {
    // Ownership check
    const material = await this.repo.findById(dto.material_id)
    if (!material) throw new AppError('MATERIAL_NOT_FOUND', 404)
    if (material.cooperative_id !== currentUser.cooperative_id) {
      throw new AppError('FORBIDDEN', 403)
    }

    return this.repo.createTransactionInTx({
      transaction: {
        material:         { connect: { id: dto.material_id } },
        transaction_type: 'IMPORT',
        quantity:         dto.quantity,
        unit_price:       dto.unit_price,
        supplier:         dto.supplier,
        invoice_no:       dto.invoice_no,
        transaction_date: new Date(dto.transaction_date),
        expiry_date:      dto.expiry_date ? new Date(dto.expiry_date) : undefined,
        notes:            dto.notes,
        created_by:       currentUser.id,
      },
      stockDelta: +dto.quantity,  // cộng vào tồn kho
      materialId: dto.material_id,
      expiryDate: dto.expiry_date ? new Date(dto.expiry_date) : undefined,
    })
  }

  async exportStock(dto: ExportTransactionDtoType, currentUser: AuthUser) {
    const material = await this.repo.findById(dto.material_id)
    if (!material) throw new AppError('MATERIAL_NOT_FOUND', 404)
    if (material.cooperative_id !== currentUser.cooperative_id) {
      throw new AppError('FORBIDDEN', 403)
    }

    const stock = material.stock_item
    if (!stock) throw new AppError('INSUFFICIENT_STOCK', 422)

    // BR-005-1: kiểm tra tồn kho
    if (stock.current_stock < dto.quantity) {
      throw new AppError('INSUFFICIENT_STOCK', 422,
        `Tồn kho hiện tại: ${stock.current_stock} ${material.unit}`)
    }

    // BR-005-6: kiểm tra hạn sử dụng
    if (stock.expiry_date && stock.expiry_date < new Date()) {
      throw new AppError('MATERIAL_EXPIRED', 422,
        `Vật tư đã hết hạn ngày: ${stock.expiry_date.toLocaleDateString('vi-VN')}`)
    }

    // Kiểm tra farmer thuộc cùng HTX
    const farmer = await this.farmerRepo.findById(dto.recipient_farmer_id)
    if (!farmer || farmer.cooperative_id !== currentUser.cooperative_id) {
      throw new AppError('FARMER_NOT_FOUND', 404)
    }

    return this.repo.createTransactionInTx({
      transaction: {
        material:            { connect: { id: dto.material_id } },
        transaction_type:    'EXPORT',
        quantity:            dto.quantity,
        recipient_farmer_id: dto.recipient_farmer_id,
        purpose:             dto.purpose,
        transaction_date:    new Date(dto.transaction_date),
        notes:               dto.notes,
        created_by:          currentUser.id,
      },
      stockDelta: -dto.quantity,  // trừ khỏi tồn kho
      materialId: dto.material_id,
    })
  }

  async returnStock(dto: ReturnTransactionDtoType, currentUser: AuthUser) {
    const material = await this.repo.findById(dto.material_id)
    if (!material) throw new AppError('MATERIAL_NOT_FOUND', 404)
    if (material.cooperative_id !== currentUser.cooperative_id) {
      throw new AppError('FORBIDDEN', 403)
    }

    return this.repo.createTransactionInTx({
      transaction: {
        material:            { connect: { id: dto.material_id } },
        transaction_type:    'RETURN',
        quantity:            dto.quantity,
        recipient_farmer_id: dto.recipient_farmer_id,
        purpose:             dto.return_reason,
        transaction_date:    new Date(dto.transaction_date),
        notes:               dto.notes,
        created_by:          currentUser.id,
      },
      stockDelta: +dto.quantity,  // hoàn trả → cộng lại tồn kho
      materialId: dto.material_id,
    })
  }

  // ── Reconciliation ────────────────────────────

  async getReconciliation(cooperativeId: string, filters: ReconciliationQueryDtoType) {
    const dateFilter = {
      ...(filters.from_date && { gte: new Date(filters.from_date) }),
      ...(filters.to_date   && { lte: new Date(filters.to_date) }),
    }

    // 1. Tổng xuất kho theo nông dân + loại vật tư
    const exports = await prisma.warehouseTransaction.groupBy({
      by: ['recipient_farmer_id', 'material_id'],
      where: {
        transaction_type: 'EXPORT',
        material: { cooperative_id: cooperativeId },
        ...(filters.farmer_id && { recipient_farmer_id: filters.farmer_id }),
        ...(Object.keys(dateFilter).length && { transaction_date: dateFilter }),
      },
      _sum: { quantity: true },
    })

    // 2. Tổng vật tư ghi trong nhật ký canh tác cùng nông dân + thời gian
    const logged = await prisma.farmingLog.groupBy({
      by: ['season_id'],
      where: {
        activity_type: { in: ['FERTILIZING', 'PESTICIDE'] },
        ...(Object.keys(dateFilter).length && { activity_date: dateFilter }),
      },
      _sum: {
        quantity_kg: true,  // FERTILIZING
        dosage: true,       // PESTICIDE
      },
    })

    // 3. Tính chênh lệch và trả về
    return {
      exported: exports,
      logged:   logged,
      summary:  'Chênh lệch dương = vật tư đã cấp nhưng chưa ghi nhật ký',
    }
  }
}
```

---

## 7. Router

```typescript
// warehouse.router.ts

import { Router } from 'express'
import { requireAuth }  from '../../shared/middleware/auth.middleware'
import { requireRole }  from '../../shared/middleware/role.middleware'

const router = Router()
router.use(requireAuth)

const ALLOWED = requireRole(['HTX_MANAGER', 'WAREHOUSE_KEEPER'])
const HTX_ONLY = requireRole(['HTX_MANAGER'])

// Danh mục vật tư
router.post  ('/materials',     HTX_ONLY, (req, res, next) => controller.createMaterial(req, res, next))
router.get   ('/materials',     ALLOWED,  (req, res, next) => controller.getMaterials(req, res, next))
router.get   ('/materials/:id', ALLOWED,  (req, res, next) => controller.getMaterialById(req, res, next))
router.put   ('/materials/:id', HTX_ONLY, (req, res, next) => controller.updateMaterial(req, res, next))
router.delete('/materials/:id', HTX_ONLY, (req, res, next) => controller.deleteMaterial(req, res, next))

// Tồn kho
router.get('/stock',        ALLOWED, (req, res, next) => controller.getStock(req, res, next))
router.get('/stock/alerts', ALLOWED, (req, res, next) => controller.getStockAlerts(req, res, next))

// Giao dịch
router.post('/transactions/import', ALLOWED,  (req, res, next) => controller.importStock(req, res, next))
router.post('/transactions/export', ALLOWED,  (req, res, next) => controller.exportStock(req, res, next))
router.post('/transactions/return', ALLOWED,  (req, res, next) => controller.returnStock(req, res, next))
router.get ('/transactions',        ALLOWED,  (req, res, next) => controller.getTransactions(req, res, next))
router.get ('/transactions/:id',    ALLOWED,  (req, res, next) => controller.getTransactionById(req, res, next))

// Đối chiếu
router.get('/reconciliation', HTX_ONLY, (req, res, next) => controller.getReconciliation(req, res, next))

export default router
```

---

## 8. Error Codes Module Warehouse

| Code | HTTP | Mô tả |
|---|---|---|
| `MATERIAL_NOT_FOUND` | 404 | Không tìm thấy vật tư |
| `MATERIAL_EXPIRED` | 422 | Vật tư đã hết hạn sử dụng |
| `INSUFFICIENT_STOCK` | 422 | Tồn kho không đủ để xuất |
| `MATERIAL_IN_USE` | 409 | Không thể xóa vật tư đang có giao dịch |
| `FARMER_NOT_IN_COOPERATIVE` | 403 | Nông dân không thuộc HTX này |

---

## 9. Test Cases Đầy Đủ

```typescript
// warehouse.test.ts

describe('WarehouseService', () => {

  // ── Material ──────────────────────────────────
  describe('Material', () => {
    it('✅ HTX_MANAGER tạo vật tư mới thành công')
    it('❌ Tạo vật tư với material_type không hợp lệ → 400 VALIDATION_ERROR')
    it('❌ HTX_MANAGER xem vật tư HTX khác → 403 FORBIDDEN')
  })

  // ── Import ────────────────────────────────────
  describe('Import Stock', () => {
    it('✅ Nhập kho hợp lệ → tồn kho tăng đúng')
    it('✅ Nhập kho 2 lần → tồn kho cộng dồn đúng')
    it('❌ Thiếu supplier → 400 VALIDATION_ERROR')
    it('❌ Thiếu invoice_no → 400 VALIDATION_ERROR')
    it('❌ quantity <= 0 → 400 VALIDATION_ERROR')
  })

  // ── Export ────────────────────────────────────
  describe('Export Stock', () => {
    it('✅ Xuất kho hợp lệ → tồn kho giảm đúng')
    it('❌ Xuất nhiều hơn tồn kho → 422 INSUFFICIENT_STOCK')  // BR-005-1
    it('❌ Xuất vật tư đã hết hạn → 422 MATERIAL_EXPIRED')    // BR-005-6
    it('❌ Thiếu recipient_farmer_id → 400 VALIDATION_ERROR') // BR-005-4
    it('❌ Nông dân không thuộc HTX → 403 FORBIDDEN')
    it('❌ Xuất kho âm (quantity < 0) → 400 VALIDATION_ERROR')
  })

  // ── Return ────────────────────────────────────
  describe('Return Stock', () => {
    it('✅ Hoàn trả → tồn kho cộng lại đúng')
    it('❌ Thiếu return_reason → 400 VALIDATION_ERROR')
  })

  // ── Business Rules ────────────────────────────
  describe('Business Rules', () => {
    it('❌ Không cho sửa/xóa phiếu đã tạo → 405 METHOD_NOT_ALLOWED') // BR-005-5
    it('✅ Cảnh báo vật tư sắp hết hạn ≤ 30 ngày → xuất hiện trong /stock/alerts')
    it('✅ Cảnh báo tồn kho dưới min_stock_alert → xuất hiện trong /stock/alerts')
    it('✅ Ownership: HTX_MANAGER chỉ thao tác vật tư trong HTX mình')
  })

  // ── Reconciliation ────────────────────────────
  describe('Reconciliation', () => {
    it('✅ Xuất kho 50kg phân, nhật ký ghi 40kg → chênh lệch +10kg')
    it('✅ Chưa có nhật ký → chênh lệch = toàn bộ số đã xuất')
    it('✅ Filter theo farmer_id trả đúng dữ liệu nông dân đó')
    it('✅ Filter theo khoảng thời gian hoạt động đúng')
  })

  // ── Prisma Transaction ────────────────────────
  describe('Atomic Transaction', () => {
    it('✅ Import + update stock trong 1 transaction — rollback nếu lỗi')
    it('✅ Export + update stock trong 1 transaction — rollback nếu lỗi')
  })
})
```

---

## 10. Kế Hoạch Kiểm Thử Thủ Công (Postman)

```bash
# Bước 1: Đăng nhập HTX Manager
POST /api/v1/auth/login
Body: { "phone": "0987654321", "password": "..." }
→ Lưu access_token

# Bước 2: Tạo vật tư
POST /api/v1/warehouse/materials
Body: { "material_name": "Phân NPK 16-16-8", "material_type": "FERTILIZER", "unit": "kg", "min_stock_alert": 50 }
→ Expect: 201 + material record

# Bước 3: Nhập kho
POST /api/v1/warehouse/transactions/import
Body: { "material_id": "...", "quantity": 200, "supplier": "Cty Phân Bón ABC", "invoice_no": "INV-2024-001", "transaction_date": "2024-06-01T00:00:00Z" }
→ Expect: 201 + current_stock = 200

# Bước 4: Xuất kho hợp lệ
POST /api/v1/warehouse/transactions/export
Body: { "material_id": "...", "quantity": 50, "recipient_farmer_id": "...", "purpose": "Bón phân vụ Đông Xuân", "transaction_date": "2024-06-05T00:00:00Z" }
→ Expect: 201 + current_stock = 150

# Bước 5: Test INSUFFICIENT_STOCK
POST /api/v1/warehouse/transactions/export
Body: { ..., "quantity": 500 }
→ Expect: 422 { "error": { "code": "INSUFFICIENT_STOCK" } }

# Bước 6: Test MATERIAL_EXPIRED
# (Nhập kho với expiry_date trong quá khứ trước, rồi thử xuất)
→ Expect: 422 { "error": { "code": "MATERIAL_EXPIRED" } }

# Bước 7: Xem cảnh báo tồn kho
GET /api/v1/warehouse/stock/alerts
→ Expect: Danh sách vật tư sắp hết / sắp hết hạn

# Bước 8: Xem đối chiếu
GET /api/v1/warehouse/reconciliation?farmer_id=...
→ Expect: { exported: [...], logged: [...], summary: "..." }
```

---

## 11. Dependency & Thứ Tự Implement

```
1. Prisma migration (Material + StockItem + WarehouseTransaction)
2. warehouse.dto.ts     — Zod schemas + cross-validation
3. warehouse.repository.ts — CRUD + createTransactionInTx
4. warehouse.service.ts    — business logic + reconciliation
5. warehouse.controller.ts — HTTP handlers
6. warehouse.router.ts     — mount endpoints + middleware
7. warehouse.test.ts       — toàn bộ test cases
8. Chạy npm run test → đảm bảo xanh hết
```