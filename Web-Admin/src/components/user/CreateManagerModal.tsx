'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, CheckCircle2, Copy, Check } from 'lucide-react';
import { apiClient } from '@/lib/api/axios';

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

interface Cooperative {
  id: string;
  name: string;
  htx_code: string;
}

interface CreateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  cooperatives: Cooperative[];
  onSuccess: () => void;
}

const PHONE_VN_REGEX = /^0[35789]\d{8}$/;

// ─────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────

export function CreateManagerModal({ isOpen, onClose, cooperatives, onSuccess }: CreateManagerModalProps) {
  // ── Phase: 'form' | 'success' ──
  const [phase, setPhase] = useState<'form' | 'success'>('form');

  // ── Form state ──
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [cooperativeId, setCooperativeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // ── Success state ──
  const [tempPassword, setTempPassword] = useState('');
  const [createdUserName, setCreatedUserName] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Reset on open/close ──
  useEffect(() => {
    if (isOpen) {
      setPhase('form');
      setFullName('');
      setPhone('');
      setCooperativeId('');
      setSubmitting(false);
      setError('');
      setTempPassword('');
      setCreatedUserName('');
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // ── Validation ──
  const validate = (): string => {
    if (!fullName.trim()) return 'Vui lòng nhập họ tên';
    if (fullName.trim().length < 2) return 'Họ tên phải có tối thiểu 2 ký tự';
    if (!phone.trim()) return 'Vui lòng nhập số điện thoại';
    if (!PHONE_VN_REGEX.test(phone.trim())) return 'Số điện thoại không hợp lệ (03x, 05x, 07x, 08x, 09x)';
    if (!cooperativeId) return 'Vui lòng chọn hợp tác xã';
    return '';
  };

  // ── Submit ──
  const handleSubmit = async () => {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setError('');
    setSubmitting(true);

    try {
      const res = await apiClient.post('/users/managers', {
        full_name: fullName.trim(),
        phone: phone.trim(),
        cooperative_id: cooperativeId,
      });

      if (res.data?.success) {
        const { user, temporaryPassword } = res.data.data;
        setTempPassword(temporaryPassword);
        setCreatedUserName(user.display_name || user.phone);
        setPhase('success');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: { message?: string }; message?: string } } };
      const message =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        'Có lỗi xảy ra. Vui lòng thử lại.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Copy to clipboard ──
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for non-HTTPS / older browsers
      const textarea = document.createElement('textarea');
      textarea.value = tempPassword;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ══════════════════════════════════════════════════
  // RENDER — Form Phase
  // ══════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden">
        {/* ── Header ── */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
          <h2 className="font-serif text-lg font-bold text-[#1b4332]">
            {phase === 'form' ? 'Tạo tài khoản Quản lý HTX' : 'Tạo thành công'}
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-5">
          {phase === 'form' ? (
            <>
              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Full name */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Họ tên <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-800 placeholder:text-stone-400 placeholder:font-normal"
                  autoFocus
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0901234567"
                  className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-800 font-mono placeholder:font-sans placeholder:font-normal placeholder:text-stone-400"
                />
              </div>

              {/* Cooperative */}
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                  Hợp tác xã <span className="text-red-500">*</span>
                </label>
                <select
                  value={cooperativeId}
                  onChange={(e) => setCooperativeId(e.target.value)}
                  className="w-full py-2 bg-transparent border-b border-stone-200 focus:border-[#1b4332] focus:outline-none transition-all text-sm font-semibold text-stone-800 cursor-pointer"
                >
                  <option value="">— Chọn hợp tác xã —</option>
                  {cooperatives.map((coop) => (
                    <option key={coop.id} value={coop.id}>
                      {coop.name} ({coop.htx_code})
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            /* ── Success Phase ── */
            <>
              {/* Success banner */}
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs px-4 py-3 rounded-xl border border-emerald-200 font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Đã tạo tài khoản thành công cho <span className="font-bold">{createdUserName}</span>
              </div>

              {/* Temp password display */}
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Mật khẩu tạm thời
                </p>
                <p className="text-xs text-amber-700">
                  Mật khẩu này chỉ hiển thị một lần. Vui lòng sao chép và gửi cho người dùng. Họ sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu.
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-white border border-amber-200 rounded-xl px-4 py-2.5 font-mono text-sm font-bold text-stone-800 tracking-wider select-all">
                    {tempPassword}
                  </code>
                  <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${
                      copied
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200'
                    }`}
                  >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    {copied ? 'Đã sao chép' : 'Sao chép'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex gap-3 justify-end px-6 py-4 border-t border-[#e6ebe3] bg-[#fbfcf9]">
          {phase === 'form' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl font-bold text-xs transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 bg-[#1b4332] hover:bg-[#143225] text-white px-4 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Tạo tài khoản
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="bg-[#1b4332] hover:bg-[#143225] text-white px-4 py-2 rounded-xl font-bold text-xs transition-all"
            >
              Đã lưu mật khẩu
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
