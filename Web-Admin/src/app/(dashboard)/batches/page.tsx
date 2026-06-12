'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import { Batch, QrCode, Season } from '@/lib/types';
import { BatchTable } from '@/components/batches/BatchTable';
import { QrCodeTable } from '@/components/batches/QrCodeTable';
import { BatchStatusTimeline } from '@/components/batches/BatchStatusTimeline';
import { CreateBatchModal } from '@/components/batches/CreateBatchModal';
import { ActivateModal } from '@/components/batches/ActivateModal';
import { RecallModal } from '@/components/batches/RecallModal';
import { Plus, Package, Clock, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function BatchesPage() {
  const { user } = useAuthStore();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [qrCodes, setQrCodes] = useState<QrCode[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'batches' | 'qr' | 'timeline'>('batches');
  const [selectedBatchIdForQr, setSelectedBatchIdForQr] = useState<string>('');
  const [selectedBatchIdForTimeline, setSelectedBatchIdForTimeline] = useState<string>('');

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeBatchForModal, setActiveBatchForModal] = useState<Batch | null>(null);
  const [isActivateOpen, setIsActivateOpen] = useState(false);
  const [isRecallOpen, setIsRecallOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [resBatches, resSeasons] = await Promise.all([
        apiClient.get('/qr/batches'),
        apiClient.get('/seasons?status=COMPLETED'),
      ]);

      if (resBatches.data?.success) {
        setBatches(resBatches.data.data);
      }
      if (resSeasons.data?.success) {
        setSeasons(resSeasons.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Polling loop for PENDING_QR status
  useEffect(() => {
    const hasPending = batches.some((b) => b.status === 'PENDING_QR');
    if (!hasPending) return;

    const interval = setInterval(async () => {
      try {
        const res = await apiClient.get('/qr/batches');
        if (res.data?.success) {
          const fresh = res.data.data as Batch[];
          fresh.forEach((b) => {
            const old = batches.find((ob) => ob.id === b.id);
            if (old?.status === 'PENDING_QR' && b.status === 'QR_RECEIVED') {
              showToast(`✅ Đã nhận ${b.quantity_qr_requested} mã QR cho lô "${b.batch_name}" từ CheckVN!`, 'success');
            }
          });
          setBatches(fresh);
        }
      } catch (err) {
        console.error('Lỗi khi polling batches:', err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [batches]);

  // Fetch QR codes when selected batch changes
  useEffect(() => {
    const fetchQrs = async () => {
      if (!selectedBatchIdForQr) {
        setQrCodes([]);
        return;
      }
      try {
        setQrLoading(true);
        const res = await apiClient.get(`/qr/batches/${selectedBatchIdForQr}/qr-codes`);
        if (res.data?.success) {
          setQrCodes(res.data.data);
        }
      } catch (err) {
        console.error('Lỗi khi tải danh sách QR:', err);
      } finally {
        setQrLoading(false);
      }
    };
    fetchQrs();
  }, [selectedBatchIdForQr]);

  const handleCreateBatch = async (data: {
    season_id: string;
    batch_name: string;
    total_weight_kg: number;
    quantity_qr: number;
    packaging_unit: string;
    product_description?: string;
  }) => {
    try {
      setSubmitting(true);
      const res = await apiClient.post('/qr/batches', data);
      if (res.data?.success) {
        showToast('Tạo lô hàng thành công!', 'success');
        setIsCreateOpen(false);
        fetchData();
      }
    } catch (err) {
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestQr = async (id: string) => {
    try {
      setActionLoadingId(id);
      const res = await apiClient.post(`/qr/batches/${id}/request`);
      if (res.data?.success) {
        showToast('Yêu cầu cấp QR đã gửi lên CheckVN thành công!', 'success');
        fetchData();
      }
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      showToast(axiosError.response?.data?.message || 'Không thể yêu cầu cấp QR', 'error');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleActivate = async (id: string, note: string) => {
    try {
      setSubmitting(true);
      const res = await apiClient.post(`/qr/batches/${id}/activate`, { activation_note: note });
      if (res.data?.success) {
        showToast('Kích hoạt lô hàng và toàn bộ mã QR thành công!', 'success');
        setIsActivateOpen(false);
        fetchData();
      }
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      showToast(axiosError.response?.data?.message || 'Kích hoạt thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecall = async (id: string, reason: string) => {
    try {
      setSubmitting(true);
      const res = await apiClient.post(`/qr/batches/${id}/recall`, { recall_reason: reason });
      if (res.data?.success) {
        showToast('Đã thu hồi lô hàng và vô hiệu hóa QR thành công!', 'success');
        setIsRecallOpen(false);
        fetchData();
      }
    } catch (err) {
      const axiosError = err as { response?: { data?: { message?: string } } };
      showToast(axiosError.response?.data?.message || 'Thu hồi thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = (codeUrl: string) => {
    navigator.clipboard.writeText(codeUrl);
    showToast('✅ Đã copy link tra cứu vào clipboard!');
  };

  // Filter logic
  const filteredBatches = batches.filter((b) => {
    const codeMatches = b.batch_code.toLowerCase().includes(searchTerm.toLowerCase());
    const nameMatches = b.batch_name.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatches = !statusFilter || b.status === statusFilter;

    let dateMatches = true;
    if (fromDate) {
      dateMatches = dateMatches && new Date(b.created_at) >= new Date(fromDate);
    }
    if (toDate) {
      const dTo = new Date(toDate);
      dTo.setHours(23, 59, 59, 999);
      dateMatches = dateMatches && new Date(b.created_at) <= dTo;
    }

    return (codeMatches || nameMatches) && statusMatches && dateMatches;
  });

  // Calculate statistics
  const totalCount = batches.length;
  const pendingCount = batches.filter((b) => b.status === 'PENDING_QR').length;
  const activeCount = batches.filter((b) => b.status === 'ACTIVE').length;
  const recalledCount = batches.filter((b) => b.status === 'RECALLED').length;

  return (
    <div className="space-y-6 font-sans relative">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border shadow-lg animate-bounce transition-all ${
          toast.type === 'success' ? 'bg-[#E8F5E9] text-[#2E7D32] border-[#2E7D32]/20' : 'bg-red-50 text-red-800 border-red-200'
        }`}>
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold text-[#1B5E20] tracking-tight">
            Quản lý Lô Hàng & QR CheckVN
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Tạo lô hàng từ vụ thu hoạch, yêu cầu cấp mã QR và quản lý truy xuất nguồn gốc sản phẩm.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-[#1B5E20] hover:bg-[#2E7D32] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-300 text-sm"
        >
          <Plus className="h-4 w-4" />
          Tạo Lô Hàng
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-stone-50 rounded-xl text-stone-500">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Tổng lô hàng</span>
            <span className="text-2xl font-bold text-stone-800">{totalCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-orange-50 rounded-xl text-[#E65100]">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Chờ cấp QR</span>
            <span className="text-2xl font-bold text-[#E65100]">{pendingCount}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-[#E8F5E9] rounded-xl text-[#2E7D32]">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Đang lưu hành</span>
            <span className="text-2xl font-bold text-[#2E7D32]">{activeCount}</span>
          </div>
        </div>

        <div className={`bg-white p-5 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4 ${recalledCount > 0 ? 'border-red-200' : ''}`}>
          <div className={`p-3 rounded-xl ${recalledCount > 0 ? 'bg-red-50 text-[#B71C1C]' : 'bg-stone-50 text-stone-400'}`}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-stone-400 uppercase tracking-wider block">Đã thu hồi</span>
            <span className={`text-2xl font-bold ${recalledCount > 0 ? 'text-[#B71C1C]' : 'text-stone-800'}`}>{recalledCount}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('batches')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'batches' ? 'border-[#1B5E20] text-[#1B5E20] font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Lô Hàng
        </button>
        <button
          onClick={() => setActiveTab('qr')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'qr' ? 'border-[#1B5E20] text-[#1B5E20] font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Mã QR
        </button>
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-all ${
            activeTab === 'timeline' ? 'border-[#1B5E20] text-[#1B5E20] font-bold' : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Lịch sử
        </button>
      </div>

      {/* Main Views */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
            <input
              type="text"
              placeholder="Tìm theo tên, mã lô..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="py-1.5 px-3 bg-[#F9FAFB] border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none text-xs font-semibold placeholder:text-stone-400"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-3 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none text-xs font-semibold text-stone-600"
            >
              <option value="">-- Tất cả trạng thái --</option>
              <option value="DRAFT">Nháp (DRAFT)</option>
              <option value="PENDING_QR">Chờ cấp QR (PENDING_QR)</option>
              <option value="QR_RECEIVED">Đã nhận QR (QR_RECEIVED)</option>
              <option value="ACTIVE">Đang lưu hành (ACTIVE)</option>
              <option value="RECALLED">Đã thu hồi (RECALLED)</option>
            </select>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="py-1.5 px-3 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none text-xs font-semibold text-stone-600"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="py-1.5 px-3 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none text-xs font-semibold text-stone-600"
            />
          </div>

          <BatchTable
            batches={filteredBatches}
            loading={loading}
            onRequestQr={handleRequestQr}
            onActivateClick={(b) => {
              setActiveBatchForModal(b);
              setIsActivateOpen(true);
            }}
            onRecallClick={(b) => {
              setActiveBatchForModal(b);
              setIsRecallOpen(true);
            }}
            onSelectBatchForQr={(b) => {
              setSelectedBatchIdForQr(b.id);
              setActiveTab('qr');
            }}
            actionLoadingId={actionLoadingId}
          />
        </div>
      )}

      {activeTab === 'qr' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm max-w-sm">
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Chọn Lô Hàng</label>
            <select
              value={selectedBatchIdForQr}
              onChange={(e) => setSelectedBatchIdForQr(e.target.value)}
              className="w-full py-1.5 px-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none text-xs font-semibold text-stone-600"
            >
              <option value="">-- Chọn lô hàng --</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_name} ({b.batch_code})
                </option>
              ))}
            </select>
          </div>

          <QrCodeTable
            qrCodes={qrCodes}
            selectedBatch={batches.find((b) => b.id === selectedBatchIdForQr) || null}
            loading={qrLoading}
            onCopyLink={handleCopyLink}
          />
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm max-w-sm">
            <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-2">Chọn Lô Hàng</label>
            <select
              value={selectedBatchIdForTimeline}
              onChange={(e) => setSelectedBatchIdForTimeline(e.target.value)}
              className="w-full py-1.5 px-2 bg-transparent border-b border-stone-200 focus:border-[#1B5E20] focus:outline-none text-xs font-semibold text-stone-600"
            >
              <option value="">-- Chọn lô hàng --</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_name} ({b.batch_code})
                </option>
              ))}
            </select>
          </div>

          <BatchStatusTimeline
            selectedBatch={batches.find((b) => b.id === selectedBatchIdForTimeline) || null}
          />
        </div>
      )}

      {/* Modals */}
      <CreateBatchModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateBatch}
        seasons={seasons}
        submitting={submitting}
      />

      <ActivateModal
        isOpen={isActivateOpen}
        onClose={() => setIsActivateOpen(false)}
        onSubmit={handleActivate}
        batch={activeBatchForModal}
        submitting={submitting}
      />

      <RecallModal
        isOpen={isRecallOpen}
        onClose={() => setIsRecallOpen(false)}
        onSubmit={handleRecall}
        batch={activeBatchForModal}
        submitting={submitting}
      />
    </div>
  );
}
