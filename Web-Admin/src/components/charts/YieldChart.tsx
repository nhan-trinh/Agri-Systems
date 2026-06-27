'use client';

import { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { apiClient } from '@/lib/api/axios';
import { Loader2, AlertTriangle } from 'lucide-react';

interface YieldChartData {
  month: number;
  yield_kg: number;
}

interface ChartDataPoint {
  name: string;
  yield: number;
}

const MONTH_NAMES = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

interface YieldChartProps {
  year?: number;
  cooperativeId?: string;
}

export function YieldChart({ year, cooperativeId }: YieldChartProps) {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(year || new Date().getFullYear());

  useEffect(() => {
    fetchYieldChart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear, cooperativeId]);

  const fetchYieldChart = async () => {
    try {
      setLoading(true);
      setError(null);
      const params: { year: number; cooperativeId?: string } = { year: selectedYear };
      if (cooperativeId) params.cooperativeId = cooperativeId;

      const res = await apiClient.get('/dashboard/yield-chart', { params });
      if (res.data?.success) {
        const rawData: YieldChartData[] = res.data.data;
        const chartData: ChartDataPoint[] = rawData.map((item) => ({
          name: MONTH_NAMES[item.month - 1],
          yield: Number((item.yield_kg / 1000).toFixed(2)), // Convert to tonnes
        }));
        setData(chartData);
      }
    } catch {
      setError('Không thể tải dữ liệu sản lượng');
    } finally {
      setLoading(false);
    }
  };

  const hasData = data.some(d => d.yield > 0);
  const totalYield = data.reduce((sum, d) => sum + d.yield, 0);

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
          onClick={fetchYieldChart}
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
        <div className="text-4xl">🌾</div>
        <p className="text-sm text-stone-500 font-medium">Chưa có dữ liệu sản lượng cho năm {selectedYear}</p>
        <p className="text-xs text-stone-400">Dữ liệu sẽ hiển thị khi các vụ mùa hoàn thành</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Year Selector + Total */}
      <div className="flex justify-between items-center">
        <p className="text-xs font-bold text-stone-500">
          Tổng: <span className="text-[#1b4332] text-sm">{totalYield.toFixed(1)}</span> tấn
        </p>
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
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id="yieldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#52b788" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#52b788" stopOpacity={0.01} />
              </linearGradient>
            </defs>
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
              label={{ value: 'Tấn', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#a8a29e', offset: 15 }}
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
              formatter={(value: any) => [`${value} tấn`, 'Sản lượng']}
              labelFormatter={(label) => `Tháng ${String(label).replace('T', '')}`}
            />
            <Area
              type="monotone"
              dataKey="yield"
              stroke="#2d6a4f"
              strokeWidth={2.5}
              fill="url(#yieldGradient)"
              dot={{ r: 3, fill: '#2d6a4f', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#1b4332', strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
