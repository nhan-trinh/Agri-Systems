'use client';

import { useEffect, useState } from 'react';
import { X, Loader2, AlertTriangle, ScanLine, User } from 'lucide-react';
import { apiClient } from '@/lib/api/axios';
import {
  CROP_TYPE_OPTIONS,
  type CropType,
  type HarvestStockItem,
  type ReceivePayload,
} from '@/lib/harvest-warehouse';
import { QrScanner } from './QrScanner';

interface Season {
  id: string;
  season_name: string;
  crop_variety: string;
  start_date: string;
  expected_end_date: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  farm_zone: { zone_name: string; farmer: { full_name: string } };
}

interface QrLookupResponse {
  season_id: string;
  season_name?: string;
  crop_type?: CropType;
  farmer_id?: string;
  farmer_name?: string;
}

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ReceivePayload) => Promise<void>;
  seasons: Season[];
  /** Stock list lets us pre-fill crop_type/produce_name/unit from the clicked row. */
  stockItems: HarvestStockItem[];
  preselectedItem?: HarvestStockItem | null;
  submitting: boolean;
}

const INPUT_CLASS =
  'w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700';

export function ReceiveModal({
  isOpen,
  onClose,
  onSubmit,
  seasons,
  stockItems,
  preselectedItem,
  submitting,
}: ReceiveModalProps) {
  const [seasonId, setSeasonId] = useState('');
  const [cropType, setCropType] = useState<CropType>('RICE');
  const [produceName, setProduceName] = useState('');
  const [unit, setUnit] = useState('kg');
  const [quantity, setQuantity] = useState('');
  const [entryDate, setEntryDate] = useState('');
  const [qualityNotes, setQualityNotes] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [scanMessage, setScanMessage] = useState('');

  // Reset / pre-fill whenever the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    const today = new Date().toISOString().split('T')[0];
    setSeasonId('');
    setCropType(preselectedItem?.crop_type ?? 'RICE');
    setProduceName(preselectedItem?.produce_name ?? '');
    setUnit(preselectedItem?.unit ?? 'kg');
    setQuantity('');
    setEntryDate(today);
    setQualityNotes('');
    setNotes('');
    setError('');
    setScanMessage('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preselectedItem]);

  if (!isOpen) return null;

  const selectedSeason = seasons.find((s) => s.id === seasonId);
  const seasonClosed = selectedSeason?.status === 'COMPLETED';

  // UC-01 fast path: a scanned QR resolves to season/farmer context.
  const handleQrDecode = async (code: string) => {
    setScanMessage('Đang tra cứu mã QR...');
    try {
      const res = await apiClient.get(`/harvest-warehouse/qr-lookup/${encodeURIComponent(code)}`);
      if (res.data?.success) {
        const data = res.data.data as QrLookupResponse;
        setSeasonId(data.season_id);
        if (data.crop_type) setCropType(data.crop_type);
        setScanMessage(
          `Đã quét: ${data.season_name ?? data.season_id}${data.farmer_name ? ` · ${data.farmer_name}` : ''}`
        );
        setError('');
      } else {
        setScanMessage('');
        setError('Không tìm thấy thông tin cho mã QR này');
      }
    } catch {
      setScanMessage('');
      setError('Mã QR không hợp lệ hoặc không thuộc HTX của bạn');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!seasonId) {
      setError('Vui lòng chọn vụ mùa nguồn hoặc quét QR để tự động điền');
      return;
    }
    const qtyVal = parseFloat(quantity);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setError('Khối lượng nhận vào phải lớn hơn 0');
      return;
    }
    if (!produceName.trim()) {
      setError('Vui lòng nhập tên nông sản');
      return;
    }

    const payload: ReceivePayload = {
      season_id: seasonId,
      crop_type: cropType,
      produce_name: produceName.trim(),
      unit,
      quantity: qtyVal,
      entry_date: new Date(entryDate).toISOString(),
      quality_notes: qualityNotes.trim() || undefined,
      notes: notes.trim() || undefined,
    };

    try {
      await onSubmit(payload);
    } catch (err) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Có lỗi xảy ra khi nhận nông sản vào kho');
    }
  };

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
          <h3 className="font-serif text-lg font-bold text-[#1b4332]">Phiếu Nhận Nông Sản Vào Kho</h3>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* UC-01: QR scan fast path */}
          <div className="bg-[#f7faf5] rounded-2xl border border-[#e6ebe3] p-4 space-y-3">
            <div className="flex items-center gap-2 text-[#1b4332]">
              <ScanLine className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Quét QR để điền nhanh</span>
            </div>
            <QrScanner onDecode={handleQrDecode} onError={(m) => setScanMessage(m)} />
            {scanMessage && (
              <p className="text-[10px] text-emerald-700 font-bold text-center bg-emerald-50 py-1.5 px-2 rounded-lg">
                {scanMessage}
              </p>
            )}
            <p className="text-[10px] text-stone-400 text-center">
              Hoặc chọn vụ mùa thủ công bên dưới nếu không có QR (NFR-05).
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Season source (manual fallback / NFR-05) */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Vụ Mùa Nguồn <span className="text-red-500">*</span>
            </label>
            <select value={seasonId} onChange={(e) => setSeasonId(e.target.value)} className={INPUT_CLASS}>
              <option value="">-- Chọn vụ mùa --</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.season_name} ({s.crop_variety}) — {s.farm_zone.farmer.full_name}
                  {s.status !== 'ACTIVE' ? ` [${s.status}]` : ''}
                </option>
              ))}
            </select>
            {selectedSeason && (
              <p className="text-[10px] text-stone-400 font-semibold mt-1.5 flex items-center gap-1">
                <User className="h-3 w-3" />
                {selectedSeason.farm_zone.farmer.full_name} · {selectedSeason.farm_zone.zone_name}
              </p>
            )}
          </div>

          {/* UC-06: warn when receiving against a closed season (flag, don't block) */}
          {seasonClosed && (
            <div className="bg-amber-50 text-amber-800 text-xs px-4 py-2.5 rounded-xl border border-amber-200 font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" />
              Vụ mùa đã đóng (COMPLETED). Giao dịch vẫn được tạo nhưng sẽ được đánh dấu &quot;nhận sau khi đóng vụ&quot;.
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
                Tên Nông Sản <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Lúa ST25"
                value={produceName}
                onChange={(e) => setProduceName(e.target.value)}
                list="harvest-produce-options"
                className={INPUT_CLASS}
              />
              <datalist id="harvest-produce-options">
                {stockItems
                  .filter((i) => i.crop_type === cropType)
                  .map((i) => (
                    <option key={i.id} value={i.produce_name} />
                  ))}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
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
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Đơn Vị</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="kg"
                className={INPUT_CLASS}
              />
            </div>
            <div className="sm:col-span-1">
              <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                Ngày Nhận <span className="text-red-500">*</span>
              </label>
              <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className={INPUT_CLASS} />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Ghi Chú Chất Lượng
            </label>
            <input
              type="text"
              placeholder="VD: Độ ẩm 14%, hạt đầy"
              value={qualityNotes}
              onChange={(e) => setQualityNotes(e.target.value)}
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
              Xác nhận Nhận Kho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
