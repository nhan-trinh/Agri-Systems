'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { TrendingUp, Sprout, Map } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { apiClient } from '@/lib/api/axios';
import type { ZoneData } from '@/components/map/FarmZoneMap';
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
      .catch(() => {});
  }, [user]);

  if (!user) return null;

  const cooperativeId = user.cooperativeId || undefined;

  return (
    <div className="space-y-6">
      {/* ── Hero header with Carbon Pulse ── */}
      <DashboardHeader user={user} />

      {/* ── Full width Stats Cards ── */}
      <DashboardStatsCards cooperativeId={cooperativeId} />

      {/* ── 2-column Layout Split ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Charts, Quick Actions, and Map */}
        <div className="lg:col-span-2 space-y-6">
          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <DashboardSection title="Xu hướng Carbon" icon={TrendingUp}>
              <CarbonTrendChart cooperativeId={cooperativeId} />
            </DashboardSection>
            <DashboardSection title="Sản lượng thu hoạch" icon={Sprout}>
              <YieldChart cooperativeId={cooperativeId} />
            </DashboardSection>
          </div>

          {/* Quick actions */}
          <QuickActions role={user.role} />
        </div>

        {/* Right: Activities & Alerts */}
        <div className="lg:col-span-1">
          <RecentActivitiesPanel cooperativeId={cooperativeId} />
        </div>
      </div>

      {/* ── Farm-zone map (Full width) ── */}
      <DashboardSection title="Bản đồ vùng trồng" icon={Map} bodyClassName="px-0 pb-0">
        <div className="h-[450px] w-full overflow-hidden rounded-b-xl">
          <FarmZoneMap zones={zones} />
        </div>
      </DashboardSection>
    </div>
  );
}
