import {
  mockMachines,
  getMockSensorData,
  getMockPrediction,
  mockMaintenanceTasks,
  mockRedistributions,
} from "./mock-data"
import type {
  Machine,
  SensorReading,
  Prediction,
  MaintenanceTask,
  RedistributionInfo,
} from "./types"

const API_BASE = "http://localhost:5000"

async function fetchWithFallback<T>(url: string, fallback: T): Promise<T> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) throw new Error("API error")
    return (await res.json()) as T
  } catch {
    return fallback
  }
}

export async function fetchMachines(): Promise<Machine[]> {
  return fetchWithFallback(`${API_BASE}/machines`, mockMachines)
}

export async function fetchSensorData(machineId: string): Promise<SensorReading[]> {
  return fetchWithFallback(
    `${API_BASE}/sensors?machine_id=${machineId}`,
    getMockSensorData(machineId)
  )
}

export async function fetchPrediction(machineId: string): Promise<Prediction> {
  return fetchWithFallback(
    `${API_BASE}/predictions?machine_id=${machineId}`,
    getMockPrediction(machineId)
  )
}

export async function fetchMaintenance(machineId?: string): Promise<MaintenanceTask[]> {
  if (machineId) {
    return fetchWithFallback(
      `${API_BASE}/maintenance?machine_id=${machineId}`,
      mockMaintenanceTasks.filter((t) => t.machineId === machineId)
    )
  }
  return fetchWithFallback(`${API_BASE}/maintenance`, mockMaintenanceTasks)
}

export async function fetchRedistribution(machineId: string): Promise<RedistributionInfo | null> {
  return fetchWithFallback(
    `${API_BASE}/redistribute?machine_id=${machineId}`,
    mockRedistributions[machineId] ?? null
  )
}
