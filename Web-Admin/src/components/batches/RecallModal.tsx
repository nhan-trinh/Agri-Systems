import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setConfirmText('');
      setError('');
    }
  }, [isOpen]);

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
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Có lỗi xảy ra khi thu hồi lô hàng');
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
