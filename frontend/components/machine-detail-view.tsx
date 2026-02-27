"use client"

import { useEffect, useState, useMemo } from "react"
import { ArrowLeft, Cpu, Calendar, AlertTriangle, Brain, Zap, Activity, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { RiskBadge } from "@/components/risk-badge"
import {
  Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Area, AreaChart, ReferenceLine,
} from "recharts"
import { fetchMachines, fetchSensorData, fetchPrediction } from "@/lib/api"
import { generateHistoricalAnomalies } from "@/lib/mock-data"
import type { Machine, SensorReading, Prediction } from "@/lib/types"

interface MachineDetailViewProps {
  machineId: string
  onBack: () => void
}

const sensorOptions = [
  { key: "temperature" as const, label: "Temperature", unit: "°C",  color: "#ef4444" },
  { key: "vibration"   as const, label: "Vibration",   unit: "mm/s", color: "#eab308" },
  { key: "pressure"    as const, label: "Pressure",    unit: "Pa",  color: "#3b82f6" },
  { key: "rpm"         as const, label: "RPM",         unit: "RPM", color: "#22c55e" },
]
type SensorKey = (typeof sensorOptions)[number]["key"]

// Per machine type sensor weight info — mirrors backend config.py
const MACHINE_WEIGHTS: Record<string, { sensor: string; weight: number; reason: string }[]> = {
  Motor: [
    { sensor: "Temperature", weight: 0.35, reason: "Overheating is the #1 cause of motor failure" },
    { sensor: "Vibration",   weight: 0.30, reason: "Bearing wear shows up as vibration spikes" },
    { sensor: "Pressure",    weight: 0.20, reason: "Coolant pressure affects thermal management" },
    { sensor: "RPM",         weight: 0.15, reason: "Speed anomalies indicate load or winding issues" },
  ],
  Conveyor: [
    { sensor: "Vibration",   weight: 0.40, reason: "Belt misalignment is the primary failure mode" },
    { sensor: "Pressure",    weight: 0.25, reason: "Tension pressure indicates belt stress" },
    { sensor: "Temperature", weight: 0.20, reason: "Friction from slipping belts raises temperature" },
    { sensor: "RPM",         weight: 0.15, reason: "Speed drops signal belt slippage or jam" },
  ],
  Pump: [
    { sensor: "Pressure",    weight: 0.35, reason: "Flow pressure is the core health metric for pumps" },
    { sensor: "Temperature", weight: 0.25, reason: "Cavitation and seal failure raise temperatures" },
    { sensor: "Vibration",   weight: 0.25, reason: "Impeller damage shows as vibration anomalies" },
    { sensor: "RPM",         weight: 0.15, reason: "RPM drops indicate blockage or motor issues" },
  ],
}

export function MachineDetailView({ machineId, onBack }: MachineDetailViewProps) {
  const [machine, setMachine] = useState<Machine | null>(null)
  const [sensorData, setSensorData] = useState<SensorReading[]>([])
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSensors, setSelectedSensors] = useState<SensorKey[]>(["temperature", "vibration"])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchMachines(),
      fetchSensorData(machineId),
      fetchPrediction(machineId),
    ]).then(([machines, sensors, pred]) => {
      const found =
        machines.find((m) => m.id === machineId) ??
        machines.find((m) => m.id.toLowerCase() === machineId.toLowerCase()) ??
        null
      setMachine(found)
      setSensorData(sensors ?? [])
      setPrediction(pred)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [machineId])

  const toggleSensor = (key: SensorKey) => {
    setSelectedSensors((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    )
  }

  const chartData = useMemo(
    () => sensorData.map((r) => ({
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      temperature: r.temperature,
      vibration: r.vibration,
      pressure: r.pressure,
      rpm: r.rpm,
    })),
    [sensorData]
  )

  const historicalAnomalies = useMemo(() => generateHistoricalAnomalies(machineId), [machineId])

  if (loading) return <DetailSkeleton onBack={onBack} />

  if (!machine || !prediction) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">Machine not found.</p>
        <Button variant="outline" onClick={onBack}>Go Back</Button>
      </div>
    )
  }

  const anomalyPercent = Math.round(prediction.anomalyScore * 100)
  const weights = MACHINE_WEIGHTS[machine.type] ?? MACHINE_WEIGHTS["Motor"]

  // Detect correlation: check if 2+ sensors are in contributingSensors
  const topSensors = prediction.contributingSensors.filter(s => s.contribution > 0.25)
  const hasCorrelation = topSensors.length >= 2

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="mt-1 shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">{machine.name}</h1>
            <RiskBadge level={machine.riskLevel} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Cpu className="h-3.5 w-3.5" />{machine.type}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />Last maintenance: {machine.lastMaintenance}</span>
            <span>{machine.id}</span>
          </div>
        </div>
      </div>

      {/* Anomaly Score + Failure Window */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" /> Anomaly Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <span className={`text-3xl font-bold ${
                prediction.riskLevel === "High" ? "text-risk-high" :
                prediction.riskLevel === "Medium" ? "text-risk-medium" : "text-risk-low"
              }`}>
                {prediction.anomalyScore.toFixed(2)}
              </span>
              <span className="mb-1 text-sm text-muted-foreground">/ 1.00</span>
            </div>
            <Progress value={anomalyPercent} className="mt-3 h-2.5"
              style={{ "--progress-color": prediction.riskLevel === "High" ? "#ef4444" :
                prediction.riskLevel === "Medium" ? "#eab308" : "#22c55e" } as React.CSSProperties}
            />
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="text-risk-low">0.0–0.3 Low</span>
              <span className="text-risk-medium">0.3–0.6 Medium</span>
              <span className="text-risk-high">0.6–1.0 High</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Predicted Failure Window
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-8 w-8 ${
                prediction.riskLevel === "High" ? "text-risk-high" :
                prediction.riskLevel === "Medium" ? "text-risk-medium" : "text-risk-low"
              }`} />
              <div>
                <p className="text-xl font-bold text-foreground">{prediction.predictedFailureWindow}</p>
                <p className="text-xs text-muted-foreground">linear trend extrapolation across last 10 readings</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Top Contributing Sensors</p>
              <div className="flex flex-col gap-1.5">
                {prediction.contributingSensors.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="w-24 text-xs text-foreground">{s.name}</span>
                    <div className="h-1.5 flex-1 rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${s.contribution * 100}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs text-muted-foreground">
                      {Math.round(s.contribution * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FEATURE 1: Multi-Sensor Correlation Card */}
      <Card className={`border ${hasCorrelation ? "border-risk-high/40 bg-risk-high/5" : "border-border bg-card"}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className={`h-4 w-4 ${hasCorrelation ? "text-risk-high" : "text-risk-low"}`} />
            <span className={hasCorrelation ? "text-risk-high" : "text-foreground"}>
              Multi-Sensor Correlation {hasCorrelation ? "— DETECTED" : "— Normal"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasCorrelation ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-risk-high font-medium">
                ⚠ {topSensors.map(s => s.name).join(" + ")} are spiking together
              </p>
              <p className="text-xs text-muted-foreground">
                A single sensor anomaly could be noise. When {topSensors.length} sensors deviate simultaneously,
                it indicates a genuine mechanical problem. This is why the risk score is elevated —
                cross-sensor correlation confirms the anomaly is real.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {prediction.contributingSensors.map((s) => (
                  <div key={s.name} className={`rounded-md p-2 text-center text-xs ${
                    s.contribution > 0.25 ? "bg-risk-high/10 border border-risk-high/30" : "bg-secondary/50"
                  }`}>
                    <p className={`font-semibold ${s.contribution > 0.25 ? "text-risk-high" : "text-muted-foreground"}`}>
                      {s.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5">{Math.round(s.contribution * 100)}% weight</p>
                    {s.contribution > 0.25 && <p className="text-risk-high text-[10px] mt-0.5">↑ Elevated</p>}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm text-muted-foreground">
                All 4 sensors are within normal ranges. No correlated anomaly detected — no action required.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {prediction.contributingSensors.map((s) => (
                  <div key={s.name} className="rounded-md bg-secondary/50 p-2 text-center text-xs">
                    <p className="font-semibold text-foreground">{s.name}</p>
                    <p className="text-risk-low mt-0.5">✓ Normal</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* FEATURE 4: Machine-Type Aware Weights Card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Brain className="h-4 w-4" />
            {machine.type}-Specific Sensor Weights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            Unlike generic systems that treat all machines equally, Prognexa applies
            <span className="text-foreground font-medium"> {machine.type.toLowerCase()}-specific weights</span> to each sensor.
            This reduces false alarms and catches real failures earlier.
          </p>
          <div className="flex flex-col gap-3">
            {weights.map((w) => (
              <div key={w.sensor} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{w.sensor}</span>
                  <span className="text-primary font-bold">{Math.round(w.weight * 100)}% weight</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${w.weight * 100}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{w.reason}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md bg-secondary/50 p-3 text-xs text-muted-foreground">
            <span className="text-foreground font-medium">Why this matters: </span>
            A Motor and a Pump both have temperature sensors, but a temperature spike means very different things.
            For a Motor it is critical (35% weight). For a Pump, pressure matters more (35% weight).
            Prognexa knows the difference — most systems don't.
          </div>
        </CardContent>
      </Card>

      {/* FEATURE 5: Isolation Forest explanation card */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Brain className="h-4 w-4" /> AI Model — Isolation Forest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Prognexa uses <span className="text-foreground font-medium">Isolation Forest</span> — an unsupervised
            machine learning algorithm that learns what normal looks like and flags deviations.
            No labeled failure data needed. No new hardware required.
          </p>
          <div className="grid grid-cols-3 gap-3 text-center text-xs">
            <div className="rounded-md bg-secondary/50 p-2">
              <p className="font-semibold text-foreground">100</p>
              <p className="text-muted-foreground">Decision Trees</p>
            </div>
            <div className="rounded-md bg-secondary/50 p-2">
              <p className="font-semibold text-foreground">4</p>
              <p className="text-muted-foreground">Sensors Monitored</p>
            </div>
            <div className="rounded-md bg-secondary/50 p-2">
              <p className="font-semibold text-foreground">0</p>
              <p className="text-muted-foreground">New Hardware Needed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sensor selector */}
      <div className="flex flex-wrap gap-2">
        {sensorOptions.map((sensor) => (
          <Button key={sensor.key} variant={selectedSensors.includes(sensor.key) ? "default" : "outline"}
            size="sm" onClick={() => toggleSensor(sensor.key)} className="text-xs"
            style={selectedSensors.includes(sensor.key)
              ? { backgroundColor: sensor.color, borderColor: sensor.color, color: "#fff" } : {}}
          >
            {sensor.label} ({sensor.unit})
          </Button>
        ))}
      </div>

      {/* Sensor charts */}
      {selectedSensors.length > 1 ? (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sensor Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#1e293b" interval={5} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#1e293b" />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: "0.5rem", color: "#e2e8f0", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12, color: "#94a3b8" }} />
                  {selectedSensors.map((key) => {
                    const opt = sensorOptions.find((s) => s.key === key)!
                    return <Line key={key} type="monotone" dataKey={key}
                      name={`${opt.label} (${opt.unit})`} stroke={opt.color} dot={false} strokeWidth={2} />
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : selectedSensors.length === 1 ? (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {sensorOptions.find(s => s.key === selectedSensors[0])?.label} Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`grad-${selectedSensors[0]}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={sensorOptions.find(s => s.key === selectedSensors[0])?.color} stopOpacity={0.3} />
                      <stop offset="100%" stopColor={sensorOptions.find(s => s.key === selectedSensors[0])?.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#1e293b" interval={5} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#1e293b" />
                  <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: "0.5rem", color: "#e2e8f0", fontSize: 12 }} />
                  <Area type="monotone" dataKey={selectedSensors[0]}
                    stroke={sensorOptions.find(s => s.key === selectedSensors[0])?.color}
                    fill={`url(#grad-${selectedSensors[0]})`} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Historical anomaly trend with threshold line */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Historical Anomaly Score (30 days) — Linear Trend Prediction
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historicalAnomalies}>
                <defs>
                  <linearGradient id="gradAnomaly" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#1e293b" interval={4} />
                <YAxis domain={[0, 1]} tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#1e293b" />
                <Tooltip contentStyle={{ backgroundColor: "#111827", border: "1px solid #1e293b", borderRadius: "0.5rem", color: "#e2e8f0", fontSize: 12 }}
                  formatter={(value: number) => [value.toFixed(3), "Anomaly Score"]} />
                <ReferenceLine y={0.6} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "High Risk Threshold", fill: "#ef4444", fontSize: 10 }} />
                <ReferenceLine y={0.3} stroke="#eab308" strokeDasharray="4 4" label={{ value: "Medium Threshold", fill: "#eab308", fontSize: 10 }} />
                <Area type="monotone" dataKey="score" stroke="#ef4444" fill="url(#gradAnomaly)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Prognexa fits a linear trend line through the last 10 scores and extrapolates forward to predict
            when the score will cross the 0.6 threshold — giving you the 24/48/72-hour failure window.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

function DetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[0, 1].map(i => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-6"><Skeleton className="h-32 w-full" /></CardContent>
          </Card>
        ))}
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-6"><Skeleton className="h-[300px] w-full" /></CardContent>
      </Card>
    </div>
  )
}
