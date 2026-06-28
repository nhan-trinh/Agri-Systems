'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/axios';
import { Search, Calendar, Filter } from 'lucide-react';
import { HarvestEntryTable } from '@/components/harvest-warehouse/HarvestEntryTable';
import {
  CROP_TYPE_OPTIONS,
  ENTRY_TYPE_LABELS,
  type CropType,
  type HarvestEntryType,
  type HarvestStockEntry,
} from '@/lib/harvest-warehouse';

export default function HarvestTransactionsPage() {
  const [entries, setEntries] = useState<HarvestStockEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [entryType, setEntryType] = useState<'' | HarvestEntryType>('');
  const [cropType, setCropType] = useState<'' | CropType>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetchEntries({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchEntries = async (params: {
    entryType?: string;
    cropType?: string;
    fromDate?: string;
    toDate?: string;
  }) => {
    try {
      setLoading(true);
      const queryParts: string[] = ['limit=100'];
      if (params.entryType) queryParts.push(`entry_type=${params.entryType}`);
      if (params.cropType) queryParts.push(`crop_type=${params.cropType}`);
      if (params.fromDate) {
        const d = new Date(params.fromDate);
        d.setHours(0, 0, 0, 0);
        queryParts.push(`from_date=${d.toISOString()}`);
      }
      if (params.toDate) {
        const d = new Date(params.toDate);
        d.setHours(23, 59, 59, 999);
        queryParts.push(`to_date=${d.toISOString()}`);
      }

      const res = await apiClient.get(`/harvest-warehouse/entries?${queryParts.join('&')}`);
      if (res.data?.success) setEntries(res.data.data);
    } catch (err) {
      console.error('Không thể tải lịch sử giao dịch kho nông sản:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchEntries({ entryType, cropType, fromDate, toDate });
  };

  // Client-side text search over buyer/notes/produce (server doesn't expose a text search param).
  const filteredEntries = entries.filter((entry) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;
    return (
      (entry.buyer_name ?? '').toLowerCase().includes(term) ||
      (entry.notes ?? '').toLowerCase().includes(term) ||
      (entry.quality_notes ?? '').toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div>
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#1b4332] tracking-tight">Lịch sử Giao dịch</h1>
        <p className="text-stone-500 text-sm mt-1">
          Nhật ký nhận nông sản vào kho và xuất đi bán, theo vụ mùa / nhóm cây / thời gian.
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
          className="px-4 py-2.5 text-sm font-bold border-b-2 border-[#1b4332] text-[#1b4332] -mb-[2px]"
        >
          Lịch sử giao dịch
        </Link>
        <Link
          href="/harvest-warehouse/reconciliation"
          className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all"
        >
          Đối chiếu
        </Link>
      </div>

      {/* Filter bar */}
      <form
        onSubmit={handleApplyFilter}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded-2xl border border-[#e6ebe3] shadow-sm items-end"
      >
        <div className="relative">
          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Tìm kiếm</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-stone-400" />
            </span>
            <input
              type="text"
              placeholder="Người mua, ghi chú..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 font-semibold"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Loại GD</label>
          <select
            value={entryType}
            onChange={(e) => setEntryType(e.target.value as '' | HarvestEntryType)}
            className="w-full py-1.5 px-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-600"
          >
            <option value="">-- Tất cả --</option>
            {(Object.keys(ENTRY_TYPE_LABELS) as HarvestEntryType[]).map((t) => (
              <option key={t} value={t}>
                {ENTRY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">Nhóm cây</label>
          <select
            value={cropType}
            onChange={(e) => setCropType(e.target.value as '' | CropType)}
            className="w-full py-1.5 px-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-600"
          >
            <option value="">-- Tất cả --</option>
            {CROP_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Từ ngày
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full py-1.5 px-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-600"
          />
        </div>

        <div className="contents">
          <div>
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Đến ngày
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full py-1.5 px-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-600"
            />
          </div>
        </div>

        <button
          type="submit"
          className="lg:col-span-5 w-full bg-[#1b4332] hover:bg-[#143225] text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Filter className="h-3.5 w-3.5" />
          Lọc kết quả
        </button>
      </form>

      <HarvestEntryTable entries={filteredEntries} loading={loading} />
    </div>
  );
}
