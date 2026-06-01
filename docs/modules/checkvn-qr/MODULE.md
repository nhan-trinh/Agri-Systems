# Module: checkvn-qr

## Mục đích
Tạo lô hàng, yêu cầu CheckVN cấp dải mã QR, quản lý vòng đời QR (INACTIVE → ACTIVE → RECALLED).

## Endpoints

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/api/v1/qr/batches` | HTX_MANAGER, SUPER_ADMIN | Tạo lô hàng mới |
| GET | `/api/v1/qr/batches` | HTX_MANAGER, SUPER_ADMIN | Danh sách lô hàng |
| GET | `/api/v1/qr/batches/:id` | HTX_MANAGER, SUPER_ADMIN | Chi tiết lô hàng |
| POST | `/api/v1/qr/batches/:id/request-qr` | HTX_MANAGER | Gửi yêu cầu cấp QR lên CheckVN |
| GET | `/api/v1/qr/batches/:id/qr-codes` | HTX_MANAGER, WAREHOUSE_KEEPER | Danh sách mã QR của lô |
| POST | `/api/v1/qr/batches/:id/activate` | HTX_MANAGER | Kích hoạt toàn bộ QR của lô |
| POST | `/api/v1/qr/batches/:id/recall` | HTX_MANAGER, SUPER_ADMIN | Thu hồi lô hàng |
| POST | `/api/v1/qr/webhook/checkvn` | SYSTEM (webhook) | Nhận callback từ CheckVN |
| GET | `/public/trace/:qrCode` | PUBLIC | Tra cứu sản phẩm theo QR (no auth) |

## DTOs

```typescript
CreateBatchDto: {
  season_id: string,
  batch_name: string (max 200),
  total_weight_kg: number (> 0),
  quantity_qr_requested: number (1–10000),
  product_description: string (optional),
  packaging_unit: string,   // vd: "Túi 1kg", "Bao 25kg"
}

ActivateBatchDto: {
  activation_note: string (min 10, max 500),  // bắt buộc BR-004-8
}

RecallBatchDto: {
  recall_reason: string (min 10, max 500),    // bắt buộc
}
```

## State Machine Lô hàng

```
DRAFT ──request-qr──► PENDING_QR ──webhook OK──► QR_RECEIVED
                                                      │
                                              ACTIVATING (đang kích hoạt)
                                                      │
                                                   ACTIVE ──recall──► RECALLED
```

## Business Logic

### Tạo lô hàng
1. Lấy season từ `season_id`, kiểm tra `status = COMPLETED` (BR-004-1)
2. `total_weight_kg ≤ season.actual_yield_kg` (BR-004-4)
3. Tự sinh `batch_code` (BR-004-2)
4. Lưu với `status = DRAFT`

### Yêu cầu QR (request-qr)
1. Batch phải ở trạng thái `DRAFT`
2. Cập nhật batch `status = PENDING_QR`
3. Enqueue BullMQ job `checkvn.request-qr` với payload:
   ```json
   { "batchId": "...", "batchCode": "...", "quantity": 500, "callbackUrl": "/api/v1/qr/webhook/checkvn" }
   ```
4. HTTP response 202 Accepted ngay — không chờ CheckVN

### CheckVN Worker (BullMQ)
1. Gọi `POST https://api.checkvn.vn/v1/batches` với headers `Authorization: Bearer {CHECKVN_API_KEY}`
2. Lưu `checkvn_batch_id` vào batch record
3. CheckVN gọi webhook callback sau khi sinh xong QR

### Webhook nhận từ CheckVN
1. Verify `X-CheckVN-Signature` header (HMAC-SHA256 với `CHECKVN_WEBHOOK_SECRET`)
2. Parse danh sách mã QR từ payload
3. Bulk insert vào bảng `QrCode` với `status = INACTIVE`
4. Cập nhật batch `status = QR_RECEIVED`
5. Notify HTX_MANAGER (notification module)

### Kích hoạt (activate)
1. Batch phải ở `QR_RECEIVED`
2. Cập nhật tất cả QR của batch → `ACTIVE`, ghi `activated_at`, `activation_note`
3. Gọi CheckVN API xác nhận kích hoạt (async BullMQ)
4. Cập nhật batch → `ACTIVE`

### Public trace endpoint
1. Không cần auth
2. Tìm QrCode theo `code`, kiểm tra `status = ACTIVE`
3. Lấy toàn bộ: season info, farm zone info, farmer (tên, không lộ SĐT/CMND), farming logs, carbon badge
4. Cache Redis 5 phút (QR active ít khi thay đổi)

## Prisma Schema liên quan

```prisma
model Batch {
  id                    String      @id @default(cuid())
  batch_code            String      @unique
  season_id             String      @unique  // 1 season 1 batch
  season                Season      @relation(fields: [season_id], references: [id])
  batch_name            String
  total_weight_kg       Float
  quantity_qr_requested Int
  packaging_unit        String
  product_description   String?
  status                BatchStatus @default(DRAFT)
  checkvn_batch_id      String?
  activated_at          DateTime?
  activation_note       String?
  recalled_at           DateTime?
  recall_reason         String?
  created_by            String
  created_at            DateTime    @default(now())
  qr_codes              QrCode[]
}

model QrCode {
  id           String    @id @default(cuid())
  code         String    @unique   // mã QR thực tế từ CheckVN
  batch_id     String
  batch        Batch     @relation(fields: [batch_id], references: [id])
  status       QrStatus  @default(INACTIVE)
  activated_at DateTime?
  recalled_at  DateTime?
  created_at   DateTime  @default(now())

  @@index([code])
  @@index([batch_id, status])
}

enum BatchStatus { DRAFT PENDING_QR QR_RECEIVED ACTIVATING ACTIVE RECALLED }
enum QrStatus   { INACTIVE ACTIVE RECALLED }
```

## Business Rules
- `BR-004-1` đến `BR-004-10` trong `BUSINESS_RULES.md`

## Security
- Webhook endpoint không cần Bearer token nhưng phải verify HMAC signature
- `CHECKVN_API_KEY` phải được bảo mật trong `.env`, không log ra console
