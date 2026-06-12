import { Batch } from '@/lib/types';
import { User, Package, Check, HelpCircle } from 'lucide-react';

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
              <span className="absolute -left-[31px] top-0 bg-stone-200 text-stone-400 p-1.5 rounded-full border-4 border-white flex items-center justify-center">
                <HelpCircle className="h-3.5 w-3.5" />
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
