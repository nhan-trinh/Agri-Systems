'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, AlertTriangle } from 'lucide-react';
import {
  CROP_TYPE_OPTIONS,
  type CropType,
  type HarvestStockItem,
  type ShipPayload,
} from '@/lib/harvest-warehouse';

interface ShipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ShipPayload) => Promise<void>;
  stockItems: HarvestStockItem[];
  preselectedItem?: HarvestStockItem | null;
  submitting: boolean;
}

const INPUT_CLASS =
  'w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700';

export function ShipModal({ isOpen, onClose, onSubmit, stockItems, preselectedItem, submitting }: ShipModalProps) {
  const [cropType, setCropType] = useState<CropType>('RICE');
  const [produceName, setProduceName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [quantity, setQuantity] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [qtyWarning, setQtyWarning] = useState('');

  // Reset / pre-fill whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    const today = new Date().toISOString().split('T')[0];
    setCropType(preselectedItem?.crop_type ?? 'RICE');
    setProduceName(preselectedItem?.produce_name ?? '');
    setUnit(preselectedItem?.unit ?? 'kg');
    setQuantity('');
    setBuyerName('');
    setBuyerContact('');
    setUnitPrice('');
    setEntryDate(today);
    setNotes('');
    setError('');
    setQtyWarning('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preselectedItem]);

  // Produces of the selected crop that currently have on-hand stock.
  const availableProduces = stockItems.filter((i) => i.crop_type === cropType);
  const selectedItem = availableProduces.find((i) => i.produce_name === produceName);
  const currentStock = selectedItem?.current_stock ?? 0;

  // FR-05: realtime on-hand warning (parallel to Material Warehouse ExportModal).
  useEffect(() => {
    setQtyWarning('');
    if (!selectedItem) return;
    const qtyVal = parseFloat(quantity);
    if (!isNaN(qtyVal) && qtyVal > currentStock) {
      setQtyWarning(`Số lượng vượt quá tồn kho hiện tại (${currentStock.toLocaleString('vi-VN')} ${unit})`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produceName, quantity, selectedItem, currentStock, unit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!produceName.trim()) {
      setError('Vui lòng chọn nông sản xuất đi');
      return;
    }
    const qtyVal = parseFloat(quantity);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setError('Khối lượng xuất đi phải lớn hơn 0');
      return;
    }
    // FR-05 hard block — shipping non-existent produce is a data-integrity violation.
    if (selectedItem && qtyVal > currentStock) {
      setError('Tồn kho không đủ để đáp ứng yêu cầu xuất đi');
      return;
    }
    if (!buyerName.trim()) {
      setError('Vui lòng nhập tên người mua');
      return;
    }

    const priceVal = parseFloat(unitPrice);
    const payload: ShipPayload = {
      crop_type: cropType,
      produce_name: produceName.trim(),
      unit,
      quantity: qtyVal,
      buyer_name: buyerName.trim(),
      buyer_contact: buyerContact.trim() || undefined,
      unit_price: isNaN(priceVal) || priceVal <= 0 ? undefined : priceVal,
      entry_date: new Date(entryDate).toISOString(),
      notes: notes.trim() || undefined,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Có lỗi xảy ra khi xuất nông sản đi bán');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
          <h3 className="font-serif text-lg font-bold text-[#1b4332]">Phiếu Xuất Nông Sản Đi Bán</h3>
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Nhóm Cây Trồng <span className="text-red-500">*</span>
              </label>
              <select value={cropType} onChange={(e) => setCropType(e.target.value as CropType)} className={INPUT_CLASS}>
                {CROP_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Nông Sản Xuất <span className="text-red-500">*</span>
              </label>
              <select value={produceName} onChange={(e) => setProduceName(e.target.value)} className={INPUT_CLASS}>
                <option value="">-- Chọn nông sản --</option>
                {availableProduces.map((i) => (
                  <option key={i.id} value={i.produce_name}>
                    {i.produce_name} (tồn: {i.current_stock.toLocaleString('vi-VN')} {i.unit})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedItem && (
            <div className="flex justify-between items-center text-[10px] text-stone-400 font-bold -mt-2">
              <span>
                Tồn hiện tại:{' '}
                <strong className="text-emerald-700">
                  {currentStock.toLocaleString('vi-VN')} {unit}
                </strong>
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Khối Lượng <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  placeholder="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full py-2 pr-10 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-800"
                />
                <span className="absolute right-0 top-1/2 -translate-y-1/2 text-xs font-bold text-stone-400">{unit}</span>
              </div>
              {qtyWarning && <p className="text-[10px] text-red-600 mt-1 font-bold">{qtyWarning}</p>}
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Đơn Vị</label>
              <input type="text" value={unit} onChange={(e) => setUnit(e.target.value)} className={INPUT_CLASS} />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Ngày Xuất <span className="text-red-500">*</span>
              </label>
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={INPUT_CLASS} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Người Mua <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Công ty TNHH Nông sản"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Liên Hệ Người Mua
              </label>
              <input
                type="text"
                placeholder="SĐT / địa chỉ"
                value={buyerContact}
                onChange={(e) => setBuyerContact(e.target.value)}
                className={INPUT_CLASS}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Đơn Giá (đ/{unit}) <span className="text-stone-300">— tùy chọn</span>
            </label>
            <input
              type="number"
              step="1"
              min="0"
              placeholder="VD: 15000"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              className={INPUT_CLASS}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Ghi Chú</label>
            <textarea
              placeholder="Thông tin bổ sung..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold text-stone-800 resize-none"
            />
          </div>

          <div className="bg-amber-50 border border-amber-100 px-4 py-3 rounded-2xl">
            <p className="text-[10px] font-bold text-amber-800 leading-normal">
              ⚠️ Lưu ý: Phiếu đã tạo không thể sửa hoặc xóa để bảo toàn tính toàn vẹn dữ liệu đối soát (FR-10).
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
              disabled={submitting}
              className="flex items-center gap-1.5 bg-[#1b4332] hover:bg-[#143225] text-white px-4 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Xác nhận Xuất Đi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
