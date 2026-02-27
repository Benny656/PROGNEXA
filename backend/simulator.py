# ── simulator.py ──────────────────────────────────────────────────
# Generates fake sensor data for all machines
# Used both for Feather.ai training CSV and live API data

import random
import numpy as np
from datetime import datetime, timedelta
from config import MACHINES, NORMAL_RANGES

# ── Generate a single sensor reading ─────────────────────────────
def generate_single_reading(machine, is_anomaly=False):
    """
    Generates one set of sensor readings for a machine.
    If is_anomaly=True, pushes values above normal range.
    """
    ranges = NORMAL_RANGES[machine["type"]]

    if is_anomaly:
        temp      = random.uniform(ranges["temperature"][1] + 10,
                                   ranges["temperature"][1] + 30)
        vibration = random.uniform(ranges["vibration"][1]   + 1,
                                   ranges["vibration"][1]   + 4)
        pressure  = random.uniform(ranges["pressure"][1]    + 10,
                                   ranges["pressure"][1]    + 25)
        rpm       = random.uniform(ranges["rpm"][1]         + 100,
                                   ranges["rpm"][1]         + 300)
    else:
        temp      = random.uniform(*ranges["temperature"])
        vibration = random.uniform(*ranges["vibration"])
        pressure  = random.uniform(*ranges["pressure"])
        rpm       = random.uniform(*ranges["rpm"])

        # Add small random noise to make it realistic
        temp      += random.gauss(0, 0.5)
        vibration += random.gauss(0, 0.05)
        pressure  += random.gauss(0, 0.3)
        rpm       += random.gauss(0, 5)

    return {
        "temperature": round(temp,      2),
        "vibration":   round(vibration, 2),
        "pressure":    round(pressure,  2),
        "rpm":         round(rpm,       2),
    }

# ── Get live reading for one machine ─────────────────────────────
def get_live_reading(machine_id):
    """
    Returns a single live sensor reading for one machine.
    Called by app.py every time the frontend requests sensor data.
    15% chance of anomaly to keep the demo interesting.
    """
    machine = next(
        (m for m in MACHINES if m["machine_id"] == machine_id),
        None
    )
    if not machine:
        return None

    is_anomaly = random.random() < 0.15
    reading    = generate_single_reading(machine, is_anomaly)
    reading["machine_id"]    = machine_id
    reading["machine_name"]  = machine["name"]
    reading["machine_type"]  = machine["type"]
    reading["timestamp"]     = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    reading["anomaly_label"] = 1 if is_anomaly else 0
    return reading

# ── Get sensor history for charts ────────────────────────────────
def get_sensor_history(machine_id, num_readings=20):
    """
    Returns last N sensor readings for a machine.
    Used by frontend to draw sensor trend charts.
    """
    machine = next(
        (m for m in MACHINES if m["machine_id"] == machine_id),
        None
    )
    if not machine:
        return []

    history  = []
    start    = datetime.now() - timedelta(minutes=num_readings * 5)

    for i in range(num_readings):
        timestamp  = start + timedelta(minutes=i * 5)
        is_anomaly = random.random() < 0.15
        reading    = generate_single_reading(machine, is_anomaly)
        reading["timestamp"] = timestamp.strftime("%Y-%m-%d %H:%M:%S")
        history.append(reading)

    return history

# ── Get anomaly score history ─────────────────────────────────────
def get_anomaly_history(machine_id, num_readings=10):
    """
    Returns list of recent anomaly scores for a machine.
    Used by predictor.py to calculate failure window.
    """
    from scoring import calculate_anomaly_score

    machine = next(
        (m for m in MACHINES if m["machine_id"] == machine_id),
        None
    )
    if not machine:
        return []

    history = []
    for _ in range(num_readings):
        is_anomaly = random.random() < 0.15
        reading    = generate_single_reading(machine, is_anomaly)
        score      = calculate_anomaly_score(reading, machine["type"])
        history.append(score)

    return history

# ── Generate and save full CSV ────────────────────────────────────
def generate_csv(filename="sensor_data.csv", readings_per_machine=500):
    """
    Generates full training CSV for Feather.ai.
    Run this directly: python simulator.py
    """
    import pandas as pd

    all_data = []
    start    = datetime.now() - timedelta(hours=readings_per_machine * 5 // 60)

    for machine in MACHINES:
        for i in range(readings_per_machine):
            timestamp  = start + timedelta(minutes=i * 5)
            is_anomaly = random.random() < 0.15
            reading    = generate_single_reading(machine, is_anomaly)

            all_data.append({
                "machine_id":    machine["machine_id"],
                "machine_name":  machine["name"],
                "machine_type":  machine["type"],
                "timestamp":     timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "temperature":   reading["temperature"],
                "vibration":     reading["vibration"],
                "pressure":      reading["pressure"],
                "rpm":           reading["rpm"],
                "anomaly_label": 1 if is_anomaly else 0
            })

    df = pd.DataFrame(all_data)
    df.to_csv(filename, index=False)
    print(f"Done! Generated {len(df)} rows for {len(MACHINES)} machines")
    print(f"Anomalies: {df['anomaly_label'].sum()} rows")
    print(f"Saved to {filename}")

# ── Run directly to generate CSV ─────────────────────────────────
if __name__ == "__main__":
    generate_csv()