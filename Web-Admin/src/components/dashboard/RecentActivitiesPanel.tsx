'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/axios';
import Link from 'next/link';
import {
  AlertTriangle,
  Sprout,
  Package,
  Award,
  Clock,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Inbox,
} from 'lucide-react';

interface RecentActivity {
  type: 'FARMING_LOG' | 'BATCH_ACTIVATED' | 'CARBON_ISSUED';
  message: string;
  time: string;
}

interface ActionItem {
  type: 'CARBON_DRAFT' | 'LOW_STOCK' | 'QR_RECEIVED';
  message: string;
  action_url: string;
}

interface RecentActivitiesPanelProps {
  cooperativeId?: string;
}

export function RecentActivitiesPanel({ cooperativeId }: RecentActivitiesPanelProps) {
  const [activities, setActivities] = useState<RecentActivity[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cooperativeId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { cooperativeId?: string } = {};
      if (cooperativeId) params.cooperativeId = cooperativeId;

      const [activitiesRes, actionsRes] = await Promise.all([
        apiClient.get('/dashboard/recent-activities', { params }),
        apiClient.get('/dashboard/action-items', { params }),
      ]);

      if (activitiesRes.data?.success) {
        setActivities(activitiesRes.data.data);
      }
      if (actionsRes.data?.success) {
        setActions(actionsRes.data.data);
      }
    } catch {
      setError('Không thể tải hoạt động gần đây');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'FARMING_LOG':
        return <Sprout className="h-4 w-4 text-emerald-600" />;
      case 'BATCH_ACTIVATED':
        return <Package className="h-4 w-4 text-indigo-600" />;
      case 'CARBON_ISSUED':
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return <Clock className="h-4 w-4 text-stone-400" />;
    }
  };

  const getActivityBg = (type: string) => {
    switch (type) {
      case 'FARMING_LOG':
        return 'bg-emerald-50';
      case 'BATCH_ACTIVATED':
        return 'bg-indigo-50';
      case 'CARBON_ISSUED':
        return 'bg-amber-50';
      default:
        return 'bg-stone-50';
    }
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'CARBON_DRAFT':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'LOW_STOCK':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'QR_RECEIVED':
        return <Package className="h-4 w-4 text-blue-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-stone-400" />;
    }
  };

  const getActionBorderColor = (type: string) => {
    switch (type) {
      case 'CARBON_DRAFT':
        return 'border-l-orange-400 bg-orange-50/30';
      case 'LOW_STOCK':
        return 'border-l-red-400 bg-red-50/30';
      case 'QR_RECEIVED':
        return 'border-l-blue-400 bg-blue-50/30';
      default:
        return 'border-l-stone-300 bg-stone-50/30';
    }
  };

  const formatTimeAgo = (timeStr: string) => {
    const date = new Date(timeStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return date.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-white p-5 rounded-2xl border border-[#e6ebe3] shadow-sm animate-pulse">
            <div className="h-4 w-32 bg-stone-100 rounded mb-4" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="flex items-start gap-3 py-3 border-b border-stone-50 last:border-0">
                <div className="h-8 w-8 bg-stone-100 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 bg-stone-100 rounded" />
                  <div className="h-2.5 w-16 bg-stone-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-[#e6ebe3] shadow-sm flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <p className="text-sm text-stone-600 font-medium flex-1">{error}</p>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs font-bold text-[#1b4332] hover:underline"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Action Items (Urgent) */}
      <div className="bg-white p-5 rounded-2xl border border-[#e6ebe3] shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-serif text-sm font-bold text-stone-800 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            Cần xử lý
          </h3>
          {actions.length > 0 && (
            <span className="bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
              {actions.length}
            </span>
          )}
        </div>

        {actions.length === 0 ? (
          <div className="py-8 text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-sm text-stone-500 font-medium">Không có việc cần xử lý</p>
            <p className="text-xs text-stone-400 mt-1">Tất cả đã được giải quyết</p>
          </div>
        ) : (
          <div className="space-y-2">
            {actions.map((item, i) => (
              <Link
                key={i}
                href={item.action_url}
                className={`block border-l-4 rounded-xl p-3 hover:shadow-sm transition-all group ${getActionBorderColor(item.type)}`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="mt-0.5 flex-shrink-0">
                    {getActionIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-700 font-semibold leading-relaxed">
                      {item.message}
                    </p>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-stone-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activities */}
      <div className="bg-white p-5 rounded-2xl border border-[#e6ebe3] shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-serif text-sm font-bold text-stone-800 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-[#1b4332]" />
            Hoạt động gần đây
          </h3>
          <button
            onClick={fetchData}
            className="text-stone-400 hover:text-[#1b4332] transition-colors"
            title="Làm mới"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {activities.length === 0 ? (
          <div className="py-8 text-center">
            <Inbox className="h-8 w-8 mx-auto text-stone-300 mb-2" />
            <p className="text-sm text-stone-500 font-medium">Chưa có hoạt động nào</p>
            <p className="text-xs text-stone-400 mt-1">Hoạt động sẽ xuất hiện khi có dữ liệu mới</p>
          </div>
        ) : (
          <div className="space-y-1 max-h-[280px] overflow-y-auto scrollbar-thin">
            {activities.map((activity, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 py-2.5 px-2 rounded-lg hover:bg-[#f5f8f4] transition-all group"
              >
                <div className={`${getActivityBg(activity.type)} p-1.5 rounded-lg flex-shrink-0 mt-0.5 group-hover:scale-110 transition-transform`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-700 font-medium leading-relaxed line-clamp-2">
                    {activity.message}
                  </p>
                  <p className="text-[10px] text-stone-400 font-semibold mt-0.5 flex items-center gap-1">
                    <Clock className="h-2.5 w-2.5" />
                    {formatTimeAgo(activity.time)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
