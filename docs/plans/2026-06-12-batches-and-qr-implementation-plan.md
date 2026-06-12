# Batch & QR CheckVN Implementation Plan

> **For Antigravity:** REQUIRED WORKFLOW: Use `.agent/workflows/execute-plan.md` to execute this plan in single-flow mode.

**Goal:** Implement the Batch management and QR code CheckVN integration with tracing screens in Web-Admin, along with necessary backend schema inclusions for carbon attributes.

**Architecture:** We will update the backend repository queries to include carbon record details, define shared TypeScript interfaces, construct the tab-based batch manager dashboard with interactive modals, and design a responsive public mobile trace view with Leaflet map support.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Lucide Icons, Axios, React Leaflet.

---

### Task 1: Backend Database Queries & Service Update

**Files:**
- Modify: `BackEnd/src/modules/checkvn-qr/checkvn-qr.repository.ts:220-250`
- Modify: `BackEnd/src/modules/checkvn-qr/checkvn-qr.service.ts:310-335`
- Test: `BackEnd/src/modules/checkvn-qr/checkvn-qr.test.ts`

**Step 1: Write query update**
Include `carbon_record: true` in `season` relation when fetching tracing data.
In `checkvn-qr.repository.ts`:
```typescript
            season: {
              include: {
                farm_zone: {
                  include: {
                    farmer: {
                      include: {
                        cooperative: true,
                      },
                    },
                  },
                },
                farming_logs: {
                  orderBy: {
                    activity_date: 'asc',
                  },
                },
                carbon_record: true, // Add this line
              },
            },
```

**Step 2: Map Carbon Record in Service**
In `checkvn-qr.service.ts` line 316:
```typescript
      carbon_record: qrCode.batch.season.carbon_record ? {
        net_carbon_tCO2e: qrCode.batch.season.carbon_record.net_carbon_tCO2e,
        status: qrCode.batch.season.carbon_record.status,
        certificate_no: qrCode.batch.season.carbon_record.certificate_no,
        credit_amount_tCO2e: qrCode.batch.season.carbon_record.credit_amount_tCO2e,
      } : null,
```

**Step 3: Run backend test**
Run: `npm test` in `BackEnd` directory.
Expected: PASS

**Step 4: Commit**
```bash
git add BackEnd/src/modules/checkvn-qr/checkvn-qr.repository.ts BackEnd/src/modules/checkvn-qr/checkvn-qr.service.ts
git commit -m "feat(backend): retrieve and return carbon record in public trace query"
```

---

### Task 2: Define Shared Frontend Interfaces

**Files:**
- Modify: `Web-Admin/src/lib/types.ts`

**Step 1: Add types**
Add `Batch` and `QrCode` interfaces to frontend types.
```typescript
export type BatchStatus = 'DRAFT' | 'PENDING_QR' | 'QR_RECEIVED' | 'ACTIVE' | 'RECALLED';
export type QrStatus = 'INACTIVE' | 'ACTIVE' | 'RECALLED';

export interface Batch {
  id: string;
  batch_code: string;
  season_id: string;
  batch_name: string;
  total_weight_kg: number;
  quantity_qr_requested: number;
  packaging_unit: string;
  product_description?: string;
  status: BatchStatus;
  checkvn_batch_id?: string;
  activated_at?: string;
  activation_note?: string;
  recalled_at?: string;
  recall_reason?: string;
  created_by: string;
  created_at: string;
  season?: {
    season_name: string;
    actual_yield_kg?: number;
  };
}

export interface QrCode {
  id: string;
  code: string;
  batch_id: string;
  status: QrStatus;
  scan_count: number;
  last_scanned_at?: string;
  created_at: string;
}
```

**Step 2: Verify type checks**
Run: `npx tsc --noEmit` in `Web-Admin`.
Expected: PASS

**Step 3: Commit**
```bash
git add Web-Admin/src/lib/types.ts
git commit -m "feat(frontend): define Batch and QrCode types"
```

---

### Task 3: Update Navigation Sidebar Link

**Files:**
- Modify: `Web-Admin/src/components/shared/Sidebar.tsx:65-70`

**Step 1: Update navigation path**
```typescript
    {
      title: 'Lô hàng & QR',
      href: '/batches',
      icon: QrCode,
      roles: ['HTX_MANAGER'],
    },
```

**Step 2: Commit**
```bash
git add Web-Admin/src/components/shared/Sidebar.tsx
git commit -m "refactor(frontend): update sidebar navigation link to batches"
```

---

### Task 4: Create Badge and Header Components

**Files:**
- Create: `Web-Admin/src/components/batches/BatchStatusBadge.tsx`
- Create: `Web-Admin/src/components/batches/QrStatusBadge.tsx`

**Step 1: Implement BatchStatusBadge**
```typescript
import { BatchStatus } from '@/lib/types';

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const configs = {
    DRAFT: { text: '📝 Nháp', className: 'bg-stone-50 text-stone-500 border-stone-200' },
    PENDING_QR: { text: '⏳ Chờ cấp QR', className: 'bg-orange-50 text-[#E65100] border-orange-200' },
    QR_RECEIVED: { text: '📬 Đã nhận QR', className: 'bg-blue-50 text-[#1565C0] border-blue-200' },
    ACTIVE: { text: '✅ Đang lưu hành', className: 'bg-emerald-50 text-[#2E7D32] border-emerald-200' },
    RECALLED: { text: '🚫 Đã thu hồi', className: 'bg-red-50 text-[#B71C1C] border-red-200' },
  };
  const config = configs[status] || configs.DRAFT;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${config.className}`}>
      {config.text}
    </span>
  );
}
```

**Step 2: Implement QrStatusBadge**
```typescript
import { QrStatus } from '@/lib/types';

export function QrStatusBadge({ status }: { status: QrStatus }) {
  const configs = {
    INACTIVE: { text: '🔒 Chưa kích hoạt', className: 'bg-stone-50 text-stone-500 border-stone-200' },
    ACTIVE: { text: '✅ Đang lưu hành', className: 'bg-emerald-50 text-[#2E7D32] border-emerald-200' },
    RECALLED: { text: '🚫 Thu hồi', className: 'bg-red-50 text-[#B71C1C] border-red-200' },
  };
  const config = configs[status] || configs.INACTIVE;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${config.className}`}>
      {config.text}
    </span>
  );
}
```

**Step 3: Commit**
```bash
git add Web-Admin/src/components/batches/BatchStatusBadge.tsx Web-Admin/src/components/batches/QrStatusBadge.tsx
git commit -m "feat(frontend): create BatchStatusBadge and QrStatusBadge components"
```

---

### Task 5: Create BatchTable Component

**Files:**
- Create: `Web-Admin/src/components/batches/BatchTable.tsx`

**Step 1: Implement BatchTable component**
Implement lists, filters, actions depending on status (Request QR with spinner when PENDING_QR, Activate, Recall, View QR).
```typescript
import { Batch } from '@/lib/types';
import { BatchStatusBadge } from './BatchStatusBadge';
import { Loader2 } from 'lucide-react';

interface BatchTableProps {
  batches: Batch[];
  loading: boolean;
  onRequestQr: (id: string) => Promise<void>;
  onActivateClick: (batch: Batch) => void;
  onRecallClick: (batch: Batch) => void;
  onSelectBatchForQr: (batch: Batch) => void;
  actionLoadingId: string | null;
}

export function BatchTable({
  batches,
  loading,
  onRequestQr,
  onActivateClick,
  onRecallClick,
  onSelectBatchForQr,
  actionLoadingId,
}: BatchTableProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-stone-200">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B5E20]" />
        <p className="text-sm font-semibold text-stone-500">Đang tải danh sách lô hàng...</p>
      </div>
    );
  }

  if (batches.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-stone-200">
        <p className="text-stone-500 font-medium">Không tìm thấy lô hàng nào</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-stone-600">
          <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4">Mã lô</th>
              <th className="px-6 py-4">Tên lô hàng</th>
              <th className="px-6 py-4">Vụ mùa</th>
              <th className="px-6 py-4">Khối lượng</th>
              <th className="px-6 py-4">Số lượng QR</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4">Ngày tạo</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {batches.map((batch) => (
              <tr key={batch.id} className="hover:bg-stone-50/55 transition-colors">
                <td className="px-6 py-4 font-mono font-bold text-stone-800">{batch.batch_code}</td>
                <td className="px-6 py-4 font-semibold text-stone-900">{batch.batch_name}</td>
                <td className="px-6 py-4 text-stone-500">{batch.season?.season_name || '-'}</td>
                <td className="px-6 py-4 font-mono text-stone-800">{batch.total_weight_kg.toLocaleString()} kg</td>
                <td className="px-6 py-4 font-mono text-stone-800">{batch.quantity_qr_requested.toLocaleString()}</td>
                <td className="px-6 py-4"><BatchStatusBadge status={batch.status} /></td>
                <td className="px-6 py-4 text-stone-500">{new Date(batch.created_at).toLocaleDateString('vi-VN')}</td>
                <td className="px-6 py-4 text-right space-x-2">
                  {batch.status === 'DRAFT' && (
                    <button
                      onClick={() => onRequestQr(batch.id)}
                      disabled={actionLoadingId === batch.id}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      {actionLoadingId === batch.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      Yêu cầu cấp QR 🔗
                    </button>
                  )}
                  {batch.status === 'PENDING_QR' && (
                    <button
                      disabled
                      className="inline-flex items-center gap-1 text-xs font-bold text-stone-400 bg-stone-50 border border-stone-200 px-2.5 py-1.5 rounded-lg cursor-not-allowed"
                    >
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Đang xử lý... ⏳
                    </button>
                  )}
                  {batch.status === 'QR_RECEIVED' && (
                    <>
                      <button
                        onClick={() => onSelectBatchForQr(batch)}
                        className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-all"
                      >
                        Xem QR 👁
                      </button>
                      <button
                        onClick={() => onActivateClick(batch)}
                        className="text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-all"
                      >
                        Kích hoạt ✅
                      </button>
                    </>
                  )}
                  {batch.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => onSelectBatchForQr(batch)}
                        className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-all"
                      >
                        Xem QR 👁
                      </button>
                      <button
                        onClick={() => onRecallClick(batch)}
                        className="text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-2.5 py-1.5 rounded-lg transition-all"
                      >
                        Thu hồi 🚫
                      </button>
                    </>
                  )}
                  {batch.status === 'RECALLED' && (
                    <span className="text-xs font-semibold text-stone-400">Đã thu hồi</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add Web-Admin/src/components/batches/BatchTable.tsx
git commit -m "feat(frontend): create BatchTable component with responsive status actions"
```

---

### Task 6: Create QrCodeTable Component

**Files:**
- Create: `Web-Admin/src/components/batches/QrCodeTable.tsx`

**Step 1: Implement QrCodeTable component**
Add filter details, rendering, copy public link action, and client-side CSV export trigger.
```typescript
import { QrCode, Batch } from '@/lib/types';
import { QrStatusBadge } from './QrStatusBadge';
import { Copy, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useState } from 'react';

interface QrCodeTableProps {
  qrCodes: QrCode[];
  selectedBatch: Batch | null;
  loading: boolean;
  onCopyLink: (code: string) => void;
}

export function QrCodeTable({ qrCodes, selectedBatch, loading, onCopyLink }: QrCodeTableProps) {
  const [exporting, setExporting] = useState(false);

  const handleExportCSV = () => {
    if (!selectedBatch || qrCodes.length === 0) return;
    try {
      setExporting(true);
      const headers = ['STT', 'Mã QR', 'Lô hàng', 'Trạng thái', 'Số lần quét', 'Ngày tạo'];
      const rows = qrCodes.map((qr, index) => [
        index + 1,
        qr.code,
        selectedBatch.batch_name,
        qr.status === 'ACTIVE' ? 'Đang lưu hành' : qr.status === 'RECALLED' ? 'Đã thu hồi' : 'Chưa kích hoạt',
        qr.scan_count || 0,
        new Date(qr.created_at).toLocaleString('vi-VN'),
      ]);
      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
        + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `danh_sach_qr_${selectedBatch.batch_code}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setExporting(false);
    }
  };

  if (!selectedBatch) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-stone-200">
        <p className="text-stone-500 font-medium">Vui lòng chọn lô hàng từ bộ lọc để xem danh sách mã QR</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-2xl border border-stone-200">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B5E20]" />
        <p className="text-sm font-semibold text-stone-500">Đang tải mã QR của lô hàng...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-stone-200">
        <div className="text-xs font-semibold text-stone-500">
          Lô hàng: <span className="font-bold text-stone-800">{selectedBatch.batch_name}</span> ({qrCodes.length} mã)
        </div>
        <button
          onClick={handleExportCSV}
          disabled={exporting || qrCodes.length === 0}
          className="flex items-center gap-1.5 text-xs font-bold bg-[#1B5E20] hover:bg-[#2E7D32] text-white py-2 px-4 rounded-lg shadow-sm transition-all"
        >
          {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
          Xuất Excel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-stone-600">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 w-20">STT</th>
                <th className="px-6 py-4">Mã QR (CheckVN URL)</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Lượt quét</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {qrCodes.map((qr, index) => (
                <tr key={qr.id} className="hover:bg-stone-50/55 transition-colors">
                  <td className="px-6 py-4 font-mono font-bold text-stone-500">{index + 1}</td>
                  <td className="px-6 py-4 font-mono font-medium text-stone-800 break-all">{qr.code}</td>
                  <td className="px-6 py-4"><QrStatusBadge status={qr.status} /></td>
                  <td className="px-6 py-4 font-mono font-bold text-stone-700">{qr.scan_count}</td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onCopyLink(qr.code)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy link
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add Web-Admin/src/components/batches/QrCodeTable.tsx
git commit -m "feat(frontend): create QrCodeTable with client CSV export and copy link action"
```

---

### Task 7: Create BatchStatusTimeline Component

**Files:**
- Create: `Web-Admin/src/components/batches/BatchStatusTimeline.tsx`

**Step 1: Implement BatchStatusTimeline component**
```typescript
import { Batch } from '@/lib/types';
import { Calendar, User, Package, Check, HelpCircle } from 'lucide-react';

interface BatchStatusTimelineProps {
  selectedBatch: Batch | null;
}

export function BatchStatusTimeline({ selectedBatch }: BatchStatusTimelineProps) {
  if (!selectedBatch) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-stone-200">
        <p className="text-stone-500 font-medium">Vui lòng chọn lô hàng để xem lịch sử trạng thái</p>
      </div>
    );
  }

  const creationDate = new Date(selectedBatch.created_at).toLocaleString('vi-VN');
  const activationDate = selectedBatch.activated_at ? new Date(selectedBatch.activated_at).toLocaleString('vi-VN') : null;
  const recallDate = selectedBatch.recalled_at ? new Date(selectedBatch.recalled_at).toLocaleString('vi-VN') : null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm max-w-xl">
      <div className="flex items-center gap-2 border-b border-stone-100 pb-4 mb-6">
        <Package className="h-5 w-5 text-[#1B5E20]" />
        <h3 className="font-serif text-base font-bold text-[#1B5E20]">
          Lịch sử hoạt động: {selectedBatch.batch_name}
        </h3>
      </div>

      <div className="relative pl-6 border-l-2 border-stone-200 space-y-8">
        {/* Step 1: Created */}
        <div className="relative">
          <span className="absolute -left-[31px] top-0 bg-[#1B5E20] text-white p-1 rounded-full border-4 border-white">
            <Check className="h-3.5 w-3.5" />
          </span>
          <div>
            <span className="text-xs font-bold text-stone-400">{creationDate}</span>
            <h4 className="text-sm font-bold text-stone-800 mt-0.5">Lô hàng được tạo</h4>
            <p className="text-xs text-stone-500 mt-1 flex items-center gap-1.5 font-medium">
              <User className="h-3.5 w-3.5" />
              Người tạo: {selectedBatch.created_by} | Khối lượng: {selectedBatch.total_weight_kg.toLocaleString()} kg | {selectedBatch.quantity_qr_requested} QRs
            </p>
          </div>
        </div>

        {/* Step 2: Request QRs */}
        {selectedBatch.checkvn_batch_id && (
          <div className="relative">
            <span className="absolute -left-[31px] top-0 bg-[#1B5E20] text-white p-1 rounded-full border-4 border-white">
              <Check className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-xs font-bold text-stone-400">{creationDate}</span>
              <h4 className="text-sm font-bold text-stone-800 mt-0.5">Yêu cầu cấp QR</h4>
              <p className="text-xs text-stone-500 mt-1 font-semibold">
                Gửi yêu cầu lên cổng CheckVN (ID Batch: {selectedBatch.checkvn_batch_id})
              </p>
            </div>
          </div>
        )}

        {/* Step 3: QR Received */}
        {selectedBatch.checkvn_batch_id && selectedBatch.status !== 'PENDING_QR' && (
          <div className="relative">
            <span className="absolute -left-[31px] top-0 bg-[#1B5E20] text-white p-1 rounded-full border-4 border-white">
              <Check className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-xs font-bold text-stone-400">{creationDate}</span>
              <h4 className="text-sm font-bold text-stone-800 mt-0.5">Nhận mã QR thành công</h4>
              <p className="text-xs text-stone-500 mt-1 font-semibold">
                CheckVN cấp {selectedBatch.quantity_qr_requested} mã QR liên kết thành công.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Active */}
        <div className="relative">
          {selectedBatch.activated_at ? (
            <>
              <span className="absolute -left-[31px] top-0 bg-emerald-600 text-white p-1 rounded-full border-4 border-white">
                <Check className="h-3.5 w-3.5" />
              </span>
              <div>
                <span className="text-xs font-bold text-stone-400">{activationDate}</span>
                <h4 className="text-sm font-bold text-emerald-800 mt-0.5">Kích hoạt lô hàng</h4>
                {selectedBatch.activation_note && (
                  <p className="text-xs text-stone-600 mt-1 bg-emerald-50 border border-emerald-100 p-2.5 rounded-xl font-medium">
                    &ldquo;{selectedBatch.activation_note}&rdquo;
                  </p>
                )}
              </div>
            </>
          ) : (
            <>
              <span className="absolute -left-[31px] top-0 bg-stone-200 text-stone-400 p-1.5 rounded-full border-4 border-white">
                <HelpCircle className="h-3 w-3" />
              </span>
              <div>
                <h4 className="text-sm font-semibold text-stone-400">Chưa kích hoạt</h4>
              </div>
            </>
          )}
        </div>

        {/* Step 5: Recalled */}
        {selectedBatch.status === 'RECALLED' && (
          <div className="relative">
            <span className="absolute -left-[31px] top-0 bg-red-600 text-white p-1 rounded-full border-4 border-white">
              <Check className="h-3.5 w-3.5" />
            </span>
            <div>
              <span className="text-xs font-bold text-stone-400">{recallDate}</span>
              <h4 className="text-sm font-bold text-red-800 mt-0.5">Đã thu hồi lô hàng</h4>
              {selectedBatch.recall_reason && (
                <p className="text-xs text-red-800 mt-1 bg-red-50 border border-red-100 p-2.5 rounded-xl font-semibold">
                  Lý do: &ldquo;{selectedBatch.recall_reason}&rdquo;
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add Web-Admin/src/components/batches/BatchStatusTimeline.tsx
git commit -m "feat(frontend): create BatchStatusTimeline component"
```

---

### Task 8: Create CreateBatchModal Component

**Files:**
- Create: `Web-Admin/src/components/batches/CreateBatchModal.tsx`

**Step 1: Implement CreateBatchModal component**
Fetch only completed seasons check details and perform real-time harvest limits verification.
```typescript
import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';

interface Season {
  id: string;
  season_name: string;
  actual_yield_kg: number | null;
  status: string;
}

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    season_id: string;
    batch_name: string;
    total_weight_kg: number;
    quantity_qr: number;
    packaging_unit: string;
    product_description?: string;
  }) => Promise<void>;
  seasons: Season[];
  submitting: boolean;
}

export function CreateBatchModal({ isOpen, onClose, onSubmit, seasons, submitting }: CreateBatchModalProps) {
  const [formData, setFormData] = useState({
    season_id: '',
    batch_name: '',
    total_weight_kg: '',
    quantity_qr: '',
    packaging_unit: '',
    product_description: '',
  });
  const [error, setError] = useState('');
  const [weightWarning, setWeightWarning] = useState('');

  const completedSeasons = seasons.filter((s) => s.status === 'COMPLETED');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        season_id: '',
        batch_name: '',
        total_weight_kg: '',
        quantity_qr: '',
        packaging_unit: '',
        product_description: '',
      });
      setError('');
      setWeightWarning('');
    }
  }, [isOpen]);

  const selectedSeasonObj = completedSeasons.find((s) => s.id === formData.season_id);
  const maxYield = selectedSeasonObj?.actual_yield_kg || 0;

  useEffect(() => {
    setWeightWarning('');
    if (selectedSeasonObj) {
      const weightVal = parseFloat(formData.total_weight_kg);
      if (!isNaN(weightVal) && weightVal > maxYield) {
        setWeightWarning(`Khối lượng lô hàng vượt quá sản lượng thu hoạch thực tế (${maxYield.toLocaleString()} kg)`);
      }
    }
  }, [formData.season_id, formData.total_weight_kg, selectedSeasonObj, maxYield]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.season_id) {
      setError('Vui lòng chọn vụ mùa đã thu hoạch');
      return;
    }
    if (!formData.batch_name.trim()) {
      setError('Vui lòng nhập tên lô hàng');
      return;
    }
    const weightVal = parseFloat(formData.total_weight_kg);
    if (isNaN(weightVal) || weightVal <= 0) {
      setError('Khối lượng lô hàng phải lớn hơn 0');
      return;
    }
    if (weightVal > maxYield) {
      setError(`Khối lượng lô hàng không được vượt quá sản lượng vụ mùa (${maxYield.toLocaleString()} kg)`);
      return;
    }
    const qrVal = parseInt(formData.quantity_qr, 10);
    if (isNaN(qrVal) || qrVal < 1 || qrVal > 10000) {
      setError('Số lượng QR cần cấp phải từ 1 đến 10,000');
      return;
    }
    if (!formData.packaging_unit.trim()) {
      setError('Vui lòng nhập quy cách đóng gói');
      return;
    }

    try {
      await onSubmit({
        season_id: formData.season_id,
        batch_name: formData.batch_name.trim(),
        total_weight_kg: weightVal,
        quantity_qr: qrVal,
        packaging_unit: formData.packaging_unit.trim(),
        product_description: formData.product_description.trim() || undefined,
      });
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi tạo lô hàng');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-stone-200 bg-stone-50">
          <h3 className="font-serif text-lg font-bold text-[#1B5E20]">Tạo Lô Hàng Mới</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Vụ mùa thu hoạch <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.season_id}
              onChange={(e) => setFormData({ ...formData, season_id: e.target.value })}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-700"
            >
              <option value="">-- Chọn vụ mùa đã thu hoạch --</option>
              {completedSeasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.season_name} (Thu hoạch: {(s.actual_yield_kg || 0).toLocaleString()} kg)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Tên lô hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Gạo ST25 Vụ Đông Xuân 2024-2025"
              value={formData.batch_name}
              onChange={(e) => setFormData({ ...formData, batch_name: e.target.value })}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Khối lượng lô (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.total_weight_kg}
                onChange={(e) => setFormData({ ...formData, total_weight_kg: e.target.value })}
                className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-800"
              />
              {weightWarning && <p className="text-[10px] text-red-600 mt-1 font-bold">{weightWarning}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Số lượng QR cần cấp <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="1-10000"
                value={formData.quantity_qr}
                onChange={(e) => setFormData({ ...formData, quantity_qr: e.target.value })}
                className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Quy cách đóng gói <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Túi 1kg, Bao 25kg"
              value={formData.packaging_unit}
              onChange={(e) => setFormData({ ...formData, packaging_unit: e.target.value })}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Mô tả sản phẩm (gửi lên CheckVN)
            </label>
            <textarea
              placeholder="Thông tin thêm về sản phẩm..."
              rows={2}
              value={formData.product_description}
              onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-800 resize-none"
            />
          </div>

          <div className="bg-amber-50 border border-amber-100 px-4 py-3 rounded-2xl">
            <p className="text-[10px] font-bold text-amber-800 leading-normal">
              ⚠️ Lưu ý: Mỗi vụ mùa thu hoạch chỉ được tạo tối đa 1 lô hàng duy nhất.
            </p>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white px-4 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Tạo Lô Hàng 📦
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add Web-Admin/src/components/batches/CreateBatchModal.tsx
git commit -m "feat(frontend): create CreateBatchModal with dynamic harvest rules validation"
```

---

### Task 9: Create ActivateModal and RecallModal Components

**Files:**
- Create: `Web-Admin/src/components/batches/ActivateModal.tsx`
- Create: `Web-Admin/src/components/batches/RecallModal.tsx`

**Step 1: Implement ActivateModal**
Requires minimum 10 characters label confirming stickers pasted.
```typescript
import React, { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { Batch } from '@/lib/types';

interface ActivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, note: string) => Promise<void>;
  batch: Batch | null;
  submitting: boolean;
}

export function ActivateModal({ isOpen, onClose, onSubmit, batch, submitting }: ActivateModalProps) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !batch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (note.trim().length < 10) {
      setError('Vui lòng nhập xác nhận dán tem tối thiểu 10 ký tự');
      return;
    }

    try {
      await onSubmit(batch.id, note.trim());
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi kích hoạt lô hàng');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-stone-200 bg-stone-50">
          <h3 className="font-serif text-lg font-bold text-[#1B5E20]">Kích Hoạt Lô Hàng</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="text-xs text-stone-600 space-y-1">
            <p>Lô hàng: <strong className="text-stone-900">{batch.batch_name}</strong></p>
            <p>Số mã QR sẽ kích hoạt: <strong className="text-emerald-700">{batch.quantity_qr_requested.toLocaleString()} mã</strong></p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Xác nhận đã dán tem *
            </label>
            <textarea
              placeholder="VD: Đã dán đầy đủ tem QR lên các sản phẩm tại kho..."
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-800 resize-none"
            />
            <p className="text-[10px] text-stone-400 mt-1">Tối thiểu 10 ký tự.</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-xs font-medium text-emerald-800 space-y-1">
            <p>✅ Sau khi kích hoạt:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-emerald-700 leading-normal">
              <li>Mã QR chuyển sang trạng thái hoạt động (ACTIVE).</li>
              <li>Người dùng có thể quét và tra cứu sản phẩm trực tiếp.</li>
              <li>Hành động này không thể hoàn tác.</li>
            </ul>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || note.trim().length < 10}
              className="flex items-center gap-1.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white px-4 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Xác nhận Kích Hoạt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 2: Implement RecallModal**
Requires string input "THU HOI" to enable submit trigger.
```typescript
import React, { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { Batch } from '@/lib/types';

interface RecallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, reason: string) => Promise<void>;
  batch: Batch | null;
  submitting: boolean;
}

export function RecallModal({ isOpen, onClose, onSubmit, batch, submitting }: RecallModalProps) {
  const [reason, setReason] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !batch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (reason.trim().length < 10) {
      setError('Vui lòng nhập lý do thu hồi tối thiểu 10 ký tự');
      return;
    }
    if (confirmText.trim() !== 'THU HOI') {
      setError('Vui lòng nhập đúng cụm từ "THU HOI" để xác nhận');
      return;
    }

    try {
      await onSubmit(batch.id, reason.trim());
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi thu hồi lô hàng');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-stone-200 bg-red-50">
          <h3 className="font-serif text-lg font-bold text-[#B71C1C]">⚠️ Thu Hồi Lô Hàng</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl text-xs font-semibold text-red-800 space-y-1">
            <p>🚨 CẢNH BÁO — Hành động này không thể hoàn tác!</p>
            <p className="text-[11px] font-normal leading-relaxed text-red-700">
              Toàn bộ {batch.quantity_qr_requested.toLocaleString()} mã QR liên quan sẽ bị vô hiệu hóa ngay lập tức. Người dùng quét mã sẽ nhận được cảnh báo hàng bị thu hồi.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Lý do thu hồi *
            </label>
            <textarea
              placeholder="VD: Phát hiện lỗi bao bì đóng gói, cần kiểm tra chất lượng..."
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-red-600 focus:outline-none transition-all text-sm font-semibold text-stone-800 resize-none"
            />
            <p className="text-[10px] text-stone-400 mt-1">Tối thiểu 10 ký tự.</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Xác nhận thu hồi *
            </label>
            <input
              type="text"
              placeholder="Nhập 'THU HOI' để xác nhận"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-red-600 focus:outline-none transition-all text-sm font-bold text-red-700 tracking-wider"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting || reason.trim().length < 10 || confirmText.trim() !== 'THU HOI'}
              className="flex items-center gap-1.5 bg-[#B71C1C] hover:bg-[#8e1414] text-white px-4 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Xác nhận Thu Hồi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

**Step 3: Commit**
```bash
git add Web-Admin/src/components/batches/ActivateModal.tsx Web-Admin/src/components/batches/RecallModal.tsx
git commit -m "feat(frontend): create ActivateModal and RecallModal components with validations"
```

---

### Task 10: Create Batches Page & Dashboard View

**Files:**
- Create: `Web-Admin/src/app/(dashboard)/batches/page.tsx`

**Step 1: Implement Batches main dashboard page**
Add stats calculations, tab rendering, API polling loop for `PENDING_QR` batches, and modals triggers.
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import { Batch, QrCode } from '@/lib/types';
import { BatchTable } from '@/components/batches/BatchTable';
import { QrCodeTable } from '@/components/batches/QrCodeTable';
import { BatchStatusTimeline } from '@/components/batches/BatchStatusTimeline';
import { CreateBatchModal } from '@/components/batches/CreateBatchModal';
import { ActivateModal } from '@/components/batches/ActivateModal';
import { RecallModal } from '@/components/batches/RecallModal';
import { Plus, Package, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function BatchesPage() {
  const { user } = useAuthStore();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'batches' | 'qr' | 'timeline'>('batches');
  const [selectedBatchIdForQr, setSelectedBatchIdForQr] = useState<string>('');
  const [selectedBatchIdForTimeline, setSelectedBatchIdForTimeline] = useState<string>('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeBatchForModal, setActiveBatchForModal] = useState<Batch | null>(null);
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [isRecallOpen, setIsRecallOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resBatches, resSeasons] = await Promise.all([
        apiClient.get('/qr/batches'),
        apiClient.get('/seasons?status=COMPLETED'),
      ]);

      if (resBatches.data?.success) {
        setBatches(resBatches.data.data);
      }
      if (resSeasons.data?.success) {
        setSeasons(resSeasons.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Polling loop for PENDING_QR status
  useEffect(() => {
    const hasPending = batches.some((b) => b.status === 'PENDING_QR');
    if (!hasPending) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get('/qr/batches');
        if (res.data?.success) {
          const fresh = res.data.data as Batch[];
          fresh.forEach((b) => {
            const old = batches.find((ob) => ob.id === b.id);
            if (old?.status === 'PENDING_QR' && b.status === 'QR_RECEIVED') {
              showToast(`✅ Đã nhận ${b.quantity_qr_requested} mã QR cho lô "${b.batch_name}" từ CheckVN!`, 'success');
            }
          });
          setBatches(fresh);
        }
      } catch (err) {
        console.error('Lỗi khi polling batches:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [batches]);

  // Fetch QR codes when selected batch changes
  useEffect(() => {
    const fetchQrs = async () => {
      if (!selectedBatchIdForQr) {
        setQrCodes([]);
        return;
      }
      try {
        setQrLoading(true);
        const res = await apiClient.get(`/qr/batches/${selectedBatchIdForQr}/qr-codes`);
        if (res.data?.success) {
          setQrCodes(res.data.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách QR:', err);
      } finally {
        setQrLoading(false);
      }
    };
    fetchQrs();
  }, [selectedBatchIdForQr]);

  const handleCreateBatch = async (data: any) => {
    try {
      setSubmitting(true);
      const res = await apiClient.post('/qr/batches', data);
      if (res.data?.success) {
        showToast('Tạo lô hàng thành công!', 'success');
        setIsCreateOpen(false);
        fetchData();
      }
    } catch (err: any) {
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestQr = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await apiClient.post(`/qr/batches/${id}/request`);
      if (res.data?.success) {
        showToast('Yêu cầu cấp QR đã gửi lên CheckVN thành công!', 'success');
        fetchData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Không thể yêu cầu cấp QR', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleActivate = async (id: string, note: string) => {
    try {
      setSubmitting(true);
      const res = await apiClient.post(`/qr/batches/${id}/activate`, { activation_note: note });
      if (res.data?.success) {
        showToast('Kích hoạt lô hàng và toàn bộ mã QR thành công!', 'success');
        setIsActivateOpen(false);
        fetchData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Kích hoạt thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecall = async (id: string, reason: string) => {
    try {
      setSubmitting(true);
      const res = await apiClient.post(`/qr/batches/${id}/recall`, { recall_reason: reason });
      if (res.data?.success) {
        showToast('Đã thu hồi lô hàng và vô hiệu hóa QR thành công!', 'success');
        setIsRecallOpen(false);
        fetchData();
      }
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Thu hồi thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (codeUrl: string) => {
    navigator.clipboard.writeText(codeUrl);
    showToast('✅ Đã copy link tra cứu vào clipboard!');
  };

  // Filter logic
  const filteredBatches = batches.filter((b) => {
    const codeMatches = b.batch_code.toLowerCase().includes(searchTerm.toLowerCase());
    const nameMatches = b.batch_name.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatches = !statusFilter || b.status === statusFilter;

    let dateMatches = true;
    if (fromDate) {
      dateMatches = dateMatches && new Date(b.created_at) >= new Date(fromDate);
    }
    if (toDate) {
      const dTo = new Date(toDate);
      dTo.setHours(23, 59, 59, 999);
      dateMatches = dateMatches && new Date(b.created_at) <= dTo;
    }

    return (codeMatches || nameMatches) && statusMatches && dateMatches;
  });

  // Calculate statistics
  const totalCount = batches.length;
  const pendingCount = batches.filter((b) => b.status === 'PENDING_QR').length;
  const activeCount = batches.filter((b) => b.status === 'ACTIVE').length;
  const recalledCount = batches.filter((b) => b.status === 'RECALLED').length;

  return (
    <div className="space-y-6 font-sans relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg animate-bounce transition-all ${
          toast.type === 'success' ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/20' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#1B5E20] tracking-tight">
            Quản lý Lô Hàng & QR CheckVN
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Tạo lô hàng từ vụ thu hoạch, yêu cầu cấp mã QR và quản lý truy xuất nguồn gốc sản phẩm.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-[#1B5E20] hover:bg-[#2E7D32] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-300 text-sm"
        >
          <Plus className="h-4 w-4" />
          Tạo Lô Hàng
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-stone-50 rounded-xl text-stone-500">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Tổng lô hàng</span>
            <span className="text-2xl font-bold text-stone-800">{totalCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-xl text-[#E65100]">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Chờ cấp QR</span>
            <span className="text-2xl font-bold text-[#E65100]">{pendingCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#E8F5E9] rounded-xl text-[#2E7D32]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Đang lưu hành</span>
            <span className="text-2xl font-bold text-[#2E7D32]">{activeCount}</span>
          </div>
        </div>

        <div className={`bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4 ${recalledCount > 0 ? 'border-red-200' : ''}`}>
          <div className={`p-3 rounded-xl ${recalledCount > 0 ? 'bg-red-50 text-[#B71C1C]' : 'bg-stone-50 text-stone-400'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Đã thu hồi</span>
            <span className={`text-2xl font-bold ${recalledCount > 0 ? 'text-[#B71C1C]' : 'text-stone-800'}`}>{recalledCount}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'batches' ? 'border-[#1B5E20] text-[#1B5E20] font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Lô Hàng
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'qr' ? 'border-[#1B5E20] text-[#1B5E20] font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Mã QR
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'timeline' ? 'border-[#1B5E20] text-[#1B5E20] font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Lịch sử
        </button>
      </div>

      {/* Main Views */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <input
              type="text"
              placeholder="Tìm theo tên, mã lô..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="py-1.5 px-3 bg-[#F9FAFB] border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none text-xs font-semibold placeholder:text-stone-400"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none text-xs font-semibold text-stone-600"
            >
              <option value="">-- Tất cả trạng thái --</option>
              <option value="DRAFT">Nháp (DRAFT)</option>
              <option value="PENDING_QR">Chờ cấp QR (PENDING_QR)</option>
              <option value="QR_RECEIVED">Đã nhận QR (QR_RECEIVED)</option>
              <option value="ACTIVE">Đang lưu hành (ACTIVE)</option>
              <option value="RECALLED">Đã thu hồi (RECALLED)</option>
            </select>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="py-1.5 px-3 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none text-xs font-semibold text-stone-600"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="py-1.5 px-3 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none text-xs font-semibold text-stone-600"
            />
          </div>

          <BatchTable
            batches={filteredBatches}
            loading={loading}
            onRequestQr={handleRequestQr}
            onActivateClick={(b) => {
              setActiveBatchForModal(b);
              setIsActivateOpen(true);
            }}
            onRecallClick={(b) => {
              setActiveBatchForModal(b);
              setIsRecallOpen(true);
            }}
            onSelectBatchForQr={(b) => {
              setSelectedBatchIdForQr(b.id);
              setActiveTab('qr');
            }}
            actionLoadingId={actionLoadingId}
          />
        </div>
      )}

      {activeTab === 'qr' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm max-w-sm">
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Chọn Lô Hàng</label>
            <select
              value={selectedBatchIdForQr}
              onChange={(e) => setSelectedBatchIdForQr(e.target.value)}
              className="w-full py-1.5 px-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none text-xs font-semibold text-stone-600"
            >
              <option value="">-- Chọn lô hàng --</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_name} ({b.batch_code})
                </option>
              ))}
            </select>
          </div>

          <QrCodeTable
            qrCodes={qrCodes}
            selectedBatch={batches.find((b) => b.id === selectedBatchIdForQr) || null}
            loading={qrLoading}
            onCopyLink={handleCopyLink}
          />
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm max-w-sm">
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Chọn Lô Hàng</label>
            <select
              value={selectedBatchIdForTimeline}
              onChange={(e) => setSelectedBatchIdForTimeline(e.target.value)}
              className="w-full py-1.5 px-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none text-xs font-semibold text-stone-600"
            >
              <option value="">-- Chọn lô hàng --</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_name} ({b.batch_code})
                </option>
              ))}
            </select>
          </div>

          <BatchStatusTimeline
            selectedBatch={batches.find((b) => b.id === selectedBatchIdForTimeline) || null}
          />
        </div>
      )}

      {/* Modals */}
      <CreateBatchModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateBatch}
        seasons={seasons}
        submitting={submitting}
      />

      <ActivateModal
        isOpen={isActivateOpen}
        onClose={() => setIsActivateOpen(false)}
        onSubmit={handleActivate}
        batch={activeBatchForModal}
        submitting={submitting}
      />

      <RecallModal
        isOpen={isRecallOpen}
        onClose={() => setIsRecallOpen(false)}
        onSubmit={handleRecall}
        batch={activeBatchForModal}
        submitting={submitting}
      />
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add Web-Admin/src/app/\(dashboard\)/batches/page.tsx
git commit -m "feat(frontend): create batches main dashboard page view with polling logic"
```

---

### Task 11: Create Public Tracing Components

**Files:**
- Create: `Web-Admin/src/components/trace/TraceHeader.tsx`
- Create: `Web-Admin/src/components/trace/TraceProductInfo.tsx`
- Create: `Web-Admin/src/components/trace/TraceFarmerCard.tsx`
- Create: `Web-Admin/src/components/trace/TraceCarbonBadge.tsx`
- Create: `Web-Admin/src/components/trace/TraceRecalledWarning.tsx`
- Create: `Web-Admin/src/components/trace/TraceFarmingTimeline.tsx`
- Create: `Web-Admin/src/components/trace/TraceFarmMap.tsx`

**Step 1: Implement TraceHeader**
```typescript
import { Sprout } from 'lucide-react';

export function TraceHeader() {
  return (
    <div className="flex items-center gap-3 py-4 border-b border-stone-100 px-1">
      <div className="bg-[#1B5E20] text-white p-2 rounded-xl shadow-md">
        <Sprout className="h-6 w-6" />
      </div>
      <div>
        <h1 className="font-serif text-lg font-bold tracking-tight text-[#1B5E20]">
          AgriTrace Carbon
        </h1>
        <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">
          Cổng truy xuất nguồn gốc nông sản
        </p>
      </div>
    </div>
  );
}
```

**Step 2: Implement TraceProductInfo**
```typescript
import { Batch } from '@/lib/types';
import { Calendar, Tag, ShieldCheck } from 'lucide-react';

interface TraceProductInfoProps {
  batch: any;
}

export function TraceProductInfo({ batch }: TraceProductInfoProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-sm">
      <div className="bg-[#E8F5E9] text-[#2E7D32] px-4 py-2.5 flex items-center gap-1.5 text-xs font-bold border-b border-[#E8F5E9]">
        <ShieldCheck className="h-4.5 w-4.5" />
        Sản phẩm đã được xác thực chính gốc CheckVN
      </div>
      <div className="p-4 space-y-3">
        <h2 className="font-serif text-lg font-bold text-stone-900 leading-snug">
          {batch.batch_name}
        </h2>
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#2E7D32] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
          <Tag className="h-3 w-3" />
          Quy cách: {batch.packaging_unit}
        </span>
        <div className="grid grid-cols-2 gap-3 pt-3 border-t border-stone-100 text-xs font-semibold text-stone-500">
          <div>
            Ngày đóng gói: <span className="text-stone-800 block mt-0.5">{new Date(batch.activated_at || batch.created_at).toLocaleDateString('vi-VN')}</span>
          </div>
          <div>
            Khối lượng: <span className="text-stone-800 block mt-0.5">{batch.total_weight_kg.toLocaleString()} kg</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Implement TraceFarmerCard**
```typescript
import { Users, MapPin } from 'lucide-react';

interface TraceFarmerCardProps {
  farmer: any;
  cooperative: any;
}

export function TraceFarmerCard({ farmer, cooperative }: TraceFarmerCardProps) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
      <h3 className="font-serif text-sm font-bold text-[#1B5E20] flex items-center gap-1.5">
        <Users className="h-4 w-4" />
        👨‍🌾 Thông tin hộ sản xuất
      </h3>
      <div className="space-y-1 text-xs font-medium text-stone-600">
        <p>Hộ nông dân: <span className="font-bold text-stone-800">{farmer.full_name}</span></p>
        <p className="flex items-center gap-1 mt-1">
          <MapPin className="h-3.5 w-3.5 text-stone-400" />
          {farmer.address}
        </p>
        <p className="pt-2 border-t border-stone-100 text-[10px] font-bold text-emerald-800 block uppercase mt-2">
          Hợp tác xã liên kết
        </p>
        <p className="font-bold text-stone-800 text-xs mt-1">{cooperative.name}</p>
        <p className="text-[11px] text-stone-400">SĐT: {cooperative.phone}</p>
      </div>
    </div>
  );
}
```

**Step 4: Implement TraceCarbonBadge**
```typescript
interface TraceCarbonBadgeProps {
  carbonRecord: any;
}

export function TraceCarbonBadge({ carbonRecord }: TraceCarbonBadgeProps) {
  if (!carbonRecord || carbonRecord.status !== 'ISSUED') return null;

  const isNetNegative = carbonRecord.net_carbon_tCO2e < 0;

  return (
    <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
      <h3 className="font-serif text-sm font-bold text-[#1B5E20] flex items-center gap-1.5">
        🌿 Nhật ký phát thải Carbon
      </h3>
      <div className="space-y-3 pt-1">
        <div className="flex justify-between items-center bg-[#F9FAFB] p-3 rounded-xl border border-stone-100">
          <span className="text-xs font-medium text-stone-500">Phát thải ròng:</span>
          <span className={`text-base font-extrabold ${isNetNegative ? 'text-[#2E7D32]' : 'text-[#B71C1C]'}`}>
            {carbonRecord.net_carbon_tCO2e.toLocaleString()} tCO2e
          </span>
        </div>

        <div className="text-[11px] text-stone-600 leading-normal space-y-1.5 font-medium">
          <p className="font-bold text-emerald-800 flex items-center gap-1">
            🏅 Tín chỉ Carbon đã xác thực
          </p>
          <p>Mã chứng nhận: <span className="font-mono font-bold text-stone-800">{carbonRecord.certificate_no}</span></p>
          <p>Số tín chỉ: <span className="font-bold text-stone-800">{carbonRecord.credit_amount_tCO2e} tCO2e</span></p>
        </div>
      </div>
    </div>
  );
}
```

**Step 5: Implement TraceRecalledWarning**
```typescript
import { AlertTriangle, ShieldAlert } from 'lucide-react';

interface TraceRecalledWarningProps {
  batchName: string;
  recallReason?: string;
  recalledAt?: string;
  cooperativeName: string;
}

export function TraceRecalledWarning({ batchName, recallReason, recalledAt, cooperativeName }: TraceRecalledWarningProps) {
  return (
    <div className="min-h-screen bg-red-50/20 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-3xl border border-red-200 shadow-lg p-6 space-y-5 text-center font-sans">
        <div className="bg-red-50 text-[#B71C1C] p-4 rounded-full w-fit mx-auto border border-red-100">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <div className="space-y-2">
          <h2 className="font-serif text-xl font-black text-[#B71C1C] tracking-wide uppercase">
            Sản phẩm đã bị thu hồi!
          </h2>
          <p className="text-stone-500 text-xs leading-relaxed font-semibold">
            Lô hàng này đã bị nhà sản xuất thu hồi khẩn cấp khỏi thị trường. Vui lòng dừng sử dụng sản phẩm ngay lập tức.
          </p>
        </div>

        <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50 text-left text-xs font-semibold text-red-800 space-y-1.5">
          <p>Lô hàng: <span className="text-stone-900 font-bold">{batchName}</span></p>
          <p>Lý do: <span className="text-stone-700 font-medium block mt-0.5">&ldquo;{recallReason || 'Phát hiện lỗi đóng gói'}&rdquo;</span></p>
          <p>Ngày thu hồi: <span className="text-stone-700 font-bold">{recalledAt ? new Date(recalledAt).toLocaleDateString('vi-VN') : '-'}</span></p>
        </div>

        <div className="text-[10px] text-stone-400 font-bold border-t border-stone-100 pt-4 leading-normal">
          <p>⚠️ Không sử dụng sản phẩm này và liên hệ nơi mua để được hoàn trả.</p>
          <p className="mt-1">{cooperativeName}</p>
        </div>
      </div>
    </div>
  );
}
```

**Step 6: Implement TraceFarmingTimeline**
```typescript
import { Camera } from 'lucide-react';
import { useState } from 'react';

interface ActivityLog {
  activity_date: string;
  activity_type: 'SEEDING' | 'FERTILIZING' | 'PESTICIDE' | 'IRRIGATION' | 'HARVESTING' | 'OTHER';
  notes?: string;
  photo_urls?: string[];
  fertilizer_type?: string;
  quantity_kg?: number;
  product_name?: string;
  dosage?: number;
  unit?: string;
  water_volume_m3?: number;
  duration_hours?: number;
  yield_kg?: number;
  harvest_method?: string;
}

const activityConfig = {
  SEEDING: { icon: '🌱', label: 'Gieo sạ / Trồng cây', color: 'text-emerald-700 bg-emerald-50 border-emerald-100' },
  FERTILIZING: { icon: '🌿', label: 'Bón phân', color: 'text-[#2E7D32] bg-emerald-50 border-emerald-100' },
  PESTICIDE: { icon: '💊', label: 'Phun thuốc BVTV', color: 'text-[#E65100] bg-orange-50 border-orange-100' },
  IRRIGATION: { icon: '💧', label: 'Tưới nước', color: 'text-[#1565C0] bg-blue-50 border-blue-100' },
  HARVESTING: { icon: '🌾', label: 'Thu hoạch', color: 'text-amber-800 bg-amber-50 border-amber-100' },
  OTHER: { icon: '📝', label: 'Hoạt động khác', color: 'text-stone-500 bg-stone-50 border-stone-100' },
};

export function TraceFarmingTimeline({ logs }: { logs: ActivityLog[] }) {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  if (logs.length === 0) {
    return (
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm text-center py-8">
        <p className="text-stone-500 text-xs font-semibold">Chưa có nhật ký hoạt động sản xuất</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-4">
      <h3 className="font-serif text-sm font-bold text-[#1B5E20]">
        📅 Nhật ký canh tác & chăm sóc
      </h3>

      <div className="relative pl-4 border-l border-stone-200 space-y-6 pt-2">
        {logs.map((log, index) => {
          const config = activityConfig[log.activity_type] || activityConfig.OTHER;
          const dateStr = new Date(log.activity_date).toLocaleDateString('vi-VN');

          let detailsStr = '';
          if (log.activity_type === 'FERTILIZING') {
            detailsStr = `Loại phân: ${log.fertilizer_type || '-'} | Lượng dùng: ${log.quantity_kg?.toLocaleString()} kg`;
          } else if (log.activity_type === 'PESTICIDE') {
            detailsStr = `Thuốc: ${log.product_name || '-'} | Liều lượng: ${log.dosage?.toLocaleString()} ${log.unit || 'ml'}`;
          } else if (log.activity_type === 'IRRIGATION') {
            detailsStr = `Lượng nước: ${log.water_volume_m3?.toLocaleString()} m³ | Thời gian: ${log.duration_hours} giờ`;
          } else if (log.activity_type === 'HARVESTING') {
            detailsStr = `Sản lượng: ${log.yield_kg?.toLocaleString()} kg | Phương pháp: ${log.harvest_method || '-'}`;
          }

          return (
            <div key={index} className="relative">
              <span className="absolute -left-[25px] top-0 bg-white border border-stone-200 text-sm p-0.5 rounded-full flex items-center justify-center">
                {config.icon}
              </span>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-stone-400 block">{dateStr}</span>
                <h4 className="text-xs font-bold text-stone-800 leading-normal">{config.label}</h4>
                {detailsStr && <p className="text-[11px] font-bold text-[#2E7D32]">{detailsStr}</p>}
                {log.notes && <p className="text-[11px] text-stone-500 font-medium leading-relaxed">&ldquo;{log.notes}&rdquo;</p>}

                {log.photo_urls && log.photo_urls.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {log.photo_urls.map((photo, pIdx) => (
                      <div
                        key={pIdx}
                        onClick={() => setSelectedPhoto(photo)}
                        className="relative aspect-video rounded-lg overflow-hidden border border-stone-200 cursor-zoom-in group hover:opacity-90 transition-all"
                      >
                        <img src={photo} alt="Ảnh thực địa" className="w-full h-full object-cover" />
                        <span className="absolute bottom-1 right-1 bg-black/60 p-0.5 rounded text-white opacity-0 group-hover:opacity-100 transition-all">
                          <Camera className="h-3 w-3" />
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox photo Modal */}
      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl border border-stone-800 shadow-2xl">
            <img src={selectedPhoto} alt="Ảnh thực địa phóng to" className="object-contain max-h-[80vh] w-full" />
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 7: Implement TraceFarmMap**
Render dynamically, center map on region boundary polygon coordinates.
```typescript
'use client';

import { MapContainer, TileLayer, Polygon, useMap } from 'react-leaflet';
import { useEffect, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface TraceFarmMapProps {
  boundary: {
    type: string;
    coordinates: number[][][];
  };
  zoneName: string;
  areaSqm: number;
}

function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16);
  }, [center, map]);
  return null;
}

export default function TraceFarmMap({ boundary, zoneName, areaSqm }: TraceFarmMapProps) {
  const [center, setCenter] = useState<[number, number]>([12.6784, 108.2022]);
  const [coords, setCoords] = useState<[number, number][]>([]);

  useEffect(() => {
    if (boundary && boundary.coordinates && boundary.coordinates[0]) {
      const geojsonCoords = boundary.coordinates[0];
      const leafletCoords = geojsonCoords.map(coord => [coord[1], coord[0]] as [number, number]);
      setCoords(leafletCoords);
      if (leafletCoords.length > 0) {
        setCenter(leafletCoords[0]);
      }
    }
  }, [boundary]);

  return (
    <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm space-y-3">
      <h3 className="font-serif text-sm font-bold text-[#1B5E20]">
        📍 Bản đồ ranh giới vùng trồng
      </h3>
      <div className="relative w-full h-[250px] bg-stone-100 rounded-xl overflow-hidden border border-stone-200">
        <MapContainer center={center} zoom={16} style={{ width: '100%', height: '100%' }} scrollWheelZoom={false}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap center={center} />
          {coords.length >= 3 && (
            <Polygon
              positions={coords}
              pathOptions={{
                color: '#1B5E20',
                fillColor: '#2E7D32',
                fillOpacity: 0.25,
                weight: 3,
              }}
            />
          )}
        </MapContainer>
      </div>
      <div className="flex justify-between items-center text-[11px] font-bold text-stone-500">
        <span>Vùng trồng: <strong className="text-stone-800">{zoneName}</strong></span>
        <span>Diện tích: <strong className="text-stone-800">{areaSqm.toLocaleString()} m²</strong></span>
      </div>
    </div>
  );
}
```

**Step 8: Commit**
```bash
git add Web-Admin/src/components/trace/
git commit -m "feat(frontend): create public trace components with Leaflet and photo Lightbox support"
```

---

### Task 11: Create Public Tracing Page

**Files:**
- Create: `Web-Admin/src/app/public/trace/[qrCode]/page.tsx`

**Step 1: Implement Dynamic Route Page**
Next.js Page structure using metadata headers for SEO trace and dynamically imported `TraceFarmMap`.
```typescript
'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/axios';
import { TraceHeader } from '@/components/trace/TraceHeader';
import { TraceProductInfo } from '@/components/trace/TraceProductInfo';
import { TraceFarmerCard } from '@/components/trace/TraceFarmerCard';
import { TraceCarbonBadge } from '@/components/trace/TraceCarbonBadge';
import { TraceRecalledWarning } from '@/components/trace/TraceRecalledWarning';
import { TraceFarmingTimeline } from '@/components/trace/TraceFarmingTimeline';
import { Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';

const TraceFarmMap = dynamic(() => import('@/components/trace/TraceFarmMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[250px] bg-stone-100 rounded-xl flex items-center justify-center font-bold text-xs text-stone-400">
      <Loader2 className="h-5 w-5 animate-spin mr-1.5" />
      Đang tải bản đồ ranh giới...
    </div>
  ),
});

export default function PublicTracePage() {
  const params = useParams();
  const qrCodeValue = decodeURIComponent(params.qrCode as string);
  
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code?: string; message: string } | null>(null);

  useEffect(() => {
    const fetchTraceData = async () => {
      try {
        setLoading(true);
        setError(null);
        // Correct API endpoint matching standard REST router config:
        const res = await apiClient.get(`/qr/trace/${encodeURIComponent(qrCodeValue)}`);
        if (res.data?.success) {
          setData(res.data.data);
        }
      } catch (err: any) {
        console.error('Lỗi tra cứu:', err);
        const errMsg = err.response?.data?.message || 'Không thể tra cứu thông tin sản phẩm';
        const errCode = err.response?.data?.code || 'ERROR';
        setError({ code: errCode, message: errMsg });
      } finally {
        setLoading(false);
      }
    };
    if (qrCodeValue) {
      fetchTraceData();
    }
  }, [qrCodeValue]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#1B5E20]" />
        <span className="text-xs font-semibold text-stone-500">Đang truy xuất nguồn gốc sản phẩm...</span>
      </div>
    );
  }

  // Handle Recalled Warning directly
  if (data?.status === 'RECALLED' || error?.code === 'QR_RECALLED') {
    return (
      <TraceRecalledWarning
        batchName={data?.batch?.batch_name || 'Sản phẩm liên kết'}
        recallReason={data?.recall_reason || error?.message}
        recalledAt={data?.recalled_at}
        cooperativeName={data?.cooperative?.name || 'Hợp Tác Xã'}
      />
    );
  }

  // Handle errors
  if (error || !data) {
    const isInactive = data?.status === 'INACTIVE' || error?.code === 'QR_NOT_ACTIVATED';
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl border border-stone-200 shadow-md p-6 space-y-4 text-center font-sans">
          <div className={`p-4 rounded-full w-fit mx-auto ${isInactive ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'}`}>
            {isInactive ? <AlertCircle className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
          </div>
          <div className="space-y-1">
            <h3 className="font-serif text-lg font-bold text-stone-800">
              {isInactive ? 'Sản phẩm chưa được kích hoạt' : 'Lỗi truy xuất nguồn gốc'}
            </h3>
            <p className="text-xs text-stone-500 leading-normal font-semibold">
              {error?.message || data?.message || 'Mã QR không hợp lệ hoặc không tồn tại trên hệ thống.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans pb-10">
      <div className="w-full max-w-md mx-auto bg-[#F9FAFB] px-4 py-3 space-y-4">
        {/* Header */}
        <TraceHeader />

        {/* Product Details */}
        <TraceProductInfo batch={data.batch} />

        {/* Farm Map */}
        {data.farm_zone?.boundary && (
          <TraceFarmMap
            boundary={data.farm_zone.boundary}
            zoneName={data.farm_zone.zone_name}
            areaSqm={data.farm_zone.area_sqm}
          />
        )}

        {/* Farmer info */}
        <TraceFarmerCard farmer={data.farmer} cooperative={data.cooperative} />

        {/* Timeline */}
        <TraceFarmingTimeline logs={data.farming_logs || []} />

        {/* Carbon Badge */}
        {data.carbon_record && <TraceCarbonBadge carbonRecord={data.carbon_record} />}

        {/* Footer */}
        <div className="text-center text-[10px] text-stone-400 font-bold border-t border-stone-100 pt-4 leading-normal">
          <p>Mã QR: {qrCodeValue.substring(qrCodeValue.lastIndexOf('/') + 1)}</p>
          <p className="mt-1">© AgriTrace Carbon. Mọi quyền được bảo lưu.</p>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**
```bash
git add Web-Admin/src/app/public/trace/\[qrCode\]/page.tsx
git commit -m "feat(frontend): create public trace dynamic page route"
```

---

### Task 12: Production Build Check

**Files:**
- Test: Run Next.js production build check in Web-Admin directory.

**Step 1: Run build**
Run: `npm run build` in `Web-Admin` directory.
Expected: PASS with 0 compilation errors or strict ESLint warnings.

**Step 2: Commit**
```bash
git commit --allow-empty -m "build(frontend): verify Next.js production build check successfully"
```
