export default function RiskBadge({ level, score, showScore = false }) {
  const cfg = {
    critical:   { cls: 'bg-alert-dim text-alert border-alert/30',     dot: 'bg-alert',   label: 'CRITICAL' },
    suspicious: { cls: 'bg-warning-dim text-warning border-warning/30', dot: 'bg-warning', label: 'SUSPICIOUS' },
    normal:     { cls: 'bg-success-dim text-success border-success/30', dot: 'bg-success', label: 'NORMAL' },
  }[level] || { cls: 'bg-surface-2 text-text-secondary border-border', dot: 'bg-muted', label: level?.toUpperCase() || 'UNKNOWN' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-mono font-medium border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} ${level === 'critical' ? 'animate-pulse' : ''}`} />
      {cfg.label}
      {showScore && score !== undefined && (
        <span className="ml-1 opacity-70">{(score * 100).toFixed(0)}%</span>
      )}
    </span>
  );
}
