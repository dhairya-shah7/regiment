import React from 'react';

export default function SequenceTimeline({ anomaly, onClose }) {
  if (!anomaly) return null;

  const timeline = anomaly.sequenceTimeline || [];
  const phase = anomaly.attackPhase || 'Suspicious Flow';
  const risk = Number(anomaly.riskScore || 0);

  const phaseColors = {
    'Active Intrusion': 'bg-alert/20 text-alert border-alert/40',
    'Attack Escalation': 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    'Reconnaissance Scan': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    'Suspicious Flow': 'bg-accent/20 text-accent border-accent/40',
    'Normal': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end transition-opacity p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-bg-body border-l sm:border border-border sm:rounded-2xl h-full overflow-y-auto p-4 sm:p-6 space-y-6 shadow-2xl flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border/60 pb-4 gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-xl font-bold font-mono text-text break-all">{anomaly.srcIp || '0.0.0.0'}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono border shrink-0 ${phaseColors[phase] || phaseColors['Suspicious Flow']}`}>
                  {phase}
                </span>
              </div>
              <p className="text-xs text-text-muted font-mono mt-1 break-words">
                Target: {anomaly.dstIp || '0.0.0.0'} | Threat Type: <span className="text-accent uppercase">{anomaly.threatType}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text p-2 rounded border border-border/40 hover:border-border font-mono text-sm shrink-0"
            >
              ✕ Close
            </button>
          </div>

          {/* Risk Score Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 bg-bg-card border border-border/60 shadow-sm">
              <span className="text-xs text-text-muted font-mono block">Fused Risk Score</span>
              <span className="text-lg font-bold font-mono text-alert">{(risk * 100).toFixed(1)}%</span>
            </div>
            <div className="card p-3 bg-bg-card border border-border/60 shadow-sm">
              <span className="text-xs text-text-muted font-mono block">Classification</span>
              <span className="text-lg font-bold font-mono capitalize text-accent">{anomaly.classification || 'suspicious'}</span>
            </div>
            <div className="card p-3 bg-bg-card border border-border/60 shadow-sm">
              <span className="text-xs text-text-muted font-mono block">Sequence Steps</span>
              <span className="text-lg font-bold font-mono text-cyan-400">{timeline.length || 1} Flows</span>
            </div>
          </div>

          {/* Temporal Attack Sequence Trajectory Box */}
          <div className="card p-4 sm:p-5 bg-bg-card border border-border/80 rounded-xl space-y-4 shadow-md">
            <h4 className="text-sm font-bold font-mono text-amber-400 tracking-wider flex items-center justify-center text-center gap-2">
              <span>⚡ Temporal Flow Progression (PyTorch LSTM Sequence)</span>
            </h4>

            {timeline.length === 0 ? (
              <p className="text-xs text-text-muted font-mono italic text-center">No preceding sequence steps captured.</p>
            ) : (
              <div className="space-y-4">
                {/* Visual Trajectory Bar */}
                <div className="bg-bg-body p-4 rounded border border-border/40 space-y-2">
                  <div className="flex justify-between items-center text-center text-xs font-mono font-bold mb-1">
                    <span className="text-cyan-400">Baseline (T1)</span>
                    <span className="text-amber-400">Escalation Trend</span>
                    <span className="text-alert">Anomaly Peak (T{timeline.length})</span>
                  </div>
                  <div className="h-3 w-full bg-border/40 rounded-full overflow-hidden flex gap-1 p-0.5">
                    {timeline.map((step, idx) => {
                      const stepRisk = Number(step.combined_risk || step.sequence_risk || 0);
                      const barColor =
                        stepRisk > 0.75 ? 'bg-alert' : stepRisk > 0.5 ? 'bg-amber-400' : 'bg-cyan-400';
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
                <div className="space-y-3 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-border/60">
                  {timeline.map((step, idx) => (
                    <div key={idx} className="relative flex items-start gap-4 pl-10">
                      <div
                        className={`absolute left-2.5 top-3 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-bg-card flex items-center justify-center text-[9px] font-mono font-bold ${
                          idx === timeline.length - 1
                            ? 'border-alert text-alert animate-pulse'
                            : 'border-cyan-400 text-cyan-400'
                        }`}
                      >
                        {step.step}
                      </div>

                      <div className="card p-3.5 flex-1 bg-bg-body border border-border/60 hover:border-border transition-colors space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-text font-bold">Step {step.step}: {step.phase}</span>
                          <span className="text-text-muted">{step.timestamp}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-text-muted">
                          <div>
                            <span>Packet Size: </span>
                            <span className="text-text font-bold">{step.packet_size} B</span>
                          </div>
                          <div>
                            <span>Byte Rate: </span>
                            <span className="text-text font-bold">{step.byte_rate} B/s</span>
                          </div>
                          <div>
                            <span>Point Isolation Risk: </span>
                            <span className="text-amber-400">{(step.point_risk * 100).toFixed(1)}%</span>
                          </div>
                          <div>
                            <span>LSTM Sequence Loss: </span>
                            <span className="text-cyan-400">{(step.sequence_risk * 100).toFixed(1)}%</span>
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
            <div className="card p-4 bg-bg-body border border-border/40 space-y-2">
              <h5 className="text-xs font-semibold font-mono text-text uppercase">Explanation Signals</h5>
              <p className="text-xs text-text-muted">{anomaly.explanation.summary}</p>
              {anomaly.explanation.signals?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {anomaly.explanation.signals.map((sig, sIdx) => (
                    <span key={sIdx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-border/40 text-text">
                      ⚠️ {sig}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border/60 pt-4 flex justify-end">
          <button onClick={onClose} className="btn btn-primary text-xs px-5">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
