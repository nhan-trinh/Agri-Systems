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
