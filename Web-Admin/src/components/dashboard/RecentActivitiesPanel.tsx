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
  Bell,
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
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
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
      <div className="bg-white rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_8px_30px_rgba(27,67,50,0.03)] p-6 animate-pulse space-y-5">
        <div className="h-4 w-28 bg-stone-100 rounded" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="h-8 w-8 bg-stone-100 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 bg-stone-100 rounded" />
                <div className="h-2.5 w-16 bg-stone-100 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-3xl shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-6 flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
        <p className="text-xs text-stone-600 font-medium flex-1">{error}</p>
        <button onClick={fetchData} className="text-xs font-bold text-[#1b4332] hover:underline">
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const showActions = actions.length > 0;
  const showActivities = activities.length > 0;

  return (
    <div className="bg-white rounded-[28px] shadow-[0_1px_3px_rgba(0,0,0,0.02),0_12px_40px_rgba(27,67,50,0.03)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2.5">
          <Bell className="h-4 w-4 text-stone-400" strokeWidth={1.8} />
          <h3 className="text-[13px] font-semibold text-stone-600 uppercase tracking-wide">Cập nhật</h3>
          {showActions && (
            <span className="bg-orange-100/80 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-full leading-none">
              {actions.length}
            </span>
          )}
        </div>
        <button
          onClick={fetchData}
          className="text-stone-400 hover:text-[#1b4332] transition-colors p-1 rounded-lg hover:bg-stone-50"
          title="Làm mới"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="px-5 pb-5 space-y-5">
        {/* Action items */}
        {showActions && (
          <div className="space-y-2">
            <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] px-1">
              Cần xử lý
            </p>
            {actions.map((item, i) => (
              <Link
                key={i}
                href={item.action_url}
                className="flex items-start gap-2.5 p-3 rounded-2xl bg-orange-50/40 hover:bg-orange-50 transition-all group"
              >
                <div className="mt-0.5 flex-shrink-0">
                  <AlertCircle className="h-4 w-4 text-orange-500" strokeWidth={1.8} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-stone-700 font-medium leading-relaxed line-clamp-2">
                    {item.message}
                  </p>
                </div>
                <ArrowRight className="h-3.5 w-3.5 text-stone-300 group-hover:text-orange-600 group-hover:translate-x-0.5 transition-all flex-shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        )}

        {/* Divider */}
        {showActions && showActivities && (
          <div className="h-px bg-stone-100/50" />
        )}

        {/* Recent activities */}
        <div>
          <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-[0.08em] mb-2.5 px-1">
            Hoạt động
          </p>
          {showActivities ? (
            <div className="space-y-0.5 max-h-[260px] overflow-y-auto">
              {activities.map((activity, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 py-2.5 px-2 rounded-xl hover:bg-stone-50/80 transition-colors"
                >
                  <div className="p-1.5 rounded-lg flex-shrink-0 mt-0.5">
                    {activity.type === 'FARMING_LOG' && <Sprout className="h-3.5 w-3.5 text-emerald-600" strokeWidth={1.8} />}
                    {activity.type === 'BATCH_ACTIVATED' && <Package className="h-3.5 w-3.5 text-indigo-600" strokeWidth={1.8} />}
                    {activity.type === 'CARBON_ISSUED' && <Award className="h-3.5 w-3.5 text-amber-600" strokeWidth={1.8} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-stone-600 font-medium leading-relaxed line-clamp-2">
                      {activity.message}
                    </p>
                    <p className="text-[10px] text-stone-400 font-medium mt-1 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />
                      {formatTimeAgo(activity.time)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <Inbox className="h-6 w-6 mx-auto text-stone-300 mb-2" />
              <p className="text-xs text-stone-500 font-medium">Chưa có hoạt động</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
