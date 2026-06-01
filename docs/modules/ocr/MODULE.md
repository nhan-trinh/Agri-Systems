# Module: ocr

## Mục đích
Số hóa sổ tay giấy và hóa đơn vật tư của nông dân thông qua OCR, chuyển thành dữ liệu nhật ký/kho.

## Endpoints

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/api/v1/ocr/upload` | HTX_MANAGER, FARMER | Upload ảnh/PDF để OCR |
| GET | `/api/v1/ocr/jobs/:jobId` | HTX_MANAGER, FARMER | Polling trạng thái job |
| GET | `/api/v1/ocr/results/:jobId` | HTX_MANAGER, FARMER | Lấy kết quả OCR để review |
| POST | `/api/v1/ocr/results/:jobId/confirm` | HTX_MANAGER, FARMER | Xác nhận tạo records từ OCR |
| POST | `/api/v1/ocr/results/:jobId/reject` | HTX_MANAGER, FARMER | Từ chối kết quả OCR |

## Upload Constraints
- File size: tối đa 10MB (BR-007-1)
- Formats: image/jpeg, image/png, application/pdf
- Tối đa 5 file/lần upload

## Business Logic

### Upload & Enqueue
1. Validate file (size, format)
2. Lưu file vào local storage (`./uploads/ocr/`) hoặc S3
3. Tạo `OcrJob` record với `status = PENDING`
4. Enqueue BullMQ job `ocr.process` với `{ jobId, filePath, documentType }`
5. Trả về 202 + `{ jobId }` ngay — không block (BR-007-4)

### OCR Worker
1. Gọi Tesseract.js (local) hoặc Google Vision API
2. Parse kết quả theo `documentType`:
   - `FARMING_LOG`: tìm ngày, loại hoạt động, sản phẩm, liều lượng
   - `INVOICE`: tìm tên vật tư, số lượng, đơn giá, ngày, nhà cung cấp
3. Lưu raw result vào MongoDB (không vào PostgreSQL)
4. Cập nhật `OcrJob.status = COMPLETED` (hoặc `FAILED` nếu lỗi)

### Confirm
1. User review kết quả, chỉnh sửa nếu cần
2. Khi confirm: tạo FarmingLog hoặc WarehouseTransaction từ dữ liệu đã verify
3. Cập nhật `OcrJob.status = CONFIRMED`
4. Không cho confirm 2 lần (BR-007-3)

## MongoDB Schema (OcrJob raw data)

```typescript
// MongoDB collection: ocr_jobs
{
  _id: ObjectId,
  job_id: string,    // sync với PostgreSQL OcrJob.id
  file_path: string,
  document_type: 'FARMING_LOG' | 'INVOICE',
  raw_ocr_text: string,
  parsed_data: {
    confidence: number,  // 0–1
    fields: [{ key: string, value: string, confidence: number }]
  },
  created_at: Date
}
```

## Prisma Schema

```prisma
model OcrJob {
  id              String    @id @default(cuid())
  file_url        String
  document_type   OcrDocType
  status          OcrStatus  @default(PENDING)
  error_message   String?
  confirmed_at    DateTime?
  confirmed_by    String?
  created_by      String
  created_at      DateTime   @default(now())
}

enum OcrDocType { FARMING_LOG INVOICE }
enum OcrStatus  { PENDING PROCESSING COMPLETED CONFIRMED FAILED REJECTED }
```

## Business Rules
- `BR-007-1` đến `BR-007-4` trong `BUSINESS_RULES.md`
