# Farmer Indexing and Fields Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Add a database index to `Farmer.cooperative_id` for optimized queries and add test coverage to verify Vietnamese phone number format validation and field requirements.

**Architecture:** Modify the Prisma schema to add the index, run a prisma migration, and write unit tests in `farmer.test.ts` to test the Zod DTO schema validations.

**Tech Stack:** Prisma, PostgreSQL, Express, TypeScript, Zod, Jest

---

### Task 1: Update Prisma Schema & Generate Prisma Client

**Files:**
- Modify: [schema.prisma](file:///d:/Agri-Systems/Agri-Systems/BackEnd/prisma/schema.prisma)

**Step 1: Write the schema changes**
Modify `model Farmer` in [schema.prisma](file:///d:/Agri-Systems/Agri-Systems/BackEnd/prisma/schema.prisma) to add `@@index([cooperative_id])`.

```prisma
model Farmer {
  id             String      @id @default(cuid())
  farmer_code    String      @unique
  full_name      String
  phone          String      @unique
  national_id    String?
  date_of_birth  DateTime?
  address        String
  cooperative_id String
  cooperative    Cooperative @relation(fields: [cooperative_id], references: [id])
  is_active      Boolean     @default(true)
  deleted_at     DateTime?
  created_at     DateTime    @default(now())
  updated_at     DateTime    @updatedAt
  farm_zones     FarmZone[]

  @@index([cooperative_id])
}
```

**Step 2: Generate Prisma Client to verify types**
Run: `npm run prisma:generate` in `BackEnd`
Expected: Client generated successfully.

**Step 3: Commit**
```bash
git add prisma/schema.prisma
git commit -m "db: add index on farmer cooperative_id"
```

---

### Task 2: Implement Validation Tests for Farmer DTO

**Files:**
- Modify: [farmer.test.ts](file:///d:/Agri-Systems/Agri-Systems/BackEnd/src/modules/farmer/farmer.test.ts)

**Step 1: Write the validation tests**
Replace [farmer.test.ts](file:///d:/Agri-Systems/Agri-Systems/BackEnd/src/modules/farmer/farmer.test.ts) to test `CreateFarmerDto` validation behaviors:
- Valid Vietnam phone numbers (`0987654321`, `0351234567`) must pass.
- Invalid phone numbers (`123456789`, `abc1234567`, `0281234567`) must fail.
- Optional fields (`national_id`, `date_of_birth`) can be empty or missing.
- Required fields (`full_name`, `phone`, `address`, `cooperative_id`) must not be empty.

```typescript
import { CreateFarmerDto } from './farmer.dto';

describe('Farmer DTO Validation', () => {
  it('should pass validation with valid Vietnamese phone and all required fields', () => {
    const validData = {
      full_name: 'Nguyễn Văn A',
      phone: '0987654321',
      address: 'Thôn 3, Buôn Ma Thuột',
      cooperative_id: 'coop-id-123'
    };
    const result = CreateFarmerDto.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should pass validation with optional fields included', () => {
    const validData = {
      full_name: 'Nguyễn Văn A',
      phone: '0987654321',
      address: 'Thôn 3, Buôn Ma Thuột',
      cooperative_id: 'coop-id-123',
      national_id: '123456789',
      date_of_birth: '1990-01-01'
    };
    const result = CreateFarmerDto.safeParse(validData);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.date_of_birth).toBeInstanceOf(Date);
    }
  });

  it('should fail validation if phone number does not match Vietnamese mobile format', () => {
    const invalidPhoneData = {
      full_name: 'Nguyễn Văn A',
      phone: '02838234567', // Landline prefix not allowed
      address: 'Thôn 3, Buôn Ma Thuột',
      cooperative_id: 'coop-id-123'
    };
    const result = CreateFarmerDto.safeParse(invalidPhoneData);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Số điện thoại không hợp lệ');
    }
  });

  it('should fail validation if required fields are missing', () => {
    const missingFields = {
      phone: '0987654321',
      cooperative_id: 'coop-id-123'
    };
    const result = CreateFarmerDto.safeParse(missingFields);
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run the test to verify it passes**
Run: `npm run test` in `BackEnd`
Expected: Test suite passes.

**Step 3: Commit**
```bash
git add src/modules/farmer/farmer.test.ts
git commit -m "test: add validation tests for CreateFarmerDto"
```

---

### Task 3: Create and Apply Migration

**Files:**
- Create: `BackEnd/prisma/migrations/*`

**Step 1: Run the migration**
Run: `npm run prisma:migrate` in `BackEnd`
Expected: Migration generated and applied to the database.

**Step 2: Commit**
```bash
git add prisma/migrations
git commit -m "db: migrate add farmer cooperative_id index"
```
