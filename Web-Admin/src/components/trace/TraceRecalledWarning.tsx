import { ShieldAlert } from 'lucide-react';

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
