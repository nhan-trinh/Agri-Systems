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
  CheckCircle,
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
      setError('Không thể tải thống kê tổng quan');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-[#e6ebe3] shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-stone-100 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-16 bg-stone-100 rounded" />
                <div className="h-6 w-12 bg-stone-100 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-[#e6ebe3] shadow-sm flex items-center gap-3">
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

  const cards = [
    {
      label: 'Nông dân',
      value: stats.total_farmers,
      icon: Users,
      color: 'bg-blue-50 text-blue-700',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Vùng trồng',
      value: stats.total_farm_zones,
      icon: Map,
      color: 'bg-emerald-50 text-emerald-700',
      iconColor: 'text-emerald-600',
    },
    {
      label: 'Vụ đang canh tác',
      value: stats.active_seasons,
      icon: Calendar,
      color: 'bg-amber-50 text-amber-700',
      iconColor: 'text-amber-600',
    },
    {
      label: 'Sản lượng (tấn)',
      value: Number((stats.total_yield_kg_ytd / 1000).toFixed(1)),
      icon: Wheat,
      color: 'bg-lime-50 text-lime-700',
      iconColor: 'text-lime-600',
      suffix: 'tấn',
    },
    {
      label: 'Lô hàng hoạt động',
      value: stats.active_batches,
      icon: Package,
      color: 'bg-purple-50 text-purple-700',
      iconColor: 'text-purple-600',
    },
    {
      label: 'Mã QR đã cấp',
      value: stats.total_qr_issued.toLocaleString('vi-VN'),
      icon: QrCode,
      color: 'bg-indigo-50 text-indigo-700',
      iconColor: 'text-indigo-600',
    },
    {
      label: 'Carbon chờ duyệt',
      value: stats.carbon.draft + stats.carbon.verified,
      icon: Leaf,
      color: 'bg-orange-50 text-orange-700',
      iconColor: 'text-orange-600',
      subtext: `${stats.carbon.draft} nháp · ${stats.carbon.verified} đã xác minh`,
    },
    {
      label: 'Tín chỉ carbon cấp',
      value: stats.carbon.total_credits_tCO2e,
      icon: Award,
      color: 'bg-teal-50 text-teal-700',
      iconColor: 'text-teal-600',
      suffix: 'tCO2e',
      subtext: `${stats.carbon.issued} chứng nhận`,
    },
  ];

  return (
    <div className="space-y-4">
      {/* Refresh indicator */}
      <div className="flex justify-between items-center">
        <h2 className="font-serif text-xl font-bold text-stone-800">
          Tổng quan hoạt động
        </h2>
        <button
          onClick={fetchStats}
          className="flex items-center gap-1 text-xs font-semibold text-stone-400 hover:text-[#1b4332] transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Làm mới
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={i}
              className="bg-white p-4 rounded-2xl border border-[#e6ebe3] shadow-sm hover:shadow-md hover:border-emerald-200 transition-all duration-300 group"
            >
              <div className="flex items-start gap-3">
                <div className={`${card.color} p-2.5 rounded-xl group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider truncate">
                    {card.label}
                  </p>
                  <h3 className="text-xl font-bold text-stone-800 mt-0.5 leading-tight">
                    {card.value}
                    {card.suffix && (
                      <span className="text-xs font-medium text-stone-400 ml-1">{card.suffix}</span>
                    )}
                  </h3>
                  {card.subtext && (
                    <p className="text-[10px] text-stone-400 font-medium mt-0.5 truncate">
                      {card.subtext}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Carbon Balance Indicator */}
      {stats.carbon.total_credits_tCO2e > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-200/50 flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-xl">
            <TrendingDown className="h-5 w-5 text-emerald-700" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-emerald-800">
              Tổng lượng giảm phát thải carbon đã được chứng nhận
            </p>
            <p className="text-lg font-bold text-emerald-900 mt-0.5">
              {stats.carbon.total_credits_tCO2e.toFixed(2)} <span className="text-sm font-medium">tCO2e</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-bold text-emerald-700">{stats.carbon.issued} chứng nhận</span>
          </div>
        </div>
      )}
    </div>
  );
}
