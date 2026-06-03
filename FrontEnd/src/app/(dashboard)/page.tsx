import { CarbonTrendChart } from '@/components/charts/CarbonTrendChart';
import dynamic from 'next/dynamic';

const FarmZoneMap = dynamic(() => import('@/components/map/FarmZoneMap').then(m => m.FarmZoneMap), { ssr: false });

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="grid grid-cols-2 gap-6">
        <CarbonTrendChart />
        <FarmZoneMap />
      </div>
    </div>
  );
}
