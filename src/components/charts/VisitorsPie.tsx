import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { CategoryBreakdownRow } from '../../services/api/reports';

const COLORS = ['#0B5394', '#4fc3f7', '#81c784', '#ffb74d', '#ba68c8', '#e57373'];

export default function VisitorsPie({ data }: { data: CategoryBreakdownRow[] }) {
  const chartData = data.filter((d) => d.persons > 0);

  if (chartData.length === 0) {
    return null;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={chartData} dataKey="persons" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} label>
          {chartData.map((entry, idx) => (
            <Cell key={entry.categoryId} fill={COLORS[idx % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
