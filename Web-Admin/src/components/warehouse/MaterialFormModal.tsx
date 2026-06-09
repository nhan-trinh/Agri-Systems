import React, { useState, useEffect } from 'react';
import { MaterialType } from '@/lib/types';
import { X, Loader2, AlertTriangle } from 'lucide-react';

interface Material {
  id: string;
  material_name: string;
  material_type: MaterialType;
  unit: string;
  min_stock_alert: number;
  is_active: boolean;
}

interface MaterialPayload {
  material_name: string;
  material_type: MaterialType;
  unit: string;
  min_stock_alert: number;
  is_active: boolean;
}

interface MaterialFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: MaterialPayload) => Promise<void>;
  material?: Material | null;
  submitting: boolean;
}

export function MaterialFormModal({
  isOpen,
  onClose,
  onSubmit,
  material,
  submitting,
}: MaterialFormModalProps) {
  const [formData, setFormData] = useState({
    material_name: '',
    material_type: 'SEED' as MaterialType,
    unit: '',
    min_stock_alert: '0',
    is_active: true,
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (material) {
      setFormData({
        material_name: material.material_name,
        material_type: material.material_type,
        unit: material.unit,
        min_stock_alert: String(material.min_stock_alert),
        is_active: material.is_active,
      });
    } else {
      setFormData({
        material_name: '',
        material_type: 'SEED',
        unit: '',
        min_stock_alert: '0',
        is_active: true,
      });
    }
    setError('');
  }, [material, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.material_name.trim()) {
      setError('Vui lòng nhập tên vật tư');
      return;
    }
    if (!formData.unit.trim()) {
      setError('Vui lòng nhập đơn vị tính');
      return;
    }
    const alertVal = parseFloat(formData.min_stock_alert);
    if (isNaN(alertVal) || alertVal < 0) {
      setError('Ngưỡng cảnh báo tồn kho tối thiểu không được âm');
      return;
    }

    try {
      await onSubmit({
        material_name: formData.material_name.trim(),
        material_type: formData.material_type,
        unit: formData.unit.trim(),
        min_stock_alert: alertVal,
        is_active: formData.is_active,
      });
    } catch (err) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Có lỗi xảy ra khi lưu vật tư');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
          <h3 className="font-serif text-lg font-bold text-[#1b4332]">
            {material ? 'Chỉnh Sửa Vật Tư' : 'Thêm Vật Tư Mới'}
          </h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Tên Vật Tư <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Phân NPK 16-16-8"
              value={formData.material_name}
              onChange={(e) => setFormData({ ...formData, material_name: e.target.value })}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold text-stone-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Loại Vật Tư <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.material_type}
                onChange={(e) => setFormData({ ...formData, material_type: e.target.value as MaterialType })}
                className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700"
              >
                <option value="SEED">Hạt giống</option>
                <option value="FERTILIZER">Phân bón</option>
                <option value="PESTICIDE">Thuốc BVTV</option>
                <option value="EQUIPMENT">Thiết bị</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Đơn Vị Tính <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: kg, lít, bao"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold text-stone-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Ngưỡng Cảnh Báo Tồn Kho Tối Thiểu
            </label>
            <input
              type="number"
              placeholder="0"
              value={formData.min_stock_alert}
              onChange={(e) => setFormData({ ...formData, min_stock_alert: e.target.value })}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold text-stone-800"
            />
            <p className="text-[10px] text-stone-400 mt-1.5 font-medium">
              Hệ thống sẽ cảnh báo khi tồn kho xuống dưới hoặc bằng giá trị này.
            </p>
          </div>

          {material && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="is_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-stone-300 text-[#1b4332] focus:ring-[#1b4332]"
              />
              <label htmlFor="is_active" className="text-xs font-bold text-stone-600 cursor-pointer select-none">
                Vật tư đang hoạt động (Kích hoạt)
              </label>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-4 border-t border-[#e6ebe3]">
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
              className="flex items-center gap-1.5 bg-[#1b4332] hover:bg-[#143225] text-white px-4 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Lưu Vật Tư 💾
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
