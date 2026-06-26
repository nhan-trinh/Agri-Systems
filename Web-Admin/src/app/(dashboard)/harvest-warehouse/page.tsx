'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api/axios';
import { useAuthStore } from '@/store/auth';
import {
  Wheat,
  Package,
  ArrowLeftRight,
  Ship,
  CheckCircle2,
  AlertTriangle,
  Plus,
} from 'lucide-react';
import { HarvestStockTable } from '@/components/harvest-warehouse/HarvestStockTable';
import { ReceiveModal } from '@/components/harvest-warehouse/ReceiveModal';
import { ShipModal } from '@/components/harvest-warehouse/ShipModal';
import type { HarvestStockItem, ReceivePayload, ShipPayload } from '@/lib/harvest-warehouse';

interface Season {
  id: string;
  season_name: string;
  crop_variety: string;
  start_date: string;
  expected_end_date: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  farm_zone: { zone_name: string; farmer: { full_name: string } };
}

export default function HarvestWarehousePage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [stockItems, setStockItems] = useState<HarvestStockItem[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [todayCount, setTodayCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isShipOpen, setIsShipOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HarvestStockItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // RBAC guard — only warehouse-allowed roles may view this page.
  useEffect(() => {
    if (user && !['SUPER_ADMIN', 'HTX_MANAGER', 'WAREHOUSE_KEEPER'].includes(user.role)) {
      router.push('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (user) fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDashboardData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [stockRes, seasonsRes, todayRes] = await Promise.all([
        apiClient.get('/harvest-warehouse/stock'),
        apiClient.get('/seasons'),
        apiClient.get(
          `/harvest-warehouse/entries?from_date=${startOfTodayIso()}&limit=1`
        ),
      ]);
      if (stockRes.data?.success) setStockItems(stockRes.data.data);
      if (seasonsRes.data?.success) setSeasons(seasonsRes.data.data);
      if (todayRes.data?.success) setTodayCount(todayRes.data.meta?.total ?? todayRes.data.data?.length ?? 0);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể tải dữ liệu kho nông sản', 'error');
    } finally {
      setLoading(false);
    }
  };

  const refreshStock = async () => {
    try {
      const res = await apiClient.get('/harvest-warehouse/stock');
      if (res.data?.success) setStockItems(res.data.data);
      const todayRes = await apiClient.get(
        `/harvest-warehouse/entries?from_date=${startOfTodayIso()}&limit=1`
      );
      if (todayRes.data?.success) setTodayCount(todayRes.data.meta?.total ?? todayRes.data.data?.length ?? 0);
    } catch (err) {
      console.error('Lỗi khi làm mới tồn kho nông sản:', err);
    }
  };

  const handleReceiveSubmit = async (payload: ReceivePayload) => {
    try {
      setSubmitting(true);
      const res = await apiClient.post('/harvest-warehouse/receive', payload);
      if (res.data?.success) {
        showToast('Nhận nông sản vào kho thành công!', 'success');
        setIsReceiveOpen(false);
        refreshStock();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleShipSubmit = async (payload: ShipPayload) => {
    try {
      setSubmitting(true);
      const res = await apiClient.post('/harvest-warehouse/ship', payload);
      if (res.data?.success) {
        showToast('Xuất nông sản đi bán thành công!', 'success');
        setIsShipOpen(false);
        refreshStock();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const totalProduceTypes = stockItems.length;
  const totalOnHand = stockItems.reduce((sum, i) => sum + i.current_stock, 0);

  return (
    <div className="space-y-6 font-sans relative">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg transition-all ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] tracking-tight">Kho Nông Sản</h1>
          <p className="text-stone-500 text-sm mt-1">
            Theo dõi nhập – xuất – tồn nông sản thu hoạch, đối soát trước khi cấp QR truy xuất.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedItem(null);
              setIsReceiveOpen(true);
            }}
            className="flex items-center gap-2 bg-[#1b4332] hover:bg-[#143225] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-300 text-sm"
          >
            <Plus className="h-4 w-4" />
            Nhận Nông Sản
          </button>
          <button
            onClick={() => {
              setSelectedItem(null);
              setIsShipOpen(true);
            }}
            className="flex items-center gap-2 border border-[#1b4332] text-[#1b4332] hover:bg-emerald-50 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 text-sm"
          >
            Xuất Đi Bán
          </button>
        </div>
      </div>

      {/* Sub tabs */}
      <div className="flex border-b border-stone-200">
        <Link
          href="/harvest-warehouse"
          className="px-4 py-2.5 text-sm font-bold border-b-2 border-[#1b4332] text-[#1b4332] -mb-[2px]"
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
          className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all"
        >
          Đối chiếu
        </Link>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={Wheat}
          label="Loại nông sản"
          value={totalProduceTypes}
          sub="loại đang lưu trữ"
          tone="emerald"
        />
        <KpiCard
          icon={Package}
          label="Tổng tồn kho"
          value={totalOnHand.toLocaleString('vi-VN')}
          sub="kg trên tất cả loại"
          tone="emerald"
        />
        <KpiCard
          icon={ArrowLeftRight}
          label="GD hôm nay"
          value={todayCount}
          sub="phiếu nhận/xuất"
          tone="blue"
        />
        <KpiCard
          icon={Ship}
          label="Sẵn sàng xuất"
          value={stockItems.filter((i) => i.current_stock > 0).length}
          sub="loại có tồn để bán"
          tone="blue"
        />
      </div>

      {/* Stock table */}
      <div className="flex justify-between items-center px-1">
        <h3 className="font-serif text-lg font-bold text-[#1b4332] flex items-center gap-2">
          <Wheat className="h-5 w-5 text-[#1b4332]" />
          Bảng theo dõi tồn kho nông sản
        </h3>
      </div>

      <HarvestStockTable
        items={stockItems}
        loading={loading}
        onReceiveClick={(item) => {
          setSelectedItem(item);
          setIsReceiveOpen(true);
        }}
        onShipClick={(item) => {
          setSelectedItem(item);
          setIsShipOpen(true);
        }}
      />

      {/* Modals */}
      <ReceiveModal
        isOpen={isReceiveOpen}
        onClose={() => setIsReceiveOpen(false)}
        onSubmit={handleReceiveSubmit}
        seasons={seasons}
        stockItems={stockItems}
        preselectedItem={selectedItem}
        submitting={submitting}
      />
      <ShipModal
        isOpen={isShipOpen}
        onClose={() => setIsShipOpen(false)}
        onSubmit={handleShipSubmit}
        stockItems={stockItems}
        preselectedItem={selectedItem}
        submitting={submitting}
      />
    </div>
  );
}

function startOfTodayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sub: string;
  tone: 'emerald' | 'blue';
}) {
  const toneClasses =
    tone === 'emerald' ? 'bg-emerald-50 text-[#1b4332]' : 'bg-blue-50 text-blue-700';
  return (
    <div className="bg-white p-5 rounded-2xl border border-[#e6ebe3] shadow-sm hover:shadow-md transition-all duration-200">
      <div className="flex justify-between items-start">
        <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">{label}</span>
        <div className={`p-2 rounded-lg ${toneClasses}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">
        <h3 className="text-2xl font-bold text-stone-800">{value}</h3>
        <p className="text-stone-400 text-[11px] mt-1 font-semibold">{sub}</p>
      </div>
    </div>
  );
}
