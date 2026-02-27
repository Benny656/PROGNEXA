# ── app.py ────────────────────────────────────────────────────────
# Flask API server — ties all modules together
# Run with: python app.py

from flask import Flask, jsonify, request
from flask_cors import CORS

from config import MACHINES, FLASK_PORT, FLASK_DEBUG
from simulator import get_live_reading, get_sensor_history, get_anomaly_history
from scoring import score_machine
from predictor import predict_failure_window, get_trend_direction
from redistributor import redistribute_workload, get_machine_load, reset_loads
from feather_client import get_ai_recommendation, get_anomaly_score
import os

app = Flask(__name__)
CORS(app)  # Allows frontend to call backend without issues

# ── Helper ────────────────────────────────────────────────────────
def get_machine_by_id(machine_id):
    return next(
        (m for m in MACHINES if m["machine_id"] == machine_id),
        None
    )

# ── /machines ─────────────────────────────────────────────────────
@app.route("/machines", methods=["GET"])
def get_machines():
    """
    Returns all machines with their current risk level and load.
    Frontend uses this to populate the machine list.
    """
    result = []

    for machine in MACHINES:
        mid     = machine["machine_id"]
        reading = get_live_reading(mid)

        if not reading:
            continue

        # Get anomaly score from Feather.ai or local model
        ai_score = get_anomaly_score(reading)

        # Get risk level and contributing sensors
        scored   = score_machine(reading, machine["type"])

        # Blend AI score with weighted score
        final_score = round((ai_score + scored["anomaly_score"]) / 2, 4)

        from scoring import get_risk_level
        risk_level = get_risk_level(final_score)

        result.append({
            "machine_id":           mid,
            "name":                 machine["name"],
            "type":                 machine["type"],
            "risk_level":           risk_level,
            "anomaly_score":        final_score,
            "current_load":         get_machine_load(mid),
            "contributing_sensors": scored["contributing_sensors"],
        })

    return jsonify(result)

# ── /sensors ──────────────────────────────────────────────────────
@app.route("/sensors", methods=["GET"])
def get_sensors():
    """
    Returns sensor history for a machine.
    Frontend uses this to draw trend charts.
    """
    machine_id = request.args.get("machine_id", type=int)

    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400

    machine = get_machine_by_id(machine_id)
    if not machine:
        return jsonify({"error": "Machine not found"}), 404

    history = get_sensor_history(machine_id, num_readings=20)

    return jsonify({
        "machine_id":   machine_id,
        "machine_name": machine["name"],
        "machine_type": machine["type"],
        "readings":     history
    })

# ── /predictions ──────────────────────────────────────────────────
@app.route("/predictions", methods=["GET"])
def get_predictions():
    """
    Returns anomaly score, risk level, failure window,
    trend direction and AI recommendation for a machine.
    """
    machine_id = request.args.get("machine_id", type=int)

    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400

    machine = get_machine_by_id(machine_id)
    if not machine:
        return jsonify({"error": "Machine not found"}), 404

    # Get current reading
    reading     = get_live_reading(machine_id)
    ai_score    = get_anomaly_score(reading)
    scored      = score_machine(reading, machine["type"])

    # Blend scores
    final_score = round((ai_score + scored["anomaly_score"]) / 2, 4)

    from scoring import get_risk_level
    risk_level = get_risk_level(final_score)

    # Get anomaly history for trend prediction
    anomaly_history = get_anomaly_history(machine_id, num_readings=10)
    failure_window  = predict_failure_window(anomaly_history)
    trend           = get_trend_direction(anomaly_history)

    # Get AI recommendation for Medium and High risk machines
    ai_recommendation = None
    if risk_level in ["Medium", "High"]:
        ai_recommendation = get_ai_recommendation(
            machine_name        = machine["name"],
            machine_type        = machine["type"],
            anomaly_score       = final_score,
            risk_level          = risk_level,
            contributing_sensors= scored["contributing_sensors"],
            failure_window      = failure_window
        )

    return jsonify({
        "machine_id":               machine_id,
        "machine_name":             machine["name"],
        "anomaly_score":            final_score,
        "risk_level":               risk_level,
        "predicted_failure_window": failure_window,
        "trend":                    trend,
        "contributing_sensors":     scored["contributing_sensors"],
        "sensor_reading":           reading,
        "ai_recommendation":        ai_recommendation
    })

# ── /maintenance ──────────────────────────────────────────────────
@app.route("/maintenance", methods=["GET"])
def get_maintenance():
    """
    Returns recommended maintenance schedule for a machine.
    """
    machine_id = request.args.get("machine_id", type=int)

    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400

    machine = get_machine_by_id(machine_id)
    if not machine:
        return jsonify({"error": "Machine not found"}), 404

    reading    = get_live_reading(machine_id)
    scored     = score_machine(reading, machine["type"])
    risk_level = scored["risk_level"]

    # Generate maintenance recommendation based on risk
    if risk_level == "High":
        action   = "Immediate inspection required"
        priority = "Critical"
        days     = 0
    elif risk_level == "Medium":
        action   = "Schedule inspection within 48 hours"
        priority = "High"
        days     = 2
    else:
        action   = "Routine maintenance check"
        priority = "Low"
        days     = 30

    from datetime import datetime, timedelta
    suggested_date = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")

    return jsonify({
        "machine_id":       machine_id,
        "machine_name":     machine["name"],
        "risk_level":       risk_level,
        "recommended_action": action,
        "priority":         priority,
        "suggested_date":   suggested_date,
        "anomaly_score":    scored["anomaly_score"]
    })

# ── /redistribute ─────────────────────────────────────────────────
@app.route("/redistribute", methods=["GET"])
def redistribute():
    """
    Redistributes workload from a high risk machine
    to healthy machines.
    """
    machine_id = request.args.get("machine_id", type=int)

    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400

    machine = get_machine_by_id(machine_id)
    if not machine:
        return jsonify({"error": "Machine not found"}), 404

    # Get current scores for all machines
    all_scores = {}
    for m in MACHINES:
        reading        = get_live_reading(m["machine_id"])
        ai_score       = get_anomaly_score(reading)
        scored         = score_machine(reading, m["type"])
        all_scores[m["machine_id"]] = round(
            (ai_score + scored["anomaly_score"]) / 2, 4
        )

    source_load = get_machine_load(machine_id)
    plan        = redistribute_workload(machine_id, source_load, all_scores)

    return jsonify(plan)

# ── /reset ────────────────────────────────────────────────────────
@app.route("/reset", methods=["GET"])
def reset():
    """
    Resets all machine loads back to 50%.
    Useful for demo — call this before showing judges.
    """
    reset_loads()
    return jsonify({"status": "All machine loads reset to 50%"})

# ── /health ───────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    """Quick check to confirm API is running."""
    return jsonify({
        "status":  "online",
        "message": "MaintenanceIQ API is running"
    })

# ── Run ───────────────────────────────────────────────────────────
if __name__ == "__main__":
app.run(
    host="0.0.0.0",
    port=int(os.environ.get("PORT", 5000)),
    debug=False
)
