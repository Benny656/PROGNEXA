# ── feather_client.py ─────────────────────────────────────────────
# Uses Featherless.ai to generate smart AI maintenance recommendations
# Falls back to local Isolation Forest for anomaly scoring

import requests
import numpy as np
from sklearn.ensemble import IsolationForest

# ── Paste your API key here ───────────────────────────────────────
FEATHERLESS_API_KEY = "rc_51400760c149f720044a0d4acec125e76f6f839e6645d9524bc6da7b6ed447ae"
FEATHERLESS_URL     = "https://api.featherless.ai/v1/chat/completions"
MODEL               = "deepseek-ai/DeepSeek-V3-0324"

# ── Local Isolation Forest (anomaly scoring) ──────────────────────
_local_model = None

def _get_local_model():
    global _local_model
    if _local_model is None:
        np.random.seed(42)
        normal_data = np.random.normal(
            loc=[65, 1.8, 100, 1450],
            scale=[15, 0.8, 12, 200],
            size=(1000, 4)
        )
        _local_model = IsolationForest(
            n_estimators=100,
            contamination=0.15,
            random_state=42
        )
        _local_model.fit(normal_data)
    return _local_model

def get_anomaly_score(readings):
    """
    Uses local Isolation Forest to score sensor readings.
    Returns anomaly score between 0.0 and 1.0
    """
    model    = _get_local_model()
    features = np.array([[
        readings["temperature"],
        readings["vibration"],
        readings["pressure"],
        readings["rpm"]
    ]])
    raw_score  = model.decision_function(features)[0]
    normalized = 1 - ((raw_score + 0.5) / 1.0)
    return round(max(0.0, min(1.0, normalized)), 4)

# ── Featherless.ai AI Recommendation ─────────────────────────────
def get_ai_recommendation(machine_name, machine_type,
                           anomaly_score, risk_level,
                           contributing_sensors, failure_window):
    """
    Calls Featherless.ai to get a smart maintenance recommendation.
    Called when a machine hits Medium or High risk.
    """
    prompt = f"""You are an expert industrial maintenance engineer.

A machine has been flagged by our predictive maintenance system.

Machine Details:
- Name: {machine_name}
- Type: {machine_type}
- Anomaly Score: {anomaly_score} out of 1.0
- Risk Level: {risk_level}
- Sensors Contributing to Anomaly: {', '.join(contributing_sensors)}
- Predicted Failure Window: {failure_window}

Give a short, practical maintenance recommendation in 2-3 sentences.
Be specific about what the engineer should check and why.
Do not use bullet points. Write in plain English."""

    headers = {
        "Authorization": f"Bearer {FEATHERLESS_API_KEY}",
        "Content-Type":  "application/json"
    }

    payload = {
        "model": MODEL,
        "messages": [
            {
                "role":    "system",
                "content": "You are an expert industrial maintenance engineer. Give concise, actionable advice."
            },
            {
                "role":    "user",
                "content": prompt
            }
        ],
        "max_tokens": 150,
        "temperature": 0.7
    }

    try:
        response = requests.post(
            FEATHERLESS_URL,
            headers=headers,
            json=payload,
            timeout=10
        )
        data = response.json()
        return data["choices"][0]["message"]["content"].strip()

    except Exception as e:
        # Fallback recommendation if API fails
        return (
            f"Immediate inspection recommended for {machine_name}. "
            f"Check {', '.join(contributing_sensors)} readings as they are "
            f"showing abnormal patterns. Schedule maintenance within {failure_window}."
        )