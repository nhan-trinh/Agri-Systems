'use client';

import { useState, useEffect } from 'react';
import { X, Loader2, AlertTriangle, CheckCircle2, Copy, Check } from 'lucide-react';
import { apiClient } from '@/lib/api/axios';
import { UserRow } from './UserTable';

// ─────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserRow | null;
  onSuccess: () => void;
}

// ─────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────

export function ResetPasswordModal({ isOpen, onClose, user, onSuccess }: ResetPasswordModalProps) {
  const [phase, setPhase] = useState<'confirm' | 'success'>('confirm');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // ── Reset on open/close ──
  useEffect(() => {
    if (isOpen) {
      setPhase('confirm');
      setSubmitting(false);
      setError('');
      setTempPassword('');
      setCopied(false);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  // ── Submit reset ──
  const handleReset = async () => {
    setError('');
    setSubmitting(true);

    try {
      const res = await apiClient.post(`/users/${user.id}/reset-password`);

      if (res.data?.success) {
        setTempPassword(res.data.data.temporaryPassword);
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

  return (
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-xl border border-[#e6ebe3] overflow-hidden">
        {/* ── Header ── */}
        <div className="flex justify-between items-center px-6 py-5 border-b border-[#e6ebe3] bg-[#fbfcf9]">
          <h2 className="font-serif text-lg font-bold text-[#1b4332]">
            {phase === 'confirm' ? 'Đặt lại mật khẩu' : 'Mật khẩu mới'}
          </h2>
          {phase === 'confirm' && (
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 p-1 hover:bg-stone-100 rounded-full transition-all"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-5">
          {phase === 'confirm' ? (
            <>
              {/* Warning banner */}
              <div className="flex items-start gap-2.5 bg-amber-50 text-amber-800 text-xs px-4 py-3.5 rounded-xl border border-amber-200 font-semibold">
                <AlertTriangle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p>Mật khẩu mới sẽ được tạo ngẫu nhiên bởi hệ thống.</p>
                  <p>Người dùng sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần tiếp theo.</p>
                </div>
              </div>

              {/* Target user info */}
              <div className="bg-stone-50 rounded-xl px-4 py-3 border border-stone-200 space-y-0.5">
                <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Tài khoản</p>
                <p className="text-sm font-bold text-stone-800">
                  {user.display_name || '—'}
                </p>
                <p className="font-mono text-xs text-stone-500">{user.phone}</p>
              </div>

              {/* Error banner */}
              {error && (
                <div className="flex items-center gap-2 bg-red-50 text-red-800 text-xs px-4 py-3 rounded-xl border border-red-200 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </>
          ) : (
            /* ── Success Phase ── */
            <>
              <div className="flex items-center gap-2 bg-emerald-50 text-emerald-800 text-xs px-4 py-3 rounded-xl border border-emerald-200 font-semibold">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Đã đặt lại mật khẩu thành công
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                  Mật khẩu tạm thời
                </p>
                <p className="text-xs text-amber-700">
                  Mật khẩu này chỉ hiển thị một lần. Vui lòng sao chép và gửi cho người dùng.
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
          {phase === 'confirm' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 border border-stone-200 text-stone-600 hover:bg-stone-50 rounded-xl font-bold text-xs transition-all"
              >
                Hủy
              </button>
              <button
                onClick={handleReset}
                disabled={submitting}
                className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl font-bold text-xs transition-all disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Xác nhận đặt lại
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
