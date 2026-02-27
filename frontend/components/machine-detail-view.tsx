"use client"

import { useEffect, useState, useMemo } from "react"
import { ArrowLeft, Cpu, Calendar, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { RiskBadge } from "@/components/risk-badge"
import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts"
import { fetchMachines, fetchSensorData, fetchPrediction } from "@/lib/api"
import { generateHistoricalAnomalies } from "@/lib/mock-data"
import type { Machine, SensorReading, Prediction } from "@/lib/types"

interface MachineDetailViewProps {
  machineId: string
  onBack: () => void
}

const sensorOptions = [
  { key: "temperature" as const, label: "Temperature", unit: "°C", color: "#ef4444" },
  { key: "vibration" as const, label: "Vibration", unit: "mm/s", color: "#eab308" },
  { key: "pressure" as const, label: "Pressure", unit: "Pa", color: "#3b82f6" },
  { key: "rpm" as const, label: "RPM", unit: "RPM", color: "#22c55e" },
]

type SensorKey = (typeof sensorOptions)[number]["key"]

export function MachineDetailView({ machineId, onBack }: MachineDetailViewProps) {
  const [machine, setMachine] = useState<Machine | null>(null)
  const [sensorData, setSensorData] = useState<SensorReading[]>([])
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSensors, setSelectedSensors] = useState<SensorKey[]>([
    "temperature",
    "vibration",
  ])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetchMachines(),
      fetchSensorData(machineId),
      fetchPrediction(machineId),
    ]).then(([machines, sensors, pred]) => {
      setMachine(machines.find((m) => m.id === machineId) ?? null)
      setSensorData(sensors)
      setPrediction(pred)
      setLoading(false)
    })
  }, [machineId])

  const toggleSensor = (key: SensorKey) => {
    setSelectedSensors((prev) =>
      prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key]
    )
  }

  const chartData = useMemo(
    () =>
      sensorData.map((r) => ({
        time: new Date(r.timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        temperature: r.temperature,
        vibration: r.vibration,
        pressure: r.pressure,
        rpm: r.rpm,
      })),
    [sensorData]
  )

  const historicalAnomalies = useMemo(
    () => generateHistoricalAnomalies(machineId),
    [machineId]
  )

  if (loading) {
    return <DetailSkeleton onBack={onBack} />
  }

  if (!machine || !prediction) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12">
        <p className="text-muted-foreground">Machine not found.</p>
        <Button variant="outline" onClick={onBack}>
          Go Back
        </Button>
      </div>
    )
  }

  const anomalyPercent = Math.round(prediction.anomalyScore * 100)

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mt-1 shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-bold text-foreground">{machine.name}</h1>
            <RiskBadge level={machine.riskLevel} />
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Cpu className="h-3.5 w-3.5" />
              {machine.type}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Last maintenance: {machine.lastMaintenance}
            </span>
            <span>{machine.id}</span>
          </div>
        </div>
      </div>

      {/* Anomaly score + prediction */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Anomaly Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              <span
                className={`text-3xl font-bold ${
                  prediction.riskLevel === "High"
                    ? "text-risk-high"
                    : prediction.riskLevel === "Medium"
                    ? "text-risk-medium"
                    : "text-risk-low"
                }`}
              >
                {prediction.anomalyScore.toFixed(2)}
              </span>
              <span className="mb-1 text-sm text-muted-foreground">/ 1.00</span>
            </div>
            <Progress
              value={anomalyPercent}
              className="mt-3 h-2.5"
              style={
                {
                  "--progress-color":
                    prediction.riskLevel === "High"
                      ? "#ef4444"
                      : prediction.riskLevel === "Medium"
                      ? "#eab308"
                      : "#22c55e",
                } as React.CSSProperties
              }
            />
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Predicted Failure Window
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <AlertTriangle
                className={`h-8 w-8 ${
                  prediction.riskLevel === "High"
                    ? "text-risk-high"
                    : prediction.riskLevel === "Medium"
                    ? "text-risk-medium"
                    : "text-risk-low"
                }`}
              />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {prediction.predictedFailureWindow}
                </p>
                <p className="text-xs text-muted-foreground">estimated time to failure</p>
              </div>
            </div>
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Top Contributing Sensors
              </p>
              <div className="flex flex-col gap-1.5">
                {prediction.contributingSensors.map((s) => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="w-24 text-xs text-foreground">{s.name}</span>
                    <div className="h-1.5 flex-1 rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${s.contribution * 100}%` }}
                      />
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

      {/* Sensor selector */}
      <div className="flex flex-wrap gap-2">
        {sensorOptions.map((sensor) => (
          <Button
            key={sensor.key}
            variant={selectedSensors.includes(sensor.key) ? "default" : "outline"}
            size="sm"
            onClick={() => toggleSensor(sensor.key)}
            className="text-xs"
            style={
              selectedSensors.includes(sensor.key)
                ? { backgroundColor: sensor.color, borderColor: sensor.color, color: "#fff" }
                : {}
            }
          >
            {sensor.label} ({sensor.unit})
          </Button>
        ))}
      </div>

      {/* Sensor trend charts */}
      {selectedSensors.length > 1 ? (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Sensor Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10, fill: "#94a3b8" }}
                    stroke="#1e293b"
                    interval={5}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#1e293b" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#111827",
                      border: "1px solid #1e293b",
                      borderRadius: "0.5rem",
                      color: "#e2e8f0",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
                  />
                  {selectedSensors.map((key) => {
                    const opt = sensorOptions.find((s) => s.key === key)!
                    return (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        name={`${opt.label} (${opt.unit})`}
                        stroke={opt.color}
                        dot={false}
                        strokeWidth={2}
                      />
                    )
                  })}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-1">
          {selectedSensors.map((key) => {
            const opt = sensorOptions.find((s) => s.key === key)!
            return (
              <Card key={key} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {opt.label} ({opt.unit})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={opt.color} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={opt.color} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10, fill: "#94a3b8" }}
                          stroke="#1e293b"
                          interval={5}
                        />
                        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} stroke="#1e293b" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#111827",
                            border: "1px solid #1e293b",
                            borderRadius: "0.5rem",
                            color: "#e2e8f0",
                            fontSize: 12,
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey={key}
                          stroke={opt.color}
                          fill={`url(#grad-${key})`}
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Historical anomalies */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Historical Anomaly Scores (30 days)
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
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  stroke="#1e293b"
                  interval={4}
                />
                <YAxis
                  domain={[0, 1]}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  stroke="#1e293b"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#111827",
                    border: "1px solid #1e293b",
                    borderRadius: "0.5rem",
                    color: "#e2e8f0",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [value.toFixed(3), "Anomaly Score"]}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#ef4444"
                  fill="url(#gradAnomaly)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function DetailSkeleton({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
      <Card className="bg-card border-border">
        <CardContent className="p-6">
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    </div>
  )
}
