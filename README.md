# PROGNEXA

**Predictive Maintenance Intelligence Platform**

PROGNEXA is a full-stack predictive maintenance platform for manufacturing plants. It reduces false-positive alarms through multi-sensor correlation analysis, predicts equipment failure windows using trend analysis, and delivers AI-generated maintenance recommendations — all without requiring new hardware.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Current Limitations](#current-limitations)

---

## Overview

Manufacturing plants lose millions annually due to unplanned equipment downtime. Existing predictive maintenance systems generate excessive false alarms and lack contextual awareness. PROGNEXA solves this by:

- Reducing false positives via **multi-sensor correlation analysis**
- Predicting failure windows using **linear regression on anomaly score history**
- Delivering **AI-generated, actionable maintenance recommendations** (via Featherless.ai / DeepSeek-V3)
- Enabling **workload redistribution** to healthy machines when failures are detected
- Working with **existing sensor data** — no new hardware required

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Python 3, Flask, Flask-CORS, NumPy, scikit-learn (Isolation Forest) |
| AI Recommendations | Featherless.ai API — DeepSeek-V3-0324 |
| Data Simulation | Custom Python simulator (no real hardware needed) |
| Deployment | Railway (backend), Vercel (frontend) |

---

## Architecture

PROGNEXA is split into two independently deployable services that communicate over REST:

```
┌──────────────────────────────────┐       ┌──────────────────────────────────┐
│         Frontend (Vercel)        │       │         Backend (Railway)        │
│  Next.js 14 / TypeScript         │◄─────►│  Flask / Python 3                │
│                                  │  REST │                                  │
│  - Dashboard & Fleet Overview    │       │  - Sensor Simulation             │
│  - Machine Detail View           │       │  - Anomaly Scoring Engine        │
│  - Plant Floor Map               │       │  - Failure Window Prediction     │
│  - Anomaly Panel                 │       │  - Workload Redistribution       │
│  - Maintenance Scheduler         │       │  - Featherless.ai LLM Client     │
│  - Shutdown Control              │       │  - Isolation Forest ML Model     │
└──────────────────────────────────┘       └──────────────────────────────────┘
```

The frontend includes full mock-data fallback, so the UI remains functional even when the backend is offline.

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.9+
- A [Featherless.ai](https://featherless.ai) API key (optional — falls back to template strings without it)

### Backend Setup

```bash
cd backend
pip install -r requirements.txt
export FEATHERLESS_API_KEY=your_key_here
python app.py
```

The Flask server will start on `http://localhost:5000`.

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The Next.js app will start on `http://localhost:3000`.

> Update the `API_BASE` URL in `frontend/lib/api.ts` if your backend is not running locally.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FEATHERLESS_API_KEY` | Optional | API key for Featherless.ai LLM recommendations. If absent, a fallback template message is shown. |

---

## API Reference

All endpoints are served by the Flask backend.

| Endpoint | Method | Description |
|---|---|---|
| `/machines` | GET | All 12 machines with anomaly scores, risk levels, failure windows, load, and shutdown status |
| `/sensors?machine_id=N` | GET | 48 timestamped sensor readings for one machine (for chart rendering) |
| `/predictions?machine_id=N` | GET | Full prediction: anomaly score, risk, failure window, trend, contributing sensors, and AI recommendation (if Medium/High) |
| `/maintenance` | GET | Maintenance tasks for all machines sorted by priority. Optional `?machine_id=N` for a single machine |
| `/redistribute?machine_id=N` | GET | Compute and execute workload redistribution from a high-risk machine |
| `/shutdown` | POST | Take a machine offline and redistribute its load. Body: `{ "machine_id": N }` |
| `/restore` | POST | Bring a machine back online. Body: `{ "machine_id": N }` |
| `/redistribution-log` | GET | Last 20 redistribution/restore events in reverse chronological order |
| `/status` | GET | Lightweight status: machine ID, name, shutdown state, current load |
| `/reset` | GET | Reset all machine loads to 50% and clear all shutdowns |
| `/health` | GET | Returns `{ "status": "online" }` — used by the settings panel to test connectivity |

---

## Project Structure

```
prognexa/
├── backend/
│   ├── app.py                  # Flask routes — wires all modules together
│   ├── config.py               # All system constants: machines, ranges, weights, thresholds
│   ├── simulator.py            # Synthetic sensor data generation + CSV export
│   ├── scoring.py              # Rule-based anomaly scoring with correlation check
│   ├── predictor.py            # Linear regression failure window + trend direction
│   ├── redistributor.py        # Workload redistribution, shutdown, restore, log
│   ├── feather_client.py       # Isolation Forest local scorer + Featherless.ai LLM client
│   └── requirements.txt        # Python dependencies
│
└── frontend/
    ├── lib/
    │   ├── types.ts             # TypeScript interfaces for all data models
    │   ├── api.ts               # All API calls with fallback to mock data
    │   └── mock-data.ts         # Static demo data for offline use
    └── components/
        ├── app-shell.tsx        # Navigation shell and page router
        ├── dashboard-page.tsx   # Main dashboard with fleet overview
        ├── machine-detail-view.tsx  # Per-machine deep dive with charts and AI rec
        ├── plant-floor-map.tsx  # Visual grid floor plan of all machines
        ├── anomaly-panel.tsx    # Filtered table of flagged machines with predictions
        ├── maintenance-scheduler.tsx  # Maintenance task table with priority filtering
        ├── shutdown-panel.tsx   # Manual shutdown/restore + redistribution log
        ├── settings-panel.tsx   # UI config panel (API URL, thresholds, notifications)
        └── risk-badge.tsx       # Shared coloured risk level badge component
```

---

## How It Works

### Anomaly Scoring

Each machine reading is scored using two methods that are averaged together:

1. **Rule-based scoring** (`scoring.py`): Normalises each sensor value (temperature, vibration, pressure, RPM) relative to its normal range, applies per-machine-type weights (e.g. vibration is weighted 40% for Conveyors), and adds a 0.1 bonus when 2+ sensors are simultaneously elevated — the key mechanism for reducing false positives.

2. **Isolation Forest** (`feather_client.py`): A local ML model trained at startup on 1,000 synthetic normal readings. Scores are normalised to 0.0–1.0 and averaged with the rule-based score.

Risk levels are mapped as: `< 0.3` → Low, `0.3–0.6` → Medium, `> 0.6` → High.

### Failure Window Prediction

`predictor.py` fits a linear regression on the 10 most recent anomaly scores. If the slope is flat or negative, the machine is marked **Stable**. Otherwise, it extrapolates when the trend will cross the 0.6 threshold and buckets the result into **24h**, **48h**, or **72h** windows.

### Workload Redistribution

When a machine is flagged as high-risk or manually shut down, `redistributor.py` distributes its load equally among available machines — excluding machines that are already shut down, have an anomaly score ≥ 0.6, or are already at ≥ 80% load. All state is held in memory and resets on server restart.

### AI Recommendations

For Medium and High risk machines, `feather_client.py` sends a domain-specific prompt (including machine name, type, anomaly score, contributing sensors, and predicted failure window) to the DeepSeek-V3-0324 model via Featherless.ai. The response is 2–3 sentences of actionable engineer advice, displayed in the machine detail view.

---

## Current Limitations

- **No persistence**: Machine loads and shutdown states are in-memory. A server restart resets everything.
- **Simulated data only**: All sensor readings are synthetic. A production deployment would need a real data ingestion layer (MQTT, REST hooks, or a database).
- **No authentication**: The API has no auth layer — any user can call `/shutdown` or `/restore`.
- **No auto-refresh**: The frontend does not poll the backend automatically; data reflects state at page load.
- **Settings panel is UI-only**: Threshold changes, notification preferences, and API URL overrides do not persist or affect the backend.
- **Static anomaly alert feed**: The real-time alerts panel on the dashboard uses hardcoded mock data and does not poll the backend for live events.
- **Featherless.ai key not bundled**: AI recommendations silently fall back to a template string if the API key is missing.

---

*PROGNEXA — Predictive Maintenance Intelligence Platform*
