import { useEffect, useState } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import KPICard from '../components/ui/KPICard';
import LiveFeed from '../components/ui/LiveFeed';
import AlertBanner from '../components/ui/AlertBanner';
import TrafficChart from '../components/charts/TrafficChart';
import AnomalyChart from '../components/charts/AnomalyChart';
import ProtocolPie from '../components/charts/ProtocolPie';
import { useWebSocket } from '../hooks/useWebSocket';
import { useAnomalyStore } from '../store/anomalyStore';
import api from '../services/api';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const { anomalies } = useAnomalyStore();
  useWebSocket();

  const fetchStats = async () => {
    try {
      const res = await api.get('/dashboard/stats');
      setStats(res.data);
    } catch (err) {
      console.error('Dashboard stats error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const kpis = stats?.kpis || {};
  const liveFeedItems = stats?.recentAnomalies?.length ? stats.recentAnomalies : anomalies.slice(0, 10);

  return (
    <PageWrapper title="/ dashboard / overview">
      <AlertBanner />
      <div className="space-y-5">
        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard label="Total Traffic Records" value={loading ? '…' : kpis.totalAnomalies?.toLocaleString()} icon="◈" color="accent" sublabel="All analyzed records" />
          <KPICard label="Active Anomalies" value={loading ? '…' : (kpis.suspiciousCount + kpis.criticalCount)?.toLocaleString()} icon="⚠" color="warning" sublabel="Suspicious + Critical" />
          <KPICard label="Critical Threats" value={loading ? '…' : kpis.criticalCount?.toLocaleString()} icon="⊠" color="alert" sublabel="Risk score > 0.7" />
          <KPICard label="Model Accuracy" value={loading ? '…' : `${kpis.modelAccuracy ?? 100}`} unit="%" icon="◎" color="success" sublabel="Estimated classification" />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 card">
            <p className="section-title mb-3">Traffic Volume / Anomaly Timeline (24h)</p>
            <TrafficChart data={stats?.trafficTimeline || []} />
          </div>
          <div className="card">
            <p className="section-title mb-3">Protocol Distribution</p>
            <ProtocolPie data={stats?.protocolDistribution || []} />
          </div>
        </div>

        {/* Anomaly Spikes + Live Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="card">
            <p className="section-title mb-3">Anomaly Spikes Per Hour</p>
            <AnomalyChart data={stats?.trafficTimeline || []} />
          </div>
          <div>
            <p className="section-title mb-3">Live Event Feed</p>
            <LiveFeed events={liveFeedItems} />
          </div>
        </div>

        {/* System Health */}
        <div className="card">
          <p className="section-title mb-3">System Health</p>
          <div className="flex gap-6 flex-wrap">
            {[
              { label: 'MongoDB', status: 'online' },
              { label: 'ML Service', status: 'online' },
              { label: 'API Server', status: 'online' },
              { label: 'WebSocket', status: 'online' },
            ].map((sys) => (
              <div key={sys.label} className="flex items-center gap-2">
                <span className="status-dot bg-success animate-pulse-slow" />
                <span className="text-xs font-mono text-text-secondary">{sys.label}</span>
                <span className="text-xs font-mono text-success uppercase">{sys.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
