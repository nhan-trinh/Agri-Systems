'use client';

import { useAuthStore } from '@/store/auth';

export function Header() {
  const { user } = useAuthStore();

  if (!user) return null;

  const getRoleBadgeStyles = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'HTX_MANAGER':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'WAREHOUSE_KEEPER':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'GOV_VIEWER':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-stone-50 text-stone-700 border-stone-200';
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
    <header className="h-16 border-b border-[#e6ebe3] bg-white flex items-center justify-between px-6 font-sans">
      <div className="flex items-center gap-2">
        <h2 className="text-stone-800 font-semibold text-base hidden md:block">
          Hệ thống Quản lý AgriTrace
        </h2>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Badge */}
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${getRoleBadgeStyles(user.role)}`}>
          {getRoleLabel(user.role)}
        </span>

        {/* User Info */}
        <div className="flex items-center gap-3 pl-3 border-l border-[#e6ebe3]">
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
              className="h-9 w-9 rounded-full object-cover border border-[#e6ebe3]"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-700 font-semibold flex items-center justify-center border border-emerald-100">
              {user.role.substring(0, 2)}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
