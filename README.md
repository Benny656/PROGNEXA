# PROGNEXA — Predictive Maintenance Intelligence Platform

A full-stack predictive maintenance platform for manufacturing plants that detects anomalies, predicts failure windows, and redistributes workloads — with zero new hardware required.

Project Link:
https://prognexa.vercel.app/

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Python 3, Flask, NumPy, scikit-learn |
| AI | Featherless.ai (DeepSeek-V3) + Isolation Forest |
| Deployment | Vercel (frontend) + Railway (backend) |

## Features

- **Anomaly Detection** — Multi-sensor correlation scoring to reduce false positives
- **Failure Window Prediction** — Linear regression trend analysis (24h / 48h / 72h / Stable)
- **AI Recommendations** — DeepSeek-V3 generated actionable maintenance advice for flagged machines
- **Workload Redistribution** — Automatically shifts load away from high-risk machines
- **Plant Floor Map** — Visual 2D grid of all 12 machines with live risk status
- **Maintenance Scheduler** — Priority-sorted task list per machine
- **Mock Data Fallback** — Fully usable UI even without a running backend

## How It Works

1. Sensor data is simulated for 12 machines (Motor, Conveyor, Pump types)
2. Each reading is scored by a rule-based engine + Isolation Forest model; scores are averaged
3. Failure windows are predicted from a 10-point anomaly score history
4. Medium/High risk machines trigger an AI recommendation via Featherless.ai
5. High-risk machines can be manually or automatically redistributed

## Getting Started

### Backend
```bash
cd backend
pip install -r requirements.txt
export FEATHERLESS_API_KEY=your_key_here
python app.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/machines` | GET | All 12 machines with scores and status |
| `/predictions?machine_id=N` | GET | Full prediction + AI recommendation |
| `/sensors?machine_id=N` | GET | 48 sensor readings for charts |
| `/maintenance` | GET | Maintenance tasks sorted by priority |
| `/redistribute?machine_id=N` | GET | Trigger workload redistribution |
| `/shutdown` | POST | Take a machine offline |
| `/restore` | POST | Bring a machine back online |
| `/reset` | GET | Reset all loads to 50% |

## Limitations

- No database — all state is in-memory and resets on server restart
- No authentication on API endpoints
- Settings panel changes are UI-only (not persisted to backend)
- No auto-refresh — data reflects state at page load

## Project Structure
```
backend/
  config.py          # Machine configs, thresholds, sensor weights
  simulator.py       # Synthetic sensor data generator
  scoring.py         # Rule-based anomaly scoring
  predictor.py       # Failure window prediction
  redistributor.py   # Workload redistribution logic
  feather_client.py  # Isolation Forest + Featherless.ai client
  app.py             # Flask routes

frontend/
  lib/types.ts       # TypeScript interfaces
  lib/api.ts         # API calls with mock fallback
  lib/mock-data.ts   # Static demo data
  components/        # Dashboard, Plant Map, Anomaly Panel, etc.
```

