import { useUIStore } from '../../store/uiStore';

export default function AlertBanner() {
  const { alerts, dismissAlert } = useUIStore();
  const critical = alerts.filter((a) => a.level === 'critical');
  if (critical.length === 0) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-40 pointer-events-none">
      {critical.slice(0, 3).map((alert) => (
        <div key={alert.id} className="pointer-events-auto flex items-center gap-3 px-5 py-3 bg-alert border-b border-alert/50 animate-slide-in">
          <span className="text-white text-xs font-mono font-bold uppercase tracking-widest">⚠ CRITICAL</span>
          <span className="flex-1 text-white text-xs font-mono">{alert.message}</span>
          <button
            onClick={() => dismissAlert(alert.id)}
            className="text-white/70 hover:text-white text-xs shrink-0"
          >✕</button>
        </div>
      ))}
    </div>
  );
}
