# Module: reporting

## Mục đích
Báo cáo động, dashboard tổng hợp, export Excel/PDF cho HTX Manager và cơ quan nhà nước.

## Endpoints

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/reports/dashboard` | HTX_MANAGER, SUPER_ADMIN | Dashboard overview |
| GET | `/api/v1/reports/production` | HTX_MANAGER, SUPER_ADMIN, GOV_VIEWER | Báo cáo sản lượng |
| GET | `/api/v1/reports/carbon-summary` | HTX_MANAGER, SUPER_ADMIN, GOV_VIEWER | Tổng hợp Carbon |
| GET | `/api/v1/reports/qr-status` | HTX_MANAGER, SUPER_ADMIN | Thống kê trạng thái QR |
| GET | `/api/v1/reports/warehouse` | HTX_MANAGER, WAREHOUSE_KEEPER | Báo cáo tồn kho |
| POST | `/api/v1/reports/export` | HTX_MANAGER, SUPER_ADMIN | Tạo job export file |
| GET | `/api/v1/reports/export/:jobId` | HTX_MANAGER, SUPER_ADMIN | Lấy link download |

## Query Params chung
`?from_date=&to_date=&cooperative_id=&crop_type=`

## Dashboard Response Shape

```typescript
{
  total_farmers: number,
  total_farm_zones: number,
  active_seasons: number,
  completed_seasons_ytd: number,
  total_yield_kg_ytd: number,
  active_batches: number,
  total_qr_issued: number,
  total_qr_active: number,
  carbon_records: {
    draft: number,
    verified: number,
    issued: number,
    total_credits_tCO2e: number,
  },
  recent_activity: ActivityItem[],  // 10 hoạt động gần nhất
}
```

## Business Logic

- Dashboard data: cache Redis 15 phút, key = `dashboard:{cooperative_id}` (BR-008-3)
- `GOV_VIEWER` chỉ nhận aggregate data, không có `farmer_id` hay thông tin cá nhân (BR-008-1)
- Carbon summary chỉ hiển thị records `status = VERIFIED hoặc ISSUED` cho GOV_VIEWER (BR-008-2)
- Export chạy async BullMQ, trả về `{ jobId, status: 'PENDING' }` (BR-008-4)
- Export worker tạo file Excel (xlsx) hoặc PDF, lưu vào storage, cập nhật job với `download_url`

## Export Job Schema

```prisma
model ExportJob {
  id           String       @id @default(cuid())
  report_type  String       // 'production', 'carbon', 'warehouse', ...
  format       ExportFormat
  filters      Json
  status       ExportStatus @default(PENDING)
  download_url String?
  expires_at   DateTime?    // link expire sau 24h
  created_by   String
  created_at   DateTime     @default(now())
}

enum ExportFormat { EXCEL PDF }
enum ExportStatus { PENDING PROCESSING COMPLETED FAILED }
```

## Cache Strategy
- Invalidate `dashboard:{cooperative_id}` khi: farming log mới, batch kích hoạt, carbon record thay đổi
- Báo cáo sản lượng cache 15 phút
- Export file cache không cần (single-use download)

## Business Rules
- `BR-008-1` đến `BR-008-4` trong `BUSINESS_RULES.md`
