'use client';

import { useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Phone,
  ShieldCheck,
  Sprout,
} from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const PHONE_VN_REGEX = /^0[35789]\d{8}$/;

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'request' | 'reset' | 'done'>('request');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const requestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const trimmedPhone = phone.trim();
    if (!PHONE_VN_REGEX.test(trimmedPhone)) {
      setError('Số điện thoại không hợp lệ (ví dụ: 0987654321)');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/forgot-password`, {
        phone: trimmedPhone,
      });

      if (res.data?.success) {
        setPhone(trimmedPhone);
        setNotice(res.data.data?.message || 'Nếu tài khoản tồn tại, mã OTP sẽ được gửi qua SMS.');
        setStep('reset');
      } else {
        setError(res.data?.error?.message || 'Không thể gửi OTP. Vui lòng thử lại.');
      }
    } catch (err: unknown) {
      let message = 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.error?.message || message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!/^\d{6}$/.test(otp)) {
      setError('OTP phải gồm đúng 6 chữ số');
      return;
    }
    if (newPassword.length < 8) {
      setError('Mật khẩu mới phải chứa ít nhất 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        phone,
        otp,
        new_password: newPassword,
      });

      if (res.data?.success) {
        setStep('done');
        setNotice('Đặt lại mật khẩu thành công. Vui lòng đăng nhập bằng mật khẩu mới.');
      } else {
        setError(res.data?.error?.message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.');
      }
    } catch (err: unknown) {
      let message = 'Không thể đặt lại mật khẩu. Vui lòng kiểm tra OTP và thử lại.';
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.error?.message || message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAFBF8] px-4 py-10 font-sans">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#122A1E] shadow-md shadow-emerald-900/10 mb-4">
            <Sprout className="w-6 h-6 text-emerald-300" />
          </div>
          <p className="text-xs font-bold text-[#1e5c3f] tracking-widest uppercase">
            AgriTrace Carbon
          </p>
          <h1 className="text-3xl font-serif font-black text-[#122A1E] mt-1.5 tracking-tight">
            Khôi phục mật khẩu
          </h1>
        </div>

        <div className="bg-white border border-stone-200/70 rounded-2xl p-8 shadow-xl shadow-emerald-950/5">
          <div className="flex items-start gap-3 mb-6">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-[#1a402a]">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-serif font-black text-[#122A1E]">
                {step === 'request' ? 'Tài khoản quản trị' : step === 'reset' ? 'Xác minh OTP' : 'Hoàn tất'}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-stone-500">
                Chỉ dùng cho tài khoản Web Admin như Super Admin, HTX Manager và thủ kho.
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-800">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {notice && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <span>{notice}</span>
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={requestOtp} className="space-y-6">
              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Số điện thoại
                </label>
                <div className="relative">
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Nhập số điện thoại đăng nhập"
                    className="w-full border-b border-stone-200 bg-transparent py-3 pr-8 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-[#1e5c3f] focus:outline-none"
                    required
                  />
                  <Phone className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a402a] px-6 py-3.5 text-sm font-bold text-[#FAFBF8] shadow-md shadow-emerald-950/5 transition-colors hover:bg-[#122c1d] disabled:bg-stone-100 disabled:text-stone-400"
              >
                {loading ? <span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : 'Gửi mã OTP'}
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={resetPassword} className="space-y-6">
              <div className="space-y-1.5">
                <label htmlFor="otp" className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Mã OTP
                </label>
                <div className="relative">
                  <input
                    id="otp"
                    inputMode="numeric"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Nhập 6 chữ số"
                    className="w-full border-b border-stone-200 bg-transparent py-3 pr-8 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-[#1e5c3f] focus:outline-none"
                    required
                  />
                  <KeyRound className="absolute right-0 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Mật khẩu mới
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu mới"
                    className="w-full border-b border-stone-200 bg-transparent py-3 pr-8 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-[#1e5c3f] focus:outline-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-400 transition-colors hover:text-stone-600"
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="text-xs font-bold uppercase tracking-wide text-stone-500">
                  Xác nhận mật khẩu
                </label>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full border-b border-stone-200 bg-transparent py-3 text-sm text-stone-900 placeholder-stone-400 transition-colors focus:border-[#1e5c3f] focus:outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a402a] px-6 py-3.5 text-sm font-bold text-[#FAFBF8] shadow-md shadow-emerald-950/5 transition-colors hover:bg-[#122c1d] disabled:bg-stone-100 disabled:text-stone-400"
              >
                {loading ? <span className="h-5 w-5 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : 'Đặt lại mật khẩu'}
              </button>
            </form>
          )}

          {step === 'done' && (
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1a402a] px-6 py-3.5 text-sm font-bold text-[#FAFBF8] shadow-md shadow-emerald-950/5 transition-colors hover:bg-[#122c1d]"
            >
              Quay lại đăng nhập
            </Link>
          )}

          <div className="mt-6">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-stone-500 transition-colors hover:text-[#1a402a]"
            >
              <ArrowLeft className="h-4 w-4" />
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
