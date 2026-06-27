'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/axios';
import {
  Users,
  Map,
  Calendar,
  Wheat,
  Package,
  QrCode,
  Leaf,
  Award,
  TrendingDown,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

interface DashboardStats {
  total_farmers: number;
  total_farm_zones: number;
  active_seasons: number;
  completed_seasons_ytd: number;
  total_yield_kg_ytd: number;
  active_batches: number;
  total_qr_issued: number;
  carbon: {
    draft: number;
    verified: number;
    issued: number;
    total_credits_tCO2e: number;
  };
}

interface DashboardStatsCardsProps {
  cooperativeId?: string;
}

export function DashboardStatsCards({ cooperativeId }: DashboardStatsCardsProps) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooperativeId]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { cooperativeId?: string } = {};
      if (cooperativeId) params.cooperativeId = cooperativeId;

      const res = await apiClient.get('/dashboard/stats', { params });
      if (res.data?.success) {
        setStats(res.data.data);
      }
    } catch {
      setError('Không thể tải thống kê');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        {/* Hero skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-3xl p-7 animate-pulse bg-stone-100/60 h-[140px]" />
          ))}
        </div>
        {/* Metric skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl p-5 animate-pulse bg-stone-50 h-[90px]" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white p-6 rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <p className="text-sm text-stone-600 font-medium flex-1">{error || 'Không có dữ liệu'}</p>
        <button
          onClick={fetchStats}
          className="flex items-center gap-1.5 text-xs font-bold text-[#1b4332] hover:underline"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Thử lại
        </button>
      </div>
    );
  }

  const operationalCards = [
    {
      label: 'Nông dân',
      value: stats.total_farmers,
      icon: Users,
      accent: 'text-emerald-600',
      accentBg: 'bg-emerald-50',
    },
    {
      label: 'Vùng trồng',
      value: stats.total_farm_zones,
      icon: Map,
      accent: 'text-sky-600',
      accentBg: 'bg-sky-50',
    },
    {
      label: 'Vụ đang canh tác',
      value: stats.active_seasons,
      icon: Calendar,
      accent: 'text-amber-600',
      accentBg: 'bg-amber-50',
    },
    {
      label: 'Lô hàng hoạt động',
      value: stats.active_batches,
      icon: Package,
      accent: 'text-violet-600',
      accentBg: 'bg-violet-50',
    },
    {
      label: 'Mã QR đã cấp',
      value: stats.total_qr_issued.toLocaleString('vi-VN'),
      icon: QrCode,
      accent: 'text-indigo-600',
      accentBg: 'bg-indigo-50',
    },
    {
      label: 'Carbon chờ duyệt',
      value: stats.carbon.draft + stats.carbon.verified,
      icon: Leaf,
      accent: 'text-orange-600',
      accentBg: 'bg-orange-50',
      subtext: `${stats.carbon.draft} nháp · ${stats.carbon.verified} đã xác minh`,
    },
  ];

  return (
    <div className="space-y-5">
      {/* ─── Section label ─── */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-bold text-stone-800 tracking-tight">Tổng quan hoạt động</h2>
        <button
          onClick={fetchStats}
          className="flex items-center gap-1 text-xs font-medium text-stone-400 hover:text-[#1b4332] transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Làm mới
        </button>
      </div>

      {/* ─── Hero cards row ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Hero 1: Carbon Credits */}
        <div className="relative overflow-hidden rounded-xl bg-[#1b4332] p-7 text-white shadow-sm">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-white/10">
                <Award className="h-5 w-5 text-emerald-300" strokeWidth={1.8} />
              </div>
              <span className="text-[11px] font-semibold text-emerald-300/80 uppercase tracking-[0.1em]">
                Tín chỉ carbon
              </span>
            </div>
            <p className="font-sans text-4.5xl font-bold tracking-tight leading-none">
              {stats.carbon.total_credits_tCO2e.toFixed(1)}
              <span className="text-base font-medium text-emerald-300 ml-1.5">tCO₂e</span>
            </p>
            <p className="text-emerald-200/70 text-xs font-medium mt-3">
              {stats.carbon.issued} chứng nhận đã phát hành
            </p>
          </div>
        </div>

        {/* Hero 2: Total Yield */}
        <div className="relative overflow-hidden rounded-xl bg-[#faf5e8] p-7 shadow-sm">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-amber-100/80">
                <Wheat className="h-5 w-5 text-amber-700" strokeWidth={1.8} />
              </div>
              <span className="text-[11px] font-semibold text-amber-700/70 uppercase tracking-[0.1em]">
                Sản lượng thu hoạch
              </span>
            </div>
            <p className="font-sans text-4.5xl font-bold text-stone-900 tracking-tight leading-none">
              {(stats.total_yield_kg_ytd / 1000).toFixed(1)}
              <span className="text-base font-medium text-amber-700/60 ml-1.5">tấn</span>
            </p>
            <p className="text-stone-500 text-xs font-medium mt-3">
              {stats.completed_seasons_ytd} vụ đã hoàn thành trong năm
            </p>
          </div>
        </div>
      </div>

      {/* ─── Operational metric cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {operationalCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="rounded-xl bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.015)] border-0"
            >
              <div className="flex flex-col gap-3">
                <div className={`${card.accentBg} ${card.accent} p-2 rounded-lg w-fit`}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-stone-400 uppercase tracking-[0.06em] truncate">
                    {card.label}
                  </p>
                  <p className="font-sans text-2xl font-bold text-stone-900 mt-0.5 leading-tight tracking-tight">
                    {card.value}
                  </p>
                  {card.subtext && (
                    <p className="text-[9px] text-stone-400 font-medium mt-0.5 truncate">
                      {card.subtext}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Carbon Balance Banner ─── */}
      {stats.carbon.total_credits_tCO2e > 0 && (
        <div className="flex items-center gap-4 rounded-xl bg-emerald-50/40 px-6 py-4">
          <div className="p-2.5 rounded-lg bg-emerald-100/80">
            <TrendingDown className="h-5 w-5 text-emerald-700" strokeWidth={1.8} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-emerald-800/80">
              Tổng lượng giảm phát thải đã được chứng nhận
            </p>
            <p className="font-sans text-lg font-bold text-emerald-900 mt-0.5">
              {stats.carbon.total_credits_tCO2e.toFixed(2)}{' '}
              <span className="text-sm font-medium text-emerald-600">tCO₂e</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold text-emerald-700">{stats.carbon.issued} chứng nhận</span>
          </div>
        </div>
      )}
    </div>
  );
}
