'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api/axios';
import { useAuthStore } from '@/store/auth';
import { Plus, Search, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { MaterialTable } from '@/components/warehouse/MaterialTable';
import { MaterialFormModal } from '@/components/warehouse/MaterialFormModal';
import { MaterialType } from '@/lib/types';

interface Material {
  id: string;
  material_name: string;
  material_type: MaterialType;
  unit: string;
  min_stock_alert: number;
  is_active: boolean;
  stock_item?: {
    current_stock: number;
    expiry_date: string | null;
  } | null;
}

export default function MaterialsPage() {
  const { user } = useAuthStore();
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Modals States
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchMaterials = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await apiClient.get('/warehouse/materials');
      if (res.data?.success) {
        setMaterials(res.data.data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể tải danh mục vật tư', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (data: Omit<Material, 'id' | 'stock_item'> & { is_active: boolean }) => {
    try {
      setSubmitting(true);
      if (selectedMaterial) {
        // Edit mode
        const res = await apiClient.put(`/warehouse/materials/${selectedMaterial.id}`, data);
        if (res.data?.success) {
          showToast('Cập nhật thông tin vật tư thành công!', 'success');
          setIsFormOpen(false);
          fetchMaterials();
        }
      } else {
        // Create mode
        const res = await apiClient.post('/warehouse/materials', data);
        if (res.data?.success) {
          showToast('Thêm vật tư mới thành công!', 'success');
          setIsFormOpen(false);
          fetchMaterials();
        }
      }
    } catch (err: unknown) {
      throw err; // Captured by form modal
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    const target = materials.find(m => m.id === id);
    if (!target) return;

    const confirmMessage = `Bạn có chắc chắn muốn xóa vật tư "${target.material_name}"?\nHành động này không thể hoàn tác và chỉ có thể thực hiện nếu vật tư chưa có dữ liệu giao dịch liên quan.`;
    if (!confirm(confirmMessage)) return;

    try {
      setLoading(true);
      await apiClient.delete(`/warehouse/materials/${id}`);
      // Backend returns 204 No Content for successful delete or response structure with success
      showToast('Đã xóa vật tư thành công.', 'success');
      fetchMaterials();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể xóa vật tư (vật tư có thể đã phát sinh giao dịch)', 'error');
      fetchMaterials();
    } finally {
      setLoading(false);
    }
  };

  // Filter logic on the client side for search & status, and server/client type
  const filteredMaterials = materials.filter((m) => {
    const matchesSearch = m.material_name.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === '' || m.material_type === typeFilter;
    const matchesStatus =
      statusFilter === '' ||
      (statusFilter === 'active' && m.is_active) ||
      (statusFilter === 'inactive' && !m.is_active);

    return matchesSearch && matchesType && matchesStatus;
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#1b4332] tracking-tight">
            Danh mục Vật tư
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Đăng ký, cập nhật và quản lý thông tin các loại giống lúa, phân bón, thuốc bảo vệ thực vật.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedMaterial(null);
            setIsFormOpen(true);
          }}
          className="flex items-center gap-2 bg-[#1b4332] hover:bg-[#143225] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-300 text-sm"
        >
          <Plus className="h-4 w-4" />
          Thêm Vật Tư Mới
        </button>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex overflow-x-auto border-b border-stone-200">
        <Link href="/warehouse" className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all">
          Tồn kho
        </Link>
        <Link href="/warehouse/materials" className="px-4 py-2.5 text-sm font-bold border-b-2 border-[#1b4332] text-[#1b4332] -mb-[2px]">
          Danh mục vật tư
        </Link>
        <Link href="/warehouse/transactions" className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all">
          Lịch sử giao dịch
        </Link>
        <Link href="/warehouse/reconciliation" className="px-4 py-2.5 text-sm font-semibold border-b-2 border-transparent text-stone-500 hover:text-stone-800 -mb-[2px] transition-all">
          Đối chiếu
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-[#e6ebe3] shadow-sm">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-stone-400" />
          </span>
          <input
            type="text"
            placeholder="Tìm theo tên vật tư..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 font-semibold"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="py-2 px-3 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-600"
        >
          <option value="">-- Tất cả loại --</option>
          <option value="SEED">Hạt giống</option>
          <option value="FERTILIZER">Phân bón</option>
          <option value="PESTICIDE">Thuốc BVTV</option>
          <option value="EQUIPMENT">Thiết bị</option>
          <option value="OTHER">Khác</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="py-2 px-3 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-600"
        >
          <option value="">-- Trạng thái --</option>
          <option value="active">Hoạt động</option>
          <option value="inactive">Vô hiệu hóa</option>
        </select>
      </div>

      {/* Main Table */}
      <MaterialTable
        materials={filteredMaterials}
        onEdit={(mat) => {
          setSelectedMaterial(mat);
          setIsFormOpen(true);
        }}
        onDelete={handleDeleteMaterial}
        loading={loading}
      />

      {/* Forms */}
      <MaterialFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        material={selectedMaterial}
        submitting={submitting}
      />
    </div>
  );
}
