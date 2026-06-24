import { type User } from '@/store/auth';
import { cn } from '@/lib/cn';

const ROLE_LABELS: Record<User['role'], string> = {
  SUPER_ADMIN: 'Super Admin',
  HTX_MANAGER: 'HTX Manager',
  FARMER: 'Nông dân',
  WAREHOUSE_KEEPER: 'Warehouse Keeper',
  GOV_VIEWER: 'Gov Viewer',
  PUBLIC: 'Khách',
};

const ROLE_BADGE_STYLES: Partial<Record<User['role'], string>> = {
  SUPER_ADMIN: 'bg-amber-50 text-amber-700 border-amber-200',
  HTX_MANAGER: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  WAREHOUSE_KEEPER: 'bg-slate-100 text-slate-600 border-slate-200',
  GOV_VIEWER: 'bg-blue-50 text-blue-700 border-blue-200',
};

interface DashboardHeaderProps {
  user: User;
}

/**
 * Compact dashboard greeting bar: greeting · today's date (vi-VN) · role badge.
 * Replaces the oversized hero banner — standard SaaS sizing, brand palette kept.
 * Owns the single source of truth for role labels and badge colors.
 */
export function DashboardHeader({ user }: DashboardHeaderProps) {
  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="space-y-1">
        <h1 className="font-serif text-2xl md:text-3xl font-bold tracking-tight text-[#1b4332]">
          Xin chào, {user.zaloName || user.phone}!
        </h1>
        <p className="text-xs font-medium text-stone-500 capitalize">{today}</p>
      </div>

      <span
        className={cn(
          'self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold border',
          ROLE_BADGE_STYLES[user.role] ?? 'bg-stone-100 text-stone-600 border-stone-200'
        )}
      >
        {ROLE_LABELS[user.role] ?? user.role}
      </span>
    </div>
  );
}
