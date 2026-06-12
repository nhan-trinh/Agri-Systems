import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { apiClient } from '@/lib/api/axios';

interface Season {
  id: string;
  season_name: string;
  crop_variety: string;
  actual_yield_kg: number | null;
  status: string;
  batch: unknown | null;
  farm_zone: {
    zone_name: string;
    farm_zone_code: string;
  };
}

interface CreateBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  seasons: Season[];
}

export function CreateBatchModal({ isOpen, onClose, onSuccess, seasons }: CreateBatchModalProps) {
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [batchName, setBatchName] = useState('');
  const [totalWeight, setTotalWeight] = useState('');
  const [quantityQr, setQuantityQr] = useState('100');
  const [packagingUnit, setPackagingUnit] = useState('Bao 50kg');
  const [description, setDescription] = useState('');

  const [maxWeight, setMaxWeight] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Filter completed seasons that do not have a batch yet
  const eligibleSeasons = seasons.filter(s => s.status === 'COMPLETED' && !s.batch);

  useEffect(() => {
    if (selectedSeasonId) {
      const season = seasons.find(s => s.id === selectedSeasonId);
      if (season) {
        const yieldVal = season.actual_yield_kg || 0;
        setMaxWeight(yieldVal);
        setBatchName(`Lô hàng - ${season.season_name}`);
        setTotalWeight(yieldVal.toString());
      }
    } else {
      setMaxWeight(null);
      setBatchName('');
      setTotalWeight('');
    }
  }, [selectedSeasonId, seasons]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedSeasonId || !batchName.trim() || !totalWeight || !quantityQr || !packagingUnit.trim()) {
      setError('Vui lòng nhập đầy đủ các trường bắt buộc');
      return;
    }

    const weightNum = parseFloat(totalWeight);
    const qtyNum = parseInt(quantityQr, 10);

    if (isNaN(weightNum) || weightNum <= 0) {
      setError('Khối lượng lô hàng phải là số dương');
      return;
    }

    if (maxWeight !== null && weightNum > maxWeight) {
      setError(`Khối lượng vượt quá sản lượng thu hoạch thực tế (${maxWeight.toLocaleString()} kg) của vụ mùa`);
      return;
    }

    if (isNaN(qtyNum) || qtyNum < 1 || qtyNum > 10000) {
      setError('Số lượng mã QR phải từ 1 đến 10,000');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.post('/qr/batches', {
        season_id: selectedSeasonId,
        batch_name: batchName,
        total_weight_kg: weightNum,
        quantity_qr: qtyNum,
        packaging_unit: packagingUnit,
        product_description: description || undefined,
      });

      if (res.data?.success) {
        onSuccess();
        onClose();
        // Reset form
        setSelectedSeasonId('');
        setBatchName('');
        setTotalWeight('');
        setQuantityQr('100');
        setPackagingUnit('Bao 50kg');
        setDescription('');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Không thể tạo lô hàng mới. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl border border-[#e6ebe3] shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#e6ebe3] flex justify-between items-center bg-[#fbfcf9]">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#1b4332]">Khai báo Lô Hàng mới</h3>
            <p className="text-stone-500 text-xs mt-0.5">Tạo lô đóng gói và đề xuất dải tem QR CheckVN</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-600 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-start gap-2 font-medium">
              <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Season select */}
          <div className="space-y-1">
            <label className="text-stone-500 font-semibold text-xs">Vụ mùa đã thu hoạch *</label>
            <select
              value={selectedSeasonId}
              onChange={(e) => setSelectedSeasonId(e.target.value)}
              className="w-full px-3 py-2 bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-700"
              required
            >
              <option value="">-- Chọn vụ mùa đã thu hoạch --</option>
              {eligibleSeasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.season_name} ({s.farm_zone?.zone_name} - {s.crop_variety})
                </option>
              ))}
            </select>
            {eligibleSeasons.length === 0 && (
              <p className="text-[10px] text-amber-600 font-medium mt-1">Không có vụ mùa nào trống để đóng lô hàng.</p>
            )}
          </div>

          {/* Batch Name */}
          <div className="space-y-1">
            <label className="text-stone-500 font-semibold text-xs">Tên lô hàng *</label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="Nhập tên lô hàng"
              className="w-full px-3 py-2 bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-700"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Total Weight */}
            <div className="space-y-1">
              <label className="text-stone-500 font-semibold text-xs">Tổng khối lượng (kg) *</label>
              <input
                type="number"
                step="any"
                value={totalWeight}
                onChange={(e) => setTotalWeight(e.target.value)}
                placeholder="Khối lượng lô hàng"
                className="w-full px-3 py-2 bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-700 font-mono"
                required
              />
              {maxWeight !== null && (
                <p className="text-[10px] text-stone-400 font-semibold mt-1">
                  Tối đa: <span className="text-[#1b4332] font-bold">{maxWeight.toLocaleString()} kg</span> (Sản lượng thu hoạch)
                </p>
              )}
            </div>

            {/* Packaging Unit */}
            <div className="space-y-1">
              <label className="text-stone-500 font-semibold text-xs">Đơn vị đóng gói *</label>
              <input
                type="text"
                value={packagingUnit}
                onChange={(e) => setPackagingUnit(e.target.value)}
                placeholder="VD: Bao 50kg, Hộp 1kg..."
                className="w-full px-3 py-2 bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-700"
                required
              />
            </div>
          </div>

          {/* Quantity QR */}
          <div className="space-y-1">
            <label className="text-stone-500 font-semibold text-xs">Số lượng mã QR CheckVN yêu cầu *</label>
            <input
              type="number"
              value={quantityQr}
              onChange={(e) => setQuantityQr(e.target.value)}
              min="1"
              max="10000"
              className="w-full px-3 py-2 bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-700 font-mono"
              required
            />
            <p className="text-[9px] text-stone-400 font-medium">Số lượng từ 1 đến 10,000 tem/mã QR.</p>
          </div>

          {/* Product Description */}
          <div className="space-y-1">
            <label className="text-stone-500 font-semibold text-xs">Mô tả sản phẩm (Tùy chọn)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả thông tin chi tiết về lô nông sản, tiêu chuẩn..."
              rows={2}
              className="w-full px-3 py-2 bg-[#fbfcf9] border border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs rounded-xl font-medium"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex gap-3 pt-4 border-t border-[#e6ebe3]">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-stone-200 text-stone-600 rounded-xl font-bold hover:bg-stone-50 text-xs transition-all"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-[#1b4332] hover:bg-[#143225] text-white rounded-xl font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang xử lý...
                </>
              ) : (
                'Tạo Lô Hàng'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
