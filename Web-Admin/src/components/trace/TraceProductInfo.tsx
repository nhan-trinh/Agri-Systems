import { Tag, ShieldCheck } from 'lucide-react';
import { Batch } from '@/lib/types';

interface TraceProductInfoProps {
  batch: Batch;
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
