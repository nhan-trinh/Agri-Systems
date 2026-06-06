'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import { 
  Leaf, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Calendar, 
  FileText, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface EmissionFactor {
  id: string;
  material_type: string;
  factor_value: number;
  unit: string;
  description: string;
  source: string;
  effective_from: string;
  is_active: boolean;
  created_at: string;
}

export default function CarbonFactorsPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [factors, setFactors] = useState<EmissionFactor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedFactor, setSelectedFactor] = useState<EmissionFactor | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    material_type: '',
    factor_value: '',
    unit: '',
    description: '',
    source: '',
    effective_from: '',
    is_active: true,
  });

  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      router.push('/');
      return;
    }
    fetchFactors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchFactors = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/carbon/emission-factors');
      if (res.data?.success) {
        setFactors(res.data.data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể tải hệ số phát thải', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const validateForm = () => {
    if (!formData.material_type.trim()) {
      setFormError('Loại vật tư không được để trống');
      return false;
    }
    if (formData.factor_value === '' || isNaN(Number(formData.factor_value))) {
      setFormError('Hệ số phát thải phải là một số hợp lệ');
      return false;
    }
    if (!formData.unit.trim()) {
      setFormError('Đơn vị tính không được để trống');
      return false;
    }
    if (!formData.description.trim()) {
      setFormError('Mô tả không được để trống');
      return false;
    }
    if (!formData.source.trim()) {
      setFormError('Nguồn tài liệu không được để trống');
      return false;
    }
    if (!formData.effective_from) {
      setFormError('Ngày có hiệu lực không được để trống');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setFormSubmitting(true);
      const res = await apiClient.post('/carbon/emission-factors', {
        ...formData,
        factor_value: Number(formData.factor_value),
      });
      if (res.data?.success) {
        showToast('Thêm hệ số phát thải thành công!', 'success');
        setIsCreateOpen(false);
        resetForm();
        fetchFactors();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Có lỗi xảy ra khi thêm hệ số');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFactor || !validateForm()) return;

    try {
      setFormSubmitting(true);
      const res = await apiClient.put(`/carbon/emission-factors/${selectedFactor.id}`, {
        ...formData,
        factor_value: Number(formData.factor_value),
      });
      if (res.data?.success) {
        showToast('Cập nhật thông tin thành công!', 'success');
        setIsEditOpen(false);
        resetForm();
        fetchFactors();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa hệ số phát thải này?')) return;
    try {
      const res = await apiClient.delete(`/carbon/emission-factors/${id}`);
      if (res.data?.success) {
        showToast('Xóa hệ số phát thải thành công', 'success');
        fetchFactors();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể xóa hệ số phát thải', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      material_type: '',
      factor_value: '',
      unit: '',
      description: '',
      source: '',
      effective_from: '',
      is_active: true,
    });
    setFormError('');
  };

  const formatDateForInput = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const openEditModal = (factor: EmissionFactor) => {
    setSelectedFactor(factor);
    setFormData({
      material_type: factor.material_type,
      factor_value: String(factor.factor_value),
      unit: factor.unit,
      description: factor.description,
      source: factor.source,
      effective_from: formatDateForInput(factor.effective_from),
      is_active: factor.is_active,
    });
    setIsEditOpen(true);
  };

  const filteredFactors = factors.filter(
    (factor) =>
      factor.material_type.toLowerCase().includes(search.toLowerCase()) ||
      factor.description.toLowerCase().includes(search.toLowerCase()) ||
      factor.source.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans relative">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg animate-bounce transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-red-600" />
          )}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] tracking-tight">
            Cấu hình Hệ số phát thải Carbon
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Quản lý và cập nhật hệ số phát thải của các loại vật tư đầu vào (phân đạm, thuốc BVTV, v.v.).
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 bg-[#1b4332] hover:bg-[#143225] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-300 hover:scale-102 text-sm"
        >
          <Plus className="h-4 w-4" />
          Thêm Hệ Số Phát Thải
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex bg-white p-4 rounded-2xl border border-[#e6ebe3] shadow-sm">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-stone-400" />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo loại vật tư, mô tả, nguồn tài liệu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400"
          />
        </div>
      </div>

      {/* Main Factors Table */}
      <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#1b4332]" />
            <p className="text-sm font-semibold text-stone-500">Đang tải danh sách hệ số phát thải...</p>
          </div>
        ) : filteredFactors.length === 0 ? (
          <div className="text-center py-16">
            <Leaf className="h-12 w-12 mx-auto text-stone-300 mb-3" />
            <p className="text-stone-500 font-medium">Không tìm thấy hệ số phát thải nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f0f5ee] border-b border-[#e6ebe3] text-stone-600 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6">Loại vật tư</th>
                  <th className="p-4">Hệ số phát thải</th>
                  <th className="p-4">Đơn vị</th>
                  <th className="p-4">Mô tả</th>
                  <th className="p-4">Nguồn dữ liệu</th>
                  <th className="p-4">Ngày áp dụng</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f3ee] text-sm text-stone-700">
                {filteredFactors.map((factor) => (
                  <tr 
                    key={factor.id}
                    className="hover:bg-[#f5f8f4] transition-all duration-200"
                  >
                    <td className="p-4 pl-6 font-bold text-stone-900">
                      {factor.material_type}
                    </td>
                    <td className="p-4 font-mono font-bold text-[#1b4332]">
                      {factor.factor_value}
                    </td>
                    <td className="p-4 text-stone-600">
                      {factor.unit}
                    </td>
                    <td className="p-4 text-stone-500 max-w-xs truncate">
                      {factor.description}
                    </td>
                    <td className="p-4 text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-stone-400" />
                        <span className="truncate max-w-[150px]">{factor.source}</span>
                      </div>
                    </td>
                    <td className="p-4 text-stone-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-4 w-4 text-stone-400" />
                        <span>{new Date(factor.effective_from).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        factor.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                      }`}>
                        {factor.is_active ? 'Hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(factor)}
                          className="p-1.5 text-[#1b4332] hover:bg-emerald-50 rounded-lg transition-all"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(factor.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Xóa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal - Create/Edit Carbon Emission Factor */}
      {(isCreateOpen || isEditOpen) && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
              <h3 className="font-serif text-lg font-bold text-[#1b4332]">
                {isCreateOpen ? 'Thêm Hệ Số Phát Thải Mới' : 'Cập Nhật Hệ Số Phát Thải'}
              </h3>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditOpen(false);
                  resetForm();
                }}
                className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={isCreateOpen ? handleCreateSubmit : handleEditSubmit} className="p-6 space-y-6">
              {formError && (
                <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Loại Vật Tư <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Phân Đạm"
                    value={formData.material_type}
                    onChange={(e) => setFormData({ ...formData, material_type: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Hệ Số Phát Thải <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 2.14"
                    value={formData.factor_value}
                    onChange={(e) => setFormData({ ...formData, factor_value: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Đơn Vị Tính <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: kg CO2e/kg"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Ngày Có Hiệu Lực <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formData.effective_from}
                    onChange={(e) => setFormData({ ...formData, effective_from: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Mô Tả Hệ Số <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Hệ số phát thải theo hướng dẫn quốc gia cho phân đạm Urê"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Nguồn Dữ Liệu <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: IPCC 2019 / Bộ TN&MT"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                />
              </div>

              {isEditOpen && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded text-[#1b4332] focus:ring-[#1b4332]"
                  />
                  <label htmlFor="is_active" className="text-sm font-semibold text-stone-600">
                    Trạng thái hoạt động
                  </label>
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4 border-t border-[#e6ebe3]">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateOpen(false);
                    setIsEditOpen(false);
                    resetForm();
                  }}
                  className="px-4 py-2 border border-stone-200 rounded-xl hover:bg-stone-50 text-xs font-semibold text-stone-500 transition-all"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="flex items-center gap-2 bg-[#1b4332] hover:bg-[#143225] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all text-xs disabled:opacity-50"
                >
                  {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {isCreateOpen ? 'Xác Nhận Thêm' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
