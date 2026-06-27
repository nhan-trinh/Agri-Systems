'use client';

import { useAuthStore } from '@/store/auth';

export function Header() {
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
    <header className="h-16 bg-white shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex items-center justify-between px-8 font-sans sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <h2 className="text-stone-800 font-semibold text-base hidden md:block">
          Hệ thống Quản lý AgriTrace
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getRoleBadgeStyles(user.role)}`}>
          {getRoleLabel(user.role)}
        </span>

        {/* User Info */}
        <div className="flex items-center gap-3 pl-4">
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
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-700 font-semibold flex items-center justify-center">
              {user.role.substring(0, 2)}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
