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
  RedistributionEvent,
} from "./types"

export const API_BASE = "https://brain-wave-hackathon-project-production.up.railway.app"

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

// ── Normalise backend machine response → frontend Machine shape ──
// Backend uses machine_id (int e.g. 1), frontend uses id (string e.g. "M-001")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normaliseMachine(raw: any, index: number): Machine {
  // Support both backend format (machine_id) and mock format (id)
  const rawId = raw.id ?? raw.machine_id
  const id = rawId !== undefined
    ? String(rawId).startsWith("M-")
      ? String(rawId)
      : `M-${String(rawId).padStart(3, "0")}`
    : `M-${String(index + 1).padStart(3, "0")}`

  return {
    id,
    name: raw.name ?? raw.machine_name ?? `Machine ${id}`,
    type: raw.type ?? raw.machine_type ?? "Motor",
    riskLevel: raw.riskLevel ?? raw.risk_level ?? "Low",
    anomalyScore: raw.anomalyScore ?? raw.anomaly_score ?? 0,
    lastMaintenance: raw.lastMaintenance ?? raw.last_maintenance ?? "N/A",
    predictedFailureWindow: raw.predictedFailureWindow ?? raw.predicted_failure_window ?? "N/A",
    location: raw.location ?? { row: Math.floor(index / 4), col: index % 4 },
    isShutdown: raw.isShutdown ?? raw.is_shutdown ?? false,
    currentLoad: raw.currentLoad ?? raw.current_load ?? 50,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalisePrediction(raw: any, machineId: string): Prediction {
  const rawMid = raw.machineId ?? raw.machine_id ?? machineId
  const id = String(rawMid).startsWith("M-")
    ? String(rawMid)
    : `M-${String(rawMid).padStart(3, "0")}`

  return {
    machineId: id,
    anomalyScore: raw.anomalyScore ?? raw.anomaly_score ?? 0,
    riskLevel: raw.riskLevel ?? raw.risk_level ?? "Low",
    predictedFailureWindow: raw.predictedFailureWindow ?? raw.predicted_failure_window ?? "N/A",
    contributingSensors: raw.contributingSensors ?? raw.contributing_sensors ?? [],
  }
}

export async function fetchMachines(): Promise<Machine[]> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${API_BASE}/machines`, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) throw new Error("API error")
    const data = await res.json()
    if (Array.isArray(data) && data.length > 0) {
      return data.map(normaliseMachine)
    }
    throw new Error("Empty response")
  } catch {
    return mockMachines
  }
}

export async function fetchSensorData(machineId: string): Promise<SensorReading[]> {
  // Convert "M-001" → "1" for backend
  const numericId = machineId.replace("M-", "").replace(/^0+/, "") || "1"
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${API_BASE}/sensors?machine_id=${numericId}`, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) throw new Error("API error")
    const data = await res.json()
    // Backend wraps in { readings: [...] }, handle both formats
    const readings = Array.isArray(data) ? data : (data.readings ?? [])
    if (readings.length > 0) return readings
    throw new Error("Empty")
  } catch {
    return getMockSensorData(machineId)
  }
}

export async function fetchPrediction(machineId: string): Promise<Prediction> {
  const numericId = machineId.replace("M-", "").replace(/^0+/, "") || "1"
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)
    const res = await fetch(`${API_BASE}/predictions?machine_id=${numericId}`, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) throw new Error("API error")
    const data = await res.json()
    return normalisePrediction(data, machineId)
  } catch {
    return getMockPrediction(machineId)
  }
}

export async function fetchMaintenance(machineId?: string): Promise<MaintenanceTask[]> {
  if (machineId) {
    const numericId = machineId.replace("M-", "").replace(/^0+/, "") || "1"
    return fetchWithFallback(
      `${API_BASE}/maintenance?machine_id=${numericId}`,
      mockMaintenanceTasks.filter((t) => t.machineId === machineId)
    )
  }
  return fetchWithFallback(`${API_BASE}/maintenance`, mockMaintenanceTasks)
}

export async function fetchRedistribution(machineId: string): Promise<RedistributionInfo | null> {
  const numericId = machineId.replace("M-", "").replace(/^0+/, "") || "1"
  return fetchWithFallback(
    `${API_BASE}/redistribute?machine_id=${numericId}`,
    mockRedistributions[machineId] ?? null
  )
}

export async function shutdownMachine(machineId: string): Promise<RedistributionEvent | null> {
  const numericId = Number(machineId.replace("M-", "").replace(/^0+/, "") || "1")
  try {
    const res = await fetch(`${API_BASE}/shutdown`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machine_id: numericId }),
    })
    if (!res.ok) throw new Error("Shutdown failed")
    return await res.json()
  } catch {
    const machine = mockMachines.find((m) => m.id === machineId)
    const healthy = mockMachines.filter(
      (m) => m.id !== machineId && m.riskLevel === "Low"
    ).slice(0, 2)
    return {
      status: "Workload successfully redistributed",
      reason: "shutdown",
      source_machine_id: machineId,
      source_machine: machine?.name ?? machineId,
      load_redistributed: 50,
      timestamp: new Date().toISOString(),
      redistributed_to: healthy.map((m) => ({
        machine_id: m.id,
        name: m.name,
        load_before: 50,
        load_added: 25,
        load_after: 75,
      })),
    }
  }
}

export async function restoreMachine(machineId: string): Promise<{ message: string } | null> {
  const numericId = Number(machineId.replace("M-", "").replace(/^0+/, "") || "1")
  try {
    const res = await fetch(`${API_BASE}/restore`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ machine_id: numericId }),
    })
    if (!res.ok) throw new Error("Restore failed")
    return await res.json()
  } catch {
    const machine = mockMachines.find((m) => m.id === machineId)
    return { message: `${machine?.name ?? machineId} is back online. Load reset to 50%.` }
  }
}

export async function fetchRedistributionLog(): Promise<RedistributionEvent[]> {
  return fetchWithFallback(`${API_BASE}/redistribution-log`, [])
}
