export type RiskLevel = "Low" | "Medium" | "High"

export type MachineType = "Motor" | "Conveyor" | "Pump"

export interface Machine {
  id: string
  name: string
  type: MachineType
  riskLevel: RiskLevel
  anomalyScore: number
  lastMaintenance: string
  predictedFailureWindow: string
  location: { row: number; col: number }
}

export interface SensorReading {
  timestamp: string
  temperature: number
  vibration: number
  pressure: number
  rpm: number
}

export interface Prediction {
  machineId: string
  anomalyScore: number
  riskLevel: RiskLevel
  predictedFailureWindow: string
  contributingSensors: { name: string; contribution: number }[]
}

export interface MaintenanceTask {
  machineId: string
  machineName: string
  recommendedAction: string
  priority: "Urgent" | "High" | "Medium" | "Low"
  suggestedDate: string
}

export interface RedistributionInfo {
  machineId: string
  machineName: string
  absorbedBy: { machineId: string; machineName: string; additionalLoad: number }[]
}

export interface AnomalyAlert {
  machineId: string
  machineName: string
  anomalyScore: number
  timestamp: string
  riskLevel: RiskLevel
}
