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
    'Active Intrusion': 'bg-[#9a4f3d]/15 text-[#9a4f3d] border-[#9a4f3d]/40',
    'Attack Escalation': 'bg-[#a26a2d]/15 text-[#a26a2d] border-[#a26a2d]/40',
    'Reconnaissance Scan': 'bg-[#2b6b74]/15 text-[#2b6b74] border-[#2b6b74]/40',
    'Suspicious Flow': 'bg-[#a26a2d]/15 text-[#a26a2d] border-[#a26a2d]/40',
    'Normal': 'bg-[#485935]/15 text-[#485935] border-[#485935]/40',
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#1c130b]/75 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full sm:max-w-2xl max-h-[90vh] bg-[#fbf6ea] text-[#2c1d11] border-2 border-[#7a3d2c]/30 rounded-2xl overflow-y-auto p-5 sm:p-6 space-y-6 shadow-2xl flex flex-col justify-between my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[#7a3d2c]/20 pb-4 gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg sm:text-2xl font-bold font-mono text-[#2c1d11] break-all">{anomaly.srcIp || '0.0.0.0'}</span>
                <span className={`text-xs px-3 py-1 rounded-full font-mono font-bold border shrink-0 ${phaseColors[phase] || phaseColors['Suspicious Flow']}`}>
                  {phase}
                </span>
              </div>
              <p className="text-xs text-[#786759] font-mono mt-1 break-words">
                Target: <span className="font-bold text-[#2c1d11]">{anomaly.dstIp || '0.0.0.0'}</span> | Threat Type: <span className="text-[#9a4f3d] uppercase font-bold">{anomaly.threatType}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="bg-[#efe5d2] hover:bg-[#e5d8be] text-[#2c1d11] px-3 py-1.5 rounded-lg border border-[#7a3d2c]/30 font-mono text-xs font-bold shrink-0 transition-colors shadow-sm"
            >
              ✕ Close
            </button>
          </div>

          {/* Risk Score Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 bg-[#f4ebd0] border border-[#7a3d2c]/20 rounded-xl shadow-sm">
              <span className="text-xs text-[#786759] font-mono font-semibold block mb-1">Fused Risk Score</span>
              <span className="text-xl font-bold font-mono text-[#9a4f3d]">{(risk * 100).toFixed(1)}%</span>
            </div>
            <div className="p-3.5 bg-[#f4ebd0] border border-[#7a3d2c]/20 rounded-xl shadow-sm">
              <span className="text-xs text-[#786759] font-mono font-semibold block mb-1">Classification</span>
              <span className="text-xl font-bold font-mono capitalize text-[#a26a2d]">{anomaly.classification || 'suspicious'}</span>
            </div>
            <div className="p-3.5 bg-[#f4ebd0] border border-[#7a3d2c]/20 rounded-xl shadow-sm">
              <span className="text-xs text-[#786759] font-mono font-semibold block mb-1">Sequence Steps</span>
              <span className="text-xl font-bold font-mono text-[#2b6b74]">{timeline.length || 1} Flows</span>
            </div>
          </div>

          {/* Temporal Attack Sequence Trajectory Box */}
          <div className="p-5 bg-[#f4ebd0] border border-[#7a3d2c]/25 rounded-2xl space-y-4 shadow-sm">
            <h4 className="text-sm font-bold font-mono text-[#a26a2d] tracking-wider text-center w-full block">
              ⚡ TEMPORAL FLOW PROGRESSION (PYTORCH LSTM SEQUENCE)
            </h4>

            {timeline.length === 0 ? (
              <p className="text-xs text-[#786759] font-mono italic text-center">No preceding sequence steps captured.</p>
            ) : (
              <div className="space-y-4">
                {/* Visual Trajectory Bar */}
                <div className="bg-[#ebe0c5] p-4 rounded-xl border border-[#7a3d2c]/20 space-y-2">
                  <div className="grid grid-cols-3 text-xs font-mono font-bold mb-1">
                    <span className="text-[#2b6b74] text-left">Baseline (T1)</span>
                    <span className="text-[#a26a2d] text-center">Escalation Trend</span>
                    <span className="text-[#9a4f3d] text-right">Anomaly Peak (T{timeline.length})</span>
                  </div>
                  <div className="h-3 w-full bg-[#dfd3b5] rounded-full overflow-hidden flex gap-1 p-0.5 border border-[#7a3d2c]/20">
                    {timeline.map((step, idx) => {
                      const stepRisk = Number(step.combined_risk || step.sequence_risk || 0);
                      const barColor =
                        stepRisk > 0.75 ? 'bg-[#9a4f3d]' : stepRisk > 0.5 ? 'bg-[#a26a2d]' : 'bg-[#2b6b74]';
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
                <div className="space-y-3 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#7a3d2c]/30">
                  {timeline.map((step, idx) => (
                    <div key={idx} className="relative flex items-start gap-4 pl-10">
                      <div
                        className={`absolute left-2.5 top-3.5 -translate-x-1/2 w-4 h-4 rounded-full border-2 bg-[#fbf6ea] flex items-center justify-center text-[9px] font-mono font-bold ${
                          idx === timeline.length - 1
                            ? 'border-[#9a4f3d] text-[#9a4f3d] animate-pulse'
                            : 'border-[#2b6b74] text-[#2b6b74]'
                        }`}
                      >
                        {step.step}
                      </div>

                      <div className="p-4 flex-1 bg-[#fbf6ea] border border-[#7a3d2c]/25 hover:border-[#7a3d2c]/60 rounded-xl transition-colors space-y-2 shadow-sm">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-[#2c1d11] font-bold text-sm">Step {step.step}: {step.phase}</span>
                          <span className="text-[#786759] font-semibold">{formatTimestamp(step.timestamp)}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs font-mono text-[#5c4f43]">
                          <div>
                            <span className="text-[#786759]">Packet Size: </span>
                            <span className="text-[#2c1d11] font-bold">{step.packet_size} B</span>
                          </div>
                          <div>
                            <span className="text-[#786759]">Byte Rate: </span>
                            <span className="text-[#2c1d11] font-bold">{step.byte_rate} B/s</span>
                          </div>
                          <div>
                            <span className="text-[#786759]">Point Isolation Risk: </span>
                            <span className="text-[#a26a2d] font-bold">{(step.point_risk * 100).toFixed(1)}%</span>
                          </div>
                          <div>
                            <span className="text-[#786759]">LSTM Sequence Loss: </span>
                            <span className="text-[#2b6b74] font-bold">{(step.sequence_risk * 100).toFixed(1)}%</span>
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
            <div className="p-4 bg-[#f4ebd0] border border-[#7a3d2c]/20 rounded-2xl space-y-2">
              <h5 className="text-xs font-semibold font-mono text-[#2c1d11] uppercase tracking-wider">Explanation Signals</h5>
              <p className="text-xs text-[#5c4f43] font-mono">{anomaly.explanation.summary}</p>
              {anomaly.explanation.signals?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {anomaly.explanation.signals.map((sig, sIdx) => (
                    <span key={sIdx} className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#efe5d2] border border-[#7a3d2c]/25 text-[#9a4f3d] font-bold">
                      ⚠️ {sig}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#7a3d2c]/20 pt-4 flex justify-end">
          <button 
            onClick={onClose} 
            className="px-6 py-2.5 rounded-xl bg-[#7a3d2c] hover:bg-[#633022] text-[#fbf6ea] font-mono text-xs font-bold transition-colors shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
