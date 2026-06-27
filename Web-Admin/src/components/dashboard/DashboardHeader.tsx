'use client';

import { useEffect, useState } from 'react';
import { Sprout } from 'lucide-react';
import { type User } from '@/store/auth';
import { cn } from '@/lib/cn';
import { apiClient } from '@/lib/api/axios';

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
  const [carbonCredits, setCarbonCredits] = useState<number | null>(null);

  useEffect(() => {
    const params: { cooperativeId?: string } = {};
    if (user.cooperativeId) params.cooperativeId = user.cooperativeId;
    apiClient
      .get('/dashboard/stats', { params })
      .then((res) => {
        if (res.data?.success) {
          setCarbonCredits(res.data.data.carbon.total_credits_tCO2e);
        }
      })
      .catch(() => {});
  }, [user]);

  const today = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6">
      {/* Left: Greeting */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-stone-400">{today}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-serif text-2xl md:text-[28px] font-bold tracking-tight text-stone-900 leading-tight">
            Xin chào, {user.zaloName || user.phone}
          </h1>
          <span
            className={cn(
              'px-2.5 py-1 rounded-lg text-[10px] font-semibold tracking-wide',
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

      {/* Right: Carbon Pulse — signature element */}
      <div className="flex items-center gap-4 bg-white px-6 py-4 rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_40px_rgba(27,67,50,0.03)] animate-fade-in-up">
        <div className="relative flex-shrink-0">
          <div className="relative z-10 h-11 w-11 rounded-2xl bg-gradient-to-br from-[#1b4332] to-[#52b788] flex items-center justify-center shadow-lg shadow-emerald-900/15">
            <Sprout className="h-5 w-5 text-white" strokeWidth={1.8} />
          </div>
          <div className="absolute inset-0 rounded-2xl bg-emerald-400/10 animate-pulse-ring" />
        </div>
        <div>
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.12em]">
            Tín chỉ carbon
          </p>
          <p className="font-serif text-2xl font-bold text-stone-900 leading-tight tracking-tight">
            {carbonCredits !== null ? carbonCredits.toLocaleString('vi-VN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}
            <span className="text-sm font-medium text-emerald-600 ml-1.5">tCO₂e</span>
          </p>
          {carbonCredits !== null && carbonCredits > 0 && (
            <p className="text-[10px] text-emerald-600/60 font-medium mt-0.5">
              Tương đương {Math.round(carbonCredits * 0.75)} cây xanh/năm
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
