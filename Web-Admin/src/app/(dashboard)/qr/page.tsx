'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import { CreateBatchModal } from '@/components/qr/CreateBatchModal';
import { RecallBatchModal } from '@/components/qr/RecallBatchModal';
import {
  QrCode as QrIcon,
  Plus,
  Search,
  Loader2,
  ChevronRight,
  Clock,
  Printer,
  X,
  AlertTriangle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';

interface Farmer {
  full_name: string;
  phone: string;
}

interface FarmZone {
  zone_name: string;
  farm_zone_code: string;
  farmer: Farmer;
}

interface Season {
  id: string;
  season_name: string;
  crop_variety: string;
  actual_yield_kg: number | null;
  status: string;
  batch: unknown | null;
  farm_zone: FarmZone;
}

interface Batch {
  id: string;
  batch_code: string;
  season_id: string;
  season: Season;
  batch_name: string;
  total_weight_kg: number;
  quantity_qr_requested: number;
  packaging_unit: string;
  product_description: string | null;
  status: 'DRAFT' | 'PENDING_QR' | 'QR_RECEIVED' | 'ACTIVATING' | 'ACTIVE' | 'RECALLED';
  checkvn_batch_id: string | null;
  activated_at: string | null;
  activation_note: string | null;
  recalled_at: string | null;
  recall_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface QrItem {
  id: string;
  code: string;
  status: 'INACTIVE' | 'ACTIVE' | 'RECALLED';
  scan_count: number;
  last_scanned_at: string | null;
}

export default function QRPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [batches, setBatches] = useState<Batch[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [qrCodes, setQrCodes] = useState<QrItem[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [qrLoading, setQrLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Selected Batch State
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [selectedQrCode, setSelectedQrCode] = useState<string | null>(null);

  // Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [activationNote, setActivationNote] = useState('');
  const [isActivatingFormOpen, setIsActivatingFormOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (user && user.role !== 'HTX_MANAGER' && user.role !== 'SUPER_ADMIN') {
      router.push('/');
      return;
    }
    fetchBatches();
    fetchSeasons();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (selectedBatchId) {
      fetchQrCodes(selectedBatchId);
      setIsActivatingFormOpen(false);
      setActivationNote('');
      setFormError('');
    } else {
      setQrCodes([]);
    }
  }, [selectedBatchId]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/qr/batches');
      if (res.data?.success) {
        setBatches(res.data.data);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Không thể tải danh sách lô hàng', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasons = async () => {
    try {
      const res = await apiClient.get('/seasons');
      if (res.data?.success) {
        setSeasons(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách vụ mùa:', err);
    }
  };

  const fetchQrCodes = async (batchId: string) => {
    try {
      setQrLoading(true);
      const res = await apiClient.get(`/qr/batches/${batchId}/qr-codes`);
      if (res.data?.success) {
        setQrCodes(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách mã QR:', err);
    } finally {
      setQrLoading(false);
    }
  };

  const handleRequestQr = async (batchId: string) => {
    try {
      setActionLoading(true);
      const res = await apiClient.post(`/qr/batches/${batchId}/request`);
      if (res.data?.success) {
        showToast('Yêu cầu cấp mã QR đã được gửi sang CheckVN!', 'success');
        fetchBatches();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      showToast(error.response?.data?.message || 'Yêu cầu cấp QR thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleActivateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatchId) return;

    try {
      setActionLoading(true);
      setFormError('');
      const res = await apiClient.post(`/qr/batches/${selectedBatchId}/activate`, {
        activation_note: activationNote.trim() || undefined,
      });
      if (res.data?.success) {
        showToast('Kích hoạt dải QR và lô hàng thành công!', 'success');
        setIsActivatingFormOpen(false);
        setActivationNote('');
        fetchBatches();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setFormError(error.response?.data?.message || 'Kích hoạt lô hàng thất bại');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const selectedBatch = batches.find(b => b.id === selectedBatchId);
    if (!selectedBatch) return;

    const qrItemsHtml = qrCodes.map(qr => `
      <div class="qr-card">
        <div class="qr-code-img">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(qr.code)}" alt="QR Code" />
        </div>
        <div class="qr-info">
          <div class="title">AgriTrace Traceability</div>
          <div class="code">${qr.code.substring(qr.code.lastIndexOf('/') + 1)}</div>
          <div class="batch">${selectedBatch.batch_code}</div>
        </div>
      </div>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>In Tem QR - ${selectedBatch.batch_name}</title>
          <style>
            body { font-family: sans-serif; margin: 0; padding: 20px; }
            .print-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
            .qr-card { border: 1px solid #ddd; padding: 10px; display: flex; align-items: center; gap: 10px; page-break-inside: avoid; }
            .qr-code-img img { width: 80px; height: 80px; display: block; }
            .qr-info { font-size: 10px; color: #333; line-height: 1.3; }
            .title { font-weight: bold; color: #1b4332; margin-bottom: 2px; }
            .code { font-family: monospace; font-weight: bold; }
            .batch { color: #666; font-size: 8px; margin-top: 2px; }
            @media print {
              body { padding: 0; }
              .print-grid { grid-template-columns: repeat(3, 1fr); gap: 10px; }
              .qr-card { border: 1px dashed #888; }
            }
          </style>
        </head>
        <body onload="window.print();window.close();">
          <h2 style="font-family: serif; color: #1b4332; margin-bottom: 20px; text-align: center;">Danh Sách Tem QR - ${selectedBatch.batch_name}</h2>
          <div class="print-grid">
            ${qrItemsHtml}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-stone-50 text-stone-600 border-stone-200';
      case 'PENDING_QR': return 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse';
      case 'QR_RECEIVED': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'ACTIVATING': return 'bg-sky-50 text-sky-700 border-sky-200 animate-pulse';
      case 'ACTIVE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'RECALLED': return 'bg-red-50 text-red-700 border-red-200';
      default: return 'bg-stone-100 text-stone-800 border-stone-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'Nháp';
      case 'PENDING_QR': return 'Chờ QR CheckVN';
      case 'QR_RECEIVED': return 'Chờ kích hoạt';
      case 'ACTIVATING': return 'Đang kích hoạt';
      case 'ACTIVE': return 'Hoạt động';
      case 'RECALLED': return 'Đã thu hồi';
      default: return status;
    }
  };

  const getQrStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-emerald-100 text-emerald-800';
      case 'RECALLED': return 'bg-red-100 text-red-800';
      default: return 'bg-stone-100 text-stone-600';
    }
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const filteredBatches = batches.filter(b => {
    const matchesSearch = 
      b.batch_name.toLowerCase().includes(search.toLowerCase()) ||
      b.batch_code.toLowerCase().includes(search.toLowerCase()) ||
      b.season.season_name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === '' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedBatch = batches.find(b => b.id === selectedBatchId);

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
            Quản lý Lô Hàng & QR Code
          </h1>
          <p className="text-stone-500 text-sm mt-1">
            Đóng gói sản lượng thu hoạch nông sản, đồng bộ CheckVN để xin cấp dải tem QR và kích hoạt truy xuất nguồn gốc.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 bg-[#1b4332] hover:bg-[#143225] text-white px-5 py-2.5 rounded-xl font-semibold shadow-sm transition-all duration-300 hover:scale-102 text-sm"
        >
          <Plus className="h-4 w-4" />
          Khai Báo Lô Mới
        </button>
      </div>

      {/* Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left column: Batches list */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 bg-white p-4 rounded-2xl border border-[#e6ebe3] shadow-sm">
            <div className="relative flex-1">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-stone-400" />
              </span>
              <input
                type="text"
                placeholder="Tìm lô hàng, mã lô, vụ mùa..."
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
              <option value="DRAFT">Nháp</option>
              <option value="PENDING_QR">Chờ QR CheckVN</option>
              <option value="QR_RECEIVED">Chờ kích hoạt</option>
              <option value="ACTIVE">Hoạt động</option>
              <option value="RECALLED">Đã thu hồi</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm overflow-hidden divide-y divide-[#f0f3ee] max-h-[600px] overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#1b4332]" />
                <p className="text-sm font-semibold text-stone-500">Đang tải danh sách lô hàng...</p>
              </div>
            ) : filteredBatches.length === 0 ? (
              <div className="text-center py-16">
                <QrIcon className="h-12 w-12 mx-auto text-stone-300 mb-3" />
                <p className="text-stone-500 font-medium">Không tìm thấy lô hàng nào</p>
              </div>
            ) : (
              filteredBatches.map((batch) => (
                <div
                  key={batch.id}
                  onClick={() => setSelectedBatchId(batch.id)}
                  className={`p-4 cursor-pointer transition-all duration-200 flex justify-between items-center ${
                    selectedBatchId === batch.id ? 'bg-[#f4f7f3]' : 'hover:bg-[#f5f8f4]'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 pr-4">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif font-bold text-stone-900 truncate text-sm">
                        {batch.batch_name}
                      </h3>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold border ${getStatusBadge(batch.status)}`}>
                        {getStatusLabel(batch.status)}
                      </span>
                    </div>
                    
                    <p className="text-xs text-stone-500 font-medium">
                      Mã lô: <span className="text-stone-800 font-mono font-semibold">{batch.batch_code}</span>
                    </p>

                    <p className="text-xs text-[#1b4332] font-semibold">
                      Vụ mùa: <span>{batch.season?.season_name}</span>
                    </p>

                    <p className="text-[10px] text-stone-400 font-medium flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Tạo ngày: {formatDate(batch.created_at)}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-stone-400 flex-shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right column: Detailed View */}
        <div className="lg:col-span-7">
          {!selectedBatch ? (
            <div className="bg-white rounded-3xl border border-[#e6ebe3] p-16 text-center shadow-sm">
              <QrIcon className="h-16 w-16 mx-auto text-stone-300 mb-4" />
              <h3 className="font-serif text-lg font-bold text-[#1b4332]">Chưa Chọn Lô Hàng</h3>
              <p className="text-stone-400 text-xs mt-2 max-w-sm mx-auto leading-relaxed">
                Vui lòng chọn một lô hàng từ danh sách bên trái để quản lý mã QR, yêu cầu cấp tem CheckVN và thay đổi trạng thái lô hàng.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Batch Detail Card */}
              <div className="bg-white rounded-3xl border border-[#e6ebe3] p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-start border-b border-[#e6ebe3] pb-4">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">Thông tin lô hàng</span>
                    <h2 className="font-serif text-xl font-bold text-[#1b4332] mt-1">{selectedBatch.batch_name}</h2>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(selectedBatch.status)}`}>
                      {getStatusLabel(selectedBatch.status)}
                    </span>
                    {selectedBatch.checkvn_batch_id && (
                      <p className="text-[10px] text-stone-400 font-mono mt-1">ID CheckVN: {selectedBatch.checkvn_batch_id}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                  <div className="space-y-1">
                    <span className="text-stone-400 font-semibold">Mã lô hàng</span>
                    <p className="font-mono font-bold text-stone-800">{selectedBatch.batch_code}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-stone-400 font-semibold">Quy cách đóng gói</span>
                    <p className="font-bold text-stone-800">{selectedBatch.packaging_unit}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-stone-400 font-semibold">Khối lượng lô hàng</span>
                    <p className="font-mono font-bold text-stone-800">{selectedBatch.total_weight_kg.toLocaleString()} kg</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-stone-400 font-semibold">Xuất xứ vụ mùa</span>
                    <p className="font-bold text-[#1b4332]">{selectedBatch.season?.season_name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-stone-400 font-semibold">Hộ nông dân sản xuất</span>
                    <p className="font-bold text-stone-800">{selectedBatch.season?.farm_zone?.farmer?.full_name}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-stone-400 font-semibold">Số lượng tem đề xuất</span>
                    <p className="font-mono font-bold text-stone-800">{selectedBatch.quantity_qr_requested.toLocaleString()} mã QR</p>
                  </div>
                </div>

                {selectedBatch.product_description && (
                  <div className="p-3 bg-[#fbfcf9] rounded-xl border border-[#e6ebe3] text-stone-600 text-xs leading-relaxed font-medium">
                    <strong>Mô tả nông sản:</strong> {selectedBatch.product_description}
                  </div>
                )}

                {/* Status-specific banners */}
                {selectedBatch.status === 'RECALLED' && (
                  <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-xs text-red-950 leading-relaxed space-y-1">
                    <p className="font-bold flex items-center gap-1.5"><AlertTriangle className="h-4 w-4 text-red-600" /> LÔ HÀNG ĐÃ BỊ THU HỒI</p>
                    <p className="font-medium"><strong>Thời gian thu hồi:</strong> {selectedBatch.recalled_at ? formatDate(selectedBatch.recalled_at) : 'N/A'}</p>
                    <p className="font-medium"><strong>Lý do thu hồi:</strong> {selectedBatch.recall_reason}</p>
                  </div>
                )}

                {selectedBatch.status === 'ACTIVE' && (
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl text-xs text-emerald-950 leading-relaxed">
                    <p className="font-bold flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> DẢI TEM QR ĐANG HOẠT ĐỘNG</p>
                    <p className="font-medium mt-1">Lô hàng đang lưu thông công cộng. Người tiêu dùng quét mã QR có thể xem đầy đủ thông tin xuất xứ vụ mùa, vùng trồng, và chỉ số carbon hấp thụ.</p>
                  </div>
                )}

                {/* Operations & Action Buttons */}
                <div className="pt-2 border-t border-[#e6ebe3] flex flex-wrap items-center gap-3">
                  
                  {/* Action 1: Request QR from CheckVN (DRAFT status) */}
                  {selectedBatch.status === 'DRAFT' && (
                    <button
                      onClick={() => handleRequestQr(selectedBatch.id)}
                      disabled={actionLoading}
                      className="flex items-center gap-1.5 bg-[#1b4332] hover:bg-[#143225] text-white px-4 py-2.5 rounded-xl font-bold transition-all text-xs disabled:opacity-50"
                    >
                      {actionLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrIcon className="h-4 w-4" />}
                      Yêu Cầu Cấp QR CheckVN
                    </button>
                  )}

                  {/* Action 2: Show awaiting message (PENDING_QR status) */}
                  {selectedBatch.status === 'PENDING_QR' && (
                    <div className="flex items-center gap-3 w-full">
                      <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-blue-800 text-xs font-semibold flex items-center gap-2 flex-1">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        Đang kết nối hệ thống CheckVN để xử lý cấp mã QR...
                      </div>
                      <button 
                        onClick={() => fetchBatches()} 
                        className="p-2.5 hover:bg-stone-50 rounded-xl border border-stone-200 text-stone-500 hover:text-[#1b4332] transition-colors"
                        title="Làm mới trạng thái"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    </div>
                  )}

                  {/* Action 3: Show Activate form toggle (QR_RECEIVED status) */}
                  {selectedBatch.status === 'QR_RECEIVED' && !isActivatingFormOpen && (
                    <button
                      onClick={() => setIsActivatingFormOpen(true)}
                      className="flex items-center gap-1.5 bg-[#1b4332] hover:bg-[#143225] text-white px-5 py-2.5 rounded-xl font-bold transition-all text-xs"
                    >
                      Kích Hoạt Dải QR Hàng Loạt
                    </button>
                  )}

                  {/* Action 4: Recall Batch (ACTIVE status) */}
                  {selectedBatch.status === 'ACTIVE' && (
                    <button
                      onClick={() => setIsRecallOpen(true)}
                      className="flex items-center gap-1.5 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl font-bold transition-all text-xs ml-auto"
                    >
                      Thu Hồi Lô Hàng
                    </button>
                  )}
                </div>

                {/* Form to Input Note and Activate QR codes */}
                {isActivatingFormOpen && (
                  <form onSubmit={handleActivateBatch} className="p-4 bg-[#fbfcf9] border border-[#e6ebe3] rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-200">
                    <h4 className="text-xs font-bold text-[#1b4332]">Nhập thông tin kích hoạt dải QR</h4>
                    {formError && <p className="text-[10px] text-red-600 font-semibold">{formError}</p>}
                    <div className="space-y-1">
                      <label className="text-[10px] text-stone-400 font-semibold">Ghi chú kích hoạt (Không bắt buộc)</label>
                      <input
                        type="text"
                        value={activationNote}
                        onChange={(e) => setActivationNote(e.target.value)}
                        placeholder="Nhập ghi chú xuất kho, ngày xuất..."
                        className="w-full px-3 py-1.5 bg-white border border-stone-200 focus:border-[#1b4332] focus:outline-none text-xs rounded-xl font-medium"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setIsActivatingFormOpen(false);
                          setActivationNote('');
                          setFormError('');
                        }}
                        className="px-3 py-1.5 border border-stone-200 text-stone-600 rounded-lg text-[10px] font-bold hover:bg-stone-50"
                      >
                        Hủy
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="px-4 py-1.5 bg-[#1b4332] hover:bg-[#143225] text-white rounded-lg text-[10px] font-bold flex items-center gap-1 disabled:opacity-50"
                      >
                        {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        Xác Nhận Kích Hoạt
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* QR List Section */}
              {selectedBatch.status !== 'DRAFT' && selectedBatch.status !== 'PENDING_QR' && (
                <div className="bg-white rounded-3xl border border-[#e6ebe3] p-6 shadow-sm space-y-4">
                  <div className="flex justify-between items-center border-b border-[#e6ebe3] pb-3">
                    <h3 className="font-serif text-sm font-bold text-[#1b4332] flex items-center gap-1.5">
                      <QrIcon className="h-4 w-4" />
                      Danh sách tem mã QR CheckVN ({qrCodes.length} tem)
                    </h3>
                    <button
                      onClick={handlePrint}
                      className="flex items-center gap-1.5 text-[#1b4332] hover:text-[#143225] border border-[#e6ebe3] hover:bg-stone-50 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
                    >
                      <Printer className="h-3.5 w-3.5" />
                      In Tem QR
                    </button>
                  </div>

                  {qrLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2">
                      <Loader2 className="h-6 w-6 animate-spin text-[#1b4332]" />
                      <p className="text-[11px] font-semibold text-stone-400">Đang tải dải mã QR...</p>
                    </div>
                  ) : qrCodes.length === 0 ? (
                    <div className="text-center py-8 text-stone-400 text-xs italic">
                      Chưa có mã QR nào được ghi nhận cho lô hàng này.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 max-h-[300px] overflow-y-auto p-1 bg-[#fbfcf9] rounded-2xl border border-[#e6ebe3]">
                      {qrCodes.map((qr) => (
                        <div
                          key={qr.id}
                          onClick={() => setSelectedQrCode(qr.code)}
                          className="bg-white p-2 border border-stone-200 hover:border-[#1b4332] rounded-xl flex flex-col items-center gap-1.5 cursor-zoom-in transition-all group relative"
                        >
                          <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(qr.code)}`}
                            alt="QR"
                            className="w-12 h-12 display-block"
                          />
                          <span className={`text-[8px] font-bold px-1 rounded ${getQrStatusBadge(qr.status)}`}>
                            {qr.status}
                          </span>
                          
                          {/* Mini Tooltip on Hover */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:flex flex-col items-center z-10 bg-stone-900 text-white text-[9px] p-2 rounded shadow-md w-24 text-center leading-normal">
                            <span className="font-mono font-bold truncate w-full">{qr.code.substring(qr.code.lastIndexOf('/') + 1)}</span>
                            <span>Lượt quét: {qr.scan_count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* QR Large View Modal */}
      {selectedQrCode && (
        <div className="fixed inset-0 bg-stone-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full border border-[#e6ebe3] text-center relative animate-in fade-in zoom-in-95 duration-200 shadow-2xl">
            <button
              onClick={() => setSelectedQrCode(null)}
              className="absolute top-4 right-4 p-1 hover:bg-stone-100 rounded-xl text-stone-400 hover:text-stone-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            <h4 className="font-serif text-md font-bold text-[#1b4332] mb-1">Mã QR Truy xuất nguồn gốc</h4>
            <p className="text-stone-400 text-[10px] mb-4">Quét thử mã QR bằng camera điện thoại của bạn</p>
            <div className="bg-[#fbfcf9] p-4 border border-[#e6ebe3] rounded-2xl inline-block mb-4 shadow-inner">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedQrCode)}`}
                alt="Large QR"
                className="w-44 h-44 mx-auto"
              />
            </div>
            <div className="space-y-2">
              <p className="text-xs font-semibold text-stone-500">Đường dẫn CheckVN:</p>
              <a
                href={selectedQrCode}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-mono font-bold text-[#1b4332] hover:underline break-all block"
              >
                {selectedQrCode}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Create Batch Modal */}
      <CreateBatchModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          showToast('Khai báo lô hàng mới thành công!', 'success');
          fetchBatches();
          fetchSeasons();
        }}
        seasons={seasons}
      />

      {/* Recall Batch Modal */}
      {selectedBatch && (
        <RecallBatchModal
          isOpen={isRecallOpen}
          onClose={() => setIsRecallOpen(false)}
          onSuccess={() => {
            showToast('Thu hồi lô hàng thành công!', 'success');
            fetchBatches();
          }}
          batchId={selectedBatch.id}
          batchName={selectedBatch.batch_name}
        />
      )}
    </div>
  );
}
