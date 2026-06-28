'use client';

import { useAuthStore } from '@/store/auth';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuToggle?: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user } = useAuthStore();

  if (!user) return null;

  const getRoleBadgeStyles = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-amber-50 text-amber-700';
      case 'HTX_MANAGER':
        return 'bg-emerald-50 text-emerald-700';
      case 'WAREHOUSE_KEEPER':
        return 'bg-stone-100 text-stone-600';
      case 'GOV_VIEWER':
        return 'bg-blue-50 text-blue-700';
      default:
        return 'bg-stone-100 text-stone-600';
    }
  };

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
    <header className="h-14 md:h-16 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between px-4 md:px-8 font-sans sticky top-0 z-30">
      <div className="flex items-center gap-2">
        {/* Mobile hamburger menu button */}
        <button
          onClick={onMenuToggle}
          className="p-2 -ml-1 rounded-xl text-stone-600 hover:text-[#1b4332] hover:bg-[#f4f6f3] transition-colors md:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        <h2 className="text-stone-800 font-semibold text-sm md:text-base hidden md:block">
          Hệ thống Quản lý AgriTrace
        </h2>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        {/* Role Badge */}
        <span className={`px-2 py-1 md:px-2.5 md:py-1 rounded-full text-[10px] md:text-xs font-bold ${getRoleBadgeStyles(user.role)}`}>
          {getRoleLabel(user.role)}
        </span>

        {/* User Info */}
        <div className="flex items-center gap-2 md:gap-3 pl-2 md:pl-4">
          <div className="flex flex-col text-right hidden sm:flex">
            <span className="text-xs font-semibold text-stone-800">
              {user.zaloName || user.phone}
            </span>
            <span className="text-[10px] text-stone-400">
              ID: {user.phone}
            </span>
          </div>

          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt="User avatar" 
              className="h-8 w-8 md:h-9 md:w-9 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 md:h-9 md:w-9 rounded-full bg-emerald-50 text-emerald-700 font-semibold flex items-center justify-center text-sm md:text-base">
              {user.role.substring(0, 2)}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
