import { Loader2, Inbox } from 'lucide-react';
import type { HarvestStockEntry } from '@/lib/harvest-warehouse';
import { HarvestEntryTypeTag } from './HarvestEntryTypeTag';

interface HarvestEntryTableProps {
  entries: HarvestStockEntry[];
  loading: boolean;
}

/**
 * Filterable transaction history (RECEIVE + SHIP) — mirrors Material Warehouse
 * TransactionTable. Displays entry date, type tag, quantity, buyer/season context.
 */
export function HarvestEntryTable({ entries, loading }: HarvestEntryTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm p-12 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-[#1b4332]" />
        <p className="text-xs font-semibold text-stone-400">Đang tải lịch sử giao dịch...</p>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm p-12 flex flex-col items-center justify-center gap-2">
        <Inbox className="h-10 w-10 text-stone-300" />
        <p className="text-sm font-semibold text-stone-500">Chưa có giao dịch nào</p>
        <p className="text-xs text-stone-400">Lịch sử nhận/xuất nông sản sẽ hiển thị tại đây.</p>
      </div>
    );
  }

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e6ebe3] bg-[#fbfcf9]">
              <th className="text-left text-[10px] font-bold text-stone-400 uppercase tracking-wider px-5 py-3">Thời gian</th>
              <th className="text-left text-[10px] font-bold text-stone-400 uppercase tracking-wider px-5 py-3">Loại</th>
              <th className="text-right text-[10px] font-bold text-stone-400 uppercase tracking-wider px-5 py-3">Khối lượng</th>
              <th className="text-left text-[10px] font-bold text-stone-400 uppercase tracking-wider px-5 py-3">Nguồn / Đích</th>
              <th className="text-left text-[10px] font-bold text-stone-400 uppercase tracking-wider px-5 py-3">Ghi chú</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f3ee]">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-[#f7faf5] transition-colors align-top">
                <td className="px-5 py-3.5 text-xs font-semibold text-stone-600 whitespace-nowrap">
                  {formatDateTime(entry.entry_date)}
                </td>
                <td className="px-5 py-3.5">
                  <HarvestEntryTypeTag type={entry.entry_type} />
                </td>
                <td className="px-5 py-3.5 text-right whitespace-nowrap">
                  <span className={`text-sm font-bold ${entry.entry_type === 'RECEIVE' ? 'text-emerald-700' : 'text-blue-700'}`}>
                    {entry.entry_type === 'RECEIVE' ? '+' : '−'}
                    {entry.quantity.toLocaleString('vi-VN')}
                  </span>
                  <span className="text-[10px] text-stone-400 font-medium ml-1">{entry.unit}</span>
                </td>
                <td className="px-5 py-3.5 text-xs text-stone-600">
                  {entry.entry_type === 'SHIP' ? (
                    <div className="space-y-0.5">
                      <p className="font-semibold text-stone-700">{entry.buyer_name || '—'}</p>
                      {entry.buyer_contact && <p className="text-stone-400">{entry.buyer_contact}</p>}
                      {entry.unit_price != null && (
                        <p className="text-stone-400">{entry.unit_price.toLocaleString('vi-VN')} đ/{entry.unit}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {entry.received_after_close && (
                        <p className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-600">
                          ⚠ Nhận sau khi đóng vụ
                        </p>
                      )}
                      {entry.quality_notes && <p className="text-stone-500">CL: {entry.quality_notes}</p>}
                      {!entry.quality_notes && !entry.received_after_close && <span className="text-stone-300">—</span>}
                    </div>
                  )}
                </td>
                <td className="px-5 py-3.5 text-xs text-stone-500 max-w-[220px]">
                  {entry.notes || <span className="text-stone-300">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
