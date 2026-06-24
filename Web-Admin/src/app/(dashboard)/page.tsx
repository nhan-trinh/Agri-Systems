'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Sprout, TrendingUp, Map } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import { ZoneData } from '@/components/map/FarmZoneMap';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardSection } from '@/components/dashboard/DashboardSection';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { DashboardStatsCards } from '@/components/dashboard/DashboardStatsCards';
import { RecentActivitiesPanel } from '@/components/dashboard/RecentActivitiesPanel';
import { CarbonTrendChart } from '@/components/charts/CarbonTrendChart';
import { YieldChart } from '@/components/charts/YieldChart';

const FarmZoneMap = dynamic(() => import('@/components/map/FarmZoneMap').then((m) => m.FarmZoneMap), {
  ssr: false,
});

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [zones, setZones] = useState<ZoneData[]>([]);

  useEffect(() => {
    if (!user) return;
    apiClient
      .get('/farm-zones')
      .then((res) => {
        if (res.data?.success) setZones(res.data.data);
      })
      .catch((err) => console.error('Lỗi khi tải danh sách vùng trồng:', err));
  }, [user]);

  if (!user) return null;

  const cooperativeId = user.cooperativeId || undefined;

  return (
    <div className="space-y-6 font-sans">
      {/* Compact greeting */}
      <DashboardHeader user={user} />

      {/* KPI grid */}
      <DashboardStatsCards cooperativeId={cooperativeId} />

      {/* Charts — centerpiece */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DashboardSection title="Xu hướng phát thải & hấp thụ Carbon" icon={TrendingUp}>
          <CarbonTrendChart cooperativeId={cooperativeId} />
        </DashboardSection>
        <DashboardSection title="Sản lượng thu hoạch theo tháng" icon={Sprout}>
          <YieldChart cooperativeId={cooperativeId} />
        </DashboardSection>
      </div>

      {/* Alerts & activity feed */}
      <RecentActivitiesPanel cooperativeId={cooperativeId} />

      {/* Farm-zone map */}
      <DashboardSection title="Bản đồ vùng trồng liên kết vệ tinh" icon={Map} bodyClassName="p-0">
        <div className="h-[450px] w-full rounded-xl overflow-hidden">
          <FarmZoneMap zones={zones} />
        </div>
      </DashboardSection>

      {/* Role-based quick actions */}
      <QuickActions role={user.role} />
    </div>
  );
}
