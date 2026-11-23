import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { HourlyRevenuePoint } from '../../services/api/reports';
import { formatCurrency } from '../../utils/format';

export default function RevenueByHour({ data }: { data: HourlyRevenuePoint[] }) {
  const chartData = data.map((d) => ({ label: d.label, revenue: d.revenue / 100 }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" fontSize={12} />
        <YAxis fontSize={12} width={60} />
        <Tooltip formatter={(v) => formatCurrency(Number(v) * 100)} />
        <Line type="monotone" dataKey="revenue" stroke="#0B5394" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
