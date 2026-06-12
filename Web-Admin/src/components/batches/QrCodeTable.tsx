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
