import { useState, useEffect } from 'react';
import PageWrapper from '../components/layout/PageWrapper';
import DataTable from '../components/ui/DataTable';
import RiskBadge from '../components/ui/RiskBadge';
import FilterPanel from '../components/ui/FilterPanel';
import ExportButton from '../components/ui/ExportButton';
import { useAnomalies } from '../hooks/useAnomalies';
import { useWebSocket } from '../hooks/useWebSocket';
import api from '../services/api';

export default function Anomalies() {
  const { anomalies, total, page, limit, loading, filters, setPage, setFilter, resetFilters, flagAnomaly } = useAnomalies();
  const [datasets, setDatasets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [flagForm, setFlagForm] = useState({ status: '', analystNote: '' });
  const [flagging, setFlagging] = useState(false);
  useWebSocket();

  useEffect(() => {
    api.get('/dataset?limit=100').then(r => setDatasets(r.data.datasets || []));
  }, []);

  const handleFlag = async () => {
    if (!selected) return;
    setFlagging(true);
    await flagAnomaly(selected._id, flagForm);
    setFlagging(false);
    setSelected(null);
  };

  const columns = [
    { key: 'detectedAt', label: 'Timestamp', render: (v) => v ? new Date(v).toLocaleString('en-US', { hour12: false }) : '—' },
    { key: 'srcIp', label: 'Src IP', render: (v) => <span className="font-mono">{v||'—'}</span> },
    { key: 'dstIp', label: 'Dst IP', render: (v) => <span className="font-mono">{v||'—'}</span> },
    { key: 'protocol', label: 'Protocol', render: (v) => <span className="font-mono text-accent uppercase">{v||'—'}</span> },
    {
      key: 'riskScore', label: 'Risk Score',
      render: (v) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-surface-3">
            <div className="h-1.5" style={{
              width: `${(v||0)*100}%`,
              background: v > 0.7 ? '#FF4444' : v > 0.4 ? '#F59E0B' : '#10B981',
            }}/>
          </div>
          <span className="font-mono text-xs">{v?.toFixed(3)||'—'}</span>
        </div>
      )
    },
    { key: 'classification', label: 'Classification', render: (v) => <RiskBadge level={v} /> },
    { key: 'status', label: 'Status', render: (v) => (
      <span className="text-xs font-mono text-text-muted uppercase">{v||'—'}</span>
    )},
  ];

  const totalPages = Math.ceil(total / limit);

  return (
    <PageWrapper title="/ anomalies / browse">
      <div className="flex gap-5">
        {/* Filter sidebar */}
        <div className="w-52 shrink-0">
          <FilterPanel filters={filters} setFilter={setFilter} resetFilters={resetFilters} datasets={datasets} />
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-3">
          <div className="flex items-center justify-between">
            <p className="section-title">{total.toLocaleString()} Anomaly Records</p>
            <ExportButton params={filters} />
          </div>

          <DataTable
            columns={columns}
            data={anomalies}
            loading={loading}
            onRowClick={setSelected}
            emptyMessage="No anomalies match current filters"
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs font-mono text-text-muted">
                Page {page} of {totalPages} · {total.toLocaleString()} total
              </p>
              <div className="flex gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="btn btn-ghost btn-sm">← Prev</button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="btn btn-ghost btn-sm">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="card corner-accent w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-display font-semibold uppercase tracking-wider text-text-primary">
                Anomaly Detail
              </h3>
              <button onClick={() => setSelected(null)} className="text-text-muted hover:text-text-primary">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 text-xs font-mono">
              {[
                ['Source IP', selected.srcIp], ['Destination IP', selected.dstIp],
                ['Protocol', selected.protocol], ['Risk Score', selected.riskScore?.toFixed(4)],
                ['Classification', selected.classification], ['Status', selected.status],
                ['Packet Size', selected.packetSize], ['Duration', selected.duration],
                ['Byte Rate', selected.byteRate], ['Dataset', selected.datasetId?.name || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-text-muted uppercase tracking-wider text-xs mb-0.5">{k}</p>
                  <p className="text-text-primary">{v || '—'}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-4 space-y-3">
              <p className="section-title">Analyst Review</p>
              <div>
                <label className="input-label">Update Status</label>
                <select className="select" value={flagForm.status} onChange={e => setFlagForm(f => ({...f, status: e.target.value}))}>
                  <option value="">No change</option>
                  <option value="reviewed">Reviewed</option>
                  <option value="confirmed">Confirmed Threat</option>
                  <option value="false_positive">False Positive</option>
                  <option value="escalated">Escalate</option>
                </select>
              </div>
              <div>
                <label className="input-label">Analyst Note</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Add investigation notes..."
                  value={flagForm.analystNote}
                  onChange={e => setFlagForm(f => ({...f, analystNote: e.target.value}))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm">Cancel</button>
                <button onClick={handleFlag} disabled={flagging} className="btn btn-primary btn-sm">
                  {flagging ? '⟳' : '✓'} Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
