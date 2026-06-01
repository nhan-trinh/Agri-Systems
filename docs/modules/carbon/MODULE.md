# Module: carbon

## Mục đích
Tính toán chỉ số phát thải/hấp thụ Carbon từ dữ liệu nhật ký, cấp tín chỉ Carbon.

## Endpoints

| Method | Path | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/carbon/records` | HTX_MANAGER, SUPER_ADMIN, GOV_VIEWER | Danh sách bản ghi Carbon |
| GET | `/api/v1/carbon/records/:id` | HTX_MANAGER, SUPER_ADMIN | Chi tiết tính toán |
| POST | `/api/v1/carbon/records/:id/verify` | SUPER_ADMIN | Xác minh bản ghi → VERIFIED |
| POST | `/api/v1/carbon/records/:id/issue` | SUPER_ADMIN | Phát hành tín chỉ → ISSUED |
| GET | `/api/v1/carbon/emission-factors` | SUPER_ADMIN | Xem hệ số phát thải |
| PUT | `/api/v1/carbon/emission-factors/:id` | SUPER_ADMIN | Cập nhật hệ số phát thải |
| GET | `/api/v1/carbon/records/:id/certificate` | HTX_MANAGER | Tải chứng nhận tín chỉ (PDF async) |

## Công thức tính Carbon (BR-006)

```
PHÁT THẢI:
  N2O từ phân đạm (Urea): N2O_kg = quantity_kg × nitrogen_ratio × 0.01 × (44/28) × 273
  CH4 từ ruộng lúa ngập nước: CH4_kg = area_ha × emission_factor_CH4 × season_days
  CO2 từ thuốc BVTV: CO2_equivalent = dosage_liters × emission_factor_pesticide

HẤP THỤ:
  CO2 hấp thụ = yield_kg × 0.45 × 0.42   (biomass carbon fraction)

NET CARBON (tCO2e):
  net = (sequestered - emitted) / 1000     (kg → tấn)
  Dương = hấp thụ ròng (positive)
  Âm   = phát thải ròng (negative)

TÍN CHỈ CARBON:
  Chỉ cấp khi net > 0
  credit_amount_tCO2e = net_carbon
```

## Emission Factors (cấu hình trong DB)

```prisma
model EmissionFactor {
  id             String  @id @default(cuid())
  material_type  String  // 'UREA', 'NPK', 'PESTICIDE_LIQUID', 'RICE_CH4_FIELD', ...
  factor_value   Float
  unit           String  // 'kgCO2e/kg', 'kgCH4/ha/day'
  description    String
  source         String  // vd: "IPCC 2006 Guidelines"
  effective_from DateTime
  is_active      Boolean @default(true)
}
```

## Business Logic

### Carbon Worker (BullMQ — trigger sau HARVESTING log)

```typescript
async computeCarbon(seasonId: string) {
  // 1. Lấy tất cả logs
  const logs = await farmingLogRepo.findBySeasonId(seasonId);
  const season = await seasonRepo.findById(seasonId);

  // 2. Gom nhóm theo loại
  const fertLogs = logs.filter(l => l.activity_type === 'FERTILIZING');
  const pestiLogs = logs.filter(l => l.activity_type === 'PESTICIDE');

  // 3. Lấy emission factors từ DB
  const factors = await carbonRepo.getActiveEmissionFactors();

  // 4. Tính phát thải
  let totalEmitted = 0;
  for (const log of fertLogs) {
    const factor = factors.find(f => f.material_type === mapFertilizerType(log.fertilizer_type));
    if (factor) totalEmitted += log.quantity_kg * factor.factor_value;
  }

  // 5. Tính hấp thụ
  const sequestered = season.actual_yield_kg * 0.45 * 0.42;

  // 6. Net carbon
  const netCarbon = (sequestered - totalEmitted) / 1000; // tCO2e

  // 7. Lưu CarbonRecord với DRAFT
  await carbonRepo.upsertRecord({
    season_id: seasonId,
    total_emitted_kg: totalEmitted,
    total_sequestered_kg: sequestered,
    net_carbon_tCO2e: netCarbon,
    status: 'DRAFT',
    calculation_details: { logs_used: logs.length, factors_applied: factors.map(f => f.id) }
  });
}
```

## Prisma Schema liên quan

```prisma
model CarbonRecord {
  id                      String         @id @default(cuid())
  season_id               String         @unique   // BR-006-7
  season                  Season         @relation(fields: [season_id], references: [id])
  total_emitted_kg        Float
  total_sequestered_kg    Float
  net_carbon_tCO2e        Float
  status                  CarbonStatus   @default(DRAFT)
  calculation_details     Json           // chi tiết breakdown
  verified_by             String?        // userId SUPER_ADMIN
  verified_at             DateTime?
  issued_at               DateTime?
  certificate_no          String?        @unique
  credit_amount_tCO2e     Float?         // chỉ có khi net > 0
  created_at              DateTime       @default(now())
  updated_at              DateTime       @updatedAt
}

enum CarbonStatus { DRAFT VERIFIED ISSUED }
```

## Business Rules
- `BR-006-1` đến `BR-006-8` trong `BUSINESS_RULES.md`

## Notes
- `calculation_details` (JSON) lưu đầy đủ để audit: từng log được dùng, factor nào áp dụng, kết quả từng bước
- Khi `ISSUED`: tự sinh `certificate_no` = `CARBON-{YYYY}-{RANDOM_6CHAR}`
- Tín chỉ Carbon sau ISSUED là immutable — không được update hoặc delete (BR-006-8)
