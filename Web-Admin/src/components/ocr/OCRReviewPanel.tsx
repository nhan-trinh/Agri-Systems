'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '../../lib/api/axios';
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Save,
  Check,
  XCircle,
  FileText
} from 'lucide-react';

interface OcrDraftFormData {
  season_id?: string;
  activity_date?: string;
  activity_type?: string;
  material_id?: string | null;
  fertilizer_type?: string;
  quantity_kg?: number;
  product_name?: string;
  dosage?: number;
  unit?: string;
  water_volume_m3?: number;
  duration_hours?: number;
  yield_kg?: number;
  harvest_method?: string;
  notes?: string;
  transaction_type?: string;
  transaction_date?: string;
  quantity?: number;
  supplier?: string;
  invoice_no?: string;
  unit_price?: number;
  expiry_date?: string;
  recipient_farmer_id?: string;
  purpose?: string;
}

interface OCRReviewPanelProps {
  documentId: string;
  onClose: () => void;
}

interface ValidationError {
  field: string;
  message: string;
}

interface DraftRecord {
  id: string;
  target_entity: 'FARMING_LOG' | 'WAREHOUSE_TRANSACTION';
  status: string;
  ai_normalized_data: Record<string, unknown>;
  confirmed_data: Record<string, unknown> | null;
  validation_errors: ValidationError[] | null;
  confidence_score: number | null;
  official_record_id: string | null;
}

interface DocumentReviewData {
  document: {
    id: string;
    document_type: string;
    status: string;
    original_filename: string;
    mime_type: string;
    file_preview_url: string;
    raw_ocr_text: string | null;
  };
  draft_records: DraftRecord[];
}

interface Season {
  id: string;
  season_name: string;
  farm_zone: {
    zone_name: string;
  };
}

interface Material {
  id: string;
  material_name: string;
  unit: string;
}

interface Farmer {
  id: string;
  full_name: string;
  farmer_code: string;
}

const toSafeISOString = (dateStr: string | undefined | null): string | undefined => {
  if (!dateStr) return undefined;
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return dateStr;
  return parsed.toISOString();
};

export function OCRReviewPanel({ documentId, onClose }: OCRReviewPanelProps) {
  const [loading, setLoading] = useState(true);
  const [reviewData, setReviewData] = useState<DocumentReviewData | null>(null);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0);

  // Lists for dropdown options
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [farmers, setFarmers] = useState<Farmer[]>([]);

  // Current Form State
  const [formData, setFormData] = useState<OcrDraftFormData>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  // Actions states
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // Image Controls
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  // Toast notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // File preview source
  const [previewSrc, setPreviewSrc] = useState<string>('');

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load Review data and dropdown lookups
  useEffect(() => {
    let activeBlobUrl = '';

    const loadData = async () => {
      try {
        setLoading(true);
        // Load main document review payload
        const resReview = await apiClient.get(`/ocr/documents/${documentId}/review`);
        if (resReview.data?.success) {
          const data = resReview.data.data;
          setReviewData(data);
          
          // Set initial form state for the first draft
          const firstDraft = data.draft_records[0];
          if (firstDraft) {
            initForm(firstDraft);
          }

          // Handle file preview URL loading
          const rawUrl = data.document?.file_preview_url;
          if (rawUrl) {
            if (rawUrl.includes('/uploads/ocr/')) {
              // Local storage OCR file: needs authorization headers to download
              try {
                const response = await apiClient.get(rawUrl, { responseType: 'blob' });
                const blobUrl = URL.createObjectURL(response.data);
                activeBlobUrl = blobUrl;
                setPreviewSrc(blobUrl);
              } catch (err) {
                console.error('Failed to fetch local preview blob:', err);
                setPreviewSrc(rawUrl);
              }
            } else {
              setPreviewSrc(rawUrl);
            }
          }
        }

        // Load lookups
        const [resSeasons, resMaterials, resFarmers] = await Promise.all([
          apiClient.get('/seasons'),
          apiClient.get('/warehouse/materials'),
          apiClient.get('/farmers')
        ]);

        if (resSeasons.data?.success) setSeasons(resSeasons.data.data);
        if (resMaterials.data?.success) setMaterials(resMaterials.data.data);
        if (resFarmers.data?.success) setFarmers(resFarmers.data.data);

      } catch (err) {
        console.error('Error loading review details:', err);
        showToast('Không thể tải thông tin kiểm duyệt', 'error');
      } finally {
        setLoading(false);
      }
    };

    loadData();

    return () => {
      if (activeBlobUrl) {
        URL.revokeObjectURL(activeBlobUrl);
      }
    };
  }, [documentId]);

  const initForm = (draft: DraftRecord) => {
    const data = draft.confirmed_data || draft.ai_normalized_data || {};
    
    // Safely format dates to YYYY-MM-DD for standard html inputs
    const formattedData = { ...data };
    
    try {
      if (formattedData.activity_date) {
        formattedData.activity_date = new Date(formattedData.activity_date as string).toISOString().split('T')[0];
      }
    } catch {
      console.warn('Invalid activity_date:', formattedData.activity_date);
    }

    try {
      if (formattedData.transaction_date) {
        formattedData.transaction_date = new Date(formattedData.transaction_date as string).toISOString().split('T')[0];
      }
    } catch {
      console.warn('Invalid transaction_date:', formattedData.transaction_date);
    }

    try {
      if (formattedData.expiry_date) {
        formattedData.expiry_date = new Date(formattedData.expiry_date as string).toISOString().split('T')[0];
      }
    } catch {
      console.warn('Invalid expiry_date:', formattedData.expiry_date);
    }

    setFormData(formattedData);
    
    // Filter out initial ISO 8601 validation errors for dates if they are successfully formatted/valid
    const filteredErrors = (draft.validation_errors || []).filter(err => {
      if (err.field === 'transaction_date' && formattedData.transaction_date) {
        return false;
      }
      if (err.field === 'activity_date' && formattedData.activity_date) {
        return false;
      }
      if (err.field === 'expiry_date' && formattedData.expiry_date) {
        return false;
      }
      return true;
    });

    setValidationErrors(filteredErrors);
  };

  // Handle draft selection changes
  const handleDraftSelect = (index: number) => {
    if (!reviewData) return;
    setSelectedDraftIndex(index);
    initForm(reviewData.draft_records[index]);
  };

  const handleInputChange = <K extends keyof OcrDraftFormData>(field: K, value: OcrDraftFormData[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Action: Save Draft
  const handleSaveDraft = async () => {
    if (!reviewData) return;
    const activeDraft = reviewData.draft_records[selectedDraftIndex];
    if (!activeDraft) return;

    try {
      setSaving(true);
      // Clean payload: re-convert date inputs to ISO strings for NestJS validators
      const payload = { ...formData };
      
      payload.activity_date = toSafeISOString(payload.activity_date);
      payload.transaction_date = toSafeISOString(payload.transaction_date);
      payload.expiry_date = toSafeISOString(payload.expiry_date);

      if (payload.quantity) {
        payload.quantity = Number(payload.quantity);
      }
      if (payload.quantity_kg) {
        payload.quantity_kg = Number(payload.quantity_kg);
      }
      if (payload.dosage) {
        payload.dosage = Number(payload.dosage);
      }
      if (payload.water_volume_m3) {
        payload.water_volume_m3 = Number(payload.water_volume_m3);
      }
      if (payload.duration_hours) {
        payload.duration_hours = Number(payload.duration_hours);
      }
      if (payload.yield_kg) {
        payload.yield_kg = Number(payload.yield_kg);
      }
      if (payload.unit_price) {
        payload.unit_price = Number(payload.unit_price);
      }

      const res = await apiClient.patch(`/ocr/draft-records/${activeDraft.id}`, {
        confirmed_data: payload
      });

      if (res.data?.success) {
        showToast('Lưu bản nháp thành công!', 'success');
        // Update validation errors returned by validation check
        const newErrors = res.data.data.validation_errors || [];
        setValidationErrors(newErrors);

        // Update local reviewData records
        setReviewData(prev => {
          if (!prev) return null;
          const updatedDrafts = [...prev.draft_records];
          updatedDrafts[selectedDraftIndex] = {
            ...updatedDrafts[selectedDraftIndex],
            confirmed_data: payload,
            validation_errors: newErrors
          };
          return {
            ...prev,
            draft_records: updatedDrafts
          };
        });
      }
    } catch (err: unknown) {
      console.error('Save failed:', err);
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || 'Không thể lưu bản nháp';
      showToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  // Action: Confirm and create official record
  const handleConfirmRecord = async () => {
    if (!reviewData) return;
    const activeDraft = reviewData.draft_records[selectedDraftIndex];
    if (!activeDraft) return;

    try {
      setConfirming(true);
      // Ensure local edits are saved first or run directly
      const payload = { ...formData };
      payload.activity_date = toSafeISOString(payload.activity_date);
      payload.transaction_date = toSafeISOString(payload.transaction_date);
      payload.expiry_date = toSafeISOString(payload.expiry_date);
      
      if (payload.quantity) payload.quantity = Number(payload.quantity);
      if (payload.quantity_kg) payload.quantity_kg = Number(payload.quantity_kg);
      if (payload.dosage) payload.dosage = Number(payload.dosage);
      if (payload.water_volume_m3) payload.water_volume_m3 = Number(payload.water_volume_m3);
      if (payload.duration_hours) payload.duration_hours = Number(payload.duration_hours);
      if (payload.yield_kg) payload.yield_kg = Number(payload.yield_kg);
      if (payload.unit_price) payload.unit_price = Number(payload.unit_price);

      // Call patch first to ensure backend has the latest inputs before confirming
      await apiClient.patch(`/ocr/draft-records/${activeDraft.id}`, {
        confirmed_data: payload
      });

      const res = await apiClient.post(`/ocr/draft-records/${activeDraft.id}/confirm`);
      if (res.data?.success) {
        showToast('Xác nhận ghi sổ bản ghi thành công!', 'success');
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; code?: string; details?: unknown[]; validation_errors?: ValidationError[] }; status?: number } };
      console.error('Confirm failed — status:', error.response?.status, 'body:', JSON.stringify(error.response?.data, null, 2));
      
      const msg = error.response?.data?.message || 'Ghi sổ thất bại. Vui lòng kiểm tra lại thông tin lỗi.';
      showToast(msg, 'error');
      
      // If validation error returned, refresh the error indicators
      if (error.response?.data?.validation_errors) {
        setValidationErrors(error.response.data.validation_errors);
      }
    } finally {
      setConfirming(false);
    }
  };

  // Action: Reject Document
  const handleRejectDocument = async () => {
    if (rejectionReason.trim().length < 5) {
      showToast('Lý do từ chối phải dài ít nhất 5 ký tự.', 'error');
      return;
    }

    try {
      setRejecting(true);
      const res = await apiClient.post(`/ocr/documents/${documentId}/reject`, {
        reason: rejectionReason
      });

      if (res.data?.success) {
        showToast('Đã từ chối duyệt tài liệu quét thành công!', 'success');
        setShowRejectModal(false);
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: unknown) {
      console.error('Reject failed:', err);
      const error = err as { response?: { data?: { message?: string } } };
      const msg = error.response?.data?.message || 'Không thể từ chối tài liệu';
      showToast(msg, 'error');
    } finally {
      setRejecting(false);
    }
  };

  const getFieldError = (field: string) => {
    const error = validationErrors.find(e => e.field === field);
    return error ? error.message : null;
  };

  if (loading) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-stone-200 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 animate-spin text-[#1b4332] mb-3" />
        <p className="text-sm font-semibold text-stone-500">Đang tải tài liệu và tệp số hóa...</p>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-stone-200 shadow-sm text-center">
        <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
        <p className="text-sm font-bold text-stone-700">Không tìm thấy tài liệu OCR tương ứng</p>
        <button onClick={onClose} className="mt-4 text-[#1b4332] font-semibold hover:underline">Quay lại</button>
      </div>
    );
  }

  const { document, draft_records } = reviewData;
  const isPdf = document.mime_type === 'application/pdf';
  const currentDraft = draft_records[selectedDraftIndex];

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

      {/* Review Panel Header */}
      <div className="flex justify-between items-center bg-[#fbfcf9] p-4 rounded-xl border border-stone-200">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h2 className="font-serif text-lg font-bold text-[#1b4332]">
              Kiểm duyệt số hóa: {document.original_filename}
            </h2>
            <p className="text-xs text-stone-500 font-semibold mt-0.5">
              Phân loại: <span className="uppercase text-stone-700 font-bold">{document.document_type}</span>
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowRejectModal(true)}
            className="flex items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 px-4 py-2 rounded-xl text-xs font-bold transition-all"
          >
            <XCircle className="h-4 w-4" />
            Từ chối duyệt
          </button>
        </div>
      </div>

      {/* Main Split Screen container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px]">
        {/* Left Side: Preview Panel */}
        <div className="bg-stone-800 rounded-2xl border border-stone-700 overflow-hidden flex flex-col h-[700px]">
          <div className="p-3 bg-stone-900 border-b border-stone-700 flex justify-between items-center text-white text-xs font-bold">
            <span>BẢN GỐC ĐÃ TẢI LÊN</span>
            {!isPdf && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.max(z - 20, 50))}
                  className="p-1 hover:bg-stone-700 rounded text-stone-300"
                  title="Thu nhỏ"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="w-10 text-center font-mono">{zoom}%</span>
                <button
                  type="button"
                  onClick={() => setZoom(z => Math.min(z + 20, 300))}
                  className="p-1 hover:bg-stone-700 rounded text-stone-300"
                  title="Phóng to"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <span className="text-stone-700">|</span>
                <button
                  type="button"
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="p-1 hover:bg-stone-700 rounded text-stone-300 flex items-center gap-1"
                  title="Xoay 90 độ"
                >
                  <RotateCw className="h-4 w-4" />
                  Xoay
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-stone-900 relative">
            {isPdf ? (
              <iframe
                src={previewSrc}
                className="w-full h-full border-0 bg-white rounded-lg"
                title="Tài liệu PDF"
              />
            ) : (
              <div className="max-w-full max-h-full transition-transform duration-300 ease-out">
                <img
                  src={previewSrc}
                  alt="Review preview"
                  style={{
                    transform: `rotate(${rotation}deg) scale(${zoom / 100})`,
                    transformOrigin: 'center center',
                    maxHeight: '600px',
                    maxWidth: '100%',
                    objectFit: 'contain'
                  }}
                  className="rounded border border-stone-700 bg-white"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Form Editor Panel */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col h-[700px]">
          {/* Selected Draft Switcher (If multiple draft records are found) */}
          {draft_records.length > 1 && (
            <div className="p-4 border-b border-stone-100 bg-[#fbfcf9] flex items-center justify-between gap-3">
              <label htmlFor="draft-selector" className="text-xs font-bold text-stone-500 uppercase tracking-wide">Bản ghi số hóa nháp:</label>
              <select
                id="draft-selector"
                value={selectedDraftIndex}
                onChange={(e) => handleDraftSelect(Number(e.target.value))}
                className="border border-stone-200 rounded-xl px-3 py-1.5 bg-white text-xs font-semibold text-stone-700 outline-none focus:ring-1 focus:ring-[#1b4332]"
              >
                {draft_records.map((dr, idx) => (
                  <option key={dr.id} value={idx}>
                    Bản ghi {idx + 1} ({dr.target_entity === 'FARMING_LOG' ? 'Nhật ký canh tác' : 'Phiếu kho'})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Form Scroll Area */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <div className="flex justify-between items-start border-b pb-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#1b4332] flex items-center gap-2">
                  <FileText className="h-5 w-5 text-[#1b4332]" />
                  Hiệu chỉnh thông tin số hóa
                </h3>
                <p className="text-xs text-stone-400 mt-0.5 font-semibold">
                  Đối chiếu dữ liệu OCR trích xuất tự động và chỉnh sửa các trường chưa chính xác.
                </p>
              </div>
              {currentDraft?.confidence_score && (
                <div className="text-right">
                  <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wide block">Độ tin cậy AI</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                    currentDraft.confidence_score >= 0.8 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                  }`}>
                    {(currentDraft.confidence_score * 100).toFixed(0)}%
                  </span>
                </div>
              )}
            </div>

            {/* Error alerts banner if validation errors exist */}
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3.5 flex gap-2.5 text-xs text-red-800 font-semibold leading-relaxed">
                <AlertTriangle className="h-4.5 w-4.5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-bold">Hồ sơ có {validationErrors.length} lỗi thông tin cần sửa:</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err.message}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Dynamic Form Render */}
            {currentDraft && (
              <div className="space-y-4 font-medium text-stone-700">
                {/* ──────────────────────────────────────────────────────────── */}
                {/* DRAFT TYPE: FARMING_LOG */}
                {/* ──────────────────────────────────────────────────────────── */}
                {currentDraft.target_entity === 'FARMING_LOG' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Vụ mùa selector */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-stone-600">Vụ mùa áp dụng <span className="text-red-500">*</span></label>
                        <select
                          value={formData.season_id || ''}
                          onChange={(e) => handleInputChange('season_id', e.target.value)}
                          className={`border rounded-xl px-3 py-2 text-sm bg-white ${
                            getFieldError('season_id') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                          }`}
                        >
                          <option value="">-- Chọn vụ mùa --</option>
                          {seasons.map(s => (
                            <option key={s.id} value={s.id}>{s.season_name}</option>
                          ))}
                        </select>
                        {getFieldError('season_id') && (
                          <span className="text-[11px] text-red-500 font-bold">{getFieldError('season_id')}</span>
                        )}
                      </div>

                      {/* Ngày thực hiện */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-stone-600">Ngày thực hiện <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={formData.activity_date || ''}
                          onChange={(e) => handleInputChange('activity_date', e.target.value)}
                          className={`border rounded-xl px-3 py-2 text-sm ${
                            getFieldError('activity_date') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                          }`}
                        />
                        {getFieldError('activity_date') && (
                          <span className="text-[11px] text-red-500 font-bold">{getFieldError('activity_date')}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Loại hoạt động */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-stone-600">Loại hoạt động <span className="text-red-500">*</span></label>
                        <select
                          value={formData.activity_type || ''}
                          onChange={(e) => handleInputChange('activity_type', e.target.value)}
                          className={`border rounded-xl px-3 py-2 text-sm bg-white ${
                            getFieldError('activity_type') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                          }`}
                        >
                          <option value="">-- Chọn hoạt động --</option>
                          <option value="SEEDING">Gieo hạt / Cấy vụ</option>
                          <option value="FERTILIZING">Bón phân</option>
                          <option value="PESTICIDE">Phun thuốc bảo vệ thực vật</option>
                          <option value="IRRIGATION">Tưới nước</option>
                          <option value="HARVESTING">Thu hoạch nông sản</option>
                          <option value="OTHER">Khác</option>
                        </select>
                        {getFieldError('activity_type') && (
                          <span className="text-[11px] text-red-500 font-bold">{getFieldError('activity_type')}</span>
                        )}
                      </div>

                      {/* Vật tư kho liên kết (Optional) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-stone-600">Vật tư kho liên quan</label>
                        <select
                          value={formData.material_id || ''}
                          onChange={(e) => handleInputChange('material_id', e.target.value || null)}
                          className="border border-stone-200 rounded-xl px-3 py-2 text-sm bg-white"
                        >
                          <option value="">-- Chọn vật tư kho (Không bắt buộc) --</option>
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>{m.material_name}</option>
                          ))}
                        </select>
                        {getFieldError('material_id') && (
                          <span className="text-[11px] text-red-500 font-bold">{getFieldError('material_id')}</span>
                        )}
                      </div>
                    </div>

                    {/* Conditional activity inputs */}
                    {formData.activity_type === 'FERTILIZING' && (
                      <div className="grid grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-stone-600">Loại phân bón <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={formData.fertilizer_type || ''}
                            onChange={(e) => handleInputChange('fertilizer_type', e.target.value)}
                            placeholder="Ví dụ: NPK, Urê, Lân..."
                            className={`border rounded-xl px-3 py-2 text-sm ${
                              getFieldError('fertilizer_type') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                            }`}
                          />
                          {getFieldError('fertilizer_type') && (
                            <span className="text-[11px] text-red-500 font-bold">{getFieldError('fertilizer_type')}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-stone-600">Khối lượng (kg) <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            step="any"
                            value={formData.quantity_kg !== undefined ? formData.quantity_kg : ''}
                            onChange={(e) => handleInputChange('quantity_kg', e.target.value === '' ? undefined : Number(e.target.value))}
                            className={`border rounded-xl px-3 py-2 text-sm ${
                              getFieldError('quantity_kg') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                            }`}
                          />
                          {getFieldError('quantity_kg') && (
                            <span className="text-[11px] text-red-500 font-bold">{getFieldError('quantity_kg')}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {formData.activity_type === 'PESTICIDE' && (
                      <div className="grid grid-cols-3 gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <div className="flex flex-col gap-1.5 col-span-2">
                          <label className="text-xs font-bold text-stone-600">Tên thuốc BVTV <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={formData.product_name || ''}
                            onChange={(e) => handleInputChange('product_name', e.target.value)}
                            className={`border rounded-xl px-3 py-2 text-sm ${
                              getFieldError('product_name') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                            }`}
                          />
                          {getFieldError('product_name') && (
                            <span className="text-[11px] text-red-500 font-bold">{getFieldError('product_name')}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-stone-600">Liều lượng <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            step="any"
                            value={formData.dosage !== undefined ? formData.dosage : ''}
                            onChange={(e) => handleInputChange('dosage', e.target.value === '' ? undefined : Number(e.target.value))}
                            className={`border rounded-xl px-3 py-2 text-sm ${
                              getFieldError('dosage') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                            }`}
                          />
                          {getFieldError('dosage') && (
                            <span className="text-[11px] text-red-500 font-bold">{getFieldError('dosage')}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5 col-span-3">
                          <label className="text-xs font-bold text-stone-600">Đơn vị (ml, lít, gram...) <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={formData.unit || ''}
                            onChange={(e) => handleInputChange('unit', e.target.value)}
                            className={`border rounded-xl px-3 py-2 text-sm ${
                              getFieldError('unit') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                            }`}
                          />
                          {getFieldError('unit') && (
                            <span className="text-[11px] text-red-500 font-bold">{getFieldError('unit')}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {formData.activity_type === 'IRRIGATION' && (
                      <div className="grid grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-stone-600">Thể tích nước (m³) <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            step="any"
                            value={formData.water_volume_m3 !== undefined ? formData.water_volume_m3 : ''}
                            onChange={(e) => handleInputChange('water_volume_m3', e.target.value === '' ? undefined : Number(e.target.value))}
                            className={`border rounded-xl px-3 py-2 text-sm ${
                              getFieldError('water_volume_m3') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                            }`}
                          />
                          {getFieldError('water_volume_m3') && (
                            <span className="text-[11px] text-red-500 font-bold">{getFieldError('water_volume_m3')}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-stone-600">Thời gian (giờ) <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            step="any"
                            value={formData.duration_hours !== undefined ? formData.duration_hours : ''}
                            onChange={(e) => handleInputChange('duration_hours', e.target.value === '' ? undefined : Number(e.target.value))}
                            className={`border rounded-xl px-3 py-2 text-sm ${
                              getFieldError('duration_hours') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                            }`}
                          />
                          {getFieldError('duration_hours') && (
                            <span className="text-[11px] text-red-500 font-bold">{getFieldError('duration_hours')}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {formData.activity_type === 'HARVESTING' && (
                      <div className="grid grid-cols-2 gap-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-stone-600">Sản lượng (kg) <span className="text-red-500">*</span></label>
                          <input
                            type="number"
                            step="any"
                            value={formData.yield_kg !== undefined ? formData.yield_kg : ''}
                            onChange={(e) => handleInputChange('yield_kg', e.target.value === '' ? undefined : Number(e.target.value))}
                            className={`border rounded-xl px-3 py-2 text-sm ${
                              getFieldError('yield_kg') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                            }`}
                          />
                          {getFieldError('yield_kg') && (
                            <span className="text-[11px] text-red-500 font-bold">{getFieldError('yield_kg')}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-stone-600">Phương pháp <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={formData.harvest_method || ''}
                            onChange={(e) => handleInputChange('harvest_method', e.target.value)}
                            placeholder="Ví dụ: Thủ công, Máy gặt..."
                            className={`border rounded-xl px-3 py-2 text-sm ${
                              getFieldError('harvest_method') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                            }`}
                          />
                          {getFieldError('harvest_method') && (
                            <span className="text-[11px] text-red-500 font-bold">{getFieldError('harvest_method')}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Ghi chú chung */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-stone-600">Ghi chú chi tiết</label>
                      <textarea
                        value={formData.notes || ''}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={3}
                        className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-[#1b4332]"
                      />
                    </div>
                  </>
                )}

                {/* ──────────────────────────────────────────────────────────── */}
                {/* DRAFT TYPE: WAREHOUSE_TRANSACTION */}
                {/* ──────────────────────────────────────────────────────────── */}
                {currentDraft.target_entity === 'WAREHOUSE_TRANSACTION' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Loại giao dịch */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-stone-600">Loại giao dịch <span className="text-red-500">*</span></label>
                        <select
                          value={formData.transaction_type || ''}
                          onChange={(e) => {
                            handleInputChange('transaction_type', e.target.value);
                            // Clear type specific inputs
                            if (e.target.value === 'IMPORT') {
                              handleInputChange('recipient_farmer_id', undefined);
                              handleInputChange('purpose', undefined);
                            } else {
                              handleInputChange('unit_price', undefined);
                              handleInputChange('supplier', undefined);
                              handleInputChange('invoice_no', undefined);
                              handleInputChange('expiry_date', undefined);
                            }
                          }}
                          className={`border rounded-xl px-3 py-2 text-sm bg-white ${
                            getFieldError('transaction_type') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                          }`}
                        >
                          <option value="IMPORT">NHẬP KHO (IMPORT)</option>
                          <option value="EXPORT">XUẤT KHO (EXPORT)</option>
                        </select>
                        {getFieldError('transaction_type') && (
                          <span className="text-[11px] text-red-500 font-bold">{getFieldError('transaction_type')}</span>
                        )}
                      </div>

                      {/* Ngày giao dịch */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-stone-600">Ngày giao dịch <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={formData.transaction_date || ''}
                          onChange={(e) => handleInputChange('transaction_date', e.target.value)}
                          className={`border rounded-xl px-3 py-2 text-sm ${
                            getFieldError('transaction_date') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                          }`}
                        />
                        {getFieldError('transaction_date') && (
                          <span className="text-[11px] text-red-500 font-bold">{getFieldError('transaction_date')}</span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* Vật tư kho */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-stone-600">Chọn Vật tư <span className="text-red-500">*</span></label>
                        <select
                          value={formData.material_id || ''}
                          onChange={(e) => handleInputChange('material_id', e.target.value)}
                          className={`border rounded-xl px-3 py-2 text-sm bg-white ${
                            getFieldError('material_id') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                          }`}
                        >
                          <option value="">-- Chọn vật tư kho --</option>
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>{m.material_name} ({m.unit})</option>
                          ))}
                        </select>
                        {getFieldError('material_id') && (
                          <span className="text-[11px] text-red-500 font-bold">{getFieldError('material_id')}</span>
                        )}
                      </div>

                      {/* Số lượng */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-stone-600">Số lượng <span className="text-red-500">*</span></label>
                        <input
                          type="number"
                          step="any"
                          value={formData.quantity !== undefined ? formData.quantity : ''}
                          onChange={(e) => handleInputChange('quantity', e.target.value === '' ? undefined : Number(e.target.value))}
                          className={`border rounded-xl px-3 py-2 text-sm ${
                            getFieldError('quantity') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                          }`}
                        />
                        {getFieldError('quantity') && (
                          <span className="text-[11px] text-red-500 font-bold">{getFieldError('quantity')}</span>
                        )}
                      </div>
                    </div>

                    {/* WAREHOUSE IMPORT INPUTS */}
                    {formData.transaction_type === 'IMPORT' && (
                      <div className="space-y-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="supplier" className="text-xs font-bold text-stone-600">Nhà cung cấp <span className="text-red-500">*</span></label>
                            <input
                              id="supplier"
                              type="text"
                              value={formData.supplier || ''}
                              onChange={(e) => handleInputChange('supplier', e.target.value)}
                              className={`border rounded-xl px-3 py-2 text-sm ${
                                getFieldError('supplier') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                              }`}
                            />
                            {getFieldError('supplier') && (
                              <span className="text-[11px] text-red-500 font-bold">{getFieldError('supplier')}</span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label htmlFor="invoice_no" className="text-xs font-bold text-stone-600">Số hóa đơn <span className="text-red-500">*</span></label>
                            <input
                              id="invoice_no"
                              type="text"
                              value={formData.invoice_no || ''}
                              onChange={(e) => handleInputChange('invoice_no', e.target.value)}
                              className={`border rounded-xl px-3 py-2 text-sm ${
                                getFieldError('invoice_no') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                              }`}
                            />
                            {getFieldError('invoice_no') && (
                              <span className="text-[11px] text-red-500 font-bold">{getFieldError('invoice_no')}</span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-stone-600">Đơn giá nhập (đ/vật tư)</label>
                            <input
                              type="number"
                              value={formData.unit_price !== undefined ? formData.unit_price : ''}
                              onChange={(e) => handleInputChange('unit_price', e.target.value === '' ? undefined : Number(e.target.value))}
                              className={`border rounded-xl px-3 py-2 text-sm ${
                                getFieldError('unit_price') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                              }`}
                            />
                            {getFieldError('unit_price') && (
                              <span className="text-[11px] text-red-500 font-bold">{getFieldError('unit_price')}</span>
                            )}
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-stone-600">Hạn sử dụng</label>
                            <input
                              type="date"
                              value={formData.expiry_date || ''}
                              onChange={(e) => handleInputChange('expiry_date', e.target.value)}
                              className={`border rounded-xl px-3 py-2 text-sm ${
                                getFieldError('expiry_date') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                              }`}
                            />
                            {getFieldError('expiry_date') && (
                              <span className="text-[11px] text-red-500 font-bold">{getFieldError('expiry_date')}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* WAREHOUSE EXPORT INPUTS */}
                    {formData.transaction_type === 'EXPORT' && (
                      <div className="space-y-4 bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-stone-600">Nông dân nhận vật tư <span className="text-red-500">*</span></label>
                          <select
                            value={formData.recipient_farmer_id || ''}
                            onChange={(e) => handleInputChange('recipient_farmer_id', e.target.value)}
                            className={`border rounded-xl px-3 py-2 text-sm bg-white ${
                              getFieldError('recipient_farmer_id') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                            }`}
                          >
                            <option value="">-- Chọn nông dân nhận --</option>
                            {farmers.map(f => (
                              <option key={f.id} value={f.id}>{f.full_name} ({f.farmer_code})</option>
                            ))}
                          </select>
                          {getFieldError('recipient_farmer_id') && (
                            <span className="text-[11px] text-red-500 font-bold">{getFieldError('recipient_farmer_id')}</span>
                          )}
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-stone-600">Mục đích xuất kho <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            value={formData.purpose || ''}
                            onChange={(e) => handleInputChange('purpose', e.target.value)}
                            placeholder="Ví dụ: Cấp phát phân bón vụ Hè Thu..."
                            className={`border rounded-xl px-3 py-2 text-sm ${
                              getFieldError('purpose') ? 'border-red-500 bg-red-50' : 'border-stone-200'
                            }`}
                          />
                          {getFieldError('purpose') && (
                            <span className="text-[11px] text-red-500 font-bold">{getFieldError('purpose')}</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Ghi chú */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-stone-600">Ghi chú giao dịch</label>
                      <textarea
                        value={formData.notes || ''}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        rows={3}
                        className="border border-stone-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-[#1b4332]"
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Form Action Buttons Bar */}
          <div className="p-4 border-t border-stone-200 bg-[#f7f9f5] flex justify-between items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-100 text-stone-600 text-xs font-bold transition-all"
            >
              Quay lại
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleSaveDraft}
                disabled={saving || confirming}
                className="flex items-center gap-1.5 border border-[#1b4332] hover:bg-emerald-50 text-[#1b4332] px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:bg-stone-50 disabled:text-stone-400"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Lưu nháp
              </button>
              <button
                onClick={handleConfirmRecord}
                disabled={saving || confirming}
                className="flex items-center gap-1.5 bg-[#1b4332] hover:bg-[#143225] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:bg-stone-300"
              >
                {confirming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Xác nhận ghi sổ
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Reject Modal dialog prompt */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-stone-200 p-6 w-full max-w-md space-y-4 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-serif text-lg font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Từ chối tài liệu số hóa
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="p-1 hover:bg-stone-100 rounded text-stone-400"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-stone-600">Lý do từ chối <span className="text-red-500">*</span></label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Nhập lý do từ chối duyệt tài liệu này (Ví dụ: Ảnh mờ không đọc được, sai lệch thông tin quá nhiều...)"
                rows={4}
                className="border border-stone-200 rounded-xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-red-500"
              />
              <span className="text-[10px] text-stone-400 font-semibold">Tối thiểu 5 ký tự. Lý do từ chối sẽ được lưu vào lịch sử kiểm toán hệ thống.</span>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 rounded-xl border border-stone-200 hover:bg-stone-50 text-xs font-bold text-stone-600"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleRejectDocument}
                disabled={rejecting || rejectionReason.trim().length < 5}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2 rounded-xl text-xs font-bold disabled:bg-stone-300 transition-colors"
              >
                {rejecting ? 'Đang từ chối...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
