'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Sprout } from 'lucide-react';
import axios from 'axios';

export default function FirstLoginPage() {
  const router = useRouter();
  const { logout } = useAuthStore();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validation
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
      const res = await apiClient.post('/auth/first-login-change-password', {
        new_password: newPassword,
        confirm_password: confirmPassword,
      });

      if (res.data?.success) {
        setSuccess('Đổi mật khẩu thành công! Đang tự động chuyển hướng...');
        // Clear local credentials so they log in again with new password
        setTimeout(() => {
          logout();
          router.push('/login');
        }, 3000);
      } else {
        setError(res.data?.error?.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.');
      }
    } catch (err: unknown) {
      console.error(err);
      let message = 'Không thể đổi mật khẩu. Vui lòng kiểm tra lại.';
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.error?.message || message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-[#FAFBF8] overflow-hidden font-sans">
      {/* Decorative organic shapes */}
      <div className="absolute top-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-emerald-100/40 blur-[90px] pointer-events-none"></div>
      <div className="absolute bottom-[-15%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-100/30 blur-[100px] pointer-events-none"></div>

      {/* Subtle organic sprout background */}
      <div className="absolute top-10 left-10 text-emerald-950/5 pointer-events-none select-none hidden md:block">
        <Sprout className="w-48 h-48 rotate-[-15deg]" />
      </div>
      <div className="absolute bottom-10 right-10 text-emerald-950/5 pointer-events-none select-none hidden md:block">
        <Sprout className="w-64 h-64 rotate-[145deg]" />
      </div>

      <div className="w-full max-w-md p-6 m-4 z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#122A1E] shadow-md shadow-emerald-900/10 mb-4">
            <Sprout className="w-6 h-6 text-emerald-300" />
          </div>
          <p className="text-xs font-bold text-[#1e5c3f] tracking-widest uppercase">
            Hệ thống nông nghiệp số
          </p>
          <h1 className="text-3xl font-serif font-black text-[#122A1E] mt-1.5 tracking-tight">
            AgriTrace Carbon
          </h1>
        </div>

        {/* Change Password Card */}
        <div className="bg-white border border-stone-200/60 rounded-[2rem] p-8 shadow-xl shadow-emerald-950/5">
          <h2 className="text-2xl font-serif font-black text-[#122A1E] mb-2">Mật khẩu mới</h2>
          <p className="text-stone-500 text-xs mb-6 font-medium leading-relaxed">
            Đây là lần đầu bạn đăng nhập. Vui lòng thiết lập mật khẩu mới để bảo mật tài khoản.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-3 p-4 bg-rose-50 border border-rose-100 text-rose-800 text-sm rounded-2xl transition-all duration-300">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-start gap-3 p-4 bg-emerald-5 border border-emerald-100 text-emerald-700 text-sm rounded-2xl transition-all duration-300">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                <span>{success}</span>
              </div>
            )}

            {/* Input Password */}
            <div className="space-y-1.5 group relative">
              <label htmlFor="newPassword" className="text-xs font-bold text-stone-500 tracking-wide uppercase">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu mới"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full py-3 bg-transparent border-b border-stone-200 focus:border-[#1e5c3f] text-stone-900 placeholder-stone-400 focus:outline-none transition-all duration-300 text-sm pr-8"
                  required
                  disabled={!!success}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Input Confirm Password */}
            <div className="space-y-1.5 group relative">
              <label htmlFor="confirmPassword" className="text-xs font-bold text-stone-500 tracking-wide uppercase">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Xác nhận mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full py-3 bg-transparent border-b border-stone-200 focus:border-[#1e5c3f] text-stone-900 placeholder-stone-400 focus:outline-none transition-all duration-300 text-sm"
                  required
                  disabled={!!success}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !!success}
              className="w-full mt-6 py-3.5 px-6 bg-[#1a402a] hover:bg-[#122c1d] disabled:bg-stone-100 disabled:text-stone-400 text-[#FAFBF8] font-bold rounded-xl focus:outline-none transition-all duration-300 shadow-md shadow-emerald-950/5 flex items-center justify-center gap-2 group cursor-pointer text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <span>Cập nhật & Đăng nhập lại</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
