import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { GroupSummaryRow } from '../../services/api/reports';
import { formatCurrency } from '../../utils/format';

export default function RevenueByCounter({ data }: { data: GroupSummaryRow[] }) {
  const chartData = data.map((d) => ({ label: d.subLabel, Cash: d.cash / 100, UPI: d.upi / 100 }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis dataKey="label" fontSize={12} />
        <YAxis fontSize={12} width={60} />
        <Tooltip formatter={(v) => formatCurrency(Number(v) * 100)} />
        <Legend />
        <Bar dataKey="Cash" stackId="a" fill="#0B5394" />
        <Bar dataKey="UPI" stackId="a" fill="#4fc3f7" />
      </BarChart>
    </ResponsiveContainer>
  );
}
