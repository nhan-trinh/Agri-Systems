import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { Batch } from '@/lib/types';

interface ActivateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (id: string, note: string) => Promise<void>;
  batch: Batch | null;
  submitting: boolean;
}

export function ActivateModal({ isOpen, onClose, onSubmit, batch, submitting }: ActivateModalProps) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNote('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen || !batch) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (note.trim().length < 10) {
      setError('Vui lòng nhập xác nhận dán tem tối thiểu 10 ký tự');
      return;
    }

    try {
      await onSubmit(batch.id, note.trim());
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Có lỗi xảy ra khi kích hoạt lô hàng');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-stone-200 bg-stone-50">
          <h3 className="font-serif text-lg font-bold text-[#1B5E20]">Kích Hoạt Lô Hàng</h3>
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

          <div className="text-xs text-stone-600 space-y-1">
            <p>Lô hàng: <strong className="text-stone-900">{batch.batch_name}</strong></p>
            <p>Số mã QR sẽ kích hoạt: <strong className="text-emerald-700">{batch.quantity_qr_requested.toLocaleString()} mã</strong></p>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Xác nhận đã dán tem *
            </label>
            <textarea
              placeholder="VD: Đã dán đầy đủ tem QR lên các sản phẩm tại kho..."
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-800 resize-none"
            />
            <p className="text-[10px] text-stone-400 mt-1">Tối thiểu 10 ký tự.</p>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-xs font-medium text-emerald-800 space-y-1">
            <p>✅ Sau khi kích hoạt:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-emerald-700 leading-normal">
              <li>Mã QR chuyển sang trạng thái hoạt động (ACTIVE).</li>
              <li>Người dùng có thể quét và tra cứu sản phẩm trực tiếp.</li>
              <li>Hành động này không thể hoàn tác.</li>
            </ul>
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
              disabled={submitting || note.trim().length < 10}
              className="flex items-center gap-1.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white px-4 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Xác nhận Kích Hoạt
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
