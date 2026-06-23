'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import { 
  LayoutDashboard, 
  Building2, 
  Leaf, 
  Users, 
  UserCog, 
  Map, 
  Calendar, 
  QrCode, 
  FileSearch, 
  Package, 
  BarChart3,
  LogOut,
  Sprout
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  if (!user) return null;

  const menuItems = [
    {
      title: 'Tổng quan',
      href: '/',
      icon: LayoutDashboard,
      roles: ['SUPER_ADMIN', 'HTX_MANAGER', 'WAREHOUSE_KEEPER', 'GOV_VIEWER'],
    },
    {
      title: 'Hợp tác xã',
      href: '/cooperatives',
      icon: Building2,
      roles: ['SUPER_ADMIN'],
    },
    {
      title: 'Quản lý tài khoản',
      href: '/users',
      icon: UserCog,
      roles: ['SUPER_ADMIN', 'HTX_MANAGER'],
    },
    {
      title: 'Hệ số phát thải',
      href: '/carbon/factors',
      icon: Leaf,
      roles: ['SUPER_ADMIN'],
    },
    {
      title: 'Báo cáo Carbon',
      href: '/carbon',
      icon: Leaf,
      roles: ['SUPER_ADMIN', 'HTX_MANAGER', 'GOV_VIEWER'],
    },
    {
      title: 'Hộ nông dân',
      href: '/farmers',
      icon: Users,
      roles: ['SUPER_ADMIN', 'HTX_MANAGER'],
    },
    {
      title: 'Vùng trồng',
      href: '/farm-zones',
      icon: Map,
      roles: ['HTX_MANAGER'],
    },
    {
      title: 'Vụ mùa',
      href: '/seasons',
      icon: Calendar,
      roles: ['HTX_MANAGER'],
    },
    {
      title: 'Lô hàng & QR',
      href: '/qr',
      icon: QrCode,
      roles: ['HTX_MANAGER'],
    },
    {
      title: 'Số hóa OCR',
      href: '/ocr',
      icon: FileSearch,
      roles: ['SUPER_ADMIN', 'HTX_MANAGER', 'WAREHOUSE_KEEPER'],
    },
    {
      title: 'Kho vật tư',
      href: '/warehouse',
      icon: Package,
      roles: ['HTX_MANAGER', 'WAREHOUSE_KEEPER'],
    },
    {
      title: 'Báo cáo giám sát',
      href: '/reports',
      icon: BarChart3,
      roles: ['GOV_VIEWER'],
    },
  ];

  const filteredItems = menuItems.filter(item => item.roles.includes(user.role));

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-68 border-r border-[#e6ebe3] bg-[#fbfcf9] h-screen hidden md:flex flex-col justify-between sticky top-0 font-sans">
      <div className="flex flex-col pt-6 px-4">
        {/* Branding */}
        <div className="flex items-center gap-3 px-3 mb-8">
          <div className="bg-[#1b4332] text-white p-2 rounded-xl shadow-md transition-all duration-300 hover:scale-105">
            <Sprout className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-serif text-xl font-bold tracking-tight text-[#1b4332]">
              AgriTrace
            </h1>
            <p className="text-[10px] text-emerald-700 font-semibold tracking-wider uppercase">
              Carbon Platform
            </p>
          </div>
        </div>

        {/* Menu Items */}
        <nav className="space-y-1">
          {filteredItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 group relative ${
                  isActive
                    ? 'bg-[#1b4332] text-white shadow-sm'
                    : 'text-stone-600 hover:text-[#1b4332] hover:bg-[#f0f4ee]'
                }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/4 bottom-1/4 w-[4px] bg-[#52b788] rounded-r-full" />
                )}
                <Icon className={`h-5 w-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-[#52b788]' : 'text-stone-400 group-hover:text-[#1b4332]'}`} />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Footer Info & Logout */}
      <div className="p-4 border-t border-[#e6ebe3] bg-[#f7f9f5]">
        <div className="flex items-center gap-3 mb-4 px-2">
          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt="Avatar" 
              className="h-10 w-10 rounded-full border-2 border-emerald-600 object-cover"
            />
          ) : (
            <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center border-2 border-emerald-600">
              <span className="font-bold text-[#1b4332] text-sm">
                {user.role.substring(0, 2)}
              </span>
            </div>
          )}
          <div className="overflow-hidden">
            <p className="text-xs font-semibold text-stone-800 truncate">{user.phone}</p>
            <p className="text-[10px] text-[#52b788] font-bold uppercase">{user.role}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 transition-all duration-300"
        >
          <LogOut className="h-4 w-4" />
          Đăng xuất
        </button>
      </div>
    </aside>
  );
}
