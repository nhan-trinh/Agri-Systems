'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import { 
  Building2, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Phone, 
  MapPin, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle 
} from 'lucide-react';

interface Cooperative {
  id: string;
  htx_code: string;
  name: string;
  province: string;
  district: string;
  address: string;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export default function CooperativesPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [coops, setCoops] = useState<Cooperative[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedCoop, setSelectedCoop] = useState<Cooperative | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    htx_code: '',
    name: '',
    province: '',
    district: '',
    address: '',
    phone: '',
  });

  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN') {
      router.push('/');
      return;
    }
    fetchCooperatives();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchCooperatives = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/cooperatives');
      if (res.data?.success) {
        setCoops(res.data.data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể tải danh sách hợp tác xã', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const validateForm = () => {
    if (!formData.htx_code.trim() || formData.htx_code.length < 2) {
      setFormError('Mã HTX phải chứa tối thiểu 2 ký tự');
      return false;
    }
    if (!formData.name.trim() || formData.name.length < 3) {
      setFormError('Tên HTX phải chứa tối thiểu 3 ký tự');
      return false;
    }
    if (!formData.province.trim()) {
      setFormError('Tỉnh/Thành phố không được để trống');
      return false;
    }
    if (!formData.district.trim()) {
      setFormError('Quận/Huyện không được để trống');
      return false;
    }
    if (!formData.address.trim()) {
      setFormError('Địa chỉ không được để trống');
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
      const res = await apiClient.post('/cooperatives', {
        ...formData,
        htx_code: formData.htx_code.toUpperCase(),
      });
      if (res.data?.success) {
        showToast('Thêm hợp tác xã thành công!', 'success');
        setIsCreateOpen(false);
        resetForm();
        fetchCooperatives();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Có lỗi xảy ra khi thêm hợp tác xã');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCoop || !validateForm()) return;

    try {
      setFormSubmitting(true);
      const res = await apiClient.put(`/cooperatives/${selectedCoop.id}`, {
        ...formData,
        htx_code: formData.htx_code.toUpperCase(),
      });
      if (res.data?.success) {
        showToast('Cập nhật thông tin thành công!', 'success');
        setIsEditOpen(false);
        resetForm();
        fetchCooperatives();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn ngưng hoạt động hợp tác xã này?')) return;
    try {
      const res = await apiClient.delete(`/cooperatives/${id}`);
      if (res.data?.success) {
        showToast('Ngưng hoạt động hợp tác xã thành công', 'success');
        fetchCooperatives();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể hủy hoạt động hợp tác xã', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      htx_code: '',
      name: '',
      province: '',
      district: '',
      address: '',
      phone: '',
    });
    setFormError('');
  };

  const openEditModal = (coop: Cooperative) => {
    setSelectedCoop(coop);
    setFormData({
      htx_code: coop.htx_code,
      name: coop.name,
      province: coop.province,
      district: coop.district,
      address: coop.address,
      phone: coop.phone || '',
    });
    setIsEditOpen(true);
  };

  const filteredCoops = coops.filter(
    (coop) =>
      coop.name.toLowerCase().includes(search.toLowerCase()) ||
      coop.htx_code.toLowerCase().includes(search.toLowerCase()) ||
      coop.province.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="font-serif text-2xl md:text-3xl font-bold text-[#1b4332] tracking-tight">
            Quản lý Hợp tác xã
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Đăng ký và cấu hình các hợp tác xã liên kết trong hệ thống.
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
          Thêm Hợp Tác Xã
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
            placeholder="Tìm kiếm theo tên, mã HTX, tỉnh thành..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400"
          />
        </div>
      </div>

      {/* Main Cooperatives Table */}
      <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#1b4332]" />
            <p className="text-sm font-semibold text-stone-500">Đang tải danh sách hợp tác xã...</p>
          </div>
        ) : filteredCoops.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-12 w-12 mx-auto text-stone-300 mb-3" />
            <p className="text-stone-500 font-medium">Không tìm thấy hợp tác xã nào phù hợp</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f0f5ee] border-b border-[#e6ebe3] text-stone-600 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6">Mã HTX</th>
                  <th className="p-4">Tên Hợp tác xã</th>
                  <th className="p-4">Địa bàn</th>
                  <th className="p-4">Địa chỉ chi tiết</th>
                  <th className="p-4">Số điện thoại</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f3ee] text-sm text-stone-700">
                {filteredCoops.map((coop) => (
                  <tr 
                    key={coop.id}
                    className="hover:bg-[#f5f8f4] transition-all duration-200"
                  >
                    <td className="p-4 pl-6 font-mono font-bold text-[#1b4332]">
                      {coop.htx_code}
                    </td>
                    <td className="p-4 font-bold text-stone-900">
                      {coop.name}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-stone-600">
                        <MapPin className="h-4 w-4 text-stone-400" />
                        <span>{coop.district}, {coop.province}</span>
                      </div>
                    </td>
                    <td className="p-4 text-stone-500 max-w-xs truncate">
                      {coop.address}
                    </td>
                    <td className="p-4">
                      {coop.phone ? (
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <Phone className="h-3.5 w-3.5 text-stone-400" />
                          <span>{coop.phone}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">Chưa cập nhật</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        coop.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-stone-100 text-stone-600 border border-stone-200'
                      }`}>
                        {coop.is_active ? 'Hoạt động' : 'Ngưng hoạt động'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(coop)}
                          className="p-1.5 text-[#1b4332] hover:bg-emerald-50 rounded-lg transition-all"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        {coop.is_active && (
                          <button
                            onClick={() => handleDelete(coop.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Ngưng hoạt động"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal - Create/Edit Cooperative */}
      {(isCreateOpen || isEditOpen) && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
              <h3 className="font-serif text-lg font-bold text-[#1b4332]">
                {isCreateOpen ? 'Thêm Hợp Tác Xã Mới' : 'Cập Nhật Hợp Tác Xã'}
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
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Mã HTX <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: BMT01"
                    value={formData.htx_code}
                    onChange={(e) => setFormData({ ...formData, htx_code: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold uppercase"
                    disabled={isEditOpen} // Khóa mã HTX khi sửa
                  />
                </div>

                <div className="col-span-1">
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Số Điện Thoại
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 098xxxxxxx"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Tên Hợp Tác Xã <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: HTX Nông nghiệp Hữu cơ Buôn Ma Thuột"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Tỉnh / Thành phố <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Đắk Lắk"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Quận / Huyện <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Tp. Buôn Ma Thuột"
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Địa Chỉ Chi Tiết <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Thôn 3, Xã Cư Êbur"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                />
              </div>

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
