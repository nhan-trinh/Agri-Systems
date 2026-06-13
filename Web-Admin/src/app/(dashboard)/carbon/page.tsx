'use client';

import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import { 
  Leaf, 
  Search, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Download,
  Eye,
  Check,
  Award,
  ChevronLeft,
  ChevronRight,
  X,
  TrendingUp,
  Calculator,
  User,
  Sprout
} from 'lucide-react';

interface CarbonRecord {
  id: string;
  season_id: string;
  total_emitted_kg: number;
  total_sequestered_kg: number;
  net_carbon_tCO2e: number;
  status: 'DRAFT' | 'VERIFIED' | 'ISSUED';
  verified_by: string | null;
  verified_at: string | null;
  issued_at: string | null;
  certificate_no: string | null;
  credit_amount_tCO2e: number | null;
  created_at: string;
  season: {
    season_name: string;
    crop_variety: string;
    actual_yield_kg: number;
    farm_zone: {
      zone_name: string;
      farm_zone_code: string;
      farmer: {
        full_name: string;
        cooperative?: {
          name: string;
        };
      };
    };
  };
  calculation_details: {
    factor_version?: string;
    fertilizers: Array<{
      log_id: string;
      activity_date: string;
      fertilizer_type: string;
      quantity_kg: number;
      factor_value: number;
      emissions_kgCO2e: number;
    }>;
    pesticides: Array<{
      log_id: string;
      activity_date: string;
      product_name: string;
      quantity_liters: number;
      factor_value: number;
      emissions_kgCO2e: number;
    }>;
    harvest: Array<{
      log_id: string;
      activity_date: string;
      yield_kg: number;
      crop_type: string;
      factor_value: number;
      sequestration_kgCO2: number;
    }>;
  };
}

export default function CarbonPage() {
  const { user } = useAuthStore();
  const [records, setRecords] = useState<CarbonRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'VERIFIED' | 'ISSUED'>('ALL');
  const [search, setSearch] = useState('');
  
  // Modals & Details State
  const [selectedRecord, setSelectedRecord] = useState<CarbonRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'breakdown'>('overview');
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Stats Card state
  const [totalEmitted, setTotalEmitted] = useState(0);
  const [totalSequestered, setTotalSequestered] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);

  // Polling State & References
  const [pollingJobs, setPollingJobs] = useState<{ [recordId: string]: string }>({});
  const pollingIntervals = useRef<{ [recordId: string]: NodeJS.Timeout }>({});
  const [actionLoading, setActionLoading] = useState<{ [key: string]: boolean }>({});

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchRecords();
    const activeIntervals = pollingIntervals.current;
    // Cleanup polling intervals on unmount
    return () => {
      Object.values(activeIntervals).forEach(clearInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const params: { page: number; limit: number; status?: string } = {
        page,
        limit,
      };
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }

      const res = await apiClient.get('/carbon/records', { params });
      if (res.data?.success) {
        const dataList = res.data.data.data || [];
        setRecords(dataList);
        setTotal(res.data.data.total || 0);

        // Sum aggregates for stats card from this page's list
        let emittedSum = 0;
        let seqSum = 0;
        let creditsSum = 0;
        dataList.forEach((r: CarbonRecord) => {
          emittedSum += r.total_emitted_kg;
          seqSum += r.total_sequestered_kg;
          if (r.status === 'ISSUED' && r.credit_amount_tCO2e) {
            creditsSum += r.credit_amount_tCO2e;
          }
        });
        setTotalEmitted(Number((emittedSum / 1000).toFixed(2)));
        setTotalSequestered(Number((seqSum / 1000).toFixed(2)));
        setTotalCredits(Number(creditsSum.toFixed(2)));
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể tải danh sách bản ghi Carbon', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [`verify-${id}`]: true }));
      const res = await apiClient.post(`/carbon/records/${id}/verify`);
      if (res.data?.success) {
        showToast('Xác minh số liệu phát thải thành công!', 'success');
        fetchRecords();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Có lỗi xảy ra khi xác minh', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`verify-${id}`]: false }));
    }
  };

  const handleIssue = async (id: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [`issue-${id}`]: true }));
      const res = await apiClient.post(`/carbon/records/${id}/issue`);
      if (res.data?.success) {
        showToast('Phát hành tín chỉ Carbon thành công! Đang tạo chứng chỉ PDF...', 'success');
        fetchRecords();
        // Start background polling for PDF generation automatically
        if (res.data.data?.exportJobId) {
          startPdfPolling(id, res.data.data.exportJobId);
        } else {
          // Fallback if no exportJobId in response directly
          fetchCertificateStatus(id);
        }
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Có lỗi xảy ra khi phát hành tín chỉ', 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [`issue-${id}`]: false }));
    }
  };

  const fetchCertificateStatus = async (recordId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [`download-${recordId}`]: true }));
      const res = await apiClient.get(`/carbon/records/${recordId}/certificate`);
      if (res.data?.success && res.data.data?.id) {
        startPdfPolling(recordId, res.data.data.id);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể yêu cầu tạo chứng chỉ', 'error');
      setActionLoading(prev => ({ ...prev, [`download-${recordId}`]: false }));
    }
  };

  const startPdfPolling = (recordId: string, jobId: string) => {
    if (pollingIntervals.current[recordId]) {
      clearInterval(pollingIntervals.current[recordId]);
    }

    setPollingJobs(prev => ({ ...prev, [recordId]: jobId }));
    setActionLoading(prev => ({ ...prev, [`download-${recordId}`]: true }));

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get(`/carbon/export-jobs/${jobId}`);
        if (res.data?.success) {
          const job = res.data.data;
          if (job.status === 'COMPLETED') {
            clearInterval(interval);
            delete pollingIntervals.current[recordId];
            setPollingJobs(prev => {
              const updated = { ...prev };
              delete updated[recordId];
              return updated;
            });
            setActionLoading(prev => ({ ...prev, [`download-${recordId}`]: false }));
            showToast('Đã tạo xong chứng chỉ! Tự động tải xuống...', 'success');
            
            // Trigger browser download/redirect
            const downloadUrl = job.download_url.startsWith('http') 
              ? job.download_url 
              : `${apiClient.defaults.baseURL || ''}/..${job.download_url}`;
            window.open(downloadUrl, '_blank');
          } else if (job.status === 'FAILED') {
            clearInterval(interval);
            delete pollingIntervals.current[recordId];
            setPollingJobs(prev => {
              const updated = { ...prev };
              delete updated[recordId];
              return updated;
            });
            setActionLoading(prev => ({ ...prev, [`download-${recordId}`]: false }));
            showToast('Quá trình tạo chứng chỉ thất bại từ phía máy chủ.', 'error');
          }
        }
      } catch {
        clearInterval(interval);
        delete pollingIntervals.current[recordId];
        setPollingJobs(prev => {
          const updated = { ...prev };
          delete updated[recordId];
          return updated;
        });
        setActionLoading(prev => ({ ...prev, [`download-${recordId}`]: false }));
        showToast('Có lỗi xảy ra khi truy vấn tiến trình xuất PDF.', 'error');
      }
    }, 1500);

    pollingIntervals.current[recordId] = interval;
  };

  const openDetailModal = (record: CarbonRecord) => {
    setSelectedRecord(record);
    setActiveTab('overview');
    setIsDetailOpen(true);
  };

  // Local Search Filtering on currently fetched list
  const filteredRecords = records.filter((r) => {
    const searchLower = search.toLowerCase();
    const seasonName = r.season?.season_name?.toLowerCase() || '';
    const farmerName = r.season?.farm_zone?.farmer?.full_name?.toLowerCase() || '';
    const zoneCode = r.season?.farm_zone?.farm_zone_code?.toLowerCase() || '';
    const certNo = r.certificate_no?.toLowerCase() || '';
    
    return (
      seasonName.includes(searchLower) ||
      farmerName.includes(searchLower) ||
      zoneCode.includes(searchLower) ||
      certNo.includes(searchLower)
    );
  });

  const totalPages = Math.ceil(total / limit);

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
      <div>
        <h1 className="font-serif text-3xl font-bold text-[#1b4332] tracking-tight">
          Báo cáo & Chứng nhận Carbon
        </h1>
        <p className="text-stone-500 text-sm mt-1">
          Giám sát lượng hấp thụ ròng, thẩm định số liệu phát thải và quản lý việc phát hành tín chỉ carbon.
        </p>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-[#e6ebe3] shadow-sm flex items-center gap-4">
          <div className="bg-red-50 text-red-700 p-3 rounded-xl">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Tổng phát thải quy đổi</p>
            <h3 className="text-2xl font-bold text-stone-800 mt-1">{totalEmitted} <span className="text-sm font-medium text-stone-500">tCO2e</span></h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e6ebe3] shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl">
            <Sprout className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Tổng hấp thụ quy đổi</p>
            <h3 className="text-2xl font-bold text-[#1b4332] mt-1">{totalSequestered} <span className="text-sm font-medium text-stone-500">tCO2e</span></h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-[#e6ebe3] shadow-sm flex items-center gap-4">
          <div className="bg-amber-50 text-amber-700 p-3 rounded-xl">
            <Award className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-wider">Tín chỉ carbon đã cấp</p>
            <h3 className="text-2xl font-bold text-amber-800 mt-1">{totalCredits} <span className="text-sm font-medium text-stone-500">tCO2e</span></h3>
          </div>
        </div>
      </div>

      {/* Filter and Search Section */}
      <div className="bg-white p-4 rounded-2xl border border-[#e6ebe3] shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        {/* Status Tabs */}
        <div className="flex bg-[#f4f7f3] p-1 rounded-xl w-fit">
          <button
            onClick={() => { setStatusFilter('ALL'); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'ALL' 
                ? 'bg-white text-[#1b4332] shadow-sm' 
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => { setStatusFilter('DRAFT'); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'DRAFT' 
                ? 'bg-white text-[#1b4332] shadow-sm' 
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Bản nháp
          </button>
          <button
            onClick={() => { setStatusFilter('VERIFIED'); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'VERIFIED' 
                ? 'bg-white text-[#1b4332] shadow-sm' 
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Đã xác minh
          </button>
          <button
            onClick={() => { setStatusFilter('ISSUED'); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              statusFilter === 'ISSUED' 
                ? 'bg-white text-[#1b4332] shadow-sm' 
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Đã phát hành
          </button>
        </div>

        {/* Search Input */}
        <div className="relative max-w-md flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-stone-400" />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm vụ mùa, vùng trồng, nông dân..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-[#fbfcf9] border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all placeholder:text-stone-400"
          />
        </div>
      </div>

      {/* Main Records Table */}
      <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#1b4332]" />
            <p className="text-sm font-semibold text-stone-500">Đang tải danh sách...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-20">
            <Leaf className="h-12 w-12 mx-auto text-stone-300 mb-3 animate-pulse" />
            <p className="text-stone-500 font-medium">Không tìm thấy bản ghi carbon nào phù hợp</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f0f5ee] border-b border-[#e6ebe3] text-stone-600 text-xs font-bold uppercase tracking-wider">
                  <th className="p-4 pl-6">Vụ mùa / Vùng trồng</th>
                  <th className="p-4">Hộ nông dân</th>
                  {user?.role !== 'HTX_MANAGER' && <th className="p-4">Hợp tác xã</th>}
                  <th className="p-4">Phát thải / Hấp thụ</th>
                  <th className="p-4">Carbon ròng</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4">Chứng nhận</th>
                  <th className="p-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f0f3ee] text-sm text-stone-700">
                {filteredRecords.map((record) => {
                  const hasCredits = record.net_carbon_tCO2e < 0;
                  const isPolling = !!pollingJobs[record.id];

                  return (
                    <tr 
                      key={record.id}
                      className="hover:bg-[#f5f8f4] transition-all duration-200"
                    >
                      {/* Vụ mùa / Vùng trồng */}
                      <td className="p-4 pl-6">
                        <div className="font-bold text-stone-900">{record.season?.season_name}</div>
                        <div className="text-xs text-stone-400 mt-0.5">
                          {record.season?.farm_zone?.zone_name} ({record.season?.farm_zone?.farm_zone_code})
                        </div>
                      </td>

                      {/* Hộ nông dân */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5 font-medium text-stone-700">
                          <User className="h-4 w-4 text-stone-400" />
                          {record.season?.farm_zone?.farmer?.full_name}
                        </div>
                      </td>

                      {/* Hợp tác xã (HTX) */}
                      {user?.role !== 'HTX_MANAGER' && (
                        <td className="p-4 font-semibold text-stone-600">
                          {record.season?.farm_zone?.farmer?.cooperative?.name || 'Chưa liên kết'}
                        </td>
                      )}

                      {/* Phát thải / Hấp thụ */}
                      <td className="p-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-red-600">Bón/Phun: {(record.total_emitted_kg).toLocaleString('vi-VN')} kg</span>
                          <span className="text-xs text-emerald-600">Thu hoạch: {(record.total_sequestered_kg).toLocaleString('vi-VN')} kg</span>
                        </div>
                      </td>

                      {/* Carbon ròng (tCO2e) */}
                      <td className="p-4 font-mono font-bold">
                        <span className={record.net_carbon_tCO2e < 0 ? 'text-emerald-700' : 'text-red-700'}>
                          {record.net_carbon_tCO2e > 0 ? '+' : ''}{record.net_carbon_tCO2e} tCO2e
                        </span>
                      </td>

                      {/* Trạng thái */}
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          record.status === 'ISSUED' 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : record.status === 'VERIFIED'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            record.status === 'ISSUED' 
                              ? 'bg-emerald-600'
                              : record.status === 'VERIFIED'
                              ? 'bg-blue-600'
                              : 'bg-amber-600'
                          }`} />
                          {record.status === 'ISSUED' 
                            ? 'Đã cấp tín chỉ' 
                            : record.status === 'VERIFIED' 
                            ? 'Đã xác minh' 
                            : 'Bản nháp'}
                        </span>
                      </td>

                      {/* Số Chứng nhận */}
                      <td className="p-4 text-xs font-semibold text-stone-600">
                        {record.certificate_no ? (
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 rounded px-2 py-0.5 w-fit font-mono">
                            <Award className="h-3.5 w-3.5 text-amber-600" />
                            {record.certificate_no}
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">Chưa cấp</span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="p-4 pr-6 text-right">
                        <div className="flex justify-end items-center gap-2">
                          <button
                            onClick={() => openDetailModal(record)}
                            className="p-1.5 text-stone-500 hover:bg-stone-100 rounded-lg transition-all"
                            title="Xem chi tiết"
                          >
                            <Eye className="h-4 w-4" />
                          </button>

                          {/* Verify Action for SUPER_ADMIN */}
                          {user?.role === 'SUPER_ADMIN' && record.status === 'DRAFT' && (
                            <button
                              onClick={() => handleVerify(record.id)}
                              disabled={actionLoading[`verify-${record.id}`]}
                              className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                            >
                              {actionLoading[`verify-${record.id}`] ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )}
                              Xác minh
                            </button>
                          )}

                          {/* Issue Action for SUPER_ADMIN */}
                          {user?.role === 'SUPER_ADMIN' && record.status === 'VERIFIED' && (
                            <button
                              onClick={() => handleIssue(record.id)}
                              disabled={!hasCredits || actionLoading[`issue-${record.id}`]}
                              className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all ${
                                hasCredits 
                                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                                  : 'bg-stone-100 text-stone-400 border border-stone-200 cursor-not-allowed'
                              }`}
                              title={hasCredits ? 'Phát hành chứng nhận tín chỉ carbon' : 'Không có lượng hấp thụ ròng'}
                            >
                              {actionLoading[`issue-${record.id}`] ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Award className="h-3 w-3" />
                              )}
                              Cấp tín chỉ
                            </button>
                          )}

                          {/* Download PDF Action for SUPER_ADMIN & HTX_MANAGER */}
                          {(user?.role === 'SUPER_ADMIN' || user?.role === 'HTX_MANAGER') && record.status === 'ISSUED' && (
                            <button
                              onClick={() => fetchCertificateStatus(record.id)}
                              disabled={actionLoading[`download-${record.id}`]}
                              className="flex items-center gap-1 bg-[#1b4332] hover:bg-[#143225] disabled:bg-[#1b4332]/70 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-sm transition-all"
                            >
                              {isPolling ? (
                                <>
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  <span>Đang tạo...</span>
                                </>
                              ) : (
                                <>
                                  <Download className="h-3 w-3" />
                                  <span>Tải PDF</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {!loading && totalPages > 1 && (
          <div className="bg-[#fbfcf9] border-t border-[#e6ebe3] px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-stone-500">
              Hiển thị <span className="font-semibold">{records.length}</span> trên tổng số <span className="font-semibold">{total}</span> bản ghi
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                disabled={page === 1}
                className="p-1.5 border border-stone-200 hover:bg-stone-50 text-stone-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs font-bold flex items-center px-3 text-stone-700 bg-white border border-stone-200 rounded-lg">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                disabled={page === totalPages}
                className="p-1.5 border border-stone-200 hover:bg-stone-50 text-stone-500 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail & Formula Breakdown Modal */}
      {isDetailOpen && selectedRecord && (
        <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1b4332]">
                  Chi tiết Tính toán Carbon
                </h3>
                <p className="text-stone-500 text-xs mt-0.5">
                  Vụ mùa: <strong className="text-stone-700">{selectedRecord.season?.season_name}</strong> | Vùng trồng: <strong className="text-stone-700">{selectedRecord.season?.farm_zone?.zone_name}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-[#e6ebe3] px-6 bg-white">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'overview' 
                    ? 'border-[#1b4332] text-[#1b4332]' 
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                Tổng quan số liệu
              </button>
              <button
                onClick={() => setActiveTab('breakdown')}
                className={`py-3 px-4 text-sm font-bold border-b-2 transition-all ${
                  activeTab === 'breakdown' 
                    ? 'border-[#1b4332] text-[#1b4332]' 
                    : 'border-transparent text-stone-400 hover:text-stone-600'
                }`}
              >
                Bảng kê vật tư & Công thức
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              {activeTab === 'overview' ? (
                <div className="space-y-6">
                  {/* Summary Metric Boxes */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-red-50/50 border border-red-100 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-red-600 uppercase">Tổng phát thải</p>
                      <h4 className="text-xl font-bold text-red-800 mt-1">{(selectedRecord.total_emitted_kg).toLocaleString('vi-VN')} <span className="text-xs font-normal">kg CO2e</span></h4>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-emerald-600 uppercase">Lượng hấp thụ ròng</p>
                      <h4 className="text-xl font-bold text-emerald-800 mt-1">{(selectedRecord.total_sequestered_kg).toLocaleString('vi-VN')} <span className="text-xs font-normal">kg CO2</span></h4>
                    </div>
                    <div className="bg-amber-50/50 border border-amber-100 p-4 rounded-xl">
                      <p className="text-[10px] font-bold text-amber-600 uppercase">Net Carbon giảm thiểu</p>
                      <h4 className="text-xl font-bold text-amber-800 mt-1">{selectedRecord.net_carbon_tCO2e} <span className="text-xs font-normal">tCO2e</span></h4>
                    </div>
                  </div>

                  {/* Emissions vs Absorption visualization slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold text-stone-500">
                      <span>PHÁT THẢI (Bón phân, phun thuốc)</span>
                      <span>HẤP THỤ (Thu hoạch nông sản)</span>
                    </div>
                    <div className="h-4 w-full bg-stone-100 rounded-full overflow-hidden flex">
                      <div 
                        className="bg-red-500 h-full transition-all"
                        style={{ width: `${Math.min(100, (selectedRecord.total_emitted_kg / (selectedRecord.total_emitted_kg + selectedRecord.total_sequestered_kg || 1)) * 100)}%` }}
                      />
                      <div 
                        className="bg-emerald-500 h-full flex-1 transition-all"
                        style={{ width: `${Math.min(100, (selectedRecord.total_sequestered_kg / (selectedRecord.total_emitted_kg + selectedRecord.total_sequestered_kg || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Audit Logs */}
                  <div className="bg-[#fbfcf9] border border-[#e6ebe3] rounded-2xl p-4 space-y-3">
                    <h4 className="font-bold text-stone-800 text-sm flex items-center gap-1.5">
                      <Award className="h-4 w-4 text-[#1b4332]" />
                      Thông tin lịch sử và chứng thực
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-stone-400 block font-semibold">Tạo bản ghi lúc:</span>
                        <span className="text-stone-700 font-bold">{new Date(selectedRecord.created_at).toLocaleString('vi-VN')}</span>
                      </div>
                      <div>
                        <span className="text-stone-400 block font-semibold">Mã giống cây canh tác:</span>
                        <span className="text-stone-700 font-bold">{selectedRecord.season?.crop_variety}</span>
                      </div>
                      {selectedRecord.verified_at && (
                        <div>
                          <span className="text-stone-400 block font-semibold">Thẩm định (Xác minh) lúc:</span>
                          <span className="text-stone-700 font-bold">{new Date(selectedRecord.verified_at).toLocaleString('vi-VN')}</span>
                        </div>
                      )}
                      {selectedRecord.issued_at && (
                        <div>
                          <span className="text-stone-400 block font-semibold">Phát hành chứng nhận lúc:</span>
                          <span className="text-stone-700 font-bold">{new Date(selectedRecord.issued_at).toLocaleString('vi-VN')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Calculation Details Formula */}
                  <div className="bg-[#f0f4ee] p-4 rounded-xl border border-[#e6ebe3] flex items-start gap-3">
                    <Calculator className="h-5 w-5 text-[#1b4332] flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-sm text-[#1b4332]">Công thức tính toán Net Carbon (IPCC 2006)</h4>
                      <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                        <code>Net Carbon (tCO2e) = (Phát thải bón phân (kgCO2e) + Phát thải phun thuốc (kgCO2e) - Hấp thụ thu hoạch (kgCO2)) / 1000</code>
                      </p>
                      <p className="text-[10px] text-stone-400 mt-2 font-medium">
                        Phiên bản hệ số dữ liệu: {selectedRecord.calculation_details?.factor_version || 'IPCC v2006 / MONRE v2020'}
                      </p>
                    </div>
                  </div>

                  {/* Fertilizers Table */}
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-red-600 mb-2">1. Chi tiết lượng phân bón sử dụng</h5>
                    {selectedRecord.calculation_details?.fertilizers?.length === 0 ? (
                      <p className="text-xs italic text-stone-400 pl-2">Không ghi nhận hoạt động bón phân nào</p>
                    ) : (
                      <table className="w-full text-left text-xs border border-stone-100 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-stone-50 text-stone-600 font-bold">
                            <th className="p-2.5">Ngày bón</th>
                            <th className="p-2.5">Loại phân</th>
                            <th className="p-2.5 text-right">Khối lượng (kg)</th>
                            <th className="p-2.5 text-right">Hệ số phát thải (kgCO2e/kg)</th>
                            <th className="p-2.5 text-right">Quy đổi (kgCO2e)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {selectedRecord.calculation_details?.fertilizers?.map((item, i) => (
                            <tr key={i} className="hover:bg-stone-50">
                              <td className="p-2.5">{new Date(item.activity_date).toLocaleDateString('vi-VN')}</td>
                              <td className="p-2.5 font-semibold">{item.fertilizer_type}</td>
                              <td className="p-2.5 text-right font-mono font-medium">{item.quantity_kg.toLocaleString('vi-VN')}</td>
                              <td className="p-2.5 text-right font-mono">{item.factor_value}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-red-600">{Number(item.emissions_kgCO2e.toFixed(2)).toLocaleString('vi-VN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Pesticides Table */}
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-red-600 mb-2">2. Chi tiết lượng thuốc BVTV sử dụng</h5>
                    {selectedRecord.calculation_details?.pesticides?.length === 0 ? (
                      <p className="text-xs italic text-stone-400 pl-2">Không ghi nhận hoạt động phun thuốc nào</p>
                    ) : (
                      <table className="w-full text-left text-xs border border-stone-100 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-stone-50 text-stone-600 font-bold">
                            <th className="p-2.5">Ngày phun</th>
                            <th className="p-2.5">Tên thuốc</th>
                            <th className="p-2.5 text-right">Lượng sử dụng (lít)</th>
                            <th className="p-2.5 text-right">Hệ số (kgCO2e/lít)</th>
                            <th className="p-2.5 text-right">Quy đổi (kgCO2e)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {selectedRecord.calculation_details?.pesticides?.map((item, i) => (
                            <tr key={i} className="hover:bg-stone-50">
                              <td className="p-2.5">{new Date(item.activity_date).toLocaleDateString('vi-VN')}</td>
                              <td className="p-2.5 font-semibold">{item.product_name}</td>
                              <td className="p-2.5 text-right font-mono font-medium">{item.quantity_liters.toLocaleString('vi-VN')}</td>
                              <td className="p-2.5 text-right font-mono">{item.factor_value}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-red-600">{Number(item.emissions_kgCO2e.toFixed(2)).toLocaleString('vi-VN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Harvesting Absorption Table */}
                  <div>
                    <h5 className="font-bold text-xs uppercase tracking-wider text-emerald-600 mb-2">3. Hấp thụ qua sinh khối (Thu hoạch)</h5>
                    {selectedRecord.calculation_details?.harvest?.length === 0 ? (
                      <p className="text-xs italic text-stone-400 pl-2">Không có dữ liệu thu hoạch</p>
                    ) : (
                      <table className="w-full text-left text-xs border border-stone-100 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-stone-50 text-stone-600 font-bold">
                            <th className="p-2.5">Ngày gặt/hái</th>
                            <th className="p-2.5">Loại nông sản</th>
                            <th className="p-2.5 text-right">Sản lượng (kg)</th>
                            <th className="p-2.5 text-right">Hệ số hấp thụ carbon</th>
                            <th className="p-2.5 text-right">Hấp thụ quy đổi (kgCO2)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-50">
                          {selectedRecord.calculation_details?.harvest?.map((item, i) => (
                            <tr key={i} className="hover:bg-stone-50">
                              <td className="p-2.5">{new Date(item.activity_date).toLocaleDateString('vi-VN')}</td>
                              <td className="p-2.5 font-semibold">{item.crop_type}</td>
                              <td className="p-2.5 text-right font-mono font-medium">{item.yield_kg.toLocaleString('vi-VN')}</td>
                              <td className="p-2.5 text-right font-mono">{item.factor_value}</td>
                              <td className="p-2.5 text-right font-mono font-bold text-emerald-600">{(item.sequestration_kgCO2).toLocaleString('vi-VN')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#e6ebe3] bg-[#fbfcf9]">
              <button
                type="button"
                onClick={() => setIsDetailOpen(false)}
                className="px-5 py-2 border border-stone-200 rounded-xl hover:bg-stone-50 text-xs font-semibold text-stone-500 transition-all"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
