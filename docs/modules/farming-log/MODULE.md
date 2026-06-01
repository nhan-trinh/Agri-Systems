# Module: farming-log

## Mục đích
Ghi nhật ký canh tác hàng ngày: tưới nước, bón phân, phun thuốc, thu hoạch.

## Endpoints

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/api/v1/farming-logs` | FARMER, HTX_MANAGER | Ghi nhật ký mới |
| GET | `/api/v1/farming-logs` | FARMER(own), HTX_MANAGER, SUPER_ADMIN | Danh sách nhật ký |
| GET | `/api/v1/farming-logs/:id` | FARMER(own), HTX_MANAGER | Chi tiết nhật ký |
| PUT | `/api/v1/farming-logs/:id` | FARMER(own), HTX_MANAGER | Sửa nhật ký (chỉ khi season ACTIVE) |
| DELETE | `/api/v1/farming-logs/:id` | HTX_MANAGER, SUPER_ADMIN | Xóa (chỉ khi season ACTIVE) |

## DTOs

```typescript
CreateFarmingLogDto: {
  season_id: string,
  activity_date: string (ISO date — không phải datetime),
  activity_type: ActivityType (enum),
  notes: string (optional, max 1000),

  // Conditional — bắt buộc theo activity_type
  // FERTILIZING:
  fertilizer_type: string (optional),
  quantity_kg: number (optional, > 0),

  // PESTICIDE:
  product_name: string (optional),
  dosage: number (optional, > 0),
  unit: string (optional, max 20), // vd: "lít/ha", "kg/ha"

  // IRRIGATION:
  water_volume_m3: number (optional),
  duration_hours: number (optional),

  // HARVESTING:
  yield_kg: number (optional, > 0),
  harvest_method: string (optional),

  // Media
  photo_urls: string[] (optional, max 5 URLs),
}
```

## Business Logic

1. Validate season tồn tại và status = ACTIVE (BR-003-1)
2. `activity_date` phải nằm trong `season.start_date` ≤ date ≤ today (BR-003-3)
3. Validate bắt buộc theo `activity_type` (BR-003-5, BR-003-6, BR-003-7):
   - `PESTICIDE` → `product_name`, `dosage`, `unit` bắt buộc
   - `FERTILIZING` → `fertilizer_type`, `quantity_kg` bắt buộc
   - `HARVESTING` → `yield_kg` bắt buộc
4. Chỉ 1 bản ghi `HARVESTING` / season. Lần 2 trả `SEASON_ALREADY_ACTIVE` (BR-003-7)
5. Sau khi lưu `HARVESTING`:
   - Cập nhật `season.actual_yield_kg = yield_kg`
   - Cập nhật `season.status = COMPLETED`, `season.actual_end_date = activity_date`
   - Trigger BullMQ job `carbon.compute` với `seasonId` (async)
6. Không sửa/xóa log khi season = COMPLETED và batch đã có QR ACTIVE (BR-003-9)

## Enums

```typescript
enum ActivityType {
  SEEDING = 'SEEDING',
  FERTILIZING = 'FERTILIZING',
  PESTICIDE = 'PESTICIDE',
  IRRIGATION = 'IRRIGATION',
  HARVESTING = 'HARVESTING',
  OTHER = 'OTHER'
}
```

## Prisma Schema liên quan

```prisma
model FarmingLog {
  id              String       @id @default(cuid())
  season_id       String
  season          Season       @relation(fields: [season_id], references: [id])
  activity_date   DateTime     @db.Date
  activity_type   ActivityType
  notes           String?

  // Fertilizing
  fertilizer_type String?
  quantity_kg     Float?

  // Pesticide
  product_name    String?
  dosage          Float?
  unit            String?

  // Irrigation
  water_volume_m3 Float?
  duration_hours  Float?

  // Harvesting
  yield_kg        Float?
  harvest_method  String?

  photo_urls      String[]
  created_by      String       // userId
  created_at      DateTime     @default(now())
  updated_at      DateTime     @updatedAt
}
```

## Query Filters (GET /farming-logs)
`?season_id=&activity_type=&from_date=&to_date=&page=&limit=`

## Business Rules
- `BR-003-1` đến `BR-003-10` trong `BUSINESS_RULES.md`
