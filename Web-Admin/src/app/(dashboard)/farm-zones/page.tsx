'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import dynamic from 'next/dynamic';
import {
  Map as MapIcon,
  Plus,
  Search,
  Edit3,
  Power,
  X,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  User,
  Check
} from 'lucide-react';

// Dynamically import map component to disable SSR
const FarmZoneMap = dynamic(() => import('@/components/map/FarmZoneMap').then(m => m.FarmZoneMap), { ssr: false });

interface Farmer {
  id: string;
  farmer_code: string;
  full_name: string;
  phone: string;
  cooperative_id: string;
  is_active: boolean;
}

interface Zone {
  id: string;
  farm_zone_code: string;
  zone_name: string;
  crop_type: string;
  area_sqm: number;
  boundary: {
    type: string;
    coordinates: number[][][];
  };
  description: string | null;
  is_active: boolean;
  farmer_id: string;
  farmer: {
    id: string;
    full_name: string;
    farmer_code: string;
  };
  created_at: string;
}

export default function FarmZonesPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [zones, setZones] = useState<Zone[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCropFilter, setSelectedCropFilter] = useState('');

  // Modals / Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    zone_name: '',
    farmer_id: '',
    crop_type: 'RICE',
    description: '',
  });

  const [drawingPoints, setDrawingPoints] = useState<[number, number][]>([]);
  const [overlapChecking, setOverlapChecking] = useState(false);
  const [overlapResult, setOverlapResult] = useState<{
    overlaps: boolean;
    zoneName?: string;
    areaSqm: number;
    error?: string;
  } | null>(null);

  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user && user.role !== 'HTX_MANAGER' && user.role !== 'SUPER_ADMIN') {
      router.push('/');
      return;
    }
    fetchZones();
    fetchFarmers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Real-time boundary overlap and area check
  useEffect(() => {
    if (drawingPoints.length >= 3) {
      checkBoundaryOverlap();
    } else {
      setOverlapResult(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drawingPoints]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchZones = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/farm-zones');
      if (res.data?.success) {
        setZones(res.data.data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể tải danh sách vùng trồng', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchFarmers = async () => {
    try {
      const res = await apiClient.get('/farmers');
      if (res.data?.success) {
        // Filter only active farmers
        setFarmers(res.data.data.filter((f: Farmer) => f.is_active));
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách nông dân:', err);
    }
  };

  // Convert Leaflet drawing points [[lat, lng], ...] to GeoJSON Polygon [[[lng, lat], ..., [lng, lat]]]
  const getGeoJsonBoundary = (points: [number, number][]) => {
    if (points.length < 3) return null;
    const closedCoords = [...points.map(([lat, lng]) => [lng, lat]), [points[0][1], points[0][0]]];
    return {
      type: 'Polygon',
      coordinates: [closedCoords],
    };
  };

  const checkBoundaryOverlap = async () => {
    const boundary = getGeoJsonBoundary(drawingPoints);
    if (!boundary) return;

    try {
      setOverlapChecking(true);
      const res = await apiClient.post('/farm-zones/check-overlap', {
        boundary,
        exclude_id: editingZone?.id,
      });
      if (res.data?.success) {
        setOverlapResult(res.data.data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setOverlapResult({
        overlaps: false,
        areaSqm: 0,
        error: error.response?.data?.message || 'Lỗi kiểm tra ranh giới',
      });
    } finally {
      setOverlapChecking(false);
    }
  };

  const openCreateModal = () => {
    setSelectedZoneId(null); // clear any focused row so the display map isn't locked underneath the modal
    setEditingZone(null);
    setFormData({
      zone_name: '',
      farmer_id: '',
      crop_type: 'RICE',
      description: '',
    });
    setDrawingPoints([]);
    setOverlapResult(null);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (zone: Zone) => {
    setSelectedZoneId(null); // clear any focused row so the display map isn't locked underneath the modal
    setEditingZone(zone);
    setFormData({
      zone_name: zone.zone_name,
      farmer_id: zone.farmer_id,
      crop_type: zone.crop_type,
      description: zone.description || '',
    });
    // Parse GeoJSON coordinates [[lng, lat]] to Leaflet [[lat, lng]]
    const geojsonCoords = zone.boundary.coordinates[0];
    // Exclude the last closing point to let Leaflet draw it natively
    const leafletCoords = geojsonCoords.slice(0, -1).map((coord: number[]) => [coord[1], coord[0]] as [number, number]);
    setDrawingPoints(leafletCoords);
    setOverlapResult(null);
    setFormError('');
    setIsModalOpen(true);
  };

  const validateForm = () => {
    if (!formData.zone_name.trim()) {
      setFormError('Tên vùng trồng không được để trống');
      return false;
    }
    if (!formData.farmer_id) {
      setFormError('Vui lòng chọn nông dân quản lý');
      return false;
    }
    if (drawingPoints.length < 3) {
      setFormError('Vui lòng vẽ ranh giới vùng trồng trên bản đồ (tối thiểu 3 điểm)');
      return false;
    }
    if (overlapResult?.overlaps) {
      setFormError(`Ranh giới bị chồng lấn với vùng trồng "${overlapResult.zoneName}"`);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setFormSubmitting(true);
      const boundary = getGeoJsonBoundary(drawingPoints);
      const payload = {
        ...formData,
        boundary,
      };

      let res;
      if (editingZone) {
        res = await apiClient.put(`/farm-zones/${editingZone.id}`, payload);
      } else {
        res = await apiClient.post('/farm-zones', payload);
      }

      if (res.data?.success) {
        showToast(editingZone ? 'Cập nhật vùng trồng thành công' : 'Tạo vùng trồng thành công', 'success');
        setIsModalOpen(false);
        fetchZones();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Có lỗi xảy ra khi lưu vùng trồng');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    const actionText = currentStatus ? 'khóa' : 'kích hoạt';
    if (!confirm(`Bạn có chắc chắn muốn ${actionText} vùng trồng này?`)) return;
    try {
      const res = await apiClient.patch(`/farm-zones/${id}/status`);
      if (res.data?.success) {
        showToast(`Đã ${actionText} vùng trồng thành công`, 'success');
        fetchZones();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể cập nhật trạng thái', 'error');
    }
  };

  const getCropLabel = (cropType: string) => {
    switch (cropType) {
      case 'RICE': return 'Lúa nước';
      case 'COFFEE': return 'Cà phê';
      case 'PEPPER': return 'Hồ tiêu';
      case 'DURIAN': return 'Sầu riêng';
      case 'VEGETABLE': return 'Rau củ';
      default: return 'Khác';
    }
  };

  const filteredZones = zones.filter((zone) => {
    const matchesSearch =
      zone.zone_name.toLowerCase().includes(search.toLowerCase()) ||
      zone.farm_zone_code.toLowerCase().includes(search.toLowerCase()) ||
      zone.farmer.full_name.toLowerCase().includes(search.toLowerCase());
    const matchesCrop = selectedCropFilter === '' || zone.crop_type === selectedCropFilter;
    return matchesSearch && matchesCrop;
  });

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
            Quản lý Vùng Trồng
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Số hóa ranh giới vùng trồng bằng bản đồ vệ tinh, tính diện tích tự động và kiểm tra chồng chéo diện tích.
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-[#1b4332] hover:bg-[#143225] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-300 hover:scale-102 text-sm"
        >
          <Plus className="h-4 w-4" />
          Thêm Vùng Trồng
        </button>
      </div>

      {/* Split Layout: Map View and Table List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: interactive Map display */}
        <div className="lg:col-span-5 flex flex-col h-[500px] lg:h-[600px] sticky top-6">
          <div className="flex-1 relative rounded-2xl overflow-hidden shadow-sm border border-[#e6ebe3]">
            <FarmZoneMap
              zones={zones}
              selectedZoneId={selectedZoneId}
              isDrawing={false}
              zoom={13}
            />
          </div>
          <div className="bg-white/80 border border-[#e6ebe3] p-3 rounded-xl mt-3 flex items-center justify-between text-xs font-semibold text-stone-500">
            <span className="flex items-center gap-1.5"><MapIcon className="h-4 w-4 text-[#1b4332]" /> Click vào ô ranh giới để xem thông tin chi tiết vùng trồng.</span>
            {selectedZoneId && (
              <button
                onClick={() => setSelectedZoneId(null)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1b4332] text-white hover:bg-[#143225] transition-all text-[11px] font-bold shadow-sm"
              >
                <X className="h-3.5 w-3.5" />
                Thoát xem
              </button>
            )}
          </div>
        </div>

        {/* Right Side: Search, Filters and Table */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-[#e6ebe3] shadow-sm">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-stone-400" />
              </span>
              <input
                type="text"
                placeholder="Tìm theo tên vùng, mã số, hoặc nông dân..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400"
              />
            </div>
            <select
              value={selectedCropFilter}
              onChange={(e) => setSelectedCropFilter(e.target.value)}
              className="py-2 px-3 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs font-semibold text-stone-600"
            >
              <option value="">-- Tất cả cây trồng --</option>
              <option value="RICE">Lúa nước</option>
              <option value="COFFEE">Cà phê</option>
              <option value="PEPPER">Hồ tiêu</option>
              <option value="DURIAN">Sầu riêng</option>
              <option value="VEGETABLE">Rau củ</option>
            </select>
          </div>

          {/* Zones Table */}
          <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#1b4332]" />
                <p className="text-sm font-semibold text-stone-500">Đang tải danh sách vùng trồng...</p>
              </div>
            ) : filteredZones.length === 0 ? (
              <div className="text-center py-16">
                <MapIcon className="h-12 w-12 mx-auto text-stone-300 mb-3" />
                <p className="text-stone-500 font-medium">Không tìm thấy vùng trồng nào</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#f0f5ee] border-b border-[#e6ebe3] text-stone-600 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4 pl-6">Mã vùng trồng</th>
                      <th className="p-4">Tên Vùng</th>
                      <th className="p-4">Nông dân</th>
                      <th className="p-4">Cây trồng</th>
                      <th className="p-4">Diện tích ($m^2$)</th>
                      <th className="p-4">Trạng thái</th>
                      <th className="p-4 pr-6 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f3ee] text-sm text-stone-700">
                    {filteredZones.map((zone) => (
                      <tr
                        key={zone.id}
                        // Toggle off when re-clicking the already-selected row, so the
                        // user is never "locked" into a focused zone view (bug fix #3).
                        onClick={() => setSelectedZoneId(prev => prev === zone.id ? null : zone.id)}
                        className={`cursor-pointer transition-all duration-200 ${
                          selectedZoneId === zone.id ? 'bg-[#f4f7f3] font-semibold' : 'hover:bg-[#f5f8f4]'
                        }`}
                      >
                        <td className="p-4 pl-6 font-mono text-xs font-bold text-[#1b4332]">
                          {zone.farm_zone_code}
                        </td>
                        <td className="p-4 font-bold text-stone-900">
                          {zone.zone_name}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5 text-stone-600">
                            <User className="h-3.5 w-3.5 text-stone-400" />
                            <span>{zone.farmer?.full_name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-xs font-semibold">
                          {getCropLabel(zone.crop_type)}
                        </td>
                        <td className="p-4 font-mono font-bold text-stone-800">
                          {zone.area_sqm.toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            zone.is_active
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {zone.is_active ? 'Đang hoạt động' : 'Tạm khóa'}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => openEditModal(zone)}
                              className="p-1.5 text-[#1b4332] hover:bg-emerald-50 rounded-lg transition-all"
                              title="Chỉnh sửa"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(zone.id, zone.is_active)}
                              className={`p-1.5 rounded-lg transition-all ${
                                zone.is_active ? 'text-red-600 hover:bg-red-50' : 'text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={zone.is_active ? 'Khóa vùng trồng' : 'Kích hoạt vùng trồng'}
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
        </div>
      </div>

      {/* Modal - Create/Edit Farm Zone */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9] flex-shrink-0">
              <h3 className="font-serif text-lg font-bold text-[#1b4332]">
                {editingZone ? 'Cập Nhật Ranh Giới Vùng Trồng' : 'Khai Báo Vùng Trồng Mới'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body: Split Map drawing & Form fields */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
              {/* Left Column: Form parameters */}
              <form onSubmit={handleSubmit} className="space-y-5 flex flex-col justify-between">
                <div className="space-y-5">
                  {formError && (
                    <div className="bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                      Tên Vùng Trồng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="VD: Cánh Đồng Mẫu Lớn Ea Kao"
                      value={formData.zone_name}
                      onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })}
                      className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                        Nông Dân Phụ Trách <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.farmer_id}
                        onChange={(e) => setFormData({ ...formData, farmer_id: e.target.value })}
                        className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700"
                      >
                        <option value="">-- Chọn Nông dân --</option>
                        {farmers.map((farmer) => (
                          <option key={farmer.id} value={farmer.id}>
                            {farmer.full_name} ({farmer.farmer_code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                        Loại Cây Trồng <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={formData.crop_type}
                        onChange={(e) => setFormData({ ...formData, crop_type: e.target.value })}
                        className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-700"
                      >
                        <option value="RICE">Lúa nước</option>
                        <option value="COFFEE">Cà phê</option>
                        <option value="PEPPER">Hồ tiêu</option>
                        <option value="DURIAN">Sầu riêng</option>
                        <option value="VEGETABLE">Rau củ</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                      Mô Tả Vùng Trồng
                    </label>
                    <textarea
                      placeholder="Nhập thông tin thổ nhưỡng, địa lý..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400 text-sm font-semibold resize-none"
                    />
                  </div>

                  {/* Real-time Overlap status and calculated Area badge */}
                  <div className="bg-[#fcfdfa] border border-[#e6ebe3] rounded-2xl p-4 space-y-2">
                    <h4 className="text-xs font-bold text-stone-600 uppercase tracking-wider">Thông số ranh giới</h4>
                    
                    {overlapChecking ? (
                      <div className="flex items-center gap-2 text-stone-500 text-xs font-medium py-1">
                        <Loader2 className="h-4 w-4 animate-spin text-[#1b4332]" />
                        <span>Đang tính toán diện tích & check chồng lấn...</span>
                      </div>
                    ) : overlapResult ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs font-semibold">
                          <span className="text-stone-500">Diện tích PostGIS:</span>
                          <span className="text-stone-800 font-mono font-bold text-sm bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            {overlapResult.areaSqm.toLocaleString(undefined, { maximumFractionDigits: 1 })} m²
                          </span>
                        </div>

                        {overlapResult.overlaps ? (
                          <div className="flex items-center gap-1.5 text-red-700 bg-red-50/70 border border-red-100 p-2 rounded-xl text-xs font-bold">
                            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                            <span>Chồng lấn ranh giới vùng: &quot;{overlapResult.zoneName}&quot;</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-emerald-800 bg-emerald-50/70 border border-emerald-100 p-2 rounded-xl text-xs font-bold">
                            <Check className="h-4 w-4 flex-shrink-0" />
                            <span>Ranh giới hợp lệ, không chồng chéo.</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-stone-400 text-xs italic py-1">Vui lòng chọn ít nhất 3 điểm trên bản đồ để tính diện tích.</p>
                    )}
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex gap-3 justify-end pt-4 border-t border-[#e6ebe3] mt-6">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-stone-200 rounded-xl hover:bg-stone-50 text-xs font-semibold text-stone-500 transition-all"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting || overlapResult?.overlaps}
                    className="flex items-center gap-2 bg-[#1b4332] hover:bg-[#143225] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all text-xs disabled:opacity-50"
                  >
                    {formSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {editingZone ? 'Lưu Thay Đổi' : 'Tạo Vùng Trồng'}
                  </button>
                </div>
              </form>

              {/* Right Column: Live Map Drawer */}
              <div className="h-[500px] lg:h-auto lg:min-h-[500px] relative rounded-2xl overflow-hidden shadow-inner border border-[#e6ebe3]">
                <FarmZoneMap
                  isDrawing={true}
                  drawingPoints={drawingPoints}
                  onDrawingPointsChange={setDrawingPoints}
                  zoom={14}
                  // On edit, pass the zone id so the map fits bounds to the existing
                  // boundary once on open (the user sees their planting area, not the default location).
                  // Create mode leaves this null (no pre-populated points to fit).
                  initialFitKey={editingZone ? editingZone.id : null}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
