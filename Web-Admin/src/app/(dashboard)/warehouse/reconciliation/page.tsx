'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/axios';
import { useAuthStore } from '@/store/auth';
import { AlertTriangle, Calendar, FileCheck2, UserCheck } from 'lucide-react';
import { ReconciliationTable } from '@/components/warehouse/ReconciliationTable';

interface Farmer {
  id: string;
  farmer_code: string;
  full_name: string;
}

interface ReconciliationItem {
  material_name: string;
  unit: string;
  allocated: number;
  used: number;
  discrepancy: number;
}

export default function ReconciliationPage() {
  const { user } = useAuthStore();

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [selectedFarmerId, setSelectedFarmerId] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [reconItems, setReconItems] = useState<ReconciliationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchFarmers();
  }, [user]);

  const fetchFarmers = async () => {
    try {
      const res = await apiClient.get('/farmers');
      if (res.data?.success) {
        setFarmers(res.data.data);
      }
    } catch (err) {
      console.error('Không thể tải danh sách nông dân:', err);
    }
  };

  const handleFetchReconciliation = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedFarmerId) {
      setError('Vui lòng chọn nông dân để thực hiện đối chiếu');
      return;
    }

    try {
      setLoading(true);
      setSearched(true);
      let query = `/warehouse/reconciliation?farmer_id=${selectedFarmerId}`;
      if (fromDate) {
        query += `&from_date=${new Date(fromDate).toISOString()}`;
      }
      if (toDate) {
        query += `&to_date=${new Date(toDate).toISOString()}`;
      }

      const res = await apiClient.get(query);
      if (res.data?.success) {
        setReconItems(res.data.data.reconciliation || []);
      }
    } catch (err) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      setError(errorResponse.response?.data?.message || 'Có lỗi xảy ra khi đối chiếu dữ liệu');
      setReconItems([]);
    } finally {
      setLoading(false);
    }
  };

  // Aggregated Summary values
  const totalMaterials = reconItems.length;
  const fullyLoggedCount = reconItems.filter(item => item.discrepancy === 0).length;
  const discrepancyCount = reconItems.filter(item => item.discrepancy > 0).length;

  return (
    <div className="space-y-6 font-sans relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] tracking-tight">
            Đối Chiếu Dữ Liệu Canh Tác
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Đối soát khối lượng vật tư nông nghiệp đã xuất kho cấp phát so với lượng khai báo thực dùng trong nhật ký canh tác.
          </p>
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex border-b border-stone-200">
        <Link href="/warehouse" className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all">
          Tồn kho
        </Link>
        <Link href="/warehouse/materials" className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all">
          Danh mục vật tư
        </Link>
        <Link href="/warehouse/transactions" className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all">
          Lịch sử giao dịch
        </Link>
        <Link href="/warehouse/reconciliation" className="px-4 py-2.5 text-sm font-bold border-b-2 border-[#1b4332] text-[#1b4332] -mb-[2px]">
          Đối chiếu
        </Link>
      </div>

      {/* Filter bar */}
      <form onSubmit={handleFetchReconciliation} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-[#e6ebe3] shadow-sm items-end">
        <div>
          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <UserCheck className="h-3 w-3" />
            Nông dân đối chiếu *
          </label>
          <select
            value={selectedFarmerId}
            onChange={(e) => setSelectedFarmerId(e.target.value)}
            className="w-full py-1.5 px-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-600"
          >
            <option value="">-- Chọn nông dân --</option>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.full_name} ({f.farmer_code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Từ Ngày
          </label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full py-1.5 px-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-600"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Đến Ngày
          </label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full py-1.5 px-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-600"
          />
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

      {/* Main Table */}
      <ReconciliationTable reconciliationItems={reconItems} loading={loading} />

      {/* Summary Box */}
      {searched && !loading && reconItems.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-[#e6ebe3] shadow-sm space-y-3">
          <h3 className="font-serif text-sm font-bold text-[#1b4332] flex items-center gap-2">
            <FileCheck2 className="h-4.5 w-4.5 text-[#1b4332]" />
            📊 Tóm tắt đối chiếu dữ liệu
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-medium text-stone-600 pt-2 border-t border-[#f0f3ee]">
            <div className="bg-[#fcfdfa] p-3 rounded-xl border border-[#f0f3ee]">
              Nông dân đã nhận: <span className="font-bold text-stone-900">{totalMaterials} loại vật tư</span>
            </div>
            <div className="bg-[#fcfdfa] p-3 rounded-xl border border-[#f0f3ee]">
              Đã ghi nhật ký đầy đủ: <span className="font-bold text-emerald-700">{fullyLoggedCount}/{totalMaterials} loại</span>
            </div>
            <div className="bg-[#fcfdfa] p-3 rounded-xl border border-[#f0f3ee]">
              Cần nhắc nhở ghi nhật ký: <span className="font-bold text-orange-600">{discrepancyCount} loại vật tư còn chênh lệch</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
