import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

export default function TrafficChart({ data = [] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 border border-dashed border-border">
        <p className="text-xs font-mono text-text-muted">No traffic data</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
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
        <Line
          type="monotone"
          dataKey="anomalies"
          stroke="#00D4FF"
          strokeWidth={1.5}
          dot={false}
          name="Anomalies"
          activeDot={{ r: 4, fill: '#00D4FF' }}
        />
        <Line
          type="monotone"
          dataKey="critical"
          stroke="#FF4444"
          strokeWidth={1.5}
          dot={false}
          name="Critical"
          activeDot={{ r: 4, fill: '#FF4444' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
