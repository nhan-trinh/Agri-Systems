# Module: warehouse

## Mục đích
Quản lý kho vật tư nông nghiệp: nhập, xuất, tồn kho; cấp phát cho nông dân.

## Endpoints

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/warehouse/materials` | HTX_MANAGER, WAREHOUSE_KEEPER | Danh mục vật tư |
| POST | `/api/v1/warehouse/materials` | HTX_MANAGER | Thêm vật tư mới vào danh mục |
| GET | `/api/v1/warehouse/stock` | HTX_MANAGER, WAREHOUSE_KEEPER | Tồn kho hiện tại |
| POST | `/api/v1/warehouse/transactions/import` | WAREHOUSE_KEEPER, HTX_MANAGER | Phiếu nhập kho |
| POST | `/api/v1/warehouse/transactions/export` | WAREHOUSE_KEEPER, HTX_MANAGER | Phiếu xuất kho |
| GET | `/api/v1/warehouse/transactions` | HTX_MANAGER, WAREHOUSE_KEEPER | Lịch sử giao dịch |
| GET | `/api/v1/warehouse/stock/low-alert` | HTX_MANAGER | Vật tư sắp hết / hết hạn |

## DTOs

```typescript
ImportTransactionDto: {
  material_id: string,
  quantity: number (> 0),
  unit_price: number (optional),
  supplier: string (min 2),
  invoice_no: string,
  import_date: string (ISO),
  expiry_date: string (ISO, optional),
  notes: string (optional),
}

ExportTransactionDto: {
  material_id: string,
  quantity: number (> 0),
  recipient_farmer_id: string,
  purpose: string (min 5, max 500),
  export_date: string (ISO),
  notes: string (optional),
}
```

## Business Logic

1. **Nhập kho**: Tạo transaction `IMPORT`, cộng vào `current_stock` trong bảng `StockItem`
2. **Xuất kho**:
   - Kiểm tra `current_stock >= quantity` (BR-005-1) — nếu không: throw `INSUFFICIENT_STOCK`
   - Kiểm tra `expiry_date` nếu có — quá hạn: throw `MATERIAL_EXPIRED`
   - Tạo transaction `EXPORT`, trừ `current_stock`
3. **Low alert**: query vật tư `current_stock < min_stock_alert` OR `expiry_date <= now + 30 days`
4. Không sửa transaction đã duyệt (BR-005-5) — chỉ tạo phiếu hoàn (reverse transaction)

## Prisma Schema liên quan

```prisma
model Material {
  id              String       @id @default(cuid())
  cooperative_id  String
  material_name   String
  material_type   MaterialType
  unit            String       // "kg", "lít", "gói", "bao"
  min_stock_alert Float        @default(0)
  is_active       Boolean      @default(true)
  created_at      DateTime     @default(now())
  stock_items     StockItem[]
  transactions    WarehouseTransaction[]
}

model StockItem {
  id              String   @id @default(cuid())
  material_id     String   @unique
  material        Material @relation(fields: [material_id], references: [id])
  current_stock   Float    @default(0)
  expiry_date     DateTime?
  updated_at      DateTime @updatedAt
}

model WarehouseTransaction {
  id                   String          @id @default(cuid())
  material_id          String
  material             Material        @relation(fields: [material_id], references: [id])
  transaction_type     TransactionType
  quantity             Float
  unit_price           Float?
  supplier             String?
  invoice_no           String?
  recipient_farmer_id  String?
  purpose              String?
  transaction_date     DateTime
  expiry_date          DateTime?
  notes                String?
  created_by           String
  created_at           DateTime        @default(now())
}

enum MaterialType   { SEED FERTILIZER PESTICIDE EQUIPMENT OTHER }
enum TransactionType { IMPORT EXPORT RETURN }
```

## Business Rules
- `BR-005-1` đến `BR-005-6` trong `BUSINESS_RULES.md`
