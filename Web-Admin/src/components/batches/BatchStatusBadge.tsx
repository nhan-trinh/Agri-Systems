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
