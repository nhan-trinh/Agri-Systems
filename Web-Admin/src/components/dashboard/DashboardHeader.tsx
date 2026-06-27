'use client';

import { type User } from '@/store/auth';
import { cn } from '@/lib/cn';

const ROLE_LABELS: Record<User['role'], string> = {
  SUPER_ADMIN: 'Super Admin',
  HTX_MANAGER: 'Quản lý HTX',
  FARMER: 'Nông dân',
  WAREHOUSE_KEEPER: 'Thủ kho',
  GOV_VIEWER: 'Giám sát viên',
  PUBLIC: 'Khách',
};

interface DashboardHeaderProps {
  user: User;
}

export function DashboardHeader({ user }: DashboardHeaderProps) {
  const today = new Intl.DateTimeFormat('vi-VN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
      {/* Greeting */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-stone-400">{today}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-sans text-2xl font-bold tracking-tight text-stone-900 leading-tight">
            Xin chào, {user.zaloName || user.phone}
          </h1>
          <span
            className={cn(
              'px-2.5 py-1 rounded-md text-[10px] font-semibold tracking-wide',
              user.role === 'SUPER_ADMIN' && 'bg-amber-50 text-amber-700',
              user.role === 'HTX_MANAGER' && 'bg-emerald-50 text-emerald-700',
              user.role === 'WAREHOUSE_KEEPER' && 'bg-stone-100 text-stone-600',
              user.role === 'GOV_VIEWER' && 'bg-blue-50 text-blue-700',
              'bg-stone-100 text-stone-600'
            )}
          >
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
        </div>
      </div>
    </div>
  );
}
