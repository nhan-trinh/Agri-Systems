import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import { MaterialType } from '@/lib/types';

interface Material {
  id: string;
  material_name: string;
  material_type: MaterialType;
  unit: string;
  is_active: boolean;
  stock_item?: {
    current_stock: number;
    expiry_date: string | null;
  } | null;
}

export interface ImportPayload {
  material_id: string;
  transaction_type: string;
  quantity: number;
  unit_price?: number;
  supplier: string;
  invoice_no: string;
  transaction_date: string;
  expiry_date?: string;
  notes?: string;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ImportPayload) => Promise<void>;
  materials: Material[];
  preselectedMaterial?: Material | null;
  submitting: boolean;
}

export function ImportModal({
  isOpen,
  onClose,
  onSubmit,
  materials,
  preselectedMaterial,
  submitting,
}: ImportModalProps) {
  const [formData, setFormData] = useState({
    material_id: '',
    quantity: '',
    unit_price: '',
    supplier: '',
    invoice_no: '',
    transaction_date: '',
    expiry_date: '',
    notes: '',
  });
  const [error, setError] = useState('');

  // Filter only active materials for import
  const activeMaterials = materials.filter(m => m.is_active);

  useEffect(() => {
    // Default transaction date to today (YYYY-MM-DD)
    const today = new Date().toISOString().split('T')[0];

    if (isOpen) {
      setFormData({
        material_id: preselectedMaterial?.id || '',
        quantity: '',
        unit_price: '',
        supplier: '',
        invoice_no: '',
        transaction_date: today,
        expiry_date: '',
        notes: '',
      });
      setError('');
    }
  }, [isOpen, preselectedMaterial]);

  if (!isOpen) return null;

  const selectedMaterialObj = materials.find(m => m.id === formData.material_id);
  const currentStock = selectedMaterialObj?.stock_item?.current_stock ?? 0;
  const unit = selectedMaterialObj?.unit || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.material_id) {
      setError('Vui lòng chọn vật tư nhập kho');
      return;
    }
    const qtyVal = parseFloat(formData.quantity);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setError('Số lượng nhập kho phải lớn hơn 0');
      return;
    }
    if (!formData.supplier.trim()) {
      setError('Vui lòng nhập tên nhà cung cấp');
      return;
    }
    if (!formData.invoice_no.trim()) {
      setError('Vui lòng nhập số hóa đơn');
      return;
    }
    if (!formData.transaction_date) {
      setError('Vui lòng chọn ngày nhập kho');
      return;
    }

    const priceVal = formData.unit_price ? parseFloat(formData.unit_price) : undefined;
    if (priceVal !== undefined && (isNaN(priceVal) || priceVal < 0)) {
      setError('Đơn giá không được nhỏ hơn 0');
      return;
    }

    try {
      const payload = {
        material_id: formData.material_id,
        transaction_type: 'IMPORT',
        quantity: qtyVal,
        unit_price: priceVal,
        supplier: formData.supplier.trim(),
        invoice_no: formData.invoice_no.trim(),
        transaction_date: new Date(formData.transaction_date).toISOString(),
        expiry_date: formData.expiry_date ? new Date(formData.expiry_date).toISOString() : undefined,
        notes: formData.notes.trim() || undefined,
      };
      await onSubmit(payload);
    } catch (err) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Có lỗi xảy ra khi tạo phiếu nhập kho');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
          <h3 className="font-serif text-lg font-bold text-[#1b4332]">Phiếu Nhập Kho</h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all"
          >
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
              Vật Tư Nhập <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.material_id}
              onChange={(e) => setFormData({ ...formData, material_id: e.target.value })}
              disabled={!!preselectedMaterial}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700 disabled:opacity-60"
            >
              <option value="">-- Chọn vật tư --</option>
              {activeMaterials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.material_name} ({m.unit})
                </option>
              ))}
            </select>
            {selectedMaterialObj && (
              <p className="text-[10px] text-stone-400 mt-1.5 font-bold">
                Tồn kho hiện tại: <span className="text-[#1b4332]">{currentStock.toLocaleString()} {unit}</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Số Lượng Nhập <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  className="w-full py-2 pr-10 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-800"
                />
                {unit && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                    {unit}
                  </span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Đơn Giá (VND, tùy chọn)
              </label>
              <input
                type="number"
                placeholder="0"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Nhà Cung Cấp <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Tên công ty / cá nhân cung cấp"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold text-stone-800"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Số Hóa Đơn <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: INV-2024-001"
                value={formData.invoice_no}
                onChange={(e) => setFormData({ ...formData, invoice_no: e.target.value })}
                className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold text-stone-800"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Ngày Nhập Kho <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Hạn Sử Dụng (Nếu có)
            </label>
            <input
              type="date"
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Ghi Chú
            </label>
            <textarea
              placeholder="Thông tin bổ sung..."
              rows={2}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold text-stone-800 resize-none"
            />
          </div>

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
              Xác nhận Nhập Kho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
