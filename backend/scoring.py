# ── scoring.py ────────────────────────────────────────────────────
# Takes sensor readings and returns anomaly score + risk level

from config import SENSOR_WEIGHTS, RISK_THRESHOLDS, NORMAL_RANGES

def normalize_sensor(value, min_val, max_val):
    """
    Converts a raw sensor reading to a 0-1 scale.
    0 = perfectly normal, 1 = extremely abnormal
    """
    normalized = (value - min_val) / (max_val - min_val)
    return max(0.0, min(1.0, normalized))

def check_correlation(readings, machine_type):
    """
    Checks if multiple sensors are spiking together.
    If yes returns 1 (suspicious), if no returns 0.
    This is what reduces false positives.
    """
    ranges = NORMAL_RANGES[machine_type]
    
    sensors_above_normal = 0
    for sensor in ["temperature", "vibration", "pressure", "rpm"]:
        max_normal = ranges[sensor][1]
        if readings[sensor] > max_normal:
            sensors_above_normal += 1
    
    # If 2 or more sensors are above normal at same time = suspicious
    return 1 if sensors_above_normal >= 2 else 0

def calculate_anomaly_score(readings, machine_type):
    """
    Main scoring function.
    Takes raw sensor readings, returns anomaly score 0.0 to 1.0
    """
    ranges  = NORMAL_RANGES[machine_type]
    weights = SENSOR_WEIGHTS[machine_type]

    # Normalize each sensor to 0-1
    temp_score = normalize_sensor(
        readings["temperature"],
        ranges["temperature"][0],
        ranges["temperature"][1]
    )
    vib_score = normalize_sensor(
        readings["vibration"],
        ranges["vibration"][0],
        ranges["vibration"][1]
    )
    pres_score = normalize_sensor(
        readings["pressure"],
        ranges["pressure"][0],
        ranges["pressure"][1]
    )
    rpm_score = normalize_sensor(
        readings["rpm"],
        ranges["rpm"][0],
        ranges["rpm"][1]
    )

    # Check if sensors are spiking together
    correlation = check_correlation(readings, machine_type)

    # Weighted formula
    # anomaly_score = w1*temp + w2*vib + w3*pressure + w4*rpm + correlation bonus
    base_score = (
        weights["temperature"] * temp_score +
        weights["vibration"]   * vib_score  +
        weights["pressure"]    * pres_score +
        weights["rpm"]         * rpm_score
    )

    # Correlation adds up to 10% extra to the score
    final_score = base_score + (0.1 * correlation)

    # Cap at 1.0
    return round(min(1.0, final_score), 4)

def get_risk_level(anomaly_score):
    """
    Converts anomaly score to risk level label.
    """
    if anomaly_score < RISK_THRESHOLDS["low"]:
        return "Low"
    elif anomaly_score < RISK_THRESHOLDS["medium"]:
        return "Medium"
    else:
        return "High"

def score_machine(readings, machine_type):
    """
    Master function — call this from app.py.
    Returns everything needed for the API response.
    """
    anomaly_score = calculate_anomaly_score(readings, machine_type)
    risk_level    = get_risk_level(anomaly_score)

    # Find which sensors contributed most
    ranges = NORMAL_RANGES[machine_type]
    contributing = []
    for sensor in ["temperature", "vibration", "pressure", "rpm"]:
        if readings[sensor] > ranges[sensor][1]:
            contributing.append(sensor)

    return {
        "anomaly_score":        anomaly_score,
        "risk_level":           risk_level,
        "contributing_sensors": contributing if contributing else ["none"]
    }