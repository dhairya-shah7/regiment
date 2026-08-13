import React from 'react';

function formatTimestamp(ts) {
  if (!ts) return 'N/A';
  try {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return String(ts);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return String(ts);
  }
}

export default function SequenceTimeline({ anomaly, onClose }) {
  if (!anomaly) return null;

  const timeline = anomaly.sequenceTimeline || [];
  const phase = anomaly.attackPhase || 'Suspicious Flow';
  const risk = Number(anomaly.riskScore || 0);

  const phaseColors = {
    'Active Intrusion': 'bg-alert/20 text-alert border-alert/40',
    'Attack Escalation': 'bg-amber-500/20 text-amber-500 border-amber-500/40',
    'Reconnaissance Scan': 'bg-cyan-500/20 text-cyan-500 border-cyan-500/40',
    'Suspicious Flow': 'bg-amber-500/20 text-amber-500 border-amber-500/40',
    'Normal': 'bg-emerald-500/20 text-emerald-500 border-emerald-500/40',
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center transition-opacity p-4"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-2xl max-h-[90vh] bg-bg-card text-text-primary border border-border rounded-2xl overflow-y-auto p-5 sm:p-6 space-y-6 shadow-2xl flex flex-col justify-between my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border pb-4 gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-xl font-bold font-mono text-text-primary break-all">{anomaly.srcIp || '0.0.0.0'}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono border shrink-0 ${phaseColors[phase] || phaseColors['Suspicious Flow']}`}>
                  {phase}
                </span>
              </div>
              <p className="text-xs text-text-muted font-mono mt-1 break-words">
                Target: {anomaly.dstIp || '0.0.0.0'} | Threat Type: <span className="text-accent uppercase font-bold">{anomaly.threatType}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text-primary p-2 rounded border border-border hover:border-text-muted font-mono text-sm shrink-0 transition-colors"
            >
              ✕ Close
            </button>
          </div>

          {/* Risk Score Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-bg-body border border-border rounded-xl shadow-sm">
              <span className="text-xs text-text-muted font-mono block">Fused Risk Score</span>
              <span className="text-lg font-bold font-mono text-alert">{(risk * 100).toFixed(1)}%</span>
            </div>
            <div className="p-3 bg-bg-body border border-border rounded-xl shadow-sm">
              <span className="text-xs text-text-muted font-mono block">Classification</span>
              <span className="text-lg font-bold font-mono capitalize text-accent">{anomaly.classification || 'suspicious'}</span>
            </div>
            <div className="p-3 bg-bg-body border border-border rounded-xl shadow-sm">
              <span className="text-xs text-text-muted font-mono block">Sequence Steps</span>
              <span className="text-lg font-bold font-mono text-cyan-500">{timeline.length || 1} Flows</span>
            </div>
          </div>

          {/* Temporal Attack Sequence Trajectory Box */}
          <div className="p-5 bg-bg-body border border-border rounded-2xl space-y-4 shadow-sm">
            <h4 className="text-sm font-bold font-mono text-amber-500 tracking-wider text-center w-full block">
              ⚡ TEMPORAL FLOW PROGRESSION (PYTORCH LSTM SEQUENCE)
            </h4>

            {timeline.length === 0 ? (
              <p className="text-xs text-text-muted font-mono italic text-center">No preceding sequence steps captured.</p>
            ) : (
              <div className="space-y-4">
                {/* Visual Trajectory Bar */}
                <div className="bg-bg-card p-4 rounded-xl border border-border space-y-2">
                  <div className="grid grid-cols-3 text-xs font-mono font-bold mb-1">
                    <span className="text-cyan-500 text-left">Baseline (T1)</span>
                    <span className="text-amber-500 text-center">Escalation Trend</span>
                    <span className="text-alert text-right">Anomaly Peak (T{timeline.length})</span>
                  </div>
                  <div className="h-3 w-full bg-bg-body rounded-full overflow-hidden flex gap-1 p-0.5 border border-border">
                    {timeline.map((step, idx) => {
                      const stepRisk = Number(step.combined_risk || step.sequence_risk || 0);
                      const barColor =
                        stepRisk > 0.75 ? 'bg-alert' : stepRisk > 0.5 ? 'bg-amber-500' : 'bg-cyan-500';
                      return (
                        <div
                          key={idx}
                          className={`h-full rounded-sm transition-all ${barColor}`}
                          style={{ width: `${100 / timeline.length}%` }}
                          title={`Step ${step.step}: ${(stepRisk * 100).toFixed(1)}% risk`}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Step Cards List */}
                <div className="space-y-3 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border">
                  {timeline.map((step, idx) => (
                    <div key={idx} className="relative flex items-start gap-4 pl-10">
                      <div
                        className={`absolute left-2.5 top-3 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-bg-card flex items-center justify-center text-[9px] font-mono font-bold ${
                          idx === timeline.length - 1
                            ? 'border-alert text-alert animate-pulse'
                            : 'border-cyan-500 text-cyan-500'
                        }`}
                      >
                        {step.step}
                      </div>

                      <div className="p-4 flex-1 bg-bg-card border border-border hover:border-accent/60 rounded-xl transition-colors space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-text-primary font-bold">Step {step.step}: {step.phase}</span>
                          <span className="text-text-muted">{formatTimestamp(step.timestamp)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-text-secondary">
                          <div>
                            <span className="text-text-muted">Packet Size: </span>
                            <span className="text-text-primary font-bold">{step.packet_size} B</span>
                          </div>
                          <div>
                            <span className="text-text-muted">Byte Rate: </span>
                            <span className="text-text-primary font-bold">{step.byte_rate} B/s</span>
                          </div>
                          <div>
                            <span className="text-text-muted">Point Isolation Risk: </span>
                            <span className="text-amber-500 font-bold">{(step.point_risk * 100).toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-text-muted">LSTM Sequence Loss: </span>
                            <span className="text-cyan-500 font-bold">{(step.sequence_risk * 100).toFixed(1)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Signals Breakdown */}
          {anomaly.explanation && (
            <div className="p-4 bg-bg-body border border-border rounded-2xl space-y-2">
              <h5 className="text-xs font-semibold font-mono text-text-primary uppercase tracking-wider">Explanation Signals</h5>
              <p className="text-xs text-text-secondary">{anomaly.explanation.summary}</p>
              {anomaly.explanation.signals?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {anomaly.explanation.signals.map((sig, sIdx) => (
                    <span key={sIdx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-bg-card border border-border text-amber-500">
                      ⚠️ {sig}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border pt-4 flex justify-end">
          <button onClick={onClose} className="btn btn-primary text-xs px-5 py-2">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
