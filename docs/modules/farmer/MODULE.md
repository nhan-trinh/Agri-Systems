# Module: farmer

## Mục đích
Quản lý hồ sơ hộ nông dân, tạo tài khoản, gán vào HTX.

## Endpoints

| Method | Path | Role | Mô tả |
|---|---|---|---|
| POST | `/api/v1/farmers` | HTX_MANAGER, SUPER_ADMIN | Tạo hồ sơ nông dân mới |
| GET | `/api/v1/farmers` | HTX_MANAGER, SUPER_ADMIN, GOV_VIEWER | Danh sách nông dân (có filter, paginate) |
| GET | `/api/v1/farmers/:id` | HTX_MANAGER, SUPER_ADMIN, FARMER(own) | Chi tiết 1 nông dân |
| PUT | `/api/v1/farmers/:id` | HTX_MANAGER, SUPER_ADMIN | Cập nhật hồ sơ |
| DELETE | `/api/v1/farmers/:id` | SUPER_ADMIN | Soft delete (is_active = false) |
| GET | `/api/v1/farmers/:id/summary` | HTX_MANAGER, SUPER_ADMIN | Tổng hợp: số vùng trồng, vụ mùa, lô hàng |

## DTOs

```typescript
CreateFarmerDto: {
  full_name: string (min 2, max 100),
  phone: string (VN format: /^(0[3|5|7|8|9])+([0-9]{8})$/),
  national_id: string (optional, 9 hoặc 12 số),
  date_of_birth: string (ISO date, optional),
  address: string (max 500),
  cooperative_id: string (cuid),
}

UpdateFarmerDto: Partial<CreateFarmerDto> — không cho update phone, cooperative_id
```

## Business Logic

1. Khi tạo nông dân: tự sinh `farmer_code` = `{HTX_CODE}-{YYYY}-{4-digit-seq}` (vd: `BMT01-2024-0001`)
2. Tạo User account kèm theo với `role = FARMER`, `password` mặc định = 8 ký tự cuối SĐT, hash bcrypt
3. HTX_MANAGER chỉ tạo được nông dân trong `cooperative_id` của mình
4. `GOV_VIEWER` chỉ xem danh sách, không xem chi tiết cá nhân (trả về aggregate)

## Business Rules
- `BR-001-1` đến `BR-001-5` trong `BUSINESS_RULES.md`

## Prisma Schema liên quan

```prisma
model Farmer {
  id             String     @id @default(cuid())
  farmer_code    String     @unique
  full_name      String
  phone          String     @unique
  national_id    String?
  date_of_birth  DateTime?
  address        String
  cooperative_id String
  cooperative    Cooperative @relation(fields: [cooperative_id], references: [id])
  is_active      Boolean    @default(true)
  deleted_at     DateTime?
  created_at     DateTime   @default(now())
  updated_at     DateTime   @updatedAt
  farm_zones     FarmZone[]
  user           User?
}
```

## Query Filters (GET /farmers)
`?cooperative_id=&is_active=&search=&page=&limit=&sort_by=created_at&sort_order=desc`

`search` tìm theo `full_name` hoặc `farmer_code` hoặc `phone` (ILIKE)
