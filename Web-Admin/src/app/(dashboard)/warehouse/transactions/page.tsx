'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/axios';
import { useAuthStore } from '@/store/auth';
import { Search, Calendar, Filter } from 'lucide-react';
import { TransactionTable } from '@/components/warehouse/TransactionTable';
import { TransactionType } from '@/lib/types';

interface Transaction {
  id: string;
  material_id: string;
  transaction_type: TransactionType;
  quantity: number;
  unit_price: number | null;
  supplier: string | null;
  invoice_no: string | null;
  recipient_farmer_id: string | null;
  purpose: string | null;
  transaction_date: string;
  expiry_date: string | null;
  notes: string | null;
  created_by: string;
  material: {
    material_name: string;
    unit: string;
  };
}

interface Farmer {
  id: string;
  farmer_code: string;
  full_name: string;
}

export default function TransactionsPage() {
  const { user } = useAuthStore();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [farmerMap, setFarmerMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  // Filters state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    fetchFarmers();
    fetchTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchFarmers = async () => {
    try {
      const res = await apiClient.get('/farmers');
      if (res.data?.success) {
        const mapping: Record<string, string> = {};
        res.data.data.forEach((f: Farmer) => {
          mapping[f.id] = f.full_name;
        });
        setFarmerMap(mapping);
      }
    } catch (err) {
      console.error('Không thể tải danh sách nông dân:', err);
    }
  };

  const fetchTransactions = async (params: { type?: string; fromDate?: string; toDate?: string } = {}) => {
    if (!user) return;
    try {
      setLoading(true);
      let query = '/warehouse/transactions';
      const queryParts: string[] = [];

      if (params.type) {
        queryParts.push(`transaction_type=${params.type}`);
      }
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

      if (queryParts.length > 0) {
        query += `?${queryParts.join('&')}`;
      }

      const res = await apiClient.get(query);
      if (res.data?.success) {
        setTransactions(res.data.data);
      }
    } catch (err) {
      console.error('Không thể tải lịch sử giao dịch:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions({
      type: typeFilter,
      fromDate,
      toDate,
    });
  };

  // Local client-side text filter on search query (matches material name or farmer name)
  const filteredTransactions = transactions.filter((tx) => {
    const term = search.toLowerCase().trim();
    if (!term) return true;

    const materialName = tx.material.material_name.toLowerCase();
    const farmerName = (farmerMap[tx.recipient_farmer_id || ''] || '').toLowerCase();
    const supplier = (tx.supplier || '').toLowerCase();

    return (
      materialName.includes(term) ||
      farmerName.includes(term) ||
      supplier.includes(term) ||
      tx.recipient_farmer_id?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 font-sans relative">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] tracking-tight">
            Lịch sử Giao dịch
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Xem nhật ký lịch sử nhập kho, xuất kho cấp phát vật tư và hoàn trả vật tư từ nông dân.
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
        <Link href="/warehouse/transactions" className="px-4 py-2.5 text-sm font-bold border-b-2 border-[#1b4332] text-[#1b4332] -mb-[2px]">
          Lịch sử giao dịch
        </Link>
        <Link href="/warehouse/reconciliation" className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all">
          Đối chiếu
        </Link>
      </div>

      {/* Filter Bar */}
      <form onSubmit={handleApplyFilter} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded-2xl border border-[#e6ebe3] shadow-sm items-end">
        <div className="relative">
          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
            Tìm Kiếm
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-stone-400" />
            </span>
            <input
              type="text"
              placeholder="Vật tư, nông dân, nhà CC..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 font-semibold"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
            Loại Giao Dịch
          </label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full py-1.5 px-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-600"
          >
            <option value="">-- Tất cả loại --</option>
            <option value="IMPORT">Nhập kho (IMPORT)</option>
            <option value="EXPORT">Xuất kho (EXPORT)</option>
            <option value="RETURN">Hoàn trả (RETURN)</option>
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
          <Filter className="h-3.5 w-3.5" />
          Lọc kết quả
        </button>
      </form>

      {/* Main Table */}
      <TransactionTable
        transactions={filteredTransactions}
        farmerMap={farmerMap}
        loading={loading}
      />
    </div>
  );
}
