# OCR Frontend UI Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Build a complete, high-fidelity React interface for the OCR digitizing module in Web-Admin, supporting batch file uploads, batch list view, and split-screen document review/confirmation.

**Architecture:** The route `/ocr` operates as a state machine. It toggles between `'DASHBOARD'` (with Upload & History tabs) and `'REVIEW'` (Split-screen preview + dynamic form editing). Local React state handles page transitions, allowing smooth data flow and persistence of history page filters.

**Tech Stack:** Next.js 14, TypeScript, TailwindCSS, Axios API Client, Lucide React icons, Jest/React Testing Library.

---

### Task 1: Update Roles in Sidebar

**Files:**
- Modify: `d:/Downloads/agri-system/Web-Admin/src/components/shared/Sidebar.tsx:77-82`

**Step 1: Write a test or verify the change**
Inspect `Sidebar.tsx` and ensure that `roles` list contains `SUPER_ADMIN` and `WAREHOUSE_KEEPER` in addition to `HTX_MANAGER`.

**Step 2: Implement the change**
Update the "Số hóa OCR" item:
```typescript
    {
      title: 'Số hóa OCR',
      href: '/ocr',
      icon: FileSearch,
      roles: ['SUPER_ADMIN', 'HTX_MANAGER', 'WAREHOUSE_KEEPER'],
    },
```

**Step 3: Verify the change**
Run: `npm run lint` in `Web-Admin` to ensure no linting errors.

**Step 4: Commit**
```bash
git add Web-Admin/src/components/shared/Sidebar.tsx
git commit -m "feat(ocr): update sidebar roles for OCR route access"
```

---

### Task 2: Implement OCRPage Router State

**Files:**
- Modify: `d:/Downloads/agri-system/Web-Admin/src/app/(dashboard)/ocr/page.tsx`

**Step 1: Write a failing test in ocr-page.test.tsx**
Verify that OCRPage renders the title and toggle state correctly.
Modify `d:/Downloads/agri-system/Web-Admin/tests/ocr-page.test.tsx`:
```typescript
import { render, screen } from '@testing-library/react';
import OCRPage from '../src/app/(dashboard)/ocr/page';

describe('OCR Page', () => {
  it('renders capture options', () => {
    render(<OCRPage />);
    expect(screen.getByText('Số hóa tài liệu (OCR)')).toBeInTheDocument();
  });
});
```

**Step 2: Run test to verify it fails**
Run: `npx jest tests/ocr-page.test.tsx`
Expected: FAIL (renders "Số hóa tài liệu (OCR)" instead of placeholder)

**Step 3: Implement minimal code in page.tsx**
Modify `ocr/page.tsx` to handle `viewMode` state:
```typescript
'use client';

import { useState } from 'react';
import { OCRDashboard } from '@/components/ocr/OCRDashboard';
import { OCRReviewPanel } from '@/components/ocr/OCRReviewPanel';

export default function OCRPage() {
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'REVIEW'>('DASHBOARD');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const handleReview = (docId: string) => {
    setSelectedDocId(docId);
    setViewMode('REVIEW');
  };

  const handleCloseReview = () => {
    setSelectedDocId(null);
    setViewMode('DASHBOARD');
  };

  return (
    <div className="space-y-6 font-sans relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] tracking-tight">
            Số hóa tài liệu (OCR)
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Quét và số hóa nhật ký canh tác hoặc hóa đơn vật tư nông nghiệp bằng AI.
          </p>
        </div>
      </div>

      {viewMode === 'DASHBOARD' ? (
        <OCRDashboard onReview={handleReview} />
      ) : (
        selectedDocId && (
          <OCRReviewPanel documentId={selectedDocId} onClose={handleCloseReview} />
        )
      )}
    </div>
  );
}
```
Create skeleton files for `OCRDashboard` and `OCRReviewPanel` returning simple div containers to allow compilation.

**Step 4: Run test to verify it passes**
Run: `npx jest tests/ocr-page.test.tsx`
Expected: PASS

**Step 5: Commit**
```bash
git add Web-Admin/src/app/\(dashboard\)/ocr/page.tsx Web-Admin/src/components/ocr/ tests/ocr-page.test.tsx
git commit -m "feat(ocr): implement router page structure and skeleton components"
```

---

### Task 3: Create OCRDashboard (Upload & History Tabs)

**Files:**
- Create: `d:/Downloads/agri-system/Web-Admin/src/components/ocr/OCRDashboard.tsx`

**Step 1: Write minimal code for OCRDashboard with state and APIs**
Implement `OCRDashboard` supporting tabs:
- **UPLOAD tab**:
  - Drag and drop zone. Files saved in `filesToUpload` state array.
  - Dropdown `document_hint`: `AUTO`, `FARMING_LOGBOOK`, `MATERIAL_INVOICE`.
  - Dropdown `season_id`: Fetches seasons via `apiClient.get('/seasons')`. Only shown if `document_hint === 'FARMING_LOGBOOK'`.
  - Upload button: constructs `FormData`, appends `files` (up to 10), `document_hint`, and `season_id`. Calls `POST /ocr/batches`.
  - On success, switches tab to `HISTORY` and triggers list reload.
- **HISTORY tab**:
  - Fetches batches via `apiClient.get('/ocr/batches?page=x&limit=y')` + displays loading indicator.
  - Renders a clean table. Each row is expandable.
  - Clicking a row loads that batch's documents details (`documents` property).
  - Displays document statuses with Tailwind badges.
  - Action buttons:
    - `AWAITING_REVIEW`: Button "Duyệt" -> calls `onReview(doc.id)`.
    - `ERROR`: Button "Thử lại" -> calls `POST /ocr/documents/:id/retry` (which sets doc to `QUEUED` and re-runs).
    - `REJECTED`: Badge with tooltip or text displaying `rejection_reason` / rejection status.

**Step 2: Verify compilation and tests**
Add a simple test in `tests/ocr-page.test.tsx` checking that UPLOAD and HISTORY tabs render when `OCRDashboard` is active.
Run: `npx jest tests/ocr-page.test.tsx` and verify clean execution.

**Step 3: Commit**
```bash
git add Web-Admin/src/components/ocr/OCRDashboard.tsx
git commit -m "feat(ocr): implement OCRDashboard with Upload and History tabs"
```

---

### Task 4: Create OCRReviewPanel (Split-Screen View)

**Files:**
- Create: `d:/Downloads/agri-system/Web-Admin/src/components/ocr/OCRReviewPanel.tsx`

**Step 1: Write review panel layout and load data**
- Fetch document review data via `apiClient.get('/ocr/documents/:id/review')`.
- Store `draft` in state, including `confirmed_data` (default to `ai_normalized_data` if `confirmed_data` is empty/null).
- Fetch warehouse materials (`/warehouse/materials`) and farmers (`/farmers`) to populate selectors.
- Split-screen layout:
  - **Left side**: If PDF, render `<iframe src={previewUrl} className="w-full h-[650px] rounded border" />`.
    If image, render img element with zoom state (`zoom` - default `100`) and rotation state (`rotate` - default `0`). Add controls to zoom in/out and rotate.
  - **Right side**: Render editable form fields based on `draft.target_entity`:
    - Display field-level red errors from `validation_errors`.
    - Add "Lưu nháp" button: Calls `PATCH /ocr/draft-records/:id` with `{ confirmed_data }`. On success, updates `validation_errors` in local state and shows success toast.
    - Add "Xác nhận ghi sổ" button: Calls `POST /ocr/draft-records/:id/confirm`. On success, shows toast and returns to dashboard.
    - Add "Từ chối" button: Opens a small dialog prompt for rejection reason, calls `POST /ocr/documents/:id/reject` with `{ reason }`. On success, returns to dashboard.
    - Add "Quay lại" button: Returns to dashboard.

**Step 2: Run build to make sure TypeScript types and imports are correct**
Run: `npm run build` in `Web-Admin` to ensure NextJS compiles with zero errors.

**Step 3: Commit**
```bash
git add Web-Admin/src/components/ocr/OCRReviewPanel.tsx
git commit -m "feat(ocr): implement OCRReviewPanel with split-screen file preview and dynamic editor form"
```

---

### Task 5: Enhance Unit Tests and Verification

**Files:**
- Modify: `d:/Downloads/agri-system/Web-Admin/tests/ocr-page.test.tsx`

**Step 1: Write comprehensive mock tests**
Write mock tests simulating:
- Listing batches.
- Clicking "Duyệt" on a document in a batch.
- Rendering PDF iframe vs zoomable Image.
- Editing a draft input field and clicking "Lưu nháp" (verify Axios patch call).
- Confirming draft and returning to Dashboard.

**Step 2: Run Jest tests**
Run: `npx jest tests/ocr-page.test.tsx`
Verify all unit tests pass successfully.

**Step 3: Run final builds and check for lint errors**
Run: `npm run lint` and `npm run build` in `Web-Admin` to verify zero compile or lint errors.

**Step 4: Commit**
```bash
git add Web-Admin/tests/ocr-page.test.tsx
git commit -m "test(ocr): add thorough unit tests covering OCR UI behaviors"
```
