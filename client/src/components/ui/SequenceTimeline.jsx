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
    'Active Intrusion': 'bg-red-500/20 text-red-400 border-red-500/40',
    'Attack Escalation': 'bg-amber-500/20 text-amber-400 border-amber-500/40',
    'Reconnaissance Scan': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
    'Suspicious Flow': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    'Normal': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end transition-opacity p-0 sm:p-4">
      <div className="w-full sm:max-w-2xl bg-[#18181b] text-white border-l sm:border border-[#27272a] sm:rounded-2xl h-full overflow-y-auto p-4 sm:p-6 space-y-6 shadow-2xl flex flex-col justify-between">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#27272a] pb-4 gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base sm:text-xl font-bold font-mono text-white break-all">{anomaly.srcIp || '0.0.0.0'}</span>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono border shrink-0 ${phaseColors[phase] || phaseColors['Suspicious Flow']}`}>
                  {phase}
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-mono mt-1 break-words">
                Target: {anomaly.dstIp || '0.0.0.0'} | Threat Type: <span className="text-amber-400 uppercase font-bold">{anomaly.threatType}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white p-2 rounded border border-[#27272a] hover:border-zinc-500 font-mono text-sm shrink-0"
            >
              ✕ Close
            </button>
          </div>

          {/* Risk Score Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-[#27272a]/60 border border-[#3f3f46] rounded-xl shadow-sm">
              <span className="text-xs text-zinc-400 font-mono block">Fused Risk Score</span>
              <span className="text-lg font-bold font-mono text-red-400">{(risk * 100).toFixed(1)}%</span>
            </div>
            <div className="p-3 bg-[#27272a]/60 border border-[#3f3f46] rounded-xl shadow-sm">
              <span className="text-xs text-zinc-400 font-mono block">Classification</span>
              <span className="text-lg font-bold font-mono capitalize text-amber-400">{anomaly.classification || 'suspicious'}</span>
            </div>
            <div className="p-3 bg-[#27272a]/60 border border-[#3f3f46] rounded-xl shadow-sm">
              <span className="text-xs text-zinc-400 font-mono block">Sequence Steps</span>
              <span className="text-lg font-bold font-mono text-cyan-400">{timeline.length || 1} Flows</span>
            </div>
          </div>

          {/* Temporal Attack Sequence Trajectory Box */}
          <div className="p-5 bg-[#27272a]/70 border border-[#3f3f46] rounded-2xl space-y-4 shadow-lg">
            <h4 className="text-sm font-bold font-mono text-amber-400 tracking-wider text-center w-full block">
              ⚡ TEMPORAL FLOW PROGRESSION (PYTORCH LSTM SEQUENCE)
            </h4>

            {timeline.length === 0 ? (
              <p className="text-xs text-zinc-400 font-mono italic text-center">No preceding sequence steps captured.</p>
            ) : (
              <div className="space-y-4">
                {/* Visual Trajectory Bar */}
                <div className="bg-[#18181b] p-4 rounded-xl border border-[#3f3f46] space-y-2">
                  <div className="grid grid-cols-3 text-xs font-mono font-bold mb-1">
                    <span className="text-cyan-400 text-left">Baseline (T1)</span>
                    <span className="text-amber-400 text-center">Escalation Trend</span>
                    <span className="text-red-400 text-right">Anomaly Peak (T{timeline.length})</span>
                  </div>
                  <div className="h-3 w-full bg-[#27272a] rounded-full overflow-hidden flex gap-1 p-0.5">
                    {timeline.map((step, idx) => {
                      const stepRisk = Number(step.combined_risk || step.sequence_risk || 0);
                      const barColor =
                        stepRisk > 0.75 ? 'bg-red-500' : stepRisk > 0.5 ? 'bg-amber-400' : 'bg-cyan-400';
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
                <div className="space-y-3 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#3f3f46]">
                  {timeline.map((step, idx) => (
                    <div key={idx} className="relative flex items-start gap-4 pl-10">
                      <div
                        className={`absolute left-2.5 top-3 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-[#18181b] flex items-center justify-center text-[9px] font-mono font-bold ${
                          idx === timeline.length - 1
                            ? 'border-red-400 text-red-400 animate-pulse'
                            : 'border-cyan-400 text-cyan-400'
                        }`}
                      >
                        {step.step}
                      </div>

                      <div className="p-4 flex-1 bg-[#18181b] border border-[#3f3f46] hover:border-amber-400/50 rounded-xl transition-colors space-y-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-white font-bold">Step {step.step}: {step.phase}</span>
                          <span className="text-zinc-400">{formatTimestamp(step.timestamp)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-zinc-300">
                          <div>
                            <span className="text-zinc-400">Packet Size: </span>
                            <span className="text-white font-bold">{step.packet_size} B</span>
                          </div>
                          <div>
                            <span className="text-zinc-400">Byte Rate: </span>
                            <span className="text-white font-bold">{step.byte_rate} B/s</span>
                          </div>
                          <div>
                            <span className="text-zinc-400">Point Isolation Risk: </span>
                            <span className="text-amber-400 font-bold">{(step.point_risk * 100).toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-zinc-400">LSTM Sequence Loss: </span>
                            <span className="text-cyan-400 font-bold">{(step.sequence_risk * 100).toFixed(1)}%</span>
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
            <div className="p-4 bg-[#27272a]/70 border border-[#3f3f46] rounded-2xl space-y-2">
              <h5 className="text-xs font-semibold font-mono text-white uppercase tracking-wider">Explanation Signals</h5>
              <p className="text-xs text-zinc-300">{anomaly.explanation.summary}</p>
              {anomaly.explanation.signals?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {anomaly.explanation.signals.map((sig, sIdx) => (
                    <span key={sIdx} className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#18181b] border border-[#3f3f46] text-amber-300">
                      ⚠️ {sig}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#27272a] pt-4 flex justify-end">
          <button onClick={onClose} className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-mono text-xs font-bold transition-colors">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
