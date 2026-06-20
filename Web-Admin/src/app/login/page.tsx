'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { Phone, Eye, EyeOff, AlertCircle, ArrowRight, Sprout, ShieldCheck, TreePine, Leaf } from 'lucide-react';
import axios from 'axios';

const PHONE_VN_REGEX = /^0[35789]\d{8}$/;

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedPhone = phone.trim();

    // Validation checks
    if (!PHONE_VN_REGEX.test(trimmedPhone)) {
      setError('Số điện thoại không hợp lệ (Ví dụ: 0987654321)');
      return;
    }
    if (password.length < 8) {
      setError('Mật khẩu phải chứa ít nhất 8 ký tự');
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1') + '/auth/login',
        { phone: trimmedPhone, password }
      );

      if (res.data?.success) {
        const { accessToken, refreshToken, user } = res.data.data;

        // Save refresh token to localStorage
        localStorage.setItem('refresh_token', refreshToken);

        // Update auth state in store
        setAuth(user, accessToken);

        // Redirect based on first login flag
        if (user.isFirstLogin) {
          router.push('/first-login');
        } else {
          router.push('/');
        }
      } else {
        setError(res.data?.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    } catch (err: unknown) {
      console.error(err);
      let message = 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
      if (axios.isAxiosError(err)) {
        message = err.response?.data?.error?.message || message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#FAFBF8] font-sans">
      
      {/* Left Panel - Brand Showcase & Metrics (Hidden on Mobile) */}
      <div className="hidden md:flex md:w-[55%] lg:w-[60%] bg-[#122A1E] text-stone-100 flex-col justify-between p-12 relative overflow-hidden">
        {/* Organic mesh backgrounds */}
        <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] rounded-full bg-emerald-700/10 blur-[130px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] rounded-full bg-teal-800/10 blur-[130px] pointer-events-none"></div>
        
        {/* Subtle leaf overlay */}
        <div className="absolute top-20 right-[-30px] opacity-[0.02] pointer-events-none">
          <Leaf className="w-96 h-96 transform rotate-45 text-emerald-200" />
        </div>

        {/* Brand Top Header */}
        <div className="z-10 flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-800/60 border border-emerald-700/30">
            <Sprout className="w-5.5 h-5.5 text-emerald-300" />
          </div>
          <span className="font-serif font-black tracking-tight text-xl text-white">AgriTrace Carbon</span>
        </div>

        {/* Hero Section */}
        <div className="z-10 max-w-xl my-auto py-12">
          <p className="text-xs font-bold text-emerald-400 tracking-widest uppercase mb-3">Hệ thống điều hành trung tâm</p>
          <h1 className="text-4xl lg:text-5xl font-serif font-black text-white leading-[1.15] mb-6">
            Số hóa nông nghiệp bền vững & Quản lý phát thải
          </h1>
          <p className="text-stone-300 leading-relaxed text-base font-medium">
            AgriTrace giúp các hợp tác xã chuẩn hóa quy trình VietGAP, số hóa nhật ký đồng ruộng tự động và kiểm soát lượng phát thải khí nhà kính hướng tới tín chỉ carbon nông nghiệp sạch.
          </p>

          {/* Statistical Highlights */}
          <div className="grid grid-cols-3 gap-6 mt-12 pt-8 border-t border-emerald-900/40">
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                <Leaf className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Vùng trồng</span>
              </div>
              <p className="text-2xl font-serif font-black text-white">12,450 ha</p>
              <p className="text-xs text-stone-400 mt-1">Đã số hóa GPS</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                <TreePine className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Hấp thụ</span>
              </div>
              <p className="text-2xl font-serif font-black text-white">4,820 Tấn</p>
              <p className="text-xs text-stone-400 mt-1">CO₂ giảm thiểu ròng</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400 mb-1">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Chuẩn</span>
              </div>
              <p className="text-2xl font-serif font-black text-white">VietGAP</p>
              <p className="text-xs text-stone-400 mt-1">Mức độ tuân thủ 98%</p>
            </div>
          </div>
        </div>

        {/* Footer info left */}
        <div className="z-10 text-xs text-stone-400 font-medium">
          © 2026 TakaTech. Nền tảng truy xuất nguồn gốc carbon quốc gia.
        </div>
      </div>

      {/* Right Panel - Form (Full Width on Mobile, 45% or 40% on Desktop) */}
      <div className="flex-1 flex flex-col justify-between p-8 md:p-16 lg:p-24 relative">
        <div className="absolute top-10 right-10 text-stone-200 pointer-events-none md:hidden">
          <Sprout className="w-12 h-12" />
        </div>

        {/* Mobile Brand Title (Only shown on mobile) */}
        <div className="md:hidden flex items-center gap-2 mb-12">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#122A1E]">
            <Sprout className="w-4.5 h-4.5 text-emerald-300" />
          </div>
          <span className="font-serif font-black tracking-tight text-lg text-[#122A1E]">AgriTrace</span>
        </div>

        {/* Form Container */}
        <div className="my-auto w-full max-w-sm mx-auto">
          <p className="text-xs font-extrabold text-[#1a402a] tracking-widest uppercase mb-1.5">Chào mừng quay trở lại</p>
          <h2 className="text-3xl font-serif font-black text-[#122A1E] mb-8">Đăng nhập tài khoản</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="flex items-start gap-2.5 p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl transition-all duration-300">
                <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            {/* Input Phone */}
            <div className="space-y-1.5 group relative">
              <label htmlFor="phone" className="text-xs font-bold text-stone-500 tracking-wide uppercase">
                Số điện thoại
              </label>
              <div className="relative">
                <input
                  id="phone"
                  type="text"
                  placeholder="Nhập số điện thoại đăng nhập"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full py-3 bg-transparent border-b border-stone-200 focus:border-[#1e5c3f] text-stone-900 placeholder-stone-400 focus:outline-none transition-all duration-300 text-sm"
                  required
                />
                <Phone className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400 group-focus-within:text-[#1e5c3f] transition-colors" />
              </div>
            </div>

            {/* Input Password */}
            <div className="space-y-1.5 group relative">
              <div className="flex items-center justify-between gap-4">
                <label htmlFor="password" className="text-xs font-bold text-stone-500 tracking-wide uppercase">
                  Mật khẩu
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-bold text-[#1a402a] hover:text-[#122c1d] transition-colors"
                >
                  Quên mật khẩu?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu truy cập"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full py-3 bg-transparent border-b border-stone-200 focus:border-[#1e5c3f] text-stone-900 placeholder-stone-400 focus:outline-none transition-all duration-300 text-sm pr-8"
                  required
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

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-8 py-3.5 px-6 bg-[#1a402a] hover:bg-[#122c1d] disabled:bg-stone-100 disabled:text-stone-400 text-[#FAFBF8] font-bold rounded-xl focus:outline-none transition-all duration-300 shadow-md shadow-emerald-950/5 flex items-center justify-between group cursor-pointer text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto"></div>
              ) : (
                <>
                  <span>Xác nhận đăng nhập</span>
                  <div className="flex items-center gap-1">
                    <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info right */}
        <div className="mt-12 text-center md:text-left">
          <p className="text-xs text-stone-400 font-medium">
            Bảo mật hệ thống theo tiêu chuẩn VietGAP & GS1 Việt Nam.
          </p>
        </div>
      </div>
      
    </div>
  );
}
