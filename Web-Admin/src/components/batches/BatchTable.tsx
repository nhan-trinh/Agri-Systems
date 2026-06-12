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
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      Đang xử lý... ⏳
                    </button>
                  )}
                  {batch.status === 'QR_RECEIVED' && (
                    <>
                      <button
                        onClick={() => onSelectBatchForQr(batch)}
                        className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-all mr-1"
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
                        className="text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded-lg transition-all mr-1"
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
