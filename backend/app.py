# ── app.py ─────────────────────────────────────────────────────────
# Prognexa — Flask API Server

from flask import Flask, jsonify, request
from flask_cors import CORS
from datetime import datetime, timedelta
import random

from config import MACHINES, FLASK_PORT, FLASK_DEBUG
from simulator import get_live_reading, get_sensor_history, get_anomaly_history
from scoring import score_machine, get_risk_level
from predictor import predict_failure_window, get_trend_direction
from redistributor import (
    redistribute_workload, get_machine_load, reset_loads,
    shutdown_machine, restore_machine, is_machine_shutdown,
    get_redistribution_log,
)
from feather_client import get_ai_recommendation, get_anomaly_score

app = Flask(__name__)
CORS(app)

def get_machine_by_id(machine_id):
    return next((m for m in MACHINES if m["machine_id"] == machine_id), None)

def format_contributing_sensors(raw_sensors):
    """
    Convert backend list-of-strings to frontend {name, contribution} format.
    Backend scoring.py returns e.g. ["temperature", "vibration"]
    Frontend expects [{"name": "Temperature", "contribution": 0.35}]
    """
    sensor_contributions = {
        "temperature": 0.35,
        "vibration":   0.30,
        "pressure":    0.20,
        "rpm":         0.15,
    }
    if not raw_sensors or raw_sensors == ["none"]:
        # All sensors normal - return equal contributions
        return [
            {"name": "Temperature", "contribution": 0.25},
            {"name": "Vibration",   "contribution": 0.25},
            {"name": "Pressure",    "contribution": 0.25},
            {"name": "RPM",         "contribution": 0.25},
        ]
    result = []
    for s in raw_sensors:
        result.append({
            "name":         s.capitalize(),
            "contribution": sensor_contributions.get(s, 0.25)
        })
    # Fill remaining sensors with lower contributions
    existing = {r["name"].lower() for r in result}
    for s, c in sensor_contributions.items():
        if s not in existing:
            result.append({"name": s.capitalize(), "contribution": round(c * 0.3, 3)})
    result.sort(key=lambda x: x["contribution"], reverse=True)
    return result

def get_last_maintenance(machine_id):
    """Deterministic fake last maintenance date based on machine_id."""
    days_ago = (machine_id * 7) % 60 + 5
    return (datetime.now() - timedelta(days=days_ago)).strftime("%Y-%m-%d")

# ── /machines ──────────────────────────────────────────────────────
@app.route("/machines", methods=["GET"])
def get_machines():
    result = []
    for machine in MACHINES:
        mid     = machine["machine_id"]
        reading = get_live_reading(mid)
        if not reading:
            continue

        ai_score    = get_anomaly_score(reading)
        scored      = score_machine(reading, machine["type"])
        final_score = round((ai_score + scored["anomaly_score"]) / 2, 4)
        risk_level  = get_risk_level(final_score)
        shutdown    = is_machine_shutdown(mid)

        anomaly_history  = get_anomaly_history(mid, num_readings=10)
        failure_window   = predict_failure_window(anomaly_history)
        fmt_sensors      = format_contributing_sensors(scored["contributing_sensors"])

        result.append({
            "id":                      f"M-{str(mid).zfill(3)}",
            "machine_id":              mid,
            "name":                    machine["name"],
            "type":                    machine["type"],
            "riskLevel":               "Offline" if shutdown else risk_level,
            "risk_level":              "Offline" if shutdown else risk_level,
            "anomalyScore":            final_score,
            "anomaly_score":           final_score,
            "lastMaintenance":         get_last_maintenance(mid),
            "last_maintenance":        get_last_maintenance(mid),
            "predictedFailureWindow":  failure_window,
            "predicted_failure_window": failure_window,
            "currentLoad":             get_machine_load(mid),
            "current_load":            get_machine_load(mid),
            "isShutdown":              shutdown,
            "is_shutdown":             shutdown,
            "contributing_sensors":    fmt_sensors,
            "location": {
                "row": (mid - 1) // 4,
                "col": (mid - 1) % 4,
            },
        })
    return jsonify(result)

# ── /sensors ───────────────────────────────────────────────────────
@app.route("/sensors", methods=["GET"])
def get_sensors():
    machine_id = request.args.get("machine_id", type=int)
    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400
    machine = get_machine_by_id(machine_id)
    if not machine:
        return jsonify({"error": "Machine not found"}), 404
    history = get_sensor_history(machine_id, num_readings=48)
    return jsonify(history)  # return array directly (frontend handles both formats)

# ── /predictions ───────────────────────────────────────────────────
@app.route("/predictions", methods=["GET"])
def get_predictions():
    machine_id = request.args.get("machine_id", type=int)
    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400
    machine = get_machine_by_id(machine_id)
    if not machine:
        return jsonify({"error": "Machine not found"}), 404

    reading         = get_live_reading(machine_id)
    ai_score        = get_anomaly_score(reading)
    scored          = score_machine(reading, machine["type"])
    final_score     = round((ai_score + scored["anomaly_score"]) / 2, 4)
    risk_level      = get_risk_level(final_score)
    anomaly_history = get_anomaly_history(machine_id, num_readings=10)
    failure_window  = predict_failure_window(anomaly_history)
    trend           = get_trend_direction(anomaly_history)
    fmt_sensors     = format_contributing_sensors(scored["contributing_sensors"])

    ai_recommendation = None
    if risk_level in ["Medium", "High"]:
        ai_recommendation = get_ai_recommendation(
            machine_name         = machine["name"],
            machine_type         = machine["type"],
            anomaly_score        = final_score,
            risk_level           = risk_level,
            contributing_sensors = scored["contributing_sensors"],
            failure_window       = failure_window,
        )

    return jsonify({
        "machineId":               f"M-{str(machine_id).zfill(3)}",
        "machine_id":              machine_id,
        "machine_name":            machine["name"],
        "anomalyScore":            final_score,
        "anomaly_score":           final_score,
        "riskLevel":               risk_level,
        "risk_level":              risk_level,
        "predictedFailureWindow":  failure_window,
        "predicted_failure_window": failure_window,
        "trend":                   trend,
        "contributingSensors":     fmt_sensors,
        "contributing_sensors":    fmt_sensors,
        "sensor_reading":          reading,
        "ai_recommendation":       ai_recommendation,
        "isShutdown":              is_machine_shutdown(machine_id),
    })

# ── /maintenance ───────────────────────────────────────────────────
@app.route("/maintenance", methods=["GET"])
def get_maintenance():
    machine_id = request.args.get("machine_id", type=int)

    # If no machine_id given, return ALL machines maintenance tasks
    if not machine_id:
        all_tasks = []
        for machine in MACHINES:
            mid     = machine["machine_id"]
            reading = get_live_reading(mid)
            scored  = score_machine(reading, machine["type"])
            rl      = scored["risk_level"]
            if rl == "High":
                action, priority, days = "Immediate inspection required", "Urgent", 0
            elif rl == "Medium":
                action, priority, days = "Schedule inspection within 48 hours", "High", 2
            else:
                action, priority, days = "Routine maintenance check", "Low", 30
            all_tasks.append({
                "machineId":         f"M-{str(mid).zfill(3)}",
                "machineName":       machine["name"],
                "recommendedAction": action,
                "priority":          priority,
                "suggestedDate":     (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d"),
            })
        # Sort by priority
        priority_order = {"Urgent": 0, "High": 1, "Medium": 2, "Low": 3}
        all_tasks.sort(key=lambda t: priority_order.get(t["priority"], 4))
        return jsonify(all_tasks)

    machine = get_machine_by_id(machine_id)
    if not machine:
        return jsonify({"error": "Machine not found"}), 404

    reading    = get_live_reading(machine_id)
    scored     = score_machine(reading, machine["type"])
    risk_level = scored["risk_level"]

    if risk_level == "High":
        action, priority, days = "Immediate inspection required", "Urgent", 0
    elif risk_level == "Medium":
        action, priority, days = "Schedule inspection within 48 hours", "High", 2
    else:
        action, priority, days = "Routine maintenance check", "Low", 30

    return jsonify({
        "machineId":         f"M-{str(machine_id).zfill(3)}",
        "machineName":       machine["name"],
        "recommendedAction": action,
        "priority":          priority,
        "suggestedDate":     (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d"),
        "anomalyScore":      scored["anomaly_score"],
    })

# ── /redistribute ──────────────────────────────────────────────────
@app.route("/redistribute", methods=["GET"])
def redistribute():
    machine_id = request.args.get("machine_id", type=int)
    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400
    machine = get_machine_by_id(machine_id)
    if not machine:
        return jsonify({"error": "Machine not found"}), 404

    all_scores = {}
    for m in MACHINES:
        reading  = get_live_reading(m["machine_id"])
        ai_score = get_anomaly_score(reading)
        scored   = score_machine(reading, m["type"])
        all_scores[m["machine_id"]] = round((ai_score + scored["anomaly_score"]) / 2, 4)

    source_load = get_machine_load(machine_id)
    plan        = redistribute_workload(machine_id, source_load, all_scores)
    return jsonify(plan)

# ── /shutdown ──────────────────────────────────────────────────────
@app.route("/shutdown", methods=["POST"])
def shutdown():
    data       = request.get_json(force=True) or {}
    machine_id = data.get("machine_id") or request.args.get("machine_id", type=int)
    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400
    machine = get_machine_by_id(int(machine_id))
    if not machine:
        return jsonify({"error": "Machine not found"}), 404
    plan = shutdown_machine(int(machine_id))
    return jsonify(plan)

# ── /restore ───────────────────────────────────────────────────────
@app.route("/restore", methods=["POST"])
def restore():
    data       = request.get_json(force=True) or {}
    machine_id = data.get("machine_id") or request.args.get("machine_id", type=int)
    if not machine_id:
        return jsonify({"error": "machine_id is required"}), 400
    machine = get_machine_by_id(int(machine_id))
    if not machine:
        return jsonify({"error": "Machine not found"}), 404
    event = restore_machine(int(machine_id))
    return jsonify(event)

# ── /redistribution-log ────────────────────────────────────────────
@app.route("/redistribution-log", methods=["GET"])
def redistribution_log_route():
    limit = request.args.get("limit", default=20, type=int)
    return jsonify(get_redistribution_log(limit))

# ── /status ────────────────────────────────────────────────────────
@app.route("/status", methods=["GET"])
def machine_status():
    result = []
    for m in MACHINES:
        mid = m["machine_id"]
        result.append({
            "id":           f"M-{str(mid).zfill(3)}",
            "machine_id":   mid,
            "name":         m["name"],
            "is_shutdown":  is_machine_shutdown(mid),
            "current_load": get_machine_load(mid),
        })
    return jsonify(result)

# ── /reset ─────────────────────────────────────────────────────────
@app.route("/reset", methods=["GET"])
def reset():
    reset_loads()
    return jsonify({"status": "All machine loads reset to 50% and shutdowns cleared"})

# ── /health ────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "online", "message": "Prognexa API is running"})

import os
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
