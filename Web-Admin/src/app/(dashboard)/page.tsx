'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import { CarbonTrendChart } from '@/components/charts/CarbonTrendChart';
import { YieldChart } from '@/components/charts/YieldChart';
import { DashboardStatsCards } from '@/components/dashboard/DashboardStatsCards';
import { RecentActivitiesPanel } from '@/components/dashboard/RecentActivitiesPanel';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { 
  Sprout, 
  Building2, 
  Leaf, 
  Users, 
  Map, 
  Calendar, 
  Package, 
  BarChart3, 
  TrendingUp
} from 'lucide-react';
import { ZoneData } from '@/components/map/FarmZoneMap';

const FarmZoneMap = dynamic(() => import('@/components/map/FarmZoneMap').then(m => m.FarmZoneMap), { ssr: false });

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [zones, setZones] = useState<ZoneData[]>([]);

  useEffect(() => {
    if (user) {
      fetchZones();
    }
  }, [user]);

  const fetchZones = async () => {
    try {
      const res = await apiClient.get('/farm-zones');
      if (res.data?.success) {
        setZones(res.data.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải danh sách vùng trồng:', err);
    }
  };

  if (!user) return null;

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'Super Admin';
      case 'HTX_MANAGER':
        return 'HTX Manager';
      case 'WAREHOUSE_KEEPER':
        return 'Warehouse Keeper';
      case 'GOV_VIEWER':
        return 'Gov Viewer';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Hero Banner */}
      <div className="bg-gradient-to-r from-[#1b4332] to-[#2d6a4f] text-white p-8 rounded-3xl shadow-md relative overflow-hidden">
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 flex items-center justify-center">
          <Sprout className="h-64 w-64 rotate-12" />
        </div>
        <div className="relative z-10 space-y-2">
          <span className="bg-[#52b788]/20 text-[#52b788] px-3 py-1 rounded-full text-xs font-bold border border-[#52b788]/30 uppercase tracking-wider">
            Hệ thống AgriTrace
          </span>
          <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-tight mt-2">
            Xin chào, {user.zaloName || user.phone}!
          </h1>
          <p className="text-emerald-100 max-w-xl text-sm font-medium">
            Bạn đang đăng nhập với vai trò <strong className="text-white">{getRoleLabel(user.role)}</strong>. 
            Chào mừng bạn đến với trung tâm giám sát nông nghiệp số và quản lý phát thải carbon.
          </p>
        </div>
      </div>

      {/* Live Stats Cards */}
      <DashboardStatsCards cooperativeId={user.cooperativeId || undefined} />

      {/* Role-Based Quick Actions */}
      <div>
        <h2 className="font-serif text-xl font-bold text-stone-800 mb-4">
          Bàn làm việc của bạn
        </h2>

        {user.role === 'SUPER_ADMIN' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link 
              href="/cooperatives"
              className="bg-white p-6 rounded-2xl border border-[#e6ebe3] hover:border-emerald-500 shadow-sm transition-all duration-300 hover:shadow-md group"
            >
              <div className="bg-emerald-50 text-[#1b4332] p-3 rounded-xl w-fit group-hover:bg-[#1b4332] group-hover:text-white transition-all">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-800 mt-4 group-hover:text-[#1b4332]">
                Quản lý Hợp tác xã
              </h3>
              <p className="text-stone-500 text-xs mt-1">
                Khai báo thông tin, cấp mã số cho các HTX mới liên kết trong hệ thống.
              </p>
            </Link>

            <Link 
              href="/carbon/factors"
              className="bg-white p-6 rounded-2xl border border-[#e6ebe3] hover:border-emerald-500 shadow-sm transition-all duration-300 hover:shadow-md group"
            >
              <div className="bg-emerald-50 text-[#1b4332] p-3 rounded-xl w-fit group-hover:bg-[#1b4332] group-hover:text-white transition-all">
                <Leaf className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-800 mt-4 group-hover:text-[#1b4332]">
                Hệ số phát thải
              </h3>
              <p className="text-stone-500 text-xs mt-1">
                Cấu hình định mức phát thải CO2 cho các nguyên vật liệu canh tác.
              </p>
            </Link>

            <Link 
              href="/farmers"
              className="bg-white p-6 rounded-2xl border border-[#e6ebe3] hover:border-emerald-500 shadow-sm transition-all duration-300 hover:shadow-md group"
            >
              <div className="bg-emerald-50 text-[#1b4332] p-3 rounded-xl w-fit group-hover:bg-[#1b4332] group-hover:text-white transition-all">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-800 mt-4 group-hover:text-[#1b4332]">
                Hồ sơ Nông dân
              </h3>
              <p className="text-stone-500 text-xs mt-1">
                Giám sát toàn bộ hộ nông dân tham gia trên hệ thống AgriTrace.
              </p>
            </Link>
          </div>
        )}

        {user.role === 'HTX_MANAGER' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <Link 
              href="/farmers"
              className="bg-white p-6 rounded-2xl border border-[#e6ebe3] hover:border-emerald-500 shadow-sm transition-all duration-300 hover:shadow-md group"
            >
              <div className="bg-emerald-50 text-[#1b4332] p-3 rounded-xl w-fit group-hover:bg-[#1b4332] group-hover:text-white transition-all">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-800 mt-4 group-hover:text-[#1b4332]">
                Đăng ký Nông dân
              </h3>
              <p className="text-stone-500 text-xs mt-1">
                Thêm mới hộ nông dân và cấp mã số định danh HTX-YYYY-NNNN.
              </p>
            </Link>

            <Link 
              href="/farm-zones"
              className="bg-white p-6 rounded-2xl border border-[#e6ebe3] hover:border-emerald-500 shadow-sm transition-all duration-300 hover:shadow-md group"
            >
              <div className="bg-emerald-50 text-[#1b4332] p-3 rounded-xl w-fit group-hover:bg-[#1b4332] group-hover:text-white transition-all">
                <Map className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-800 mt-4 group-hover:text-[#1b4332]">
                Bản đồ Vùng trồng
              </h3>
              <p className="text-stone-500 text-xs mt-1">
                Số hóa polygon ranh giới và đo đạc diện tích thực tế.
              </p>
            </Link>

            <Link 
              href="/seasons"
              className="bg-white p-6 rounded-2xl border border-[#e6ebe3] hover:border-emerald-500 shadow-sm transition-all duration-300 hover:shadow-md group"
            >
              <div className="bg-emerald-50 text-[#1b4332] p-3 rounded-xl w-fit group-hover:bg-[#1b4332] group-hover:text-white transition-all">
                <Calendar className="h-6 w-6" />
              </div>
              <h3 className="font-serif text-lg font-bold text-stone-800 mt-4 group-hover:text-[#1b4332]">
                Theo dõi Vụ mùa
              </h3>
              <p className="text-stone-500 text-xs mt-1">
                Khai báo vụ mùa nông sản, ghi chép nhật ký bón phân, tưới nước, và đóng vụ mùa.
              </p>
            </Link>
          </div>
        )}

        {user.role === 'WAREHOUSE_KEEPER' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#e6ebe3] opacity-75 shadow-sm relative group cursor-not-allowed">
              <div className="bg-emerald-50 text-[#1b4332] p-3 rounded-xl w-fit">
                <Package className="h-6 w-6" />
              </div>
              <span className="absolute top-4 right-4 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 uppercase">
                Phase 3
              </span>
              <h3 className="font-serif text-lg font-bold text-stone-800 mt-4">
                Nhập xuất vật tư
              </h3>
              <p className="text-stone-500 text-xs mt-1">
                Lập phiếu kho phân đạm, hạt giống, hóa đơn nhà cung cấp. (Sắp ra mắt)
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#e6ebe3] opacity-75 shadow-sm relative group cursor-not-allowed">
              <div className="bg-emerald-50 text-[#1b4332] p-3 rounded-xl w-fit">
                <TrendingUp className="h-6 w-6" />
              </div>
              <span className="absolute top-4 right-4 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 uppercase">
                Phase 3
              </span>
              <h3 className="font-serif text-lg font-bold text-stone-800 mt-4">
                Cảnh báo hết hạn
              </h3>
              <p className="text-stone-500 text-xs mt-1">
                Cảnh báo vật tư nông nghiệp gần hết hạn sử dụng. (Sắp ra mắt)
              </p>
            </div>
          </div>
        )}

        {user.role === 'GOV_VIEWER' && (
          <div className="grid grid-cols-1 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#e6ebe3] opacity-75 shadow-sm relative group cursor-not-allowed">
              <div className="bg-emerald-50 text-[#1b4332] p-3 rounded-xl w-fit">
                <BarChart3 className="h-6 w-6" />
              </div>
              <span className="absolute top-4 right-4 bg-amber-50 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded border border-amber-200 uppercase">
                Phase 5
              </span>
              <h3 className="font-serif text-lg font-bold text-stone-800 mt-4">
                Thống kê phát thải vĩ mô
              </h3>
              <p className="text-stone-500 text-xs mt-1">
                Xem bản đồ phát thải carbon vùng và xuất báo cáo Excel/PDF ẩn danh. (Sắp ra mắt)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Action Items & Recent Activities */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-bold text-stone-800">
          Thông báo & Hoạt động
        </h2>
        <RecentActivitiesPanel cooperativeId={user.cooperativeId || undefined} />
      </div>

      {/* Visual Data Section */}
      <div className="space-y-4">
        <h2 className="font-serif text-xl font-bold text-stone-800">
          Giám sát trực quan
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-5 rounded-3xl border border-[#e6ebe3] shadow-sm">
            <h3 className="font-serif text-sm font-bold text-stone-700 mb-4 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-[#1b4332]" />
              Xu hướng phát thải & hấp thụ Carbon
            </h3>
            <CarbonTrendChart cooperativeId={user.cooperativeId || undefined} />
          </div>

          <div className="bg-white p-5 rounded-3xl border border-[#e6ebe3] shadow-sm">
            <h3 className="font-serif text-sm font-bold text-stone-700 mb-4 flex items-center gap-1.5">
              <Sprout className="h-4 w-4 text-[#1b4332]" />
              Sản lượng thu hoạch theo tháng
            </h3>
            <YieldChart cooperativeId={user.cooperativeId || undefined} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#e6ebe3] shadow-sm">
          <h3 className="font-serif text-sm font-bold text-stone-700 mb-4 flex items-center gap-1.5">
            <Map className="h-4 w-4 text-[#1b4332]" />
            Bản đồ vùng trồng liên kết vệ tinh
          </h3>
          <div className="h-[450px] w-full rounded-2xl overflow-hidden relative">
            <FarmZoneMap zones={zones} />
          </div>
        </div>
      </div>
    </div>
  );
}
