import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#0A0F1A] border border-border p-3 text-xs font-mono">
      <p className="text-text-muted mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
};

export default function AnomalyChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 border border-dashed border-border">
        <p className="text-xs font-mono text-text-muted">No anomaly spike data</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={{ stroke: 'rgba(255,255,255,0.08)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#4B5563', fontSize: 10, fontFamily: 'JetBrains Mono' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="anomalies" fill="#00D4FF" name="Anomalies" radius={[1,1,0,0]} maxBarSize={20} opacity={0.8} />
        <Bar dataKey="critical" fill="#FF4444" name="Critical" radius={[1,1,0,0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  );
}
