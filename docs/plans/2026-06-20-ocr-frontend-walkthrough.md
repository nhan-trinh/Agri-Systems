# Phase 6: Front-End OCR Digitizing & Review Panel Walkthrough

Implemented the complete Frontend UI/UX for the Digitizing Records (OCR) module in the Next.js `Web-Admin` portal.

## Changes Made

### 1. Sidebar Integration
* **[Sidebar.tsx](file:///d:/Downloads/agri-system/Web-Admin/src/components/shared/Sidebar.tsx)**: Updated permission settings for the "Số hóa OCR" entry to grant access to `SUPER_ADMIN`, `HTX_MANAGER`, and `WAREHOUSE_KEEPER` roles, aligning with the backend router middleware restrictions.

### 2. OCR Main Page (Stateful Routing)
* **[page.tsx](file:///d:/Downloads/agri-system/Web-Admin/src/app/(dashboard)/ocr/page.tsx)**: Implemented state-based view switching (`viewMode` toggle) between:
  * **Dashboard Mode**: Renders the upload zone and history list.
  * **Review Mode**: Renders the split-screen file preview and dynamic editor.

### 3. Upload & Batch History Dashboard
* **[OCRDashboard.tsx](file:///d:/Downloads/agri-system/Web-Admin/src/components/ocr/OCRDashboard.tsx)**:
  * **Upload Tab**: Drag-and-drop zone with validation (limit of 10 files, size < 10MB/file, formats PDF/JPG/PNG). Includes options for `document_hint` and a season picker (`/seasons` lookup) when hint is `FARMING_LOGBOOK`.
  * **History Tab**: Paginated batch tracker. Expandable rows query and display nested documents (`OcrDocument`) with status badges.
  * **Action Gateways**: "Duyệt hồ sơ" redirects to Review mode. "Thử lại" (`POST /ocr/documents/:id/retry`) re-queues failed analyses.

### 4. Split-Screen Document Review & Confirmation Panel
* **[OCRReviewPanel.tsx](file:///d:/Downloads/agri-system/Web-Admin/src/components/ocr/OCRReviewPanel.tsx)**:
  * **Left Panel (File Preview)**: Embedded viewer (`iframe` object for PDFs) or zoomable and rotatable canvas viewer (for image formats).
  * **Right Panel (Form Editor)**: Renders fields matching `target_entity` (FARMING_LOG or WAREHOUSE_TRANSACTION). Shows inline error tags mapped from `validation_errors`.
  * **Actions**: "Lưu nháp" (`PATCH /draft-records/:id`), "Từ chối" (`POST /documents/:id/reject` with reason modal), and "Xác nhận ghi sổ" (`POST /draft-records/:id/confirm`).

### 5. Technical & Typing Fixes
* **Jest Module Resolution**: Modified Next.js imports to use relative paths (`../../../components`) in the OCR components so that Jest can find and mock components cleanly without alias configuration mismatches.
* **Unescaped React Entities**: Replaced unescaped single and double quotes inside JSX tags with clean text/entity representations to satisfy strict Next.js compiler ESLint rules.
* **Date Parsing Overload**: Explicitly cast dynamic dates (`formattedData.activity_date as string`) in the form initializer to satisfy type declarations when creating `new Date()`.

---

## Verification Results

### 1. Automated Tests
Ran the entire frontend unit test suite:
```bash
npx jest
```
**Output**: **PASS** (7 suites, 12 tests passed successfully)
* `tests/ocr-page.test.tsx` verified tab switching, drag-drop input, form changes, API patches, and confirmation handlers.

### 2. Production Build Check
Optimized and compiled the application:
```bash
npm run build
```
**Output**: **PASS** (Next.js production build succeeded with zero errors or warnings).
