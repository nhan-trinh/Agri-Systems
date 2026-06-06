'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import {
  Calendar,
  Plus,
  Search,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  User,
  Clock,
  Trash2,
  Tag,
  ChevronRight,
  TrendingUp,
  FileText,
  Droplet,
  Shield,
  Scissors,
  Bookmark,
  X,
  Check
} from 'lucide-react';

interface FarmZone {
  id: string;
  farm_zone_code: string;
  zone_name: string;
  crop_type: string;
  area_sqm: number;
  is_active: boolean;
  farmer: {
    full_name: string;
  };
}

interface Season {
  id: string;
  farm_zone_id: string;
  farm_zone: FarmZone;
  season_name: string;
  crop_variety: string;
  start_date: string;
  expected_end_date: string;
  actual_end_date: string | null;
  planned_yield_kg: number;
  actual_yield_kg: number | null;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  created_by: string;
  created_at: string;
}

interface FarmingLog {
  id: string;
  season_id: string;
  activity_date: string;
  activity_type: 'SEEDING' | 'FERTILIZING' | 'PESTICIDE' | 'IRRIGATION' | 'HARVESTING' | 'OTHER';
  notes: string | null;
  fertilizer_type: string | null;
  quantity_kg: number | null;
  product_name: string | null;
  dosage: number | null;
  unit: string | null;
  water_volume_m3: number | null;
  duration_hours: number | null;
  yield_kg: number | null;
  harvest_method: string | null;
  photo_urls: string[];
  created_at: string;
}

export default function SeasonsPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [zones, setZones] = useState<FarmZone[]>([]);
  const [logs, setLogs] = useState<FarmingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected State
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [isCompleteOpen, setIsCompleteOpen] = useState(false);

  // Form states - Create Season
  const [seasonForm, setSeasonForm] = useState({
    farm_zone_id: '',
    season_name: '',
    crop_variety: '',
    start_date: '',
    expected_end_date: '',
    planned_yield_kg: '',
  });

  // Form states - Complete Season
  const [completeForm, setCompleteForm] = useState({
    actual_end_date: '',
    actual_yield_kg: '',
  });

  // Form states - Add Farming Log
  const [logForm, setLogForm] = useState<{
    activity_type: FarmingLog['activity_type'];
    activity_date: string;
    notes: string;
    fertilizer_type: string;
    quantity_kg: string;
    product_name: string;
    dosage: string;
    unit: string;
    water_volume_m3: string;
    duration_hours: string;
    yield_kg: string;
    harvest_method: string;
  }>({
    activity_type: 'SEEDING',
    activity_date: '',
    notes: '',
    fertilizer_type: '',
    quantity_kg: '',
    product_name: '',
    dosage: '',
    unit: '',
    water_volume_m3: '',
    duration_hours: '',
    yield_kg: '',
    harvest_method: '',
  });

  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user && user.role !== 'HTX_MANAGER' && user.role !== 'SUPER_ADMIN') {
      router.push('/');
      return;
    }
    fetchSeasons();
    fetchZones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (selectedSeasonId) {
      fetchLogs(selectedSeasonId);
    } else {
      setLogs([]);
    }
  }, [selectedSeasonId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchSeasons = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/seasons');
      if (res.data?.success) {
        setSeasons(res.data.data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể tải danh sách vụ mùa', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchZones = async () => {
    try {
      const res = await apiClient.get('/farm-zones');
      if (res.data?.success) {
        // Only list active zones
        setZones(res.data.data.filter((z: FarmZone) => z.is_active));
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách vùng trồng:', err);
    }
  };

  const fetchLogs = async (seasonId: string) => {
    try {
      setLogsLoading(true);
      const res = await apiClient.get(`/farming-logs?seasonId=${seasonId}`);
      if (res.data?.success) {
        setLogs(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách nhật ký:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  const resetSeasonForm = () => {
    setSeasonForm({
      farm_zone_id: '',
      season_name: '',
      crop_variety: '',
      start_date: '',
      expected_end_date: '',
      planned_yield_kg: '',
    });
    setFormError('');
  };

  const resetLogForm = () => {
    setLogForm({
      activity_type: 'SEEDING',
      activity_date: '',
      notes: '',
      fertilizer_type: '',
      quantity_kg: '',
      product_name: '',
      dosage: '',
      unit: '',
      water_volume_m3: '',
      duration_hours: '',
      yield_kg: '',
      harvest_method: '',
    });
    setFormError('');
  };

  const resetCompleteForm = () => {
    setCompleteForm({
      actual_end_date: '',
      actual_yield_kg: '',
    });
    setFormError('');
  };

  const handleCreateSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seasonForm.farm_zone_id || !seasonForm.season_name.trim() || !seasonForm.crop_variety.trim() || !seasonForm.start_date || !seasonForm.expected_end_date || !seasonForm.planned_yield_kg) {
      setFormError('Vui lòng nhập đầy đủ các trường bắt buộc');
      return;
    }

    try {
      setFormSubmitting(true);
      const payload = {
        ...seasonForm,
        planned_yield_kg: parseFloat(seasonForm.planned_yield_kg),
      };
      const res = await apiClient.post('/seasons', payload);
      if (res.data?.success) {
        showToast('Khai báo vụ mùa mới thành công!', 'success');
        setIsCreateOpen(false);
        resetSeasonForm();
        fetchSeasons();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Có lỗi xảy ra khi gán vụ mùa');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCompleteSeason = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completeForm.actual_end_date || !completeForm.actual_yield_kg) {
      setFormError('Vui lòng nhập đầy đủ thông số thu hoạch');
      return;
    }

    try {
      setFormSubmitting(true);
      const payload = {
        actual_end_date: completeForm.actual_end_date,
        actual_yield_kg: parseFloat(completeForm.actual_yield_kg),
      };
      const res = await apiClient.patch(`/seasons/${selectedSeasonId}/complete`, payload);
      if (res.data?.success) {
        showToast('Đóng vụ mùa thu hoạch thành công!', 'success');
        setIsCompleteOpen(false);
        resetCompleteForm();
        fetchSeasons();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Có lỗi xảy ra khi đóng vụ mùa');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCancelSeason = async () => {
    if (!confirm('Bạn có chắc chắn muốn hủy bỏ vụ mùa này? Hành động này không thể hoàn tác.')) return;
    try {
      const res = await apiClient.patch(`/seasons/${selectedSeasonId}/cancel`);
      if (res.data?.success) {
        showToast('Đã hủy bỏ vụ mùa thành công.', 'success');
        fetchSeasons();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể hủy vụ mùa', 'error');
    }
  };

  const handleCreateLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logForm.activity_date || !logForm.activity_type) {
      setFormError('Vui lòng chọn ngày thực hiện và loại hoạt động');
      return;
    }

    // Dynamic checks
    if (logForm.activity_type === 'FERTILIZING') {
      if (!logForm.fertilizer_type.trim()) {
        setFormError('Vui lòng nhập loại phân bón');
        return;
      }
      if (!logForm.quantity_kg) {
        setFormError('Vui lòng nhập khối lượng phân bón (kg)');
        return;
      }
    } else if (logForm.activity_type === 'PESTICIDE') {
      if (!logForm.product_name.trim()) {
        setFormError('Vui lòng nhập tên thuốc bảo vệ thực vật');
        return;
      }
      if (!logForm.dosage) {
        setFormError('Vui lòng nhập liều lượng thuốc');
        return;
      }
      if (!logForm.unit.trim()) {
        setFormError('Vui lòng nhập đơn vị tính (lít, ml...)');
        return;
      }
    } else if (logForm.activity_type === 'IRRIGATION') {
      if (!logForm.water_volume_m3) {
        setFormError('Vui lòng nhập thể tích nước tưới (m³)');
        return;
      }
      if (!logForm.duration_hours) {
        setFormError('Vui lòng nhập thời gian tưới (giờ)');
        return;
      }
    } else if (logForm.activity_type === 'HARVESTING') {
      if (!logForm.yield_kg) {
        setFormError('Vui lòng nhập sản lượng thu hoạch (kg)');
        return;
      }
      if (!logForm.harvest_method.trim()) {
        setFormError('Vui lòng nhập phương pháp thu hoạch');
        return;
      }
    }

    try {
      setFormSubmitting(true);
      const payload: {
        season_id: string | null;
        activity_date: string;
        activity_type: FarmingLog['activity_type'];
        notes: string;
        fertilizer_type?: string;
        quantity_kg?: number;
        product_name?: string;
        dosage?: number;
        unit?: string;
        water_volume_m3?: number;
        duration_hours?: number;
        yield_kg?: number;
        harvest_method?: string;
      } = {
        season_id: selectedSeasonId,
        activity_date: logForm.activity_date,
        activity_type: logForm.activity_type,
        notes: logForm.notes,
      };

      if (logForm.activity_type === 'FERTILIZING') {
        payload.fertilizer_type = logForm.fertilizer_type;
        payload.quantity_kg = parseFloat(logForm.quantity_kg);
      } else if (logForm.activity_type === 'PESTICIDE') {
        payload.product_name = logForm.product_name;
        payload.dosage = parseFloat(logForm.dosage);
        payload.unit = logForm.unit;
      } else if (logForm.activity_type === 'IRRIGATION') {
        payload.water_volume_m3 = parseFloat(logForm.water_volume_m3);
        payload.duration_hours = parseFloat(logForm.duration_hours);
      } else if (logForm.activity_type === 'HARVESTING') {
        payload.yield_kg = parseFloat(logForm.yield_kg);
        payload.harvest_method = logForm.harvest_method;
      }

      const res = await apiClient.post('/farming-logs', payload);
      if (res.data?.success) {
        showToast('Ghi nhật ký canh tác thành công!', 'success');
        setIsLogOpen(false);
        resetLogForm();
        if (selectedSeasonId) fetchLogs(selectedSeasonId);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Có lỗi xảy ra khi ghi nhật ký');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteLog = async (logId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa dòng nhật ký canh tác này?')) return;
    try {
      const res = await apiClient.delete(`/farming-logs/${logId}`);
      if (res.data?.success) {
        showToast('Đã xóa dòng nhật ký.', 'success');
        if (selectedSeasonId) fetchLogs(selectedSeasonId);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể xóa nhật ký', 'error');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'COMPLETED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CANCELLED':
        return 'bg-stone-50 text-stone-600 border-stone-200';
      default:
        return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Đang chạy';
      case 'COMPLETED': return 'Thu hoạch';
      case 'CANCELLED': return 'Đã hủy';
      default: return status;
    }
  };

  const getActivityBadgeColor = (type: string) => {
    switch (type) {
      case 'SEEDING': return 'bg-green-50 text-green-700 border-green-200';
      case 'FERTILIZING': return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'PESTICIDE': return 'bg-red-50 text-red-700 border-red-200';
      case 'IRRIGATION': return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'HARVESTING': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-stone-50 text-stone-700 border-stone-200';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'SEEDING': return <Bookmark className="h-4 w-4" />;
      case 'FERTILIZING': return <Tag className="h-4 w-4" />;
      case 'PESTICIDE': return <Shield className="h-4 w-4" />;
      case 'IRRIGATION': return <Droplet className="h-4 w-4" />;
      case 'HARVESTING': return <Scissors className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getActivityLabel = (type: string) => {
    switch (type) {
      case 'SEEDING': return 'Gieo sạ / Trồng cây';
      case 'FERTILIZING': return 'Bón phân';
      case 'PESTICIDE': return 'Phun thuốc BVTV';
      case 'IRRIGATION': return 'Tưới tiêu';
      case 'HARVESTING': return 'Gặt hái / Thu hoạch';
      default: return 'Khác';
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredSeasons = seasons.filter((season) => {
    const matchesSearch =
      season.season_name.toLowerCase().includes(search.toLowerCase()) ||
      season.farm_zone.zone_name.toLowerCase().includes(search.toLowerCase()) ||
      season.crop_variety.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === '' || season.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedSeason = seasons.find((s) => s.id === selectedSeasonId);

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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#1b4332] tracking-tight">
            Theo dõi Vụ Mùa
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Khai báo mùa vụ nông sản, ghi chép nhật ký phân bón, thuốc trừ sâu và báo cáo sản lượng thu hoạch.
          </p>
        </div>
        <button
          onClick={() => {
            resetSeasonForm();
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 bg-[#1b4332] hover:bg-[#143225] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-300 hover:scale-102 text-sm"
        >
          <Plus className="h-4 w-4" />
          Khai Báo Vụ Mới
        </button>
      </div>

      {/* Split Layout: Seasons list left, diaries & timeline right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Seasons list */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-[#e6ebe3] shadow-sm">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-stone-400" />
              </span>
              <input
                type="text"
                placeholder="Tìm vụ mùa, giống, vùng trồng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-2 px-3 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-600"
            >
              <option value="">-- Tất cả trạng thái --</option>
              <option value="ACTIVE">Đang chạy</option>
              <option value="COMPLETED">Thu hoạch</option>
              <option value="CANCELLED">Đã hủy</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm overflow-hidden divide-y divide-[#f0f3ee] max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#1b4332]" />
                <p className="text-sm font-semibold text-stone-500">Đang tải danh sách vụ mùa...</p>
              </div>
            ) : filteredSeasons.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="h-12 w-12 mx-auto text-stone-300 mb-3" />
                <p className="text-stone-500 font-medium">Không tìm thấy vụ mùa nào</p>
              </div>
            ) : (
              filteredSeasons.map((season) => (
                <div
                  key={season.id}
                  onClick={() => setSelectedSeasonId(season.id)}
                  className={`p-4 cursor-pointer transition-all duration-200 flex justify-between items-center ${
                    selectedSeasonId === season.id ? 'bg-[#f4f7f3]' : 'hover:bg-[#f5f8f4]'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-stone-900 truncate text-sm">
                        {season.season_name}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBadge(season.status)}`}>
                        {getStatusLabel(season.status)}
                      </span>
                    </div>
                    
                    <p className="text-xs text-stone-500 font-medium flex items-center gap-1">
                      Giống: <span className="text-stone-800 font-semibold">{season.crop_variety}</span>
                    </p>

                    <p className="text-xs text-stone-400 font-semibold flex items-center gap-1">
                      Vùng: <span className="text-[#1b4332] font-bold">{season.farm_zone?.zone_name}</span>
                    </p>

                    <p className="text-[10px] text-stone-400 font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" /> {formatDate(season.start_date)} - {formatDate(season.expected_end_date)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-stone-400 flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Detailed View & Timeline of Farming Logs */}
        <div className="lg:col-span-7">
          {!selectedSeason ? (
            <div className="bg-white rounded-3xl border border-[#e6ebe3] p-16 text-center shadow-sm">
              <Calendar className="h-16 w-16 mx-auto text-stone-300 mb-4" />
              <h3 className="font-serif text-lg font-bold text-[#1b4332]">Chưa Chọn Vụ Mùa</h3>
              <p className="text-stone-400 text-xs mt-2 max-w-sm mx-auto leading-relaxed">
                Vui lòng chọn một vụ mùa từ danh sách bên trái để xem thông tin chi tiết, nhật ký canh tác và quản lý tiến trình.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Season Detail Card */}
              <div className="bg-white rounded-3xl border border-[#e6ebe3] p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-start border-b border-[#e6ebe3] pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Chi tiết vụ mùa</span>
                    <h2 className="font-serif text-xl font-bold text-[#1b4332] mt-1">{selectedSeason.season_name}</h2>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(selectedSeason.status)}`}>
                    {getStatusLabel(selectedSeason.status)}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-stone-400 font-semibold">Cây trồng / Giống</span>
                    <p className="font-bold text-stone-800">{selectedSeason.crop_variety}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-stone-400 font-semibold">Vùng / Diện tích</span>
                    <p className="font-bold text-[#1b4332] flex items-center gap-1">
                      {selectedSeason.farm_zone?.zone_name} 
                      <span className="text-[10px] text-stone-400 font-medium">({selectedSeason.farm_zone?.area_sqm.toLocaleString()} m²)</span>
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-stone-400 font-semibold">Nông dân phụ trách</span>
                    <p className="font-bold text-stone-800 flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-stone-400" />
                      {selectedSeason.farm_zone?.farmer?.full_name}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-stone-400 font-semibold">Sản lượng dự kiến</span>
                    <p className="font-mono font-bold text-stone-800">{selectedSeason.planned_yield_kg.toLocaleString()} kg</p>
                  </div>
                </div>

                {selectedSeason.status === 'COMPLETED' && (
                  <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-2xl flex items-center justify-between text-xs">
                    <div>
                      <span className="text-amber-800 font-bold">Ngày thu hoạch thực tế:</span>
                      <p className="text-stone-600 mt-1 font-semibold">{formatDate(selectedSeason.actual_end_date!)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-amber-800 font-bold">Sản lượng thu hoạch:</span>
                      <p className="text-amber-900 font-mono font-bold mt-1 text-sm">{selectedSeason.actual_yield_kg!.toLocaleString()} kg</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {selectedSeason.status === 'ACTIVE' && (
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-[#e6ebe3]">
                    <button
                      onClick={() => {
                        resetLogForm();
                        setIsLogOpen(true);
                      }}
                      className="flex items-center gap-1.5 bg-[#1b4332] hover:bg-[#143225] text-white px-4 py-2 rounded-xl font-bold transition-all text-xs"
                    >
                      <Plus className="h-4 w-4" />
                      Ghi Nhật Ký Canh Tác
                    </button>
                    <button
                      onClick={() => {
                        resetCompleteForm();
                        setIsCompleteOpen(true);
                      }}
                      className="flex items-center gap-1.5 border border-[#1b4332] text-[#1b4332] hover:bg-emerald-50 px-4 py-2 rounded-xl font-bold transition-all text-xs"
                    >
                      <Check className="h-4 w-4" />
                      Thu Hoạch & Đóng Vụ
                    </button>
                    <button
                      onClick={handleCancelSeason}
                      className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl font-bold transition-all text-xs ml-auto"
                    >
                      Hủy vụ mùa
                    </button>
                  </div>
                )}
              </div>

              {/* Timeline Header */}
              <div className="flex justify-between items-center px-2">
                <h3 className="font-serif text-md font-bold text-[#1b4332] flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  Dòng thời gian hoạt động canh tác
                </h3>
                <span className="text-stone-400 text-[10px] font-bold uppercase tracking-wider">{logs.length} sự kiện</span>
              </div>

              {/* Timeline list */}
              {logsLoading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 bg-white rounded-3xl border border-[#e6ebe3]">
                  <Loader2 className="h-6 w-6 animate-spin text-[#1b4332]" />
                  <p className="text-xs font-semibold text-stone-400">Đang tải nhật ký vụ mùa...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="bg-white rounded-3xl border border-[#e6ebe3] p-12 text-center text-stone-400 text-xs italic">
                  Chưa có nhật ký hoạt động nào cho vụ mùa này. Hãy thêm nhật ký bón phân, tưới nước hoặc gieo hạt đầu tiên!
                </div>
              ) : (
                <div className="relative pl-6 border-l-2 border-[#e6ebe3] ml-4 space-y-6">
                  {logs.map((log) => (
                    <div key={log.id} className="relative space-y-2">
                      {/* Timeline dot */}
                      <span className="absolute -left-[35px] top-1 bg-white p-1 rounded-full border-2 border-[#e6ebe3] text-[#1b4332] shadow-sm flex items-center justify-center">
                        {getActivityIcon(log.activity_type)}
                      </span>

                      {/* Log Card */}
                      <div className="bg-white rounded-2xl border border-[#e6ebe3] p-4 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] text-stone-400 font-bold">{formatDate(log.activity_date)}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <h4 className="font-bold text-stone-900 text-sm">
                                {getActivityLabel(log.activity_type)}
                              </h4>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${getActivityBadgeColor(log.activity_type)}`}>
                                {log.activity_type}
                              </span>
                            </div>
                          </div>
                          
                          {/* Delete Action */}
                          {selectedSeason.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleDeleteLog(log.id)}
                              className="text-stone-400 hover:text-red-600 p-1 hover:bg-stone-50 rounded-lg transition-colors"
                              title="Xóa nhật ký"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        {/* Conditional parameters rendering based on type */}
                        <div className="mt-3 pt-3 border-t border-[#f0f3ee] text-xs space-y-1.5 font-medium text-stone-600">
                          {log.activity_type === 'FERTILIZING' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>Loại phân: <strong className="text-stone-800 font-bold">{log.fertilizer_type}</strong></div>
                              <div>Khối lượng: <strong className="text-stone-800 font-mono font-bold">{log.quantity_kg?.toLocaleString()} kg</strong></div>
                            </div>
                          )}

                          {log.activity_type === 'PESTICIDE' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>Loại thuốc: <strong className="text-stone-800 font-bold">{log.product_name}</strong></div>
                              <div>Liều lượng: <strong className="text-stone-800 font-mono font-bold">{log.dosage?.toLocaleString()} {log.unit}</strong></div>
                            </div>
                          )}

                          {log.activity_type === 'IRRIGATION' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>Thể tích nước: <strong className="text-stone-800 font-mono font-bold">{log.water_volume_m3?.toLocaleString()} m³</strong></div>
                              <div>Thời gian tưới: <strong className="text-stone-800 font-mono font-bold">{log.duration_hours?.toLocaleString()} giờ</strong></div>
                            </div>
                          )}

                          {log.activity_type === 'HARVESTING' && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>Sản lượng thu hoạch: <strong className="text-amber-800 font-mono font-bold text-sm">{log.yield_kg?.toLocaleString()} kg</strong></div>
                              <div>Cách thức gặt: <strong className="text-stone-800 font-bold">{log.harvest_method}</strong></div>
                            </div>
                          )}

                          {log.notes && (
                            <div className="text-stone-500 italic mt-2 bg-[#fcfdfa] p-2.5 rounded-xl border border-[#f0f3ee] leading-relaxed">
                              Ghi chú: {log.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal - Create Season */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
              <h3 className="font-serif text-lg font-bold text-[#1b4332]">Khai Báo Vụ Mùa Mới</h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSeason} className="p-6 space-y-6">
              {formError && (
                <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Chọn Vùng Trồng <span className="text-red-500">*</span>
                </label>
                <select
                  value={seasonForm.farm_zone_id}
                  onChange={(e) => setSeasonForm({ ...seasonForm, farm_zone_id: e.target.value })}
                  className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700"
                >
                  <option value="">-- Chọn Vùng trồng --</option>
                  {zones.map((zone) => (
                    <option key={zone.id} value={zone.id}>
                      {zone.zone_name} ({zone.farm_zone_code} - {zone.farmer.full_name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Tên Vụ Mùa <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: Đông Xuân 2026, Vụ lúa tháng 8"
                  value={seasonForm.season_name}
                  onChange={(e) => setSeasonForm({ ...seasonForm, season_name: e.target.value })}
                  className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Giống cây / lúa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="VD: ST25, Robusta"
                    value={seasonForm.crop_variety}
                    onChange={(e) => setSeasonForm({ ...seasonForm, crop_variety: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Sản lượng dự kiến (kg) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    placeholder="VD: 5000"
                    value={seasonForm.planned_yield_kg}
                    onChange={(e) => setSeasonForm({ ...seasonForm, planned_yield_kg: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Ngày Bắt Đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={seasonForm.start_date}
                    onChange={(e) => setSeasonForm({ ...seasonForm, start_date: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Thu hoạch dự kiến <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={seasonForm.expected_end_date}
                    onChange={(e) => setSeasonForm({ ...seasonForm, expected_end_date: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700"
                  />
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[#e6ebe3]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
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
                  Khởi Tạo Vụ Mùa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Complete Season (Harvest) */}
      {isCompleteOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
              <h3 className="font-serif text-lg font-bold text-[#1b4332]">Thu Hoạch & Đóng Vụ</h3>
              <button
                onClick={() => setIsCompleteOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCompleteSeason} className="p-6 space-y-6">
              {formError && (
                <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Ngày Thu Hoạch Thực Tế <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={completeForm.actual_end_date}
                  onChange={(e) => setCompleteForm({ ...completeForm, actual_end_date: e.target.value })}
                  className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Sản Lượng Thu Hoạch Thực Tế (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  placeholder="VD: 5300"
                  value={completeForm.actual_yield_kg}
                  onChange={(e) => setCompleteForm({ ...completeForm, actual_yield_kg: e.target.value })}
                  className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[#e6ebe3]">
                <button
                  type="button"
                  onClick={() => setIsCompleteOpen(false)}
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
                  Xác Nhận Đóng Vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Add Farming Log */}
      {isLogOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
              <h3 className="font-serif text-lg font-bold text-[#1b4332]">Ghi Nhật Ký Canh Tác Hộ</h3>
              <button
                onClick={() => setIsLogOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLog} className="p-6 space-y-6">
              {formError && (
                <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Loại Hoạt Động <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={logForm.activity_type}
                    onChange={(e) => setLogForm({ ...logForm, activity_type: e.target.value as FarmingLog['activity_type'] })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700"
                  >
                    <option value="SEEDING">Gieo sạ / Trồng cây</option>
                    <option value="FERTILIZING">Bón phân</option>
                    <option value="PESTICIDE">Phun thuốc BVTV</option>
                    <option value="IRRIGATION">Tưới tiêu</option>
                    <option value="HARVESTING">Gặt hái / Thu hoạch</option>
                    <option value="OTHER">Hoạt động khác</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Ngày Thực Hiện <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={logForm.activity_date}
                    onChange={(e) => setLogForm({ ...logForm, activity_date: e.target.value })}
                    className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700"
                  />
                </div>
              </div>

              {/* Dynamic conditional fields based on activity_type */}
              <div className="bg-[#fcfdfa] border border-[#e6ebe3] rounded-2xl p-4 space-y-4">
                <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider">Thông số hoạt động</h4>
                
                {logForm.activity_type === 'FERTILIZING' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-1">Loại Phân Bón <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="VD: Phân đạm, NPK 16-16-8"
                        value={logForm.fertilizer_type}
                        onChange={(e) => setLogForm({ ...logForm, fertilizer_type: e.target.value })}
                        className="w-full py-1 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-1">Khối lượng (kg) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        placeholder="VD: 50"
                        value={logForm.quantity_kg}
                        onChange={(e) => setLogForm({ ...logForm, quantity_kg: e.target.value })}
                        className="w-full py-1 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}

                {logForm.activity_type === 'PESTICIDE' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-stone-500 mb-1">Tên Thuốc <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          placeholder="VD: Thuốc trừ sâu A"
                          value={logForm.product_name}
                          onChange={(e) => setLogForm({ ...logForm, product_name: e.target.value })}
                          className="w-full py-1 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 mb-1">Liều lượng <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            placeholder="VD: 250"
                            value={logForm.dosage}
                            onChange={(e) => setLogForm({ ...logForm, dosage: e.target.value })}
                            className="w-full py-1 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-stone-500 mb-1">Đơn vị <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            placeholder="ml, lít"
                            value={logForm.unit}
                            onChange={(e) => setLogForm({ ...logForm, unit: e.target.value })}
                            className="w-full py-1 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {logForm.activity_type === 'IRRIGATION' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-1">Thể tích nước ($m^3$) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        placeholder="VD: 15"
                        value={logForm.water_volume_m3}
                        onChange={(e) => setLogForm({ ...logForm, water_volume_m3: e.target.value })}
                        className="w-full py-1 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-1">Thời gian tưới (giờ) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        placeholder="VD: 3"
                        value={logForm.duration_hours}
                        onChange={(e) => setLogForm({ ...logForm, duration_hours: e.target.value })}
                        className="w-full py-1 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}

                {logForm.activity_type === 'HARVESTING' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-1">Sản lượng gặt ($kg$) <span className="text-red-500">*</span></label>
                      <input
                        type="number"
                        placeholder="VD: 5000"
                        value={logForm.yield_kg}
                        onChange={(e) => setLogForm({ ...logForm, yield_kg: e.target.value })}
                        className="w-full py-1 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-500 mb-1">Cách thu hoạch <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        placeholder="VD: Máy gặt đập liên hợp"
                        value={logForm.harvest_method}
                        onChange={(e) => setLogForm({ ...logForm, harvest_method: e.target.value })}
                        className="w-full py-1 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}

                {logForm.activity_type === 'SEEDING' && (
                  <p className="text-stone-500 text-xs italic">Khai báo giống lúa/cây trồng trong biểu mẫu ở trên.</p>
                )}

                {logForm.activity_type === 'OTHER' && (
                  <p className="text-stone-500 text-xs italic">Ghi chú chi tiết hoạt động khác ở ô bên dưới.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Ghi chú chi tiết
                </label>
                <textarea
                  placeholder="Thêm thông tin bổ sung..."
                  value={logForm.notes}
                  onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
                  rows={2}
                  className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold resize-none"
                />
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-[#e6ebe3]">
                <button
                  type="button"
                  onClick={() => setIsLogOpen(false)}
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
                  Ghi Nhật Ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
