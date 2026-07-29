"""
Generate a realistic 5,000-record unlabeled network traffic CSV dataset 
containing subtle, stealthy, hard-to-detect anomalies.
"""
import os
import random
import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_stealth_dataset(num_records: int = 5000) -> pd.DataFrame:
    random.seed(42)
    np.random.seed(42)

    base_time = datetime(2026, 7, 27, 10, 0, 0)
    protocols = ["tcp", "udp", "icmp"]
    protocol_weights = [0.75, 0.20, 0.05]

    normal_src_ips = [f"192.168.1.{i}" for i in range(10, 100)]
    normal_dst_ips = [f"10.0.0.{i}" for i in range(2, 20)] + ["8.8.8.8", "1.1.1.1"]

    rows = []

    for i in range(num_records):
        current_time = base_time + timedelta(milliseconds=i * random.randint(50, 200))
        timestamp_str = current_time.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]

        # Determine if this row is a stealthy anomaly (~8% of total dataset)
        is_stealth_anomaly = (random.random() < 0.08)

        if not is_stealth_anomaly:
            # ──────── Normal Traffic Distribution ────────
            protocol = random.choices(protocols, weights=protocol_weights)[0]
            src_ip = random.choice(normal_src_ips)
            dst_ip = random.choice(normal_dst_ips)
            
            # Normal durations: 0.05s to 4.5s
            duration = round(float(np.random.exponential(scale=1.2) + 0.05), 4)
            duration = min(duration, 8.0)
            
            # Normal packet sizes: 64B to 1500B
            packet_size = float(random.choice([64, 128, 512, 1024, 1460, 1500]))
            
            # Normal byte rate: 100 to 2500 B/s
            byte_rate = round(packet_size / max(duration, 0.1) + np.random.normal(200, 50), 2)
            byte_rate = max(10.0, min(byte_rate, 4500.0))
            
            tcp_flags = random.choice(["ACK", "PA", "FPA", "SA"]) if protocol == "tcp" else "NONE"
            connection_state = random.choice(["FIN", "CON", "REQ"]) if protocol == "tcp" else "INT"

        else:
            # ──────── Hard-to-Detect Stealthy Anomalies ────────
            anomaly_type = random.choice([
                "low_and_slow_scan",
                "micro_burst_mimic",
                "subtle_parameter_drift",
                "loopback_spoof_stealth"
            ])

            if anomaly_type == "low_and_slow_scan":
                # Stealthy reconnaissance: Normal packet size (64B-128B), normal flags,
                # but slightly elevated duration/byte_rate ratio across wide time deltas
                protocol = "tcp"
                src_ip = f"192.168.1.{random.randint(101, 110)}" # Slightly outside normal range
                dst_ip = f"10.0.0.{random.randint(2, 20)}"
                duration = round(random.uniform(0.8, 1.8), 4)
                packet_size = 64.0
                byte_rate = round(random.uniform(400.0, 750.0), 2) # Sits right on normal boundary
                tcp_flags = "SYN"
                connection_state = "REQ"

            elif anomaly_type == "micro_burst_mimic":
                # Micro-burst flood: Mimics HTTPS 1460B packet size and valid ACK flag,
                # but duration is extremely compressed (0.01s - 0.05s) creating high byte_rate
                protocol = "tcp"
                src_ip = random.choice(normal_src_ips)
                dst_ip = random.choice(normal_dst_ips)
                duration = round(random.uniform(0.01, 0.04), 4) # Very fast, hard to spot without sequence tracking
                packet_size = 1460.0
                byte_rate = round(packet_size / duration, 2) # High byte rate disguised in valid packet
                tcp_flags = "PA"
                connection_state = "CON"

            elif anomaly_type == "subtle_parameter_drift":
                # Disguised UDP stream: Duration and packet size individually look normal,
                # but multi-variate ratio between packet_size and byte_rate is inverted
                protocol = "udp"
                src_ip = random.choice(normal_src_ips)
                dst_ip = random.choice(normal_dst_ips)
                duration = round(random.uniform(2.0, 3.5), 4)
                packet_size = 512.0
                byte_rate = round(random.uniform(1800.0, 2400.0), 2) # Higher than expected for UDP 512B
                tcp_flags = "NONE"
                connection_state = "INT"

            else:
                # Loopback IP Spoofing: Internal IP addressing match or micro-gateway spoofing
                protocol = "tcp"
                src_ip = "192.168.1.1" # Gateway IP acting as client
                dst_ip = "192.168.1.1" # Same IP matching
                duration = round(random.uniform(0.1, 0.5), 4)
                packet_size = 256.0
                byte_rate = round(random.uniform(500.0, 1100.0), 2)
                tcp_flags = "ACK"
                connection_state = "CON"

        rows.append({
            "event_timestamp": timestamp_str,
            "src_ip": src_ip,
            "dst_ip": dst_ip,
            "protocol": protocol,
            "packet_size": packet_size,
            "duration": duration,
            "byte_rate": byte_rate,
            "tcp_flags": tcp_flags,
            "connection_state": connection_state
        })

    df = pd.DataFrame(rows)
    return df

if __name__ == "__main__":
    df = generate_stealth_dataset(5000)
    out_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(out_dir, exist_ok=True)
    
    out_path_1 = os.path.join(out_dir, "stealth_hard_anomalies_unlabeled.csv")
    df.to_csv(out_path_1, index=False)
    print(f"Generated 5,000-record stealth unlabeled dataset at: {out_path_1}")

    # Copy to server/uploads for direct UI selection
    uploads_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "server", "uploads"))
    if os.path.exists(uploads_dir):
        out_path_2 = os.path.join(uploads_dir, "stealth_hard_anomalies_unlabeled.csv")
        df.to_csv(out_path_2, index=False)
        print(f"Copied to server uploads at: {out_path_2}")
