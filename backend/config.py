# ── Prognexa Backend Configuration ───────────────────────────────

MACHINES = [
    {"machine_id": 1,  "name": "Primary Drive Motor A",   "type": "Motor"},
    {"machine_id": 2,  "name": "Conveyor Belt Line 1",    "type": "Conveyor"},
    {"machine_id": 3,  "name": "Hydraulic Pump Station",  "type": "Pump"},
    {"machine_id": 4,  "name": "Secondary Drive Motor B", "type": "Motor"},
    {"machine_id": 5,  "name": "Conveyor Belt Line 2",    "type": "Conveyor"},
    {"machine_id": 6,  "name": "Coolant Pump C",          "type": "Pump"},
    {"machine_id": 7,  "name": "Assembly Motor D",        "type": "Motor"},
    {"machine_id": 8,  "name": "Main Feed Conveyor",      "type": "Conveyor"},
    {"machine_id": 9,  "name": "Booster Pump E",          "type": "Pump"},
    {"machine_id": 10, "name": "Packaging Motor F",       "type": "Motor"},
    {"machine_id": 11, "name": "Transfer Conveyor 3",     "type": "Conveyor"},
    {"machine_id": 12, "name": "Recirculation Pump G",    "type": "Pump"},
]

NORMAL_RANGES = {
    "Motor":    {"temperature": (60, 80),  "vibration": (1.0, 2.5),
                 "pressure":    (95, 105), "rpm":       (1400, 1600)},
    "Conveyor": {"temperature": (40, 60),  "vibration": (0.5, 1.5),
                 "pressure":    (90, 100), "rpm":       (800,  1000)},
    "Pump":     {"temperature": (50, 70),  "vibration": (0.8, 2.0),
                 "pressure":    (100,120), "rpm":       (1100, 1300)},
}

SENSOR_WEIGHTS = {
    "Motor":    {"temperature": 0.35, "vibration": 0.30,
                 "pressure":    0.20, "rpm":       0.15},
    "Conveyor": {"temperature": 0.20, "vibration": 0.40,
                 "pressure":    0.25, "rpm":       0.15},
    "Pump":     {"temperature": 0.25, "vibration": 0.25,
                 "pressure":    0.35, "rpm":       0.15},
}

RISK_THRESHOLDS = {
    "low":    0.3,
    "medium": 0.6,
}

FAILURE_WINDOWS = {
    "critical": 24,
    "warning":  48,
    "watch":    72,
}

MAX_LOAD_CAPACITY      = 100
REDISTRIBUTION_TRIGGER = 0.6
MAX_LOAD_THRESHOLD     = 80

FLASK_PORT  = 5000
FLASK_DEBUG = True
