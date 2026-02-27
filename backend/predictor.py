# ── predictor.py ──────────────────────────────────────────────────
# Looks at recent anomaly score trend and predicts failure window

import numpy as np
from config import RISK_THRESHOLDS, FAILURE_WINDOWS

def predict_failure_window(anomaly_history):
    """
    Takes a list of recent anomaly scores and predicts
    when the machine will hit critical threshold.

    anomaly_history = list of floats e.g. [0.2, 0.3, 0.35, 0.4, 0.5]
    Returns a string: "24 hours", "48 hours", "72 hours", or "Stable"
    """

    # Need at least 3 scores to detect a trend
    if len(anomaly_history) < 3:
        return "Insufficient data"

    # Already in critical zone
    latest_score = anomaly_history[-1]
    if latest_score >= RISK_THRESHOLDS["medium"]:
        return f"{FAILURE_WINDOWS['critical']} hours"

    # Fit a linear trend through the history
    x = np.arange(len(anomaly_history))
    y = np.array(anomaly_history)

    # polyfit returns slope and intercept of best fit line
    slope, intercept = np.polyfit(x, y, 1)

    # If slope is flat or going down machine is stable
    if slope <= 0.01:
        return "Stable — no failure predicted"

    # Find when the line crosses the critical threshold (0.6)
    # threshold = slope * x + intercept
    # x = (threshold - intercept) / slope
    critical_threshold = RISK_THRESHOLDS["medium"]
    steps_to_failure = (critical_threshold - intercept) / slope

    # Each step = 5 minutes of sensor data
    minutes_to_failure = steps_to_failure * 5
    hours_to_failure   = minutes_to_failure / 60

    # Bucket into windows
    if hours_to_failure <= 0:
        return f"{FAILURE_WINDOWS['critical']} hours"
    elif hours_to_failure <= 24:
        return f"{FAILURE_WINDOWS['critical']} hours"
    elif hours_to_failure <= 48:
        return f"{FAILURE_WINDOWS['warning']} hours"
    elif hours_to_failure <= 72:
        return f"{FAILURE_WINDOWS['watch']} hours"
    else:
        return "Stable — no failure predicted"

def get_trend_direction(anomaly_history):
    """
    Returns whether the machine is getting better or worse.
    Used by the dashboard to show trend arrows.
    """
    if len(anomaly_history) < 2:
        return "unknown"

    x     = np.arange(len(anomaly_history))
    y     = np.array(anomaly_history)
    slope, _ = np.polyfit(x, y, 1)

    if slope > 0.02:
        return "worsening"
    elif slope < -0.02:
        return "improving"
    else:
        return "stable"