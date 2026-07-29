"""
Hybrid Ensemble Scorer combining Isolation Forest (Point Anomaly),
Temporal LSTM Autoencoder (Sequence Anomaly), and Heuristic Rule Signatures.
"""
from typing import Dict, List, Any
import numpy as np


class HybridEnsembleScorer:
    """
    Fuses point anomaly isolation, temporal sequence progression, 
    and heuristic signatures into an ensemble risk assessment.
    """

    @staticmethod
    def classify_attack_phase(
        risk_score: float, 
        threat_type: str, 
        sequence_risk: float, 
        signals: List[str]
    ) -> str:
        if risk_score <= 0.4:
            return "Normal"

        has_syn = any("syn" in s.lower() for s in signals)
        has_burst = any("burst" in s.lower() or "volume" in s.lower() for s in signals)
        has_spoof = threat_type == "spoofing" or any("ip" in s.lower() for s in signals)

        if risk_score > 0.75 and (has_burst or threat_type in {"jamming", "intrusion_attempt"}):
            return "Active Intrusion"
        if risk_score > 0.65 and sequence_risk > 0.6:
            return "Attack Escalation"
        if has_syn or has_spoof or risk_score > 0.4:
            return "Reconnaissance Scan"
        return "Suspicious Flow"

    @staticmethod
    def build_sequence_timeline(
        idx: int,
        df_records: Any,
        scores_seq: np.ndarray,
        scores_point: np.ndarray,
        window_size: int = 5
    ) -> List[Dict[str, Any]]:
        """Build sliding window sequence steps preceding index `idx`."""
        timeline = []
        total_len = len(df_records)
        start_idx = max(0, idx - window_size + 1)

        for step_num, i in enumerate(range(start_idx, idx + 1), start=1):
            row = df_records.iloc[i] if hasattr(df_records, 'iloc') else df_records[i]
            point_score = float(scores_point[i]) if i < len(scores_point) else 0.0
            seq_score = float(scores_seq[i]) if i < len(scores_seq) else 0.0
            combined = round(0.5 * point_score + 0.5 * seq_score, 4)

            phase = (
                "Critical Burst" if combined > 0.75
                else "Pattern Escalation" if combined > 0.55
                else "Probe / Recon" if combined > 0.35
                else "Normal Baseline"
            )

            timeline.append({
                "step": step_num,
                "record_index": i,
                "timestamp": str(
                    row.get("event_timestamp")
                    or row.get("timestamp")
                    or row.get("time")
                    or f"T+{step_num}s"
                ),
                "src_ip": str(row.get("src_ip") or row.get("source_ip") or "0.0.0.0"),
                "dst_ip": str(row.get("dst_ip") or row.get("destination_ip") or "0.0.0.0"),
                "packet_size": float(row.get("packet_size", 0) or 0),
                "byte_rate": float(row.get("byte_rate", 0) or 0),
                "point_risk": round(point_score, 4),
                "sequence_risk": round(seq_score, 4),
                "combined_risk": combined,
                "phase": phase,
            })
        return timeline

    @classmethod
    def evaluate_batch(
        cls,
        scores_point: np.ndarray,
        scores_seq: np.ndarray,
        rule_scores: np.ndarray,
        weights: tuple = (0.4, 0.4, 0.2)
    ) -> np.ndarray:
        """Weighted ensemble fusion of scores."""
        w_point, w_seq, w_rule = weights
        fused = (w_point * scores_point) + (w_seq * scores_seq) + (w_rule * rule_scores)
        return np.clip(fused, 0.0, 1.0)
