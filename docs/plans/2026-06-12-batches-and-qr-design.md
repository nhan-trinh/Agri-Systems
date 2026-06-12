# Design Spec: Batches & QR CheckVN Module

## 1. Overview
The **Batches & QR CheckVN** module provides HTX Managers with tools to package harvested crops into batches, request QR codes from CheckVN, activate them, and recall them if necessary. It also features a public trace page `/public/trace/[qrCode]` that allows consumers to trace agricultural products back to their origin.

## 2. Architecture & Directory Structure
```
src/app/(dashboard)/batches/
└── page.tsx                     ← Main dashboard with 3 stats and tabs

src/app/public/trace/
└── [qrCode]/
    └── page.tsx                 ← Public mobile-first trace view (no sidebar/auth)

src/components/batches/
├── BatchTable.tsx               ← Batches list & actions
├── QrCodeTable.tsx              ← QR codes list & CSV Export
├── BatchStatusTimeline.tsx      ← Status events timeline
├── CreateBatchModal.tsx         ← Modal to package batch from completed season
├── ActivateModal.tsx            ← Modal to activate batch and QRs
├── RecallModal.tsx              ← Modal to recall batch and QRs
├── BatchStatusBadge.tsx         ← Status labels
└── QrStatusBadge.tsx            ← QR Status labels

src/components/trace/
├── TraceHeader.tsx              ← Public header
├── TraceProductInfo.tsx         ← Main product details
├── TraceFarmMap.tsx             ← Dynamic Leaflet map component (CSR)
├── TraceFarmerCard.tsx          ← Farmer credentials
├── TraceFarmingTimeline.tsx     ← Timeline of agricultural activities
├── TraceCarbonBadge.tsx         ← Emission records (if ISSUED)
└── TraceRecalledWarning.tsx     ← Replaced screen if status is RECALLED
```

## 3. Database & API Alignment
To support carbon records visualization on the trace page, the backend needs to include `carbon_record` when querying `findQrCodeWithTrace`.

### Backend Changes:
1. **Repository** (`checkvn-qr.repository.ts`): Include `carbon_record: true` under `season` in the `findQrCodeWithTrace` query.
2. **Service** (`checkvn-qr.service.ts`): Map `carbon_record` inside `traceData` returned by `publicTrace`.

## 4. Key Workflows & UX Details
* **Client-side CSV Export**: Triggers a CSV download from memory using UTF-8 BOM (`\uFEFF`) to support accented Vietnamese characters.
* **Polling**: Check and poll `GET /batches` every 5 seconds when a batch status is `PENDING_QR`. Stop polling once the status resolves to `QR_RECEIVED`.
* **Map Integration**: Dynamic load `TraceFarmMap` using `next/dynamic` with `{ ssr: false }` to avoid Leaflet SSR issues.
