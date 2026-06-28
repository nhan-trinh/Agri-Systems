'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/axios';
import { useAuthStore } from '@/store/auth';
import { 
  Package, 
  AlertTriangle, 
  Clock, 
  ArrowLeftRight, 
  Plus, 
  CheckCircle2
} from 'lucide-react';
import { StockAlertBanner } from '@/components/warehouse/StockAlertBanner';
import { StockTable } from '@/components/warehouse/StockTable';
import { ImportModal, ImportPayload } from '@/components/warehouse/ImportModal';
import { ExportModal, ExportPayload } from '@/components/warehouse/ExportModal';
import { ReturnModal, ReturnPayload } from '@/components/warehouse/ReturnModal';

interface Material {
  id: string;
  material_name: string;
  material_type: 'SEED' | 'FERTILIZER' | 'PESTICIDE' | 'EQUIPMENT' | 'OTHER';
  unit: string;
  min_stock_alert: number;
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

export default function WarehouseDashboardPage() {
  const { user } = useAuthStore();
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [todayTxCount, setTodayTxCount] = useState(0);

  // Filter States
  const [activeFilter, setActiveFilter] = useState<'all' | 'lowStock' | 'nearExpiry'>('all');

  // Modals States
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchDashboardData();
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
      
      // 1. Fetch materials (which includes stock_item)
      const resMaterials = await apiClient.get('/warehouse/materials');
      if (resMaterials.data?.success) {
        setMaterials(resMaterials.data.data);
      }

      // 2. Fetch farmers for the export/return dropdowns
      const resFarmers = await apiClient.get('/farmers');
      if (resFarmers.data?.success) {
        setFarmers(resFarmers.data.data);
      }

      // 3. Fetch today's transaction count
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const resTx = await apiClient.get(`/warehouse/transactions?from_date=${startOfToday.toISOString()}`);
      if (resTx.data?.success) {
        // Today's total records length
        setTodayTxCount(resTx.data.data.length || 0);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể tải dữ liệu kho', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch only materials (optimistic update after transaction success)
  const refreshStock = async () => {
    try {
      const resMaterials = await apiClient.get('/warehouse/materials');
      if (resMaterials.data?.success) {
        setMaterials(resMaterials.data.data);
      }
      // Refresh today's transaction count
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const resTx = await apiClient.get(`/warehouse/transactions?from_date=${startOfToday.toISOString()}`);
      if (resTx.data?.success) {
        setTodayTxCount(resTx.data.data.length || 0);
      }
    } catch (err) {
      console.error('Lỗi khi làm mới tồn kho:', err);
    }
  };

  // Transaction submissions
  const handleImportSubmit = async (payload: ImportPayload) => {
    try {
      setSubmitting(true);
      const res = await apiClient.post('/warehouse/transactions/import', payload);
      if (res.data?.success) {
        showToast('Nhập kho vật tư thành công!', 'success');
        setIsImportOpen(false);
        refreshStock();
      }
    } catch (err: unknown) {
      throw err; // Form modal will capture error and display alert
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportSubmit = async (payload: ExportPayload) => {
    try {
      setSubmitting(true);
      const res = await apiClient.post('/warehouse/transactions/export', payload);
      if (res.data?.success) {
        showToast('Xuất kho cấp phát vật tư thành công!', 'success');
        setIsExportOpen(false);
        refreshStock();
      }
    } catch (err: unknown) {
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnSubmit = async (payload: ReturnPayload) => {
    try {
      setSubmitting(true);
      const res = await apiClient.post('/warehouse/transactions/return', payload);
      if (res.data?.success) {
        showToast('Nhận vật tư hoàn trả thành công!', 'success');
        setIsReturnOpen(false);
        refreshStock();
      }
    } catch (err: unknown) {
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  // Warning calculations
  const lowStockCount = materials.filter(m => {
    const stock = m.stock_item?.current_stock ?? 0;
    return m.is_active && stock <= m.min_stock_alert;
  }).length;

  const nearExpiryCount = materials.filter(m => {
    const expiryStr = m.stock_item?.expiry_date;
    if (!m.is_active || !expiryStr) return false;
    const expiry = new Date(expiryStr);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30; // expired or near-expired
  }).length;

  // Filtered materials for table display
  const filteredMaterials = materials.filter(m => {
    if (activeFilter === 'lowStock') {
      const stock = m.stock_item?.current_stock ?? 0;
      return stock <= m.min_stock_alert;
    }
    if (activeFilter === 'nearExpiry') {
      const expiryStr = m.stock_item?.expiry_date;
      if (!expiryStr) return false;
      const expiry = new Date(expiryStr);
      const now = new Date();
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 30;
    }
    return true; // all
  });

  return (
    <div className="space-y-6 font-sans relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg animate-bounce transition-all ${
          toast.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Section 1: Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#1b4332] tracking-tight">
            Quản lý Kho Vật Tư
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Theo dõi nhập xuất tồn kho, cấp phát vật tư nông nghiệp cho hộ nông dân hợp tác xã.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSelectedMaterial(null);
              setIsImportOpen(true);
            }}
            className="flex items-center gap-2 bg-[#1b4332] hover:bg-[#143225] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-300 text-sm"
          >
            <Plus className="h-4 w-4" />
            Nhập Kho
          </button>
          <button
            onClick={() => {
              setSelectedMaterial(null);
              setIsExportOpen(true);
            }}
            className="flex items-center gap-2 border border-[#1b4332] text-[#1b4332] hover:bg-emerald-50 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 text-sm"
          >
            Xuất Kho
          </button>
        </div>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex overflow-x-auto border-b border-stone-200">
        <Link href="/warehouse" className="px-4 py-2.5 text-sm font-bold border-b-2 border-[#1b4332] text-[#1b4332] -mb-[2px]">
          Tồn kho
        </Link>
        <Link href="/warehouse/materials" className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all">
          Danh mục vật tư
        </Link>
        <Link href="/warehouse/transactions" className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all">
          Lịch sử giao dịch
        </Link>
        <Link href="/warehouse/reconciliation" className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all">
          Đối chiếu
        </Link>
      </div>

      {/* Section 2: Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng vật tư */}
        <div 
          onClick={() => setActiveFilter('all')}
          className={`bg-white p-5 rounded-2xl border border-[#e6ebe3] shadow-sm hover:shadow-md hover:border-emerald-500 transition-all duration-200 cursor-pointer ${
            activeFilter === 'all' ? 'ring-2 ring-[#1b4332] border-transparent' : ''
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Tổng vật tư</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-[#1b4332]">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-stone-800">{materials.length}</h3>
            <p className="text-stone-400 text-[11px] mt-1 font-semibold">loại vật tư đang lưu trữ</p>
          </div>
        </div>

        {/* Card 2: Sắp hết hàng */}
        <div 
          onClick={() => {
            if (lowStockCount > 0) setActiveFilter('lowStock');
          }}
          className={`bg-white p-5 rounded-2xl border border-[#e6ebe3] shadow-sm hover:shadow-md hover:border-[#E65100] transition-all duration-200 cursor-pointer ${
            activeFilter === 'lowStock' ? 'ring-2 ring-[#E65100] border-transparent' : ''
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Sắp hết hàng</span>
            <div className={`p-2 rounded-lg ${lowStockCount > 0 ? 'bg-orange-50 text-[#E65100]' : 'bg-stone-50 text-stone-400'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-[#E65100]' : 'text-stone-800'}`}>
              {lowStockCount}
            </h3>
            <p className="text-stone-400 text-[11px] mt-1 font-semibold">dưới ngưỡng tối thiểu</p>
          </div>
        </div>

        {/* Card 3: Sắp hết hạn */}
        <div 
          onClick={() => {
            if (nearExpiryCount > 0) setActiveFilter('nearExpiry');
          }}
          className={`bg-white p-5 rounded-2xl border border-[#e6ebe3] shadow-sm hover:shadow-md hover:border-[#E65100] transition-all duration-200 cursor-pointer ${
            activeFilter === 'nearExpiry' ? 'ring-2 ring-[#E65100] border-transparent' : ''
          }`}
        >
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Sắp hết hạn</span>
            <div className={`p-2 rounded-lg ${nearExpiryCount > 0 ? 'bg-orange-50 text-[#E65100]' : 'bg-stone-50 text-stone-400'}`}>
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className={`text-2xl font-bold ${nearExpiryCount > 0 ? 'text-[#E65100]' : 'text-stone-800'}`}>
              {nearExpiryCount}
            </h3>
            <p className="text-stone-400 text-[11px] mt-1 font-semibold">trong vòng 30 ngày</p>
          </div>
        </div>

        {/* Card 4: GD hôm nay */}
        <div className="bg-white p-5 rounded-2xl border border-[#e6ebe3] shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">GD Hôm Nay</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
              <ArrowLeftRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-2xl font-bold text-stone-800">{todayTxCount}</h3>
            <p className="text-stone-400 text-[11px] mt-1 font-semibold">phiếu nhập xuất hoàn thành</p>
          </div>
        </div>
      </div>

      {/* Section 3: Alert Banner and Stock Table */}
      <div className="space-y-4">
        {/* Banner */}
        <StockAlertBanner
          lowStockCount={lowStockCount}
          nearExpiryCount={nearExpiryCount}
          onFilterLowStock={() => setActiveFilter('lowStock')}
          onFilterNearExpiry={() => setActiveFilter('nearExpiry')}
          onClearFilters={() => setActiveFilter('all')}
          activeFilter={activeFilter !== 'all' ? activeFilter : ''}
        />

        {/* Stock list header */}
        <div className="flex justify-between items-center px-1">
          <h3 className="font-serif text-lg font-bold text-[#1b4332] flex items-center gap-2">
            <Package className="h-5 w-5 text-[#1b4332]" />
            Bảng theo dõi tồn kho vật tư
          </h3>
          {activeFilter !== 'all' && (
            <span className="text-xs font-bold text-[#E65100] bg-orange-50 px-3 py-1 rounded-full border border-orange-100 flex items-center gap-1.5 animate-pulse">
              Đang lọc: {activeFilter === 'lowStock' ? 'Sắp hết hàng' : 'Sắp hết hạn / Hết hạn'}
            </span>
          )}
        </div>

        {/* Main Table */}
        <StockTable
          materials={filteredMaterials}
          onImportClick={(mat) => {
            setSelectedMaterial(mat);
            setIsImportOpen(true);
          }}
          onExportClick={(mat) => {
            setSelectedMaterial(mat);
            setIsExportOpen(true);
          }}
          onReturnClick={(mat) => {
            setSelectedMaterial(mat);
            setIsReturnOpen(true);
          }}
          loading={loading}
        />
      </div>

      {/* Modals */}
      <ImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        onSubmit={handleImportSubmit}
        materials={materials}
        preselectedMaterial={selectedMaterial}
        submitting={submitting}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        onSubmit={handleExportSubmit}
        materials={materials}
        farmers={farmers}
        preselectedMaterial={selectedMaterial}
        submitting={submitting}
      />

      <ReturnModal
        isOpen={isReturnOpen}
        onClose={() => setIsReturnOpen(false)}
        onSubmit={handleReturnSubmit}
        materials={materials}
        farmers={farmers}
        preselectedMaterial={selectedMaterial}
        submitting={submitting}
      />
    </div>
  );
}
