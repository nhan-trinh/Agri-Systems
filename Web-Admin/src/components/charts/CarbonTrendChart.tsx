'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts';
import { apiClient } from '@/lib/api/axios';
import { Loader2, AlertTriangle } from 'lucide-react';

interface CarbonChartData {
  month: number;
  emitted_kg: number;
  sequestered_kg: number;
  net_tCO2e: number;
}

interface ChartDataPoint {
  name: string;
  emitted: number;
  sequestered: number;
  net: number;
}

const MONTH_NAMES = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

interface CarbonTrendChartProps {
  year?: number;
  cooperativeId?: string;
}

export function CarbonTrendChart({ year, cooperativeId }: CarbonTrendChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(year || new Date().getFullYear());

  useEffect(() => {
    fetchCarbonChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, cooperativeId]);

  const fetchCarbonChart = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { year: number; cooperativeId?: string } = { year: selectedYear };
      if (cooperativeId) params.cooperativeId = cooperativeId;

      const res = await apiClient.get('/dashboard/carbon-chart', { params });
      if (res.data?.success) {
        const rawData: CarbonChartData[] = res.data.data;
        const chartData: ChartDataPoint[] = rawData.map((item) => ({
          name: MONTH_NAMES[item.month - 1],
          emitted: Number((item.emitted_kg / 1000).toFixed(2)),
          sequestered: Number((item.sequestered_kg / 1000).toFixed(2)),
          net: Number(item.net_tCO2e.toFixed(2)),
        }));
        setData(chartData);
      }
    } catch {
      setError('Không thể tải dữ liệu biểu đồ carbon');
    } finally {
      setLoading(false);
    }
  };

  const hasData = data.some(d => d.emitted > 0 || d.sequestered > 0);

  if (loading) {
    return (
      <div className="h-72 w-full flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-[#1b4332]" />
        <p className="text-xs text-stone-400 font-medium">Đang tải biểu đồ...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-72 w-full flex flex-col items-center justify-center gap-2">
        <AlertTriangle className="h-6 w-6 text-amber-500" />
        <p className="text-xs text-stone-500 font-medium">{error}</p>
        <button
          onClick={fetchCarbonChart}
          className="text-xs text-[#1b4332] font-bold hover:underline"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className="h-72 w-full flex flex-col items-center justify-center gap-2">
        <div className="text-4xl">🌱</div>
        <p className="text-sm text-stone-500 font-medium">Chưa có dữ liệu carbon cho năm {selectedYear}</p>
        <p className="text-xs text-stone-400">Dữ liệu sẽ hiển thị khi có bản ghi carbon được tạo</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Year Selector */}
      <div className="flex justify-end">
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          className="text-xs font-bold text-stone-600 bg-stone-100 hover:bg-stone-200 border-0 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-0 transition-all cursor-pointer"
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f2ef" vertical={false} />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 10, fill: '#888b86', fontWeight: 500 }} 
              axisLine={{ stroke: '#f0f2ef' }}
              tickLine={false}
            />
            <YAxis 
              tick={{ fontSize: 9, fill: '#888b86' }} 
              axisLine={false}
              tickLine={false}
              label={{ value: 'tCO2e', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#a8a29e', offset: 15 }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: 'none',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 600,
                boxShadow: '0 10px 25px -5px rgba(27, 67, 50, 0.08)',
              }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(value: any, name: any) => {
                const label = name === 'emitted' ? 'Phát thải' : name === 'sequestered' ? 'Hấp thụ' : 'Carbon ròng';
                return [`${value} tCO2e`, label];
              }}
              labelFormatter={(label) => `Tháng ${String(label).replace('T', '')}`}
            />
            <Legend 
              formatter={(value: string) => {
                const labels: Record<string, string> = { emitted: 'Phát thải', sequestered: 'Hấp thụ', net: 'Carbon ròng' };
                return <span className="text-xs font-bold">{labels[value] || value}</span>;
              }}
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
            />
            <ReferenceLine y={0} stroke="#a8a29e" strokeDasharray="3 3" />
            <Bar dataKey="emitted" fill="#e05a47" radius={[6, 6, 0, 0]} maxBarSize={22} />
            <Bar dataKey="sequestered" fill="#52b788" radius={[6, 6, 0, 0]} maxBarSize={22} />
            <Bar dataKey="net" fill="#e9a13b" radius={[6, 6, 0, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
