export default function ProgressRing({ percent = 0, size = 80, strokeWidth = 6, color = '#00D4FF', label }) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="square"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      <div className="absolute" style={{ marginTop: size / 2 - 10 }}>
        <span className="text-sm font-mono font-bold text-text-primary">{percent}%</span>
      </div>
      {label && <p className="text-xs font-mono text-text-muted">{label}</p>}
    </div>
  );
}
