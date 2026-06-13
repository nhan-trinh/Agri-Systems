# Giao Diện Báo Cáo và Chứng Nhận Carbon (Carbon Records UI) Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement the frontend carbon monitoring and certification page with advanced filters, calculation details modal, and background polling for PDF generation.

**Architecture:** Next.js 14 App Router (React). Authentication via Zustand `useAuthStore`. Communication via HTTP using a custom Axios instance. Polling is implemented as an asynchronous interval to check background BullMQ `ExportJob` progress without blocking the main thread.

**Tech Stack:** React, Next.js 14, Tailwind CSS, Lucide icons, Axios

---

## 🛠️ Step-by-Step Task Checklist (6 Tasks)

### Task 1: Thêm đường dẫn trang Carbon vào Sidebar.tsx

**Files:**
- Modify: `d:\Downloads\agri-system\Web-Admin\src\components\shared\Sidebar.tsx:40-50`
- Test: Verify Sidebar rendering by running `npx jest tests/dashboard-layout.test.tsx`

**Step 1: Write code modification**
Insert a new menu item for `/carbon` in `Sidebar.tsx`. Modify the items so that `HTX_MANAGER` and `SUPER_ADMIN` and `GOV_VIEWER` can access the Carbon Records page.

Target content around line 41-47:
```typescript
    {
      title: 'Hệ số phát thải',
      href: '/carbon/factors',
      icon: Leaf,
      roles: ['SUPER_ADMIN'],
    },
```

Replacement content:
```typescript
    {
      title: 'Hệ số phát thải',
      href: '/carbon/factors',
      icon: Leaf,
      roles: ['SUPER_ADMIN'],
    },
    {
      title: 'Báo cáo Carbon',
      href: '/carbon',
      icon: Leaf,
      roles: ['SUPER_ADMIN', 'HTX_MANAGER', 'GOV_VIEWER'],
    },
```

**Step 2: Run verification**
Run command: `npm run lint` inside `d:\Downloads\agri-system\Web-Admin` to ensure no linting errors.

**Step 3: Commit changes**
```bash
git add src/components/shared/Sidebar.tsx
git commit -m "feat: add Carbon Records navigation to Sidebar"
```

---

### Task 2: Triển khai Cấu trúc Trang chính `/carbon/page.tsx` và State Management

**Files:**
- Create/Overwrite: `d:\Downloads\agri-system\Web-Admin\src\app\(dashboard)\carbon\page.tsx`

**Step 1: Write Page Setup code**
Implement states for filters, search, pagination, loading, selected record, details modal visibility, and polling status. Add data fetching functions.

```typescript
'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import { 
  Leaf, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Calendar, 
  FileText, 
  ArrowRight, 
  Download,
  Eye,
  Check,
  Award,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

interface CarbonRecord {
  id: string;
  season_id: string;
  total_emitted_kg: number;
  total_sequestered_kg: number;
  net_carbon_tCO2e: number;
  status: 'DRAFT' | 'VERIFIED' | 'ISSUED';
  verified_by: string | null;
  verified_at: string | null;
  issued_at: string | null;
  certificate_no: string | null;
  credit_amount_tCO2e: number | null;
  created_at: string;
  season: {
    season_name: string;
    crop_variety: string;
    actual_yield_kg: number;
    farm_zone: {
      zone_name: string;
      farm_zone_code: string;
      farmer: {
        full_name: string;
        cooperative?: {
          name: string;
        };
      };
    };
  };
  calculation_details: {
    factor_version?: string;
    fertilizers: Array<{
      log_id: string;
      activity_date: string;
      fertilizer_type: string;
      quantity_kg: number;
      factor_value: number;
      emissions_kgCO2e: number;
    }>;
    pesticides: Array<{
      log_id: string;
      activity_date: string;
      product_name: string;
      quantity_liters: number;
      factor_value: number;
      emissions_kgCO2e: number;
    }>;
    harvest: Array<{
      log_id: string;
      activity_date: string;
      yield_kg: number;
      crop_type: string;
      factor_value: number;
      sequestration_kgCO2: number;
    }>;
  };
}
```

**Step 2: Add Data Fetching Logic**
Implement `fetchRecords` calling `/carbon/records` with page, limit, status, and search filters.

**Step 3: Run verify**
Create basic file skeleton and verify compilation using `next build` or `npm run lint`.

**Step 4: Commit changes**
```bash
git add src/app/\(dashboard\)/carbon/page.tsx
git commit -m "feat: skeleton setup for carbon page"
```

---

### Task 3: Triển khai Bảng hiển thị và các Nút Thao tác nghiệp vụ theo vai trò

**Files:**
- Modify: `d:\Downloads\agri-system\Web-Admin\src\app\(dashboard)\carbon\page.tsx`

**Step 1: Write Table JSX and action handlers**
Implement role checks (`SUPER_ADMIN` vs `HTX_MANAGER` vs `GOV_VIEWER`):
- **Xác minh (Verify)**: Call `POST /api/v1/carbon/records/:id/verify`. Only for `SUPER_ADMIN` on `DRAFT`.
- **Cấp tín chỉ (Issue)**: Call `POST /api/v1/carbon/records/:id/issue`. Only for `SUPER_ADMIN` on `VERIFIED` with `net_carbon_tCO2e < 0`.
- **Tải chứng nhận (Download)**: Call polling function. For `SUPER_ADMIN` / `HTX_MANAGER` on `ISSUED`.

**Step 2: Verify linting**
Ensure all tailwind styles and lucide icons match the theme.

---

### Task 4: Triển khai Tiến trình ngầm Polling tải PDF

**Files:**
- Modify: `d:\Downloads\agri-system\Web-Admin\src\app\(dashboard)\carbon\page.tsx`

**Step 1: Add PDF generation & polling logic**
- When Clicking "Tải chứng nhận", calls `GET /carbon/records/:id/certificate`.
- Obtains `exportJobId` from the backend `202 Accepted` response.
- Starts polling `GET /carbon/export-jobs/:jobId` every 1.5s using `setInterval` or recursive `setTimeout` with a ref tracking active timers.
- Shows inline loader spinner on the record row and triggers toast state.
- Once status is `COMPLETED`, opens `download_url` in a new tab or triggers automatic download, then clears the polling state.
- Handles `FAILED` status and network timeouts gracefully by warning the user.

**Step 2: Verify polling structure**
Test that interval cancels cleanly on component unmount using standard React `useEffect` cleanups.

---

### Task 5: Triển khai Modal Chi tiết Công thức và Bảng kê Vật tư

**Files:**
- Modify: `d:\Downloads\agri-system\Web-Admin\src\app\(dashboard)\carbon\page.tsx`

**Step 1: Write Modal layout**
- Add tabs: "Tổng quan" and "Bảng kê vật tư".
- "Tổng quan": Show summary cards, a visualization progress bar (Emissions vs Absorption), and audit history metadata (verifier name, timestamps).
- "Bảng kê vật tư": Lists Fertilizers, Pesticides, and Harvest inputs alongside their pre-computed carbon conversion math.

---

### Task 6: Cập nhật và Chạy Bộ kiểm thử Front-end (Unit Tests)

**Files:**
- Modify: `d:\Downloads\agri-system\Web-Admin\tests\carbon-page.test.tsx`
- Run: `npx jest tests/carbon-page.test.tsx`

**Step 1: Write tests**
Create mocks for `apiClient` endpoints, routing, and `useAuthStore` to cover:
- Listing carbon records correctly.
- Admin verify and issue button triggering.
- Modal opens and displays tabular emission breakdown.
- Polling flow registers and stops correctly.

**Step 2: Run verification**
Run Jest test suite: `npx jest tests/carbon-page.test.tsx`
Verify that the output is PASS.

**Step 3: Run production build check**
Run command: `npm run build`
Verify zero TypeScript compilation or linting errors.

**Step 4: Commit all final changes**
```bash
git add src/app/\(dashboard\)/carbon/page.tsx tests/carbon-page.test.tsx
git commit -m "feat: complete Carbon Records UI implementation and verification"
```
