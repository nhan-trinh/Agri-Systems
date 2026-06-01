# Module: farm-zone

## Mục đích
Quản lý vùng trồng: tọa độ GPS polygon, diện tích, cây trồng, vụ mùa.

## Endpoints

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/api/v1/farm-zones` | HTX_MANAGER, SUPER_ADMIN | Tạo vùng trồng mới |
| GET | `/api/v1/farm-zones` | HTX_MANAGER, SUPER_ADMIN, FARMER | Danh sách vùng trồng |
| GET | `/api/v1/farm-zones/:id` | HTX_MANAGER, SUPER_ADMIN, FARMER(own) | Chi tiết vùng trồng |
| PUT | `/api/v1/farm-zones/:id` | HTX_MANAGER, SUPER_ADMIN | Cập nhật thông tin |
| DELETE | `/api/v1/farm-zones/:id` | HTX_MANAGER, SUPER_ADMIN | Soft delete |
| POST | `/api/v1/farm-zones/:id/seasons` | HTX_MANAGER, SUPER_ADMIN | Mở vụ mùa mới |
| PUT | `/api/v1/farm-zones/:id/seasons/:seasonId/close` | HTX_MANAGER | Đóng vụ mùa |
| GET | `/api/v1/farm-zones/:id/seasons` | Authenticated | Lịch sử vụ mùa |

## DTOs

```typescript
CreateFarmZoneDto: {
  farmer_id: string,
  zone_name: string (max 100),
  crop_type: CropType (enum),
  boundary: GeoJSONPolygon,   // { type: "Polygon", coordinates: [[[lng,lat],...]] }
  description: string (optional, max 500),
}

CreateSeasonDto: {
  season_name: string,        // vd: "Vụ Đông Xuân 2024-2025"
  crop_variety: string,       // giống cụ thể
  start_date: string (ISO),
  expected_end_date: string (ISO),
  planned_yield_kg: number,
}
```

## Business Logic

1. Khi tạo zone: gọi PostGIS `ST_Area(boundary::geography)` → lưu `area_sqm`
2. Kiểm tra overlap: `ST_Intersects` với các zone khác của cùng HTX (BR-002-4)
3. Validate diện tích: 100m² ≤ area_sqm ≤ 5,000,000m² (500ha) (BR-002-3)
4. `farm_zone_code` = `{farmer_code}-Z{NN}` tự sinh tăng dần
5. Mở vụ mùa: kiểm tra không có season ACTIVE nào khác (BR-003-2)
6. Mở vụ mùa: `expected_end_date` phải sau `start_date` ít nhất 7 ngày

## Enums

```typescript
enum CropType {
  RICE = 'RICE',
  COFFEE = 'COFFEE',
  PEPPER = 'PEPPER',
  DURIAN = 'DURIAN',
  VEGETABLE = 'VEGETABLE',
  OTHER = 'OTHER'
}

enum SeasonStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}
```

## Prisma Schema liên quan

```prisma
model FarmZone {
  id             String      @id @default(cuid())
  farm_zone_code String      @unique
  zone_name      String
  farmer_id      String
  farmer         Farmer      @relation(fields: [farmer_id], references: [id])
  crop_type      CropType
  boundary       Json        // GeoJSON polygon — raw query với PostGIS
  area_sqm       Float       // tính từ PostGIS
  description    String?
  is_active      Boolean     @default(true)
  deleted_at     DateTime?
  created_at     DateTime    @default(now())
  updated_at     DateTime    @updatedAt
  seasons        Season[]
}

model Season {
  id                String       @id @default(cuid())
  farm_zone_id      String
  farm_zone         FarmZone     @relation(fields: [farm_zone_id], references: [id])
  season_name       String
  crop_variety      String
  start_date        DateTime
  expected_end_date DateTime
  actual_end_date   DateTime?
  planned_yield_kg  Float
  actual_yield_kg   Float?       // điền khi HARVESTING log được ghi
  status            SeasonStatus @default(ACTIVE)
  created_at        DateTime     @default(now())
  farming_logs      FarmingLog[]
  batches           Batch[]
  carbon_record     CarbonRecord?
}
```

## Business Rules
- `BR-002-1` đến `BR-002-7`, `BR-003-1`, `BR-003-2` trong `BUSINESS_RULES.md`
