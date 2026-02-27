import type {
  Machine,
  SensorReading,
  Prediction,
  MaintenanceTask,
  RedistributionInfo,
  AnomalyAlert,
} from "./types"

export const mockMachines: Machine[] = [
  {
    id: "M-001",
    name: "Primary Drive Motor A",
    type: "Motor",
    riskLevel: "High",
    anomalyScore: 0.87,
    lastMaintenance: "2026-01-15",
    predictedFailureWindow: "24-48 hours",
    location: { row: 0, col: 0 },
  },
  {
    id: "M-002",
    name: "Conveyor Belt Line 1",
    type: "Conveyor",
    riskLevel: "Low",
    anomalyScore: 0.12,
    lastMaintenance: "2026-02-10",
    predictedFailureWindow: "N/A",
    location: { row: 0, col: 1 },
  },
  {
    id: "M-003",
    name: "Hydraulic Pump Station",
    type: "Pump",
    riskLevel: "Medium",
    anomalyScore: 0.54,
    lastMaintenance: "2026-01-28",
    predictedFailureWindow: "3-5 days",
    location: { row: 0, col: 2 },
  },
  {
    id: "M-004",
    name: "Secondary Drive Motor B",
    type: "Motor",
    riskLevel: "High",
    anomalyScore: 0.92,
    lastMaintenance: "2025-12-20",
    predictedFailureWindow: "12-24 hours",
    location: { row: 0, col: 3 },
  },
  {
    id: "M-005",
    name: "Conveyor Belt Line 2",
    type: "Conveyor",
    riskLevel: "Low",
    anomalyScore: 0.08,
    lastMaintenance: "2026-02-18",
    predictedFailureWindow: "N/A",
    location: { row: 1, col: 0 },
  },
  {
    id: "M-006",
    name: "Coolant Pump C",
    type: "Pump",
    riskLevel: "Medium",
    anomalyScore: 0.61,
    lastMaintenance: "2026-01-05",
    predictedFailureWindow: "2-4 days",
    location: { row: 1, col: 1 },
  },
  {
    id: "M-007",
    name: "Assembly Motor D",
    type: "Motor",
    riskLevel: "Low",
    anomalyScore: 0.15,
    lastMaintenance: "2026-02-22",
    predictedFailureWindow: "N/A",
    location: { row: 1, col: 2 },
  },
  {
    id: "M-008",
    name: "Main Feed Conveyor",
    type: "Conveyor",
    riskLevel: "Medium",
    anomalyScore: 0.48,
    lastMaintenance: "2026-01-30",
    predictedFailureWindow: "5-7 days",
    location: { row: 1, col: 3 },
  },
  {
    id: "M-009",
    name: "Booster Pump E",
    type: "Pump",
    riskLevel: "High",
    anomalyScore: 0.79,
    lastMaintenance: "2025-12-15",
    predictedFailureWindow: "24-36 hours",
    location: { row: 2, col: 0 },
  },
  {
    id: "M-010",
    name: "Packaging Motor F",
    type: "Motor",
    riskLevel: "Low",
    anomalyScore: 0.05,
    lastMaintenance: "2026-02-25",
    predictedFailureWindow: "N/A",
    location: { row: 2, col: 1 },
  },
  {
    id: "M-011",
    name: "Transfer Conveyor 3",
    type: "Conveyor",
    riskLevel: "Low",
    anomalyScore: 0.1,
    lastMaintenance: "2026-02-20",
    predictedFailureWindow: "N/A",
    location: { row: 2, col: 2 },
  },
  {
    id: "M-012",
    name: "Recirculation Pump G",
    type: "Pump",
    riskLevel: "Medium",
    anomalyScore: 0.44,
    lastMaintenance: "2026-02-01",
    predictedFailureWindow: "4-6 days",
    location: { row: 2, col: 3 },
  },
]

function generateSensorData(machineId: string): SensorReading[] {
  const readings: SensorReading[] = []
  const machine = mockMachines.find((m) => m.id === machineId)
  const isHighRisk = machine?.riskLevel === "High"
  const isMediumRisk = machine?.riskLevel === "Medium"

  for (let i = 0; i < 48; i++) {
    const date = new Date()
    date.setHours(date.getHours() - (48 - i))
    const noise = () => (Math.random() - 0.5) * 2

    let tempBase = 65
    let vibBase = 2.5
    let pressBase = 101300
    let rpmBase = 1750

    if (isHighRisk) {
      tempBase = 85 + i * 0.3
      vibBase = 5.5 + i * 0.08
      pressBase = 101300 + i * 50
      rpmBase = 1750 - i * 5
    } else if (isMediumRisk) {
      tempBase = 72 + i * 0.1
      vibBase = 3.5 + i * 0.03
      pressBase = 101300 + i * 20
      rpmBase = 1750 - i * 2
    }

    readings.push({
      timestamp: date.toISOString(),
      temperature: Math.round((tempBase + noise() * 3) * 10) / 10,
      vibration: Math.round((vibBase + noise() * 0.5) * 100) / 100,
      pressure: Math.round(pressBase + noise() * 200),
      rpm: Math.round(rpmBase + noise() * 20),
    })
  }
  return readings
}

const sensorDataCache: Record<string, SensorReading[]> = {}

export function getMockSensorData(machineId: string): SensorReading[] {
  if (!sensorDataCache[machineId]) {
    sensorDataCache[machineId] = generateSensorData(machineId)
  }
  return sensorDataCache[machineId]
}

export function getMockPrediction(machineId: string): Prediction {
  const machine = mockMachines.find((m) => m.id === machineId)!
  const sensors = [
    { name: "Temperature", contribution: 0 },
    { name: "Vibration", contribution: 0 },
    { name: "Pressure", contribution: 0 },
    { name: "RPM", contribution: 0 },
  ]

  if (machine.riskLevel === "High") {
    sensors[0].contribution = 0.35
    sensors[1].contribution = 0.3
    sensors[2].contribution = 0.2
    sensors[3].contribution = 0.15
  } else if (machine.riskLevel === "Medium") {
    sensors[0].contribution = 0.25
    sensors[1].contribution = 0.35
    sensors[2].contribution = 0.25
    sensors[3].contribution = 0.15
  } else {
    sensors[0].contribution = 0.25
    sensors[1].contribution = 0.25
    sensors[2].contribution = 0.25
    sensors[3].contribution = 0.25
  }

  return {
    machineId: machine.id,
    anomalyScore: machine.anomalyScore,
    riskLevel: machine.riskLevel,
    predictedFailureWindow: machine.predictedFailureWindow,
    contributingSensors: sensors.sort((a, b) => b.contribution - a.contribution),
  }
}

export const mockMaintenanceTasks: MaintenanceTask[] = [
  { machineId: "M-004", machineName: "Secondary Drive Motor B", recommendedAction: "Replace bearings and realign shaft", priority: "Urgent", suggestedDate: "2026-02-28" },
  { machineId: "M-001", machineName: "Primary Drive Motor A", recommendedAction: "Inspect windings and check coolant flow", priority: "Urgent", suggestedDate: "2026-03-01" },
  { machineId: "M-009", machineName: "Booster Pump E", recommendedAction: "Replace seals and check impeller", priority: "High", suggestedDate: "2026-03-02" },
  { machineId: "M-003", machineName: "Hydraulic Pump Station", recommendedAction: "Flush hydraulic lines and replace filter", priority: "Medium", suggestedDate: "2026-03-05" },
  { machineId: "M-006", machineName: "Coolant Pump C", recommendedAction: "Check valve alignment and flow rate", priority: "Medium", suggestedDate: "2026-03-06" },
  { machineId: "M-008", machineName: "Main Feed Conveyor", recommendedAction: "Tension belt and inspect rollers", priority: "Medium", suggestedDate: "2026-03-08" },
  { machineId: "M-012", machineName: "Recirculation Pump G", recommendedAction: "Inspect seals and calibrate sensors", priority: "Low", suggestedDate: "2026-03-12" },
  { machineId: "M-002", machineName: "Conveyor Belt Line 1", recommendedAction: "Routine lubrication", priority: "Low", suggestedDate: "2026-03-15" },
  { machineId: "M-005", machineName: "Conveyor Belt Line 2", recommendedAction: "Routine inspection", priority: "Low", suggestedDate: "2026-03-18" },
  { machineId: "M-007", machineName: "Assembly Motor D", recommendedAction: "Scheduled bearing check", priority: "Low", suggestedDate: "2026-03-20" },
  { machineId: "M-010", machineName: "Packaging Motor F", recommendedAction: "Routine calibration", priority: "Low", suggestedDate: "2026-03-22" },
  { machineId: "M-011", machineName: "Transfer Conveyor 3", recommendedAction: "Belt alignment check", priority: "Low", suggestedDate: "2026-03-25" },
]

export const mockRedistributions: Record<string, RedistributionInfo> = {
  "M-001": {
    machineId: "M-001",
    machineName: "Primary Drive Motor A",
    absorbedBy: [
      { machineId: "M-007", machineName: "Assembly Motor D", additionalLoad: 35 },
      { machineId: "M-010", machineName: "Packaging Motor F", additionalLoad: 25 },
    ],
  },
  "M-004": {
    machineId: "M-004",
    machineName: "Secondary Drive Motor B",
    absorbedBy: [
      { machineId: "M-007", machineName: "Assembly Motor D", additionalLoad: 30 },
      { machineId: "M-010", machineName: "Packaging Motor F", additionalLoad: 20 },
      { machineId: "M-002", machineName: "Conveyor Belt Line 1", additionalLoad: 15 },
    ],
  },
  "M-009": {
    machineId: "M-009",
    machineName: "Booster Pump E",
    absorbedBy: [
      { machineId: "M-003", machineName: "Hydraulic Pump Station", additionalLoad: 40 },
      { machineId: "M-012", machineName: "Recirculation Pump G", additionalLoad: 20 },
    ],
  },
}

export const mockAnomalyAlerts: AnomalyAlert[] = [
  { machineId: "M-004", machineName: "Secondary Drive Motor B", anomalyScore: 0.92, timestamp: new Date(Date.now() - 120000).toISOString(), riskLevel: "High" },
  { machineId: "M-001", machineName: "Primary Drive Motor A", anomalyScore: 0.87, timestamp: new Date(Date.now() - 300000).toISOString(), riskLevel: "High" },
  { machineId: "M-009", machineName: "Booster Pump E", anomalyScore: 0.79, timestamp: new Date(Date.now() - 600000).toISOString(), riskLevel: "High" },
  { machineId: "M-006", machineName: "Coolant Pump C", anomalyScore: 0.61, timestamp: new Date(Date.now() - 900000).toISOString(), riskLevel: "Medium" },
  { machineId: "M-003", machineName: "Hydraulic Pump Station", anomalyScore: 0.54, timestamp: new Date(Date.now() - 1200000).toISOString(), riskLevel: "Medium" },
  { machineId: "M-008", machineName: "Main Feed Conveyor", anomalyScore: 0.48, timestamp: new Date(Date.now() - 1500000).toISOString(), riskLevel: "Medium" },
]

export function generateHistoricalAnomalies(machineId: string) {
  const machine = mockMachines.find((m) => m.id === machineId)
  const data = []
  for (let i = 30; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    let base = 0.1
    if (machine?.riskLevel === "High") base = 0.4 + (30 - i) * 0.015
    else if (machine?.riskLevel === "Medium") base = 0.25 + (30 - i) * 0.008
    data.push({
      date: date.toISOString().split("T")[0],
      score: Math.min(1, Math.max(0, base + (Math.random() - 0.5) * 0.15)),
    })
  }
  return data
}
