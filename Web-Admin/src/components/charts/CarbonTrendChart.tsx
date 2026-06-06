'use client';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const data = [{ name: 'Jan', value: 400 }, { name: 'Feb', value: 300 }];

export function CarbonTrendChart() {
  return (
    <div className="h-64 w-full bg-white p-4 rounded-lg shadow-sm">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line type="monotone" dataKey="value" stroke="#16a34a" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
