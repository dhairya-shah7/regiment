import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#00D4FF', '#F59E0B', '#10B981', '#FF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A0F1A] border border-border p-3 text-xs font-mono">
      <p style={{ color: payload[0].payload.fill }}>{payload[0].name}: {payload[0].value}</p>
    </div>
  );
};

export default function ProtocolPie({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 border border-dashed border-border">
        <p className="text-xs font-mono text-text-muted">No protocol data</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} opacity={0.85} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => <span className="text-xs font-mono text-text-secondary uppercase">{value}</span>}
          iconType="square"
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
