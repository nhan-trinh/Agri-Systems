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

interface Farmer {
  id: string;
  farmer_code: string;
  full_name: string;
}

export interface ExportPayload {
  material_id: string;
  transaction_type: string;
  quantity: number;
  recipient_farmer_id: string;
  purpose: string;
  transaction_date: string;
  notes?: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ExportPayload) => Promise<void>;
  materials: Material[];
  farmers: Farmer[];
  preselectedMaterial?: Material | null;
  submitting: boolean;
}

export function ExportModal({
  isOpen,
  onClose,
  onSubmit,
  materials,
  farmers,
  preselectedMaterial,
  submitting,
}: ExportModalProps) {
  const [formData, setFormData] = useState({
    material_id: '',
    quantity: '',
    recipient_farmer_id: '',
    purpose: '',
    transaction_date: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const [qtyWarning, setQtyWarning] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  // Filter active materials for export
  const activeMaterials = materials.filter(m => m.is_active);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];

    if (isOpen) {
      setFormData({
        material_id: preselectedMaterial?.id || '',
        quantity: '',
        recipient_farmer_id: '',
        purpose: '',
        transaction_date: today,
        notes: '',
      });
      setError('');
      setQtyWarning('');
      setIsExpired(false);
    }
  }, [isOpen, preselectedMaterial]);

  const selectedMaterialObj = materials.find(m => m.id === formData.material_id);
  const currentStock = selectedMaterialObj?.stock_item?.current_stock ?? 0;
  const unit = selectedMaterialObj?.unit || '';
  const expiryDateStr = selectedMaterialObj?.stock_item?.expiry_date;

  // Perform realtime validations when material or quantity changes
  useEffect(() => {
    setQtyWarning('');
    setIsExpired(false);

    if (selectedMaterialObj) {
      // Check expiration
      if (expiryDateStr) {
        const expiry = new Date(expiryDateStr);
        const now = new Date();
        if (expiry < now) {
          setIsExpired(true);
        }
      }

      // Check stock limit
      const qtyVal = parseFloat(formData.quantity);
      if (!isNaN(qtyVal) && qtyVal > currentStock) {
        setQtyWarning(`Số lượng vượt quá tồn kho hiện tại (${currentStock.toLocaleString()} ${unit})`);
      }
    }
  }, [formData.material_id, formData.quantity, selectedMaterialObj, currentStock, unit, expiryDateStr]);

  if (!isOpen) return null;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'Không có hạn';
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.material_id) {
      setError('Vui lòng chọn vật tư xuất kho');
      return;
    }
    if (isExpired) {
      setError('Vật tư đã hết hạn sử dụng, không thể thực hiện xuất kho');
      return;
    }
    const qtyVal = parseFloat(formData.quantity);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setError('Số lượng xuất kho phải lớn hơn 0');
      return;
    }
    if (qtyVal > currentStock) {
      setError('Tồn kho không đủ để đáp ứng yêu cầu xuất kho');
      return;
    }
    if (!formData.recipient_farmer_id) {
      setError('Vui lòng chọn hộ nông dân nhận cấp phát');
      return;
    }
    if (!formData.purpose.trim()) {
      setError('Vui lòng nhập mục đích sử dụng');
      return;
    }
    if (!formData.transaction_date) {
      setError('Vui lòng chọn ngày xuất kho');
      return;
    }

    try {
      const payload = {
        material_id: formData.material_id,
        transaction_type: 'EXPORT',
        quantity: qtyVal,
        recipient_farmer_id: formData.recipient_farmer_id,
        purpose: formData.purpose.trim(),
        transaction_date: new Date(formData.transaction_date).toISOString(),
        notes: formData.notes.trim() || undefined,
      };
      await onSubmit(payload);
    } catch (err) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Có lỗi xảy ra khi xuất kho vật tư');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
          <h3 className="font-serif text-lg font-bold text-[#1b4332]">Phiếu Xuất Kho — Cấp Phát Nông Dân</h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {isExpired && (
            <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-bold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-red-600" />
              <span>Vật tư đã hết hạn ngày {formatDate(expiryDateStr)}, không thể xuất kho</span>
            </div>
          )}

          {error && !isExpired && (
            <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Vật Tư Xuất <span className="text-red-500">*</span>
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
              <div className="flex justify-between items-center mt-2 text-[10px] text-stone-400 font-bold">
                <span>
                  Tồn kho: <strong className="text-emerald-700">{currentStock.toLocaleString()} {unit}</strong>
                </span>
                <span>
                  Hạn sử dụng: <strong className={isExpired ? 'text-red-600' : 'text-stone-700'}>{formatDate(expiryDateStr)}</strong>
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Số Lượng Xuất <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  disabled={isExpired}
                  className="w-full py-2 pr-10 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-800 disabled:opacity-50"
                />
                {unit && (
                  <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">
                    {unit}
                  </span>
                )}
              </div>
              {qtyWarning && (
                <p className="text-[10px] text-red-600 mt-1 font-bold">{qtyWarning}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Nông Dân Nhận <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.recipient_farmer_id}
                onChange={(e) => setFormData({ ...formData, recipient_farmer_id: e.target.value })}
                disabled={isExpired}
                className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700 disabled:opacity-50"
              >
                <option value="">-- Chọn nông dân nhận --</option>
                {farmers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.full_name} ({f.farmer_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Mục Đích Sử Dụng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Bón phân vụ Đông Xuân"
                value={formData.purpose}
                onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                disabled={isExpired}
                className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold text-stone-800 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Ngày Xuất Kho <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
                disabled={isExpired}
                className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700 disabled:opacity-50"
              />
            </div>
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
              disabled={isExpired}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold text-stone-800 resize-none disabled:opacity-50"
            />
          </div>

          <div className="bg-amber-50 border border-amber-100 px-4 py-3 rounded-2xl">
            <p className="text-[10px] font-bold text-amber-800 leading-normal">
              ⚠️ Lưu ý: Phiếu đã tạo không thể sửa hoặc xóa để bảo toàn tính toàn vẹn dữ liệu đối soát. Nếu có nhầm lẫn, vui lòng lập phiếu nhập bù hoặc hoàn trả sau đó.
            </p>
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
              disabled={submitting || isExpired}
              className="flex items-center gap-1.5 bg-[#1b4332] hover:bg-[#143225] text-white px-4 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Xác nhận Xuất Kho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
