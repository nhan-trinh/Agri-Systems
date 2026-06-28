'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/axios';
import { useAuthStore } from '@/store/auth';
import { AlertTriangle, FileCheck2, Loader2, TrendingUp } from 'lucide-react';
import {
  CROP_TYPE_LABELS,
  type ReconciliationData,
} from '@/lib/harvest-warehouse';

interface Season {
  id: string;
  season_name: string;
  crop_variety: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  planned_yield_kg: number;
  actual_yield_kg: number | null;
  farm_zone: { farmer: { full_name: string } };
}

export default function HarvestReconciliationPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState('');
  const [recon, setRecon] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // HTX_ONLY route (reconciliation) — warehouse keepers are bounced.
  useEffect(() => {
    if (user && !['SUPER_ADMIN', 'HTX_MANAGER'].includes(user.role)) {
      router.push('/harvest-warehouse');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    fetchSeasons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchSeasons = async () => {
    try {
      const res = await apiClient.get('/seasons');
      if (res.data?.success) setSeasons(res.data.data);
    } catch (err) {
      console.error('Không thể tải danh sách vụ mùa:', err);
    }
  };

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setRecon(null);

    if (!selectedSeasonId) {
      setError('Vui lòng chọn vụ mùa để đối chiếu');
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient.get(`/harvest-warehouse/reconciliation/${selectedSeasonId}`);
      if (res.data?.success) setRecon(res.data.data);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Có lỗi xảy ra khi đối chiếu dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  const planned = recon?.planned_yield_kg;
  const received = recon?.received_total_kg ?? 0;
  const declared = recon?.declared_actual_yield_kg;
  const discrepancy = recon?.discrepancy_kg ?? 0;

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#1b4332] tracking-tight">Đối Chiếu Sản Lượng</h1>
        <p className="text-stone-500 text-sm mt-1">
          So sánh dự kiến, lượng thực nhận vào kho và sản lượng khai báo khi đóng vụ — phát hiện chênh lệch (UC-07).
        </p>
      </div>

      {/* Sub tabs */}
      <div className="flex overflow-x-auto border-b border-stone-200">
        <Link
          href="/harvest-warehouse"
          className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all"
        >
          Tồn kho
        </Link>
        <Link
          href="/harvest-warehouse/transactions"
          className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all"
        >
          Lịch sử giao dịch
        </Link>
        <Link
          href="/harvest-warehouse/reconciliation"
          className="px-4 py-2.5 text-sm font-bold border-b-2 border-[#1b4332] text-[#1b4332] -mb-[2px]"
        >
          Đối chiếu
        </Link>
      </div>

      {/* Season picker */}
      <form
        onSubmit={handleFetch}
        className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-[#e6ebe3] shadow-sm items-end"
      >
        <div className="sm:col-span-2">
          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
            Vụ mùa đối chiếu <span className="text-red-500">*</span>
          </label>
          <select
            value={selectedSeasonId}
            onChange={(e) => setSelectedSeasonId(e.target.value)}
            className="w-full py-1.5 px-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-600"
          >
            <option value="">-- Chọn vụ mùa --</option>
            {seasons.map((s) => (
              <option key={s.id} value={s.id}>
                {s.season_name} ({s.crop_variety}) — {s.farm_zone.farmer.full_name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full bg-[#1b4332] hover:bg-[#143225] text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <FileCheck2 className="h-4 w-4" />
          Xem đối chiếu
        </button>
      </form>

      {error && (
        <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm p-12 flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-[#1b4332]" />
          <p className="text-xs font-semibold text-stone-400">Đang đối chiếu dữ liệu...</p>
        </div>
      )}

      {/* Result */}
      {!loading && recon && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ReconCard label="Dự kiến (KH)" value={planned} tone="stone" />
            <ReconCard label="Thực nhận vào kho" value={received} tone="emerald" />
            <ReconCard label="Khai báo khi đóng vụ" value={declared} tone="blue" />
          </div>

          {/* Discrepancy highlight */}
          <div
            className={`p-5 rounded-2xl border flex items-center gap-4 ${
              discrepancy > 0
                ? 'bg-orange-50 border-orange-200'
                : 'bg-emerald-50 border-emerald-200'
            }`}
          >
            <div
              className={`p-3 rounded-xl ${discrepancy > 0 ? 'bg-orange-100 text-orange-700' : 'bg-emerald-100 text-emerald-700'}`}
            >
              {discrepancy > 0 ? <AlertTriangle className="h-6 w-6" /> : <TrendingUp className="h-6 w-6" />}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-stone-600 uppercase tracking-wider">Chênh lệch (Khai báo − Thực nhận)</p>
              <p className={`text-2xl font-bold ${discrepancy > 0 ? 'text-orange-700' : 'text-emerald-700'}`}>
                {discrepancy.toLocaleString('vi-VN')} kg
              </p>
              {discrepancy > 0 ? (
                <p className="text-[11px] text-orange-700 font-semibold mt-0.5">
                  Có chênh lệch — cần kiểm tra lô nhận thiếu hoặc điều chỉnh khai báo.
                </p>
              ) : (
                <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">Đối chiếu khớp — dữ liệu nhất quán.</p>
              )}
            </div>
          </div>

          {recon.crop_type && (
            <p className="text-[11px] text-stone-400 font-semibold">
              Nhóm cây trồng: {CROP_TYPE_LABELS[recon.crop_type] ?? recon.crop_type}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ReconCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | null | undefined;
  tone: 'stone' | 'emerald' | 'blue';
}) {
  const toneText =
    tone === 'emerald' ? 'text-emerald-700' : tone === 'blue' ? 'text-blue-700' : 'text-stone-700';
  return (
    <div className="bg-white p-5 rounded-2xl border border-[#e6ebe3] shadow-sm">
      <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-bold mt-2 ${toneText}`}>
        {value != null ? `${value.toLocaleString('vi-VN')} kg` : '—'}
      </p>
    </div>
  );
}
