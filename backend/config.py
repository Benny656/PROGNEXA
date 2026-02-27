# ── MaintenanceIQ Backend Configuration ──────────────────────────
# Change any value here and it updates everywhere automatically

# Machine definitions
MACHINES = [
    {"machine_id": 1,  "name": "Motor A",    "type": "Motor"},
    {"machine_id": 2,  "name": "Conveyor B", "type": "Conveyor"},
    {"machine_id": 3,  "name": "Pump C",     "type": "Pump"},
    {"machine_id": 4,  "name": "Motor D",    "type": "Motor"},
    {"machine_id": 5,  "name": "Conveyor E", "type": "Conveyor"},
    {"machine_id": 6,  "name": "Pump F",     "type": "Pump"},
    {"machine_id": 7,  "name": "Motor G",    "type": "Motor"},
    {"machine_id": 8,  "name": "Conveyor H", "type": "Conveyor"},
    {"machine_id": 9,  "name": "Pump I",     "type": "Pump"},
    {"machine_id": 10, "name": "Motor J",    "type": "Motor"},
]

# Normal sensor ranges per machine type
NORMAL_RANGES = {
    "Motor":    {"temperature": (60, 80),  "vibration": (1.0, 2.5),
                 "pressure":    (95, 105), "rpm":       (1400, 1600)},
    "Conveyor": {"temperature": (40, 60),  "vibration": (0.5, 1.5),
                 "pressure":    (90, 100), "rpm":       (800,  1000)},
    "Pump":     {"temperature": (50, 70),  "vibration": (0.8, 2.0),
                 "pressure":    (100,120), "rpm":       (1100, 1300)},
}

# Sensor weights per machine type (must sum to 1.0)
SENSOR_WEIGHTS = {
    "Motor":    {"temperature": 0.35, "vibration": 0.30,
                 "pressure":    0.20, "rpm":       0.15},
    "Conveyor": {"temperature": 0.20, "vibration": 0.40,
                 "pressure":    0.25, "rpm":       0.15},
    "Pump":     {"temperature": 0.25, "vibration": 0.25,
                 "pressure":    0.35, "rpm":       0.15},
}

# Risk level thresholds
RISK_THRESHOLDS = {
    "low":    0.3,
    "medium": 0.6,
}

# Failure window prediction thresholds (in hours)
FAILURE_WINDOWS = {
    "critical": 24,
    "warning":  48,
    "watch":    72,
}

# Workload redistribution
MAX_LOAD_CAPACITY   = 100   # max load a machine can handle
REDISTRIBUTION_TRIGGER = 0.6  # anomaly score that triggers redistribution
MAX_LOAD_THRESHOLD  = 80    # machines above this % load won't receive work


# Flask config
FLASK_PORT  = 5000
FLASK_DEBUG = True