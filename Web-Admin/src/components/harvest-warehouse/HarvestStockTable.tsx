import { Loader2, Package, ArrowDownToLine, Ship, AlertTriangle } from 'lucide-react';
import type { HarvestStockItem } from '@/lib/harvest-warehouse';
import { CROP_TYPE_LABELS } from '@/lib/harvest-warehouse';

interface HarvestStockTableProps {
  items: HarvestStockItem[];
  onReceiveClick: (item: HarvestStockItem) => void;
  onShipClick: (item: HarvestStockItem) => void;
  loading: boolean;
}

/**
 * On-hand produce inventory table — current_stock per (crop_type, produce_name).
 * Mirrors the Material Warehouse StockTable structure (card + table + empty state).
 */
export function HarvestStockTable({ items, onReceiveClick, onShipClick, loading }: HarvestStockTableProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm p-12 flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-[#1b4332]" />
        <p className="text-xs font-semibold text-stone-400">Đang tải tồn kho nông sản...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm p-12 flex flex-col items-center justify-center gap-2">
        <Package className="h-10 w-10 text-stone-300" />
        <p className="text-sm font-semibold text-stone-500">Chưa có nông sản nào trong kho</p>
        <p className="text-xs text-stone-400">Tồn kho sẽ xuất hiện khi có lô thu hoạch được nhận vào kho.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#e6ebe3] bg-[#fbfcf9]">
              <th className="text-left text-[10px] font-bold text-stone-400 uppercase tracking-wider px-5 py-3">Loại nông sản</th>
              <th className="text-left text-[10px] font-bold text-stone-400 uppercase tracking-wider px-5 py-3">Nhóm cây trồng</th>
              <th className="text-right text-[10px] font-bold text-stone-400 uppercase tracking-wider px-5 py-3">Đơn vị</th>
              <th className="text-right text-[10px] font-bold text-stone-400 uppercase tracking-wider px-5 py-3">Tồn hiện tại</th>
              <th className="text-right text-[10px] font-bold text-stone-400 uppercase tracking-wider px-5 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f0f3ee]">
            {items.map((item) => {
              const outOfStock = item.current_stock <= 0;
              return (
                <tr key={item.id} className="hover:bg-[#f7faf5] transition-colors">
                  <td className="px-5 py-3.5">
                    <span className="text-sm font-bold text-stone-800">{item.produce_name}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-block text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                      {CROP_TYPE_LABELS[item.crop_type]}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right text-xs font-medium text-stone-500">{item.unit}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className={`text-sm font-bold ${outOfStock ? 'text-stone-400' : 'text-stone-800'}`}>
                      {item.current_stock.toLocaleString('vi-VN')}
                    </span>
                    {outOfStock && (
                      <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-orange-600 font-bold">
                        <AlertTriangle className="h-3 w-3" /> hết
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onReceiveClick(item)}
                        title="Nhận thêm vào kho"
                        className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg border border-emerald-100 transition-all"
                      >
                        <ArrowDownToLine className="h-3.5 w-3.5" />
                        Nhận
                      </button>
                      <button
                        onClick={() => onShipClick(item)}
                        disabled={outOfStock}
                        title={outOfStock ? 'Không đủ tồn để xuất' : 'Xuất đi bán'}
                        className="flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Ship className="h-3.5 w-3.5" />
                        Xuất
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
