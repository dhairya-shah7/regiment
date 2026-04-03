"""
Dataset adapter — maps raw CSV columns from each dataset format
to the canonical SentinelOps schema:
  src_ip, dst_ip, protocol, packet_size, duration,
  tcp_flags, byte_rate, connection_state, label
"""
import pandas as pd
import numpy as np


class DatasetAdapter:
    """Adapts any supported dataset format to canonical schema."""

    SUPPORTED = ["UNSW-NB15", "NSL-KDD", "CICIDS"]

    def __init__(self, source: str):
        source = source.upper().strip()
        if source not in [s.upper() for s in self.SUPPORTED]:
            # fuzzy match
            if "UNSW" in source:
                source = "UNSW-NB15"
            elif "NSL" in source or "KDD" in source:
                source = "NSL-KDD"
            elif "CIC" in source or "IDS" in source:
                source = "CICIDS"
            else:
                raise ValueError(f"Unsupported dataset source: {source}. Choose from {self.SUPPORTED}")
        self.source = source

    def adapt(self, df: pd.DataFrame) -> pd.DataFrame:
        """Convert raw dataset columns to canonical schema."""
        # Strip whitespace from all column names (CICIDS bug)
        df.columns = [c.strip() for c in df.columns]

        if "UNSW" in self.source.upper():
            return self._adapt_unsw_nb15(df)
        elif "NSL" in self.source.upper() or "KDD" in self.source.upper():
            return self._adapt_nsl_kdd(df)
        else:
            return self._adapt_cicids(df)

    def _adapt_unsw_nb15(self, df: pd.DataFrame) -> pd.DataFrame:
        """UNSW-NB15: 49 features."""
        mapping = {
            # source col → canonical col
            "srcip": "src_ip",
            "dstip": "dst_ip",
            "proto": "protocol",
            "sbytes": "packet_size",   # source bytes as proxy
            "dur": "duration",
            "stcpb": "tcp_flags",      # TCP base sequence number proxy
            "Sload": "byte_rate",      # bits per second (source load)
            "state": "connection_state",
            "label": "label",
            "attack_cat": "_attack_cat",
        }
        # Some files use 'Label' with capital L
        if "Label" in df.columns and "label" not in df.columns:
            df = df.rename(columns={"Label": "label"})

        df = self._remap(df, mapping)
        df["label"] = df["label"].apply(lambda x: "normal" if str(x).strip() in ["0", "Normal", "normal", ""] else "anomaly")
        return df

    def _adapt_nsl_kdd(self, df: pd.DataFrame) -> pd.DataFrame:
        """NSL-KDD: 43 columns, often no header."""
        NSL_KDD_COLS = [
            "duration", "protocol_type", "service", "flag", "src_bytes",
            "dst_bytes", "land", "wrong_fragment", "urgent", "hot",
            "num_failed_logins", "logged_in", "num_compromised", "root_shell",
            "su_attempted", "num_root", "num_file_creations", "num_shells",
            "num_access_files", "num_outbound_cmds", "is_host_login",
            "is_guest_login", "count", "srv_count", "serror_rate",
            "srv_serror_rate", "rerror_rate", "srv_rerror_rate", "same_srv_rate",
            "diff_srv_rate", "srv_diff_host_rate", "dst_host_count",
            "dst_host_srv_count", "dst_host_same_srv_rate", "dst_host_diff_srv_rate",
            "dst_host_same_src_port_rate", "dst_host_srv_diff_host_rate",
            "dst_host_serror_rate", "dst_host_srv_serror_rate",
            "dst_host_rerror_rate", "dst_host_srv_rerror_rate",
            "label", "difficulty_level",
        ]
        if len(df.columns) == 43 and not any(c in df.columns for c in ["protocol_type", "flag"]):
            df.columns = NSL_KDD_COLS

        mapping = {
            "protocol_type": "protocol",
            "src_bytes": "packet_size",
            "flag": "tcp_flags",
            "dst_host_srv_count": "connection_state",
        }
        df = self._remap(df, mapping)

        # Fill missing canonical cols
        df["src_ip"] = "0.0.0.0"
        df["dst_ip"] = "0.0.0.0"
        df["byte_rate"] = df.get("packet_size", pd.Series(0)) / (df.get("duration", pd.Series(1)).replace(0, 1))
        df["label"] = df["label"].apply(lambda x: "normal" if str(x).strip().lower() == "normal" else "anomaly")
        return df

    def _adapt_cicids(self, df: pd.DataFrame) -> pd.DataFrame:
        """CICIDS 2017: 79 features, CICFlowMeter output."""
        mapping = {
            "Source IP": "src_ip",
            " Source IP": "src_ip",
            "Destination IP": "dst_ip",
            " Destination IP": "dst_ip",
            "Protocol": "protocol",
            " Protocol": "protocol",
            "Total Length of Fwd Packets": "packet_size",
            " Total Length of Fwd Packets": "packet_size",
            "Flow Duration": "duration",
            " Flow Duration": "duration",
            "FIN Flag Count": "tcp_flags",
            " FIN Flag Count": "tcp_flags",
            "Flow Bytes/s": "byte_rate",
            " Flow Bytes/s": "byte_rate",
            "Flow ID": "connection_state",
            " Flow ID": "connection_state",
            "Label": "label",
            " Label": "label",
        }
        df = self._remap(df, mapping)
        df["label"] = df["label"].apply(
            lambda x: "normal" if str(x).strip().upper() in ["BENIGN", "NORMAL", "0"] else "anomaly"
        )
        return df

    def _remap(self, df: pd.DataFrame, mapping: dict) -> pd.DataFrame:
        """Apply column renaming and ensure canonical cols exist."""
        rename_map = {k: v for k, v in mapping.items() if k in df.columns}
        df = df.rename(columns=rename_map)

        canonical = ["src_ip", "dst_ip", "protocol", "packet_size", "duration", "tcp_flags", "byte_rate", "connection_state", "label"]
        for col in canonical:
            if col not in df.columns:
                df[col] = np.nan if col not in ["src_ip", "dst_ip", "protocol", "connection_state", "label"] else "unknown"

        return df[canonical + [c for c in df.columns if c not in canonical and not c.startswith("_")]]
