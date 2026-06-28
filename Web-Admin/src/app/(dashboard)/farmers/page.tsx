'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import { 
  Users, 
  Plus, 
  Search, 
  Edit3, 
  Power, 
  X, 
  Phone, 
  Loader2, 
  CheckCircle2, 
  AlertTriangle,
  Building,
  CreditCard
} from 'lucide-react';

interface Farmer {
  id: string;
  farmer_code: string;
  full_name: string;
  phone: string;
  national_id: string | null;
  date_of_birth: string | null;
  address: string;
  cooperative_id: string;
  cooperative: {
    id: string;
    name: string;
    htx_code: string;
  };
  is_active: boolean;
  created_at: string;
}

interface Cooperative {
  id: string;
  name: string;
  htx_code: string;
  is_active: boolean;
}

export default function FarmersPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [coops, setCoops] = useState<Cooperative[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<Farmer | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    national_id: '',
    date_of_birth: '',
    address: '',
    cooperative_id: '',
  });

  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user && user.role !== 'SUPER_ADMIN' && user.role !== 'HTX_MANAGER') {
      router.push('/');
      return;
    }
    fetchFarmers();
    if (user?.role === 'SUPER_ADMIN') {
      fetchCooperatives();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Load initial cooperative for HTX manager when modal opens
  useEffect(() => {
    if (isCreateOpen && user?.role === 'HTX_MANAGER' && user.cooperativeId) {
      setFormData((prev) => ({ ...prev, cooperative_id: user.cooperativeId! }));
    }
  }, [isCreateOpen, user]);

  const fetchFarmers = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/farmers');
      if (res.data?.success) {
        setFarmers(res.data.data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể tải danh sách nông dân', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCooperatives = async () => {
    try {
      const res = await apiClient.get('/cooperatives');
      if (res.data?.success) {
        setCoops(res.data.data.filter((c: Cooperative) => c.is_active));
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách HTX:', err);
    }
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const validateForm = () => {
    if (!formData.full_name.trim() || formData.full_name.length < 2) {
      setFormError('Họ tên phải chứa tối thiểu 2 ký tự');
      return false;
    }
    const PHONE_VN_REGEX = /^0[35789]\d{8}$/;
    if (!PHONE_VN_REGEX.test(formData.phone)) {
      setFormError('Số điện thoại không hợp lệ (định dạng VN: 03x, 05x, 07x, 08x, 09x)');
      return false;
    }
    if (!formData.address.trim()) {
      setFormError('Địa chỉ không được để trống');
      return false;
    }
    if (!formData.cooperative_id) {
      setFormError('Vui lòng chọn Hợp tác xã quản lý');
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
      const payload: {
        full_name: string;
        phone: string;
        address: string;
        cooperative_id: string;
        national_id?: string;
        date_of_birth?: string;
      } = {
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
        cooperative_id: formData.cooperative_id,
      };
      if (formData.national_id.trim()) {
        payload.national_id = formData.national_id;
      }
      if (formData.date_of_birth) {
        payload.date_of_birth = formData.date_of_birth;
      }

      const res = await apiClient.post('/farmers', payload);
      if (res.data?.success) {
        showToast('Đăng ký nông dân thành công!', 'success');
        setIsCreateOpen(false);
        resetForm();
        fetchFarmers();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Có lỗi xảy ra khi đăng ký nông dân');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmer || !validateForm()) return;

    try {
      setFormSubmitting(true);
      const payload: {
        full_name: string;
        phone: string;
        address: string;
        cooperative_id: string;
        national_id: string | null;
        date_of_birth: string | null;
      } = {
        full_name: formData.full_name,
        phone: formData.phone,
        address: formData.address,
        cooperative_id: formData.cooperative_id,
        national_id: formData.national_id.trim() ? formData.national_id : null,
        date_of_birth: formData.date_of_birth ? formData.date_of_birth : null,
      };

      const res = await apiClient.put(`/farmers/${selectedFarmer.id}`, payload);
      if (res.data?.success) {
        showToast('Cập nhật thông tin thành công!', 'success');
        setIsEditOpen(false);
        resetForm();
        fetchFarmers();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const actionText = currentStatus ? 'khóa' : 'kích hoạt';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} tài khoản nông dân này?`)) return;
    try {
      const res = await apiClient.patch(`/farmers/${id}/status`);
      if (res.data?.success) {
        showToast(`Đã ${actionText} tài khoản nông dân thành công`, 'success');
        fetchFarmers();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể thay đổi trạng thái nông dân', 'error');
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: '',
      phone: '',
      national_id: '',
      date_of_birth: '',
      address: '',
      cooperative_id: user?.cooperativeId || '',
    });
    setFormError('');
  };

  const formatDateForInput = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const openEditModal = (farmer: Farmer) => {
    setSelectedFarmer(farmer);
    setFormData({
      full_name: farmer.full_name,
      phone: farmer.phone,
      national_id: farmer.national_id || '',
      date_of_birth: formatDateForInput(farmer.date_of_birth),
      address: farmer.address,
      cooperative_id: farmer.cooperative_id,
    });
    setIsEditOpen(true);
  };

  const filteredFarmers = farmers.filter(
    (farmer) =>
      farmer.full_name.toLowerCase().includes(search.toLowerCase()) ||
      farmer.farmer_code.toLowerCase().includes(search.toLowerCase()) ||
      farmer.phone.includes(search) ||
      farmer.cooperative.name.toLowerCase().includes(search.toLowerCase())
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
            Quản lý tài khoản Nông dân
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Đăng ký nông dân mới, cấp mã định danh duy nhất và quản lý trạng thái hoạt động.
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
          Đăng Ký Nông Dân
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
            placeholder="Tìm theo tên, số điện thoại, mã số nông dân..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400"
          />
        </div>
      </div>

      {/* Main Farmers Table */}
      <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#1b4332]" />
            <p className="text-sm font-semibold text-stone-500">Đang tải danh sách nông dân...</p>
          </div>
        ) : filteredFarmers.length === 0 ? (
          <div className="text-center py-16">
            <Users className="h-12 w-12 mx-auto text-stone-300 mb-3" />
            <p className="text-stone-500 font-medium">Không tìm thấy nông dân nào phù hợp</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f0f5ee] border-b border-[#e6ebe3] text-stone-600 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6">Mã Nông Dân</th>
                  <th className="p-4">Họ và Tên</th>
                  <th className="p-4">Hợp tác xã</th>
                  <th className="p-4">Số điện thoại</th>
                  <th className="p-4">CCCD / CMND</th>
                  <th className="p-4">Địa chỉ</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f3ee] text-sm text-stone-700">
                {filteredFarmers.map((farmer) => (
                  <tr 
                    key={farmer.id}
                    className="hover:bg-[#f5f8f4] transition-all duration-200"
                  >
                    <td className="p-4 pl-6 font-mono font-bold text-[#1b4332]">
                      {farmer.farmer_code}
                    </td>
                    <td className="p-4 font-bold text-stone-900">
                      {farmer.full_name}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-stone-600">
                        <Building className="h-4 w-4 text-stone-400" />
                        <span>{farmer.cooperative?.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-stone-600">
                        <Phone className="h-3.5 w-3.5 text-stone-400" />
                        <span>{farmer.phone}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      {farmer.national_id ? (
                        <div className="flex items-center gap-1.5 text-stone-600">
                          <CreditCard className="h-3.5 w-3.5 text-stone-400" />
                          <span>{farmer.national_id}</span>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">Chưa có</span>
                      )}
                    </td>
                    <td className="p-4 text-stone-500 max-w-xs truncate">
                      {farmer.address}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                        farmer.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {farmer.is_active ? 'Đang hoạt động' : 'Tạm khóa'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => openEditModal(farmer)}
                          className="p-1.5 text-[#1b4332] hover:bg-emerald-50 rounded-lg transition-all"
                          title="Chỉnh sửa"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(farmer.id, farmer.is_active)}
                          className={`p-1.5 rounded-lg transition-all ${
                            farmer.is_active
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={farmer.is_active ? 'Khóa tài khoản' : 'Kích hoạt tài khoản'}
                        >
                          <Power className="h-4 w-4" />
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

      {/* Modal - Create/Edit Farmer */}
      {(isCreateOpen || isEditOpen) && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
              <h3 className="font-serif text-lg font-bold text-[#1b4332]">
                {isCreateOpen ? 'Đăng Ký Nông Dân Mới' : 'Cập Nhật Hồ Sơ Nông Dân'}
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

            <form onSubmit={isCreateOpen ? handleCreateSubmit : handleEditSubmit} className="p-4 md:p-6 space-y-6">
              {formError && (
                <div className="bg-red-50 text-red-800 text-xs px-3 py-3 md:px-4 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Hợp tác xã - dropdown selection for SUPER_ADMIN, read-only/hidden style for HTX_MANAGER */}
              {user?.role === 'SUPER_ADMIN' ? (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Hợp Tác Xã Quản Lý <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.cooperative_id}
                    onChange={(e) => setFormData({ ...formData, cooperative_id: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700"
                  >
                    <option value="">-- Chọn Hợp tác xã --</option>
                    {coops.map((coop) => (
                      <option key={coop.id} value={coop.id}>
                        {coop.name} ({coop.htx_code})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-1">
                    Hợp Tác Xã Quản Lý
                  </label>
                  <div className="py-2 text-stone-600 font-semibold text-sm border-b border-stone-100 bg-[#f7f9f5] px-2 rounded-lg">
                    Hợp tác xã quản lý của bạn (được gắn tự động)
                  </div>
                  <input type="hidden" value={formData.cooperative_id} />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Họ và Tên Nông Dân <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Nguyễn Văn A"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Số Điện Thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 0912345678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Số CCCD / CMND
                  </label>
                  <input
                    type="text"
                    placeholder="Không bắt buộc"
                    value={formData.national_id}
                    onChange={(e) => setFormData({ ...formData, national_id: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Ngày Sinh
                  </label>
                  <input
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Địa Chỉ Liên Hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Thôn 1, Xã Ea Kao"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-4 border-t border-[#e6ebe3]">
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
                  {isCreateOpen ? 'Xác Nhận Đăng Ký' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
