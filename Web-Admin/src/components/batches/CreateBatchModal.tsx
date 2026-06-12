import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { Season } from '@/lib/types';


interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    season_id: string;
    batch_name: string;
    total_weight_kg: number;
    quantity_qr: number;
    packaging_unit: string;
    product_description?: string;
  }) => Promise<void>;
  seasons: Season[];
  submitting: boolean;
}

export function CreateBatchModal({ isOpen, onClose, onSubmit, seasons, submitting }: CreateBatchModalProps) {
  const [formData, setFormData] = useState({
    season_id: '',
    batch_name: '',
    total_weight_kg: '',
    quantity_qr: '',
    packaging_unit: '',
    product_description: '',
  });
  const [error, setError] = useState('');
  const [weightWarning, setWeightWarning] = useState('');

  const completedSeasons = seasons.filter((s) => s.status === 'COMPLETED');

  useEffect(() => {
    if (isOpen) {
      setFormData({
        season_id: '',
        batch_name: '',
        total_weight_kg: '',
        quantity_qr: '',
        packaging_unit: '',
        product_description: '',
      });
      setError('');
      setWeightWarning('');
    }
  }, [isOpen]);

  const selectedSeasonObj = completedSeasons.find((s) => s.id === formData.season_id);
  const maxYield = selectedSeasonObj?.actual_yield_kg || 0;

  useEffect(() => {
    setWeightWarning('');
    if (selectedSeasonObj) {
      const weightVal = parseFloat(formData.total_weight_kg);
      if (!isNaN(weightVal) && weightVal > maxYield) {
        setWeightWarning(`Khối lượng lô hàng vượt quá sản lượng thu hoạch thực tế (${maxYield.toLocaleString()} kg)`);
      }
    }
  }, [formData.season_id, formData.total_weight_kg, selectedSeasonObj, maxYield]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.season_id) {
      setError('Vui lòng chọn vụ mùa đã thu hoạch');
      return;
    }
    if (!formData.batch_name.trim()) {
      setError('Vui lòng nhập tên lô hàng');
      return;
    }
    const weightVal = parseFloat(formData.total_weight_kg);
    if (isNaN(weightVal) || weightVal <= 0) {
      setError('Khối lượng lô hàng phải lớn hơn 0');
      return;
    }
    if (weightVal > maxYield) {
      setError(`Khối lượng lô hàng không được vượt quá sản lượng vụ mùa (${maxYield.toLocaleString()} kg)`);
      return;
    }
    const qrVal = parseInt(formData.quantity_qr, 10);
    if (isNaN(qrVal) || qrVal < 1 || qrVal > 10000) {
      setError('Số lượng QR cần cấp phải từ 1 đến 10,000');
      return;
    }
    if (!formData.packaging_unit.trim()) {
      setError('Vui lòng nhập quy cách đóng gói');
      return;
    }

    try {
      await onSubmit({
        season_id: formData.season_id,
        batch_name: formData.batch_name.trim(),
        total_weight_kg: weightVal,
        quantity_qr: qrVal,
        packaging_unit: formData.packaging_unit.trim(),
        product_description: formData.product_description.trim() || undefined,
      });
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      setError(axiosError.response?.data?.message || 'Có lỗi xảy ra khi tạo lô hàng');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-stone-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-stone-200 bg-stone-50">
          <h3 className="font-serif text-lg font-bold text-[#1B5E20]">Tạo Lô Hàng Mới</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Vụ mùa thu hoạch <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.season_id}
              onChange={(e) => setFormData({ ...formData, season_id: e.target.value })}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-700"
            >
              <option value="">-- Chọn vụ mùa đã thu hoạch --</option>
              {completedSeasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.season_name} (Thu hoạch: {(s.actual_yield_kg || 0).toLocaleString()} kg)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Tên lô hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Gạo ST25 Vụ Đông Xuân 2024-2025"
              value={formData.batch_name}
              onChange={(e) => setFormData({ ...formData, batch_name: e.target.value })}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Khối lượng lô (kg) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.total_weight_kg}
                onChange={(e) => setFormData({ ...formData, total_weight_kg: e.target.value })}
                className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-800"
              />
              {weightWarning && <p className="text-[10px] text-red-600 mt-1 font-bold">{weightWarning}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Số lượng QR cần cấp <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                placeholder="1-10000"
                value={formData.quantity_qr}
                onChange={(e) => setFormData({ ...formData, quantity_qr: e.target.value })}
                className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Quy cách đóng gói <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Túi 1kg, Bao 25kg"
              value={formData.packaging_unit}
              onChange={(e) => setFormData({ ...formData, packaging_unit: e.target.value })}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Mô tả sản phẩm (gửi lên CheckVN)
            </label>
            <textarea
              placeholder="Thông tin thêm về sản phẩm..."
              rows={2}
              value={formData.product_description}
              onChange={(e) => setFormData({ ...formData, product_description: e.target.value })}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none transition-all text-sm font-semibold text-stone-800 resize-none"
            />
          </div>

          <div className="bg-amber-50 border border-amber-100 px-4 py-3 rounded-2xl">
            <p className="text-[10px] font-bold text-amber-800 leading-normal">
              ⚠️ Lưu ý: Mỗi vụ mùa thu hoạch chỉ được tạo tối đa 1 lô hàng duy nhất.
            </p>
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
              disabled={submitting}
              className="flex items-center gap-1.5 bg-[#1B5E20] hover:bg-[#2E7D32] text-white px-4 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Tạo Lô Hàng 📦
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
