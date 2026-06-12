import React, { useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { apiClient } from '@/lib/api/axios';

interface RecallBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  batchId: string;
  batchName: string;
}

export function RecallBatchModal({ isOpen, onClose, onSuccess, batchId, batchName }: RecallBatchModalProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (reason.trim().length < 5) {
      setError('Lý do thu hồi phải có độ dài tối thiểu 5 ký tự');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.post(`/qr/batches/${batchId}/recall`, {
        recall_reason: reason.trim(),
      });

      if (res.data?.success) {
        onSuccess();
        onClose();
        setReason('');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Không thể thu hồi lô hàng. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl border border-[#e6ebe3] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e6ebe3] flex justify-between items-center bg-red-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-serif text-md font-bold text-red-950">Yêu cầu Thu hồi Lô Hàng</h3>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-red-100 rounded-xl text-red-400 hover:text-red-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] rounded-xl leading-relaxed">
            <strong>CẢNH BÁO:</strong> Hành động này sẽ khóa vĩnh viễn lô hàng <strong>{batchName}</strong> và toàn bộ dải mã QR đi kèm trên cổng truy xuất nguồn gốc công cộng CheckVN. Người tiêu dùng sẽ nhận cảnh báo sản phẩm bị thu hồi khi quét QR.
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-stone-500 font-semibold text-xs">Lý do thu hồi lô hàng *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vui lòng nhập lý do cụ thể (tối thiểu 5 ký tự)..."
              rows={3}
              className="w-full px-3 py-2 bg-[#fbfcf9] border border-stone-200 focus:border-red-600 focus:outline-none text-xs rounded-xl font-medium"
              required
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#e6ebe3]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-50 text-xs transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang thu hồi...
                </>
              ) : (
                'Thu Hồi Lô Hàng'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
