# Warehouse & Logistics Design Document

**Date:** 2026-06-06
**Feature:** Phase 3 - Warehouse & Logistics
**Author:** Antigravity

---

## 1. Overview
The Warehouse & Logistics module manages materials (seeds, fertilizers, pesticides, equipment, etc.), monitors inventory levels, processes import/export transactions, tracks allocations to farmers, and reconciles inventory exports against actual farming log usage.

---

## 2. Requirements & Business Rules

We strictly implement the rules defined in [BUSINESS_RULES.md](file:///d:/Downloads/agri-system/docs/business-rules/BUSINESS_RULES.md#L67-L78):
- **BR-005-1 (Non-negative Stock):** Stock must not drop below zero. Every export transaction must check `current_stock >= quantity_out` before processing.
- **BR-005-2 (Material Types):** Support 5 types (`SEED`, `FERTILIZER`, `PESTICIDE`, `EQUIPMENT`, `OTHER`).
- **BR-005-3 (Import constraints):** `IMPORT` transactions require a supplier, date, and invoice number.
- **BR-005-4 (Export constraints):** `EXPORT` transactions require a recipient farmer (belonging to the same cooperative) and purpose.
- **BR-005-5 (Immutability):** Transactions cannot be edited or deleted once created. Corrections must use reversing transactions (e.g. `RETURN` or complementary transactions).
- **BR-005-6 (Expiry Date):** Material has an expiry date. System warns if HSD <= 30 days, and blocks export if expired.

---

## 3. Database Schema

We use the pre-defined models in [schema.prisma](file:///d:/Downloads/agri-system/BackEnd/prisma/schema.prisma#L260-L314):
1. **`Material`**: Represents a material item defined within a specific cooperative.
2. **`StockItem`**: Tracks current inventory level (`current_stock`) and its latest `expiry_date` in a 1-to-1 relation with `Material`.
3. **`WarehouseTransaction`**: Records every stock change (`IMPORT`, `EXPORT`, `RETURN`).

---

## 4. API Endpoints

### 4.1 Material Management
- `GET /api/v1/warehouse/materials`
  - Returns cooperative's materials list.
  - Supports query filters: `type` (MaterialType), `search` (name search), `lowStock` (filter where `current_stock <= min_stock_alert`), `nearExpiry` (expiry_date within 30 days).
- `GET /api/v1/warehouse/materials/:id`
  - Detailed material view with stock and transaction history.
- `POST /api/v1/warehouse/materials`
  - Body: `{ material_name, material_type, unit, min_stock_alert }`
- `PUT /api/v1/warehouse/materials/:id`
  - Body: `{ material_name, unit, min_stock_alert, is_active }`

### 4.2 Stock & Transactions
- `POST /api/v1/warehouse/transactions`
  - Standardized transaction endpoint.
  - Body: `{ material_id, transaction_type, quantity, transaction_date, ... }`
  - Processes imports/exports inside a Prisma Transaction to guarantee atomicity.
- `GET /api/v1/warehouse/transactions`
  - Get transaction logs. Filters: `type`, `material_id`, `startDate`, `endDate`.

### 4.3 Reconciliation
- `GET /api/v1/warehouse/reconciliation`
  - Query parameters: `farmer_id`, `season_id` (optional).
  - Returns a comparative summary of materials exported to a farmer vs. actual usage in farming logs.

---

## 5. Design Decisions & Trade-offs

### Concurrency and Stock Updates
We choose **Synchronous Database Transactions with Pessimistic/Atomic Updates** (Approach 3). When creating a transaction, we use Prisma's `$transaction` utility to:
1. Retrieve and lock the `StockItem` (or use atomic updates like `increment`/`decrement`).
2. Verify business rules: `current_stock >= quantity` (for exports), and `expiry_date` checks.
3. Update `StockItem.current_stock`.
4. Create the `WarehouseTransaction`.

*Trade-off:* Atomic update limits concurrency conflicts, and running validations inside a transaction ensures no race conditions can result in a negative stock.

### Multi-Batch Expiries in a 1-to-1 Stock model
Since `StockItem` is a 1-to-1 relation with `Material`, it has a single `expiry_date` field.
*Solution:*
- For `IMPORT`, we update `StockItem.expiry_date` with the expiry date of the imported batch if it is sooner than the current `StockItem.expiry_date`, ensuring we warn/block based on the earliest expiring batch.
- We also allow querying individual `WarehouseTransaction` records to track exact batches.

---

## 6. Verification Plan
- Unit and DTO validation tests in `warehouse.test.ts`.
- Integration tests simulating consecutive imports and exports verifying negative stock prevention, expiry date warnings/blocks, and reconciliation calculations.
