'use client';

import { useEffect, useState, useRef, Fragment } from 'react';
import { apiClient } from '../../lib/api/axios';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  X,
  Clock,
  Eye
} from 'lucide-react';

interface OCRDashboardProps {
  onReview: (docId: string) => void;
}

interface Season {
  id: string;
  season_name: string;
  farm_zone: {
    zone_name: string;
  };
  status: string;
}

interface OcrDocumentItem {
  document_id: string;
  filename: string;
  status: 'QUEUED' | 'PROCESSING' | 'AWAITING_REVIEW' | 'CONFIRMED' | 'REJECTED' | 'ERROR';
  document_type: string;
  error_message?: string;
  rejection_reason?: string;
}

interface OcrBatchItem {
  batch_id: string;
  status: 'QUEUED' | 'PROCESSING' | 'AWAITING_REVIEW' | 'PARTIALLY_FAILED' | 'CONFIRMED' | 'ERROR';
  total_files: number;
  processed_files: number;
  failed_files: number;
  created_at: string;
  documents: OcrDocumentItem[];
}

export function OCRDashboard({ onReview }: OCRDashboardProps) {
  const [activeTab, setActiveTab] = useState<'UPLOAD' | 'HISTORY'>('UPLOAD');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(false);

  // Upload States
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [documentHint, setDocumentHint] = useState<'AUTO' | 'FARMING_LOGBOOK' | 'MATERIAL_INVOICE'>('AUTO');
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // History States
  const [batches, setBatches] = useState<OcrBatchItem[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [expandedBatchId, setExpandedBatchId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Toast State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch active seasons for selection
  useEffect(() => {
    if (documentHint === 'FARMING_LOGBOOK') {
      const fetchSeasons = async () => {
        try {
          setLoadingSeasons(true);
          const res = await apiClient.get('/seasons');
          if (res.data?.success) {
            // Filter only active seasons if applicable
            setSeasons(res.data.data.filter((s: Season) => s.status === 'ACTIVE'));
          }
        } catch (err) {
          console.error('Error fetching seasons:', err);
          showToast('Không thể tải danh sách vụ mùa', 'error');
        } finally {
          setLoadingSeasons(false);
        }
      };
      fetchSeasons();
    }
  }, [documentHint]);

  // Fetch batches when tab changes or filter/page updates
  const fetchBatches = async () => {
    try {
      setLoadingBatches(true);
      let url = `/ocr/batches?page=${page}&limit=10`;
      if (filterStatus) {
        url += `&status=${filterStatus}`;
      }
      const res = await apiClient.get(url);
      if (res.data?.success) {
        setBatches(res.data.data);
        if (res.data.meta) {
          setTotalPages(res.data.meta.total_pages || 1);
        }
      }
    } catch (err) {
      console.error('Error fetching batches:', err);
      showToast('Không thể tải danh sách lô quét', 'error');
    } finally {
      setLoadingBatches(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'HISTORY') {
      fetchBatches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, page, filterStatus]);

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter(file => {
      const isValidType = ['image/jpeg', 'image/png', 'application/pdf'].includes(file.type);
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      if (!isValidType) {
        showToast(`Tệp "${file.name}" không hợp lệ. Chỉ hỗ trợ JPG, PNG, PDF.`, 'error');
      }
      if (!isValidSize) {
        showToast(`Tệp "${file.name}" quá lớn. Giới hạn là 10MB.`, 'error');
      }
      return isValidType && isValidSize;
    });

    setFilesToUpload(prev => {
      const combined = [...prev, ...validFiles];
      if (combined.length > 10) {
        showToast('Chỉ cho phép tải lên tối đa 10 tệp mỗi lần.', 'error');
        return combined.slice(0, 10);
      }
      return combined;
    });
  };

  const removeFile = (index: number) => {
    setFilesToUpload(prev => prev.filter((_, i) => i !== index));
  };

  // Submit Batch Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (filesToUpload.length === 0) {
      showToast('Vui lòng chọn ít nhất một tài liệu để quét.', 'error');
      return;
    }

    if (documentHint === 'FARMING_LOGBOOK' && !selectedSeasonId) {
      showToast('Vui lòng chọn vụ mùa tương ứng.', 'error');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      filesToUpload.forEach(file => {
        formData.append('files', file);
      });
      formData.append('document_hint', documentHint);
      if (selectedSeasonId) {
        formData.append('season_id', selectedSeasonId);
      }

      const res = await apiClient.post('/ocr/batches', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.status === 202 || res.data?.success) {
        showToast('Đã gửi tài liệu lên hàng đợi số hóa OCR thành công!', 'success');
        setFilesToUpload([]);
        setSelectedSeasonId('');
        // Switch to history tab to view processing status
        setActiveTab('HISTORY');
        setPage(1);
      }
    } catch (err: unknown) {
      console.error('Upload failed:', err);
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || 'Có lỗi xảy ra khi tải lên tài liệu';
      showToast(msg, 'error');
    } finally {
      setUploading(false);
    }
  };

  // Retry failed document processing
  const handleRetryDocument = async (docId: string) => {
    try {
      setActionLoading(prev => ({ ...prev, [docId]: true }));
      const res = await apiClient.post(`/ocr/documents/${docId}/retry`);
      if (res.data?.success || res.status === 202) {
        showToast('Đang gửi lại tài liệu xử lý...', 'success');
        // Refresh batches to show QUEUED status
        fetchBatches();
      }
    } catch (err: unknown) {
      console.error('Retry failed:', err);
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || 'Không thể thử lại xử lý tài liệu';
      showToast(msg, 'error');
    } finally {
      setActionLoading(prev => ({ ...prev, [docId]: false }));
    }
  };

  const getBatchStatusBadge = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return <span className="bg-stone-100 text-stone-700 px-3 py-1 rounded-full text-xs font-semibold border border-stone-200">Đang chờ</span>;
      case 'PROCESSING':
        return <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-semibold border border-blue-100 flex items-center gap-1.5 w-fit"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang quét</span>;
      case 'AWAITING_REVIEW':
        return <span className="bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-semibold border border-amber-200">Chờ duyệt</span>;
      case 'PARTIALLY_FAILED':
        return <span className="bg-orange-50 text-orange-700 px-3 py-1 rounded-full text-xs font-semibold border border-orange-200">Lỗi một phần</span>;
      case 'CONFIRMED':
        return <span className="bg-emerald-50 text-emerald-800 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200">Đã hoàn thành</span>;
      case 'ERROR':
        return <span className="bg-red-50 text-red-700 px-3 py-1 rounded-full text-xs font-semibold border border-red-200">Lỗi hệ thống</span>;
      default:
        return <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full text-xs font-semibold">{status}</span>;
    }
  };

  const getDocStatusBadge = (status: string) => {
    switch (status) {
      case 'QUEUED':
        return <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-xs font-medium">Chờ quét</span>;
      case 'PROCESSING':
        return <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-medium flex items-center gap-1 w-fit"><Loader2 className="h-3 w-3 animate-spin" /> Đang số hóa</span>;
      case 'AWAITING_REVIEW':
        return <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-xs font-medium border border-amber-100">Chờ kiểm duyệt</span>;
      case 'CONFIRMED':
        return <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-medium border border-emerald-100">Đã duyệt</span>;
      case 'REJECTED':
        return <span className="bg-stone-200 text-stone-700 px-2 py-0.5 rounded text-xs font-medium">Đã từ chối</span>;
      case 'ERROR':
        return <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded text-xs font-medium border border-red-100">Lỗi phân tích</span>;
      default:
        return <span className="bg-stone-100 text-stone-600 px-2 py-0.5 rounded text-xs font-medium">{status}</span>;
    }
  };

  return (
    <div className="space-y-6">
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

      {/* Tabs Menu */}
      <div className="flex border-b border-stone-200">
        <button
          onClick={() => setActiveTab('UPLOAD')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'UPLOAD'
              ? 'border-[#1b4332] text-[#1b4332]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Tải lên tài liệu
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`px-6 py-3 text-sm font-bold border-b-2 transition-all ${
            activeTab === 'HISTORY'
              ? 'border-[#1b4332] text-[#1b4332]'
              : 'border-transparent text-stone-500 hover:text-stone-800'
          }`}
        >
          Lịch sử lô quét
        </button>
      </div>

      {/* Tab 1: Upload Layout */}
      {activeTab === 'UPLOAD' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form onSubmit={handleUploadSubmit} className="lg:col-span-2 space-y-4 bg-white p-6 rounded-2xl border border-[#e6ebe3] shadow-sm">
            <h3 className="font-serif text-lg font-bold text-[#1b4332] border-b pb-3 mb-4">
              1. Tải lên tệp tài liệu cần số hóa
            </h3>

            {/* Drag & Drop Zone */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-[#1b4332] bg-emerald-50'
                  : 'border-stone-200 hover:border-[#1b4332] hover:bg-stone-50'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,application/pdf"
                className="hidden"
                onChange={handleFileInputChange}
              />
              <UploadCloud className="h-12 w-12 text-[#1b4332] mb-3 animate-pulse" />
              <p className="text-sm font-bold text-stone-800 text-center">
                Kéo thả tài liệu vào đây hoặc nhấp để chọn tệp
              </p>
              <p className="text-xs text-stone-400 text-center mt-1 font-medium">
                Chấp nhận tệp ảnh JPG, PNG hoặc tài liệu PDF (Tối đa 10 tệp, tối đa 10MB/tệp)
              </p>
            </div>

            {/* File List to Upload */}
            {filesToUpload.length > 0 && (
              <div className="space-y-2 mt-4">
                <div className="flex justify-between items-center text-xs font-bold text-stone-400 uppercase tracking-wide px-1">
                  <span>Tài liệu đã chọn ({filesToUpload.length}/10)</span>
                  <button
                    type="button"
                    onClick={() => setFilesToUpload([])}
                    className="text-red-500 hover:text-red-700 hover:underline"
                  >
                    Xóa tất cả
                  </button>
                </div>
                <div className="border border-stone-200 rounded-xl divide-y divide-stone-100 max-h-60 overflow-y-auto bg-stone-50">
                  {filesToUpload.map((file, index) => (
                    <div key={index} className="flex justify-between items-center p-3 text-sm">
                      <div className="flex items-center gap-3 overflow-hidden pr-4">
                        <FileText className="h-5 w-5 text-[#1b4332] flex-shrink-0" />
                        <span className="truncate text-stone-700 font-medium">{file.name}</span>
                        <span className="text-xs text-stone-400 font-semibold flex-shrink-0">
                          ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-stone-400 hover:text-red-600 transition-colors p-1"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Config OCR Params */}
            <div className="space-y-4 pt-4 border-t border-stone-100">
              <h3 className="font-serif text-lg font-bold text-[#1b4332] mb-3">
                2. Cấu hình số hóa
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Hint Selector */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="hint-select" className="text-xs font-bold text-stone-600">Loại tài liệu gốc (Hint)</label>
                  <select
                    id="hint-select"
                    value={documentHint}
                    onChange={(e) => {
                      setDocumentHint(e.target.value as 'AUTO' | 'FARMING_LOGBOOK' | 'MATERIAL_INVOICE');
                      setSelectedSeasonId('');
                    }}
                    className="border border-stone-200 rounded-xl px-4 py-2.5 bg-white text-stone-700 text-sm font-medium focus:ring-1 focus:ring-[#1b4332] focus:border-[#1b4332] outline-none"
                  >
                    <option value="AUTO">Tự động nhận diện (Khuyên dùng)</option>
                    <option value="FARMING_LOGBOOK">Số hóa nhật ký canh tác (FARMING_LOGBOOK)</option>
                    <option value="MATERIAL_INVOICE">Hóa đơn vật tư nhập xuất kho (MATERIAL_INVOICE)</option>
                  </select>
                </div>

                {/* Season Selector */}
                {documentHint === 'FARMING_LOGBOOK' && (
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="season-select" className="text-xs font-bold text-stone-600">Vụ mùa tương ứng</label>
                    <div className="relative">
                      {loadingSeasons ? (
                        <div className="absolute right-3 top-3">
                          <Loader2 className="h-4 w-4 animate-spin text-stone-400" />
                        </div>
                      ) : null}
                      <select
                        id="season-select"
                        value={selectedSeasonId}
                        onChange={(e) => setSelectedSeasonId(e.target.value)}
                        className="w-full border border-stone-200 rounded-xl px-4 py-2.5 bg-white text-stone-700 text-sm font-medium focus:ring-1 focus:ring-[#1b4332] focus:border-[#1b4332] outline-none"
                      >
                        <option value="">-- Chọn vụ mùa đang hoạt động --</option>
                        {seasons.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.season_name} ({s.farm_zone.zone_name})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Upload Action */}
            <div className="pt-4 border-t border-stone-100 flex justify-end">
              <button
                type="submit"
                disabled={uploading || filesToUpload.length === 0}
                className="flex items-center gap-2 bg-[#1b4332] hover:bg-[#143225] disabled:bg-stone-300 text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-all duration-300 text-sm"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang tải lên...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Bắt đầu số hóa bằng AI
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Right Instruction box */}
          <div className="bg-[#f7f9f5] border border-[#e6ebe3] rounded-2xl p-6 self-start space-y-4">
            <h4 className="font-serif text-md font-bold text-[#1b4332] flex items-center gap-2 border-b pb-2">
              <Clock className="h-4 w-4" />
              Hướng dẫn số hóa tài liệu
            </h4>
            <ul className="space-y-3 text-stone-600 text-xs font-medium leading-relaxed list-decimal pl-4">
              <li>Chọn loại tài liệu gợi ý (Hint) giúp AI xử lý chính xác hơn (đặc biệt khi số hóa nhật ký canh tác của vụ mùa).</li>
              <li>Chụp tài liệu rõ nét, căn góc thẳng và đảm bảo đủ ánh sáng để hạn chế lỗi nhận diện chữ viết tay.</li>
              <li>Các tệp PDF hoặc ảnh sẽ được đưa vào hàng đợi xử lý ngầm và số hóa thành bản ghi nháp.</li>
              <li>Sau khi phân tích xong, bạn có thể kiểm tra danh sách bên Tab **Lịch sử lô quét** và chọn **Duyệt hồ sơ** để hoàn tất ghi sổ.</li>
            </ul>
          </div>
        </div>
      )}

      {/* Tab 2: History Layout */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white rounded-2xl border border-[#e6ebe3] shadow-sm overflow-hidden">
          {/* Filter Bar */}
          <div className="p-4 border-b border-stone-100 bg-[#fbfcf9] flex flex-wrap justify-between items-center gap-4">
            <h3 className="font-serif text-lg font-bold text-[#1b4332] flex items-center gap-2">
              <Clock className="h-5 w-5 text-[#1b4332]" />
              Nhật ký lô tài liệu quét OCR
            </h3>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPage(1);
                }}
                className="border border-stone-200 rounded-xl px-3 py-1.5 bg-white text-stone-600 text-xs font-semibold focus:ring-1 focus:ring-[#1b4332] outline-none"
              >
                <option value="">Tất cả trạng thái</option>
                <option value="QUEUED">Đang xếp hàng</option>
                <option value="PROCESSING">Đang quét</option>
                <option value="AWAITING_REVIEW">Chờ kiểm duyệt</option>
                <option value="PARTIALLY_FAILED">Lỗi một phần</option>
                <option value="CONFIRMED">Đã hoàn thành</option>
                <option value="ERROR">Lỗi hệ thống</option>
              </select>
              <button
                onClick={fetchBatches}
                disabled={loadingBatches}
                className="p-2 border border-stone-200 rounded-xl text-stone-500 hover:bg-stone-50 transition-colors"
                title="Làm mới"
              >
                <RefreshCw className={`h-4 w-4 ${loadingBatches ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Table Container */}
          {loadingBatches && batches.length === 0 ? (
            <div className="p-12 flex flex-col items-center justify-center text-stone-400">
              <Loader2 className="h-10 w-10 animate-spin text-[#1b4332] mb-3" />
              <p className="text-sm font-semibold">Đang tải danh sách lô quét...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="p-12 text-center text-stone-400">
              <FileText className="h-12 w-12 mx-auto text-stone-300 mb-3" />
              <p className="text-sm font-semibold">Không tìm thấy lô quét tài liệu nào</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-stone-200 bg-[#fbfcf9] text-stone-400 text-xs font-bold uppercase tracking-wider">
                    <th className="p-4 w-10"></th>
                    <th className="p-4">Mã Lô</th>
                    <th className="p-4">Ngày tải lên</th>
                    <th className="p-4 text-center">Số tệp</th>
                    <th className="p-4 text-center">Tiến độ quét</th>
                    <th className="p-4">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 text-sm font-medium text-stone-700">
                  {batches.map((batch) => {
                    const isExpanded = expandedBatchId === batch.batch_id;
                    const dateStr = new Date(batch.created_at).toLocaleString('vi-VN');
                    return (
                      <Fragment key={batch.batch_id}>
                        {/* Main Batch Row */}
                        <tr
                          className={`hover:bg-[#fbfcf9] cursor-pointer transition-colors ${
                            isExpanded ? 'bg-[#f7f9f5]' : ''
                          }`}
                          onClick={() => setExpandedBatchId(isExpanded ? null : batch.batch_id)}
                        >
                          <td className="p-4 text-center">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-stone-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-stone-400" />
                            )}
                          </td>
                          <td className="p-4 font-mono text-xs font-semibold text-stone-900 truncate max-w-[200px]">
                            {batch.batch_id}
                          </td>
                          <td className="p-4 text-stone-500 font-semibold">{dateStr}</td>
                          <td className="p-4 text-center font-bold">{batch.total_files}</td>
                          <td className="p-4 text-center">
                            <span className="text-xs font-bold text-stone-800">
                              {batch.processed_files}/{batch.total_files} tệp
                            </span>
                            {batch.failed_files > 0 && (
                              <span className="text-xs font-bold text-red-500 ml-1.5" title="Tệp lỗi phân tích">
                                ({batch.failed_files} lỗi)
                              </span>
                            )}
                          </td>
                          <td className="p-4">{getBatchStatusBadge(batch.status)}</td>
                        </tr>

                        {/* Expandable Documents list */}
                        {isExpanded && (
                          <tr className="bg-stone-50">
                            <td colSpan={6} className="p-4 border-t border-stone-200">
                              <div className="pl-6 space-y-2.5">
                                <div className="text-xs font-bold text-stone-400 uppercase tracking-wide">
                                  Danh sách tài liệu trong lô:
                                </div>
                                <div className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-sm divide-y divide-stone-100">
                                  {batch.documents.map((doc) => (
                                    <div
                                      key={doc.document_id}
                                      className="flex justify-between items-center p-3 text-sm hover:bg-stone-50"
                                    >
                                      <div className="flex items-center gap-3 overflow-hidden pr-4">
                                        <FileText className="h-4 w-4 text-[#1b4332] flex-shrink-0" />
                                        <span className="truncate text-stone-700 font-medium" title={doc.filename}>
                                          {doc.filename}
                                        </span>
                                        <span className="text-stone-300">|</span>
                                        <span className="text-xs text-stone-400 font-semibold uppercase flex-shrink-0">
                                          {doc.document_type || 'CHƯA PHÂN LOẠI'}
                                        </span>
                                        {doc.error_message && (
                                          <span className="text-xs font-bold text-red-500 truncate" title={doc.error_message}>
                                            Lỗi: {doc.error_message}
                                          </span>
                                        )}
                                        {doc.rejection_reason && (
                                          <span className="text-xs font-bold text-stone-500 truncate" title={doc.rejection_reason}>
                                            Từ chối: {doc.rejection_reason}
                                          </span>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-3 flex-shrink-0">
                                        {getDocStatusBadge(doc.status)}
                                        {doc.status === 'AWAITING_REVIEW' && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onReview(doc.document_id);
                                            }}
                                            className="flex items-center gap-1 bg-[#1b4332] hover:bg-[#143225] text-white px-3 py-1 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                                          >
                                            <Eye className="h-3.5 w-3.5" />
                                            Duyệt hồ sơ
                                          </button>
                                        )}
                                        {doc.status === 'ERROR' && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleRetryDocument(doc.document_id);
                                            }}
                                            disabled={actionLoading[doc.document_id]}
                                            className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 px-3 py-1 rounded-lg text-xs font-semibold transition-colors disabled:bg-stone-100 disabled:text-stone-400"
                                          >
                                            {actionLoading[doc.document_id] ? (
                                              <Loader2 className="h-3 w-3 animate-spin" />
                                            ) : (
                                              <RefreshCw className="h-3 w-3" />
                                            )}
                                            Thử lại
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-stone-100 bg-[#fbfcf9] flex justify-between items-center">
              <span className="text-xs font-semibold text-stone-500">
                Trang {page} / {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-stone-200 hover:bg-stone-50 rounded-lg text-xs font-semibold disabled:text-stone-300 disabled:bg-stone-50 transition-colors"
                >
                  Trước
                </button>
                <button
                  onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-stone-200 hover:bg-stone-50 rounded-lg text-xs font-semibold disabled:text-stone-300 disabled:bg-stone-50 transition-colors"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
