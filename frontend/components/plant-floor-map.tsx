"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RiskBadge } from "@/components/risk-badge"
import { fetchMachines } from "@/lib/api"
import type { Machine } from "@/lib/types"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface PlantFloorMapProps {
  onMachineSelect: (id: string) => void
}

// Fallback grid positions in case location is missing from API response
const FALLBACK_LOCATIONS: Record<string, { row: number; col: number }> = {
  "M-001": { row: 0, col: 0 },
  "M-002": { row: 0, col: 1 },
  "M-003": { row: 0, col: 2 },
  "M-004": { row: 0, col: 3 },
  "M-005": { row: 1, col: 0 },
  "M-006": { row: 1, col: 1 },
  "M-007": { row: 1, col: 2 },
  "M-008": { row: 1, col: 3 },
  "M-009": { row: 2, col: 0 },
  "M-010": { row: 2, col: 1 },
  "M-011": { row: 2, col: 2 },
  "M-012": { row: 2, col: 3 },
}

function getLocation(machine: Machine, index: number): { row: number; col: number } {
  // If location exists and is valid, use it
  if (machine.location && typeof machine.location.row === "number") {
    return machine.location
  }
  // Try fallback map by ID
  if (FALLBACK_LOCATIONS[machine.id]) {
    return FALLBACK_LOCATIONS[machine.id]
  }
  // Last resort: auto-assign by index in a 4-column grid
  return { row: Math.floor(index / 4), col: index % 4 }
}

export function PlantFloorMap({ onMachineSelect }: PlantFloorMapProps) {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchMachines()
      .then((data) => {
        setMachines(data ?? [])
        setLoading(false)
      })
      .catch(() => {
        setError("Failed to load machines.")
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        {error}
      </div>
    )
  }

  if (!machines || machines.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        No machines found.
      </div>
    )
  }

  // Build grid using safe location resolution
  const rows = 3
  const cols = 4
  const grid: (Machine | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  )

  machines.forEach((m, index) => {
    try {
      const loc = getLocation(m, index)
      if (loc.row < rows && loc.col < cols) {
        grid[loc.row][loc.col] = m
      }
    } catch {
      // skip if placement fails
    }
  })

  // Any machines that didn't fit in the grid (overflow)
  const gridMachineIds = new Set(grid.flat().filter(Boolean).map((m) => m!.id))
  const overflowMachines = machines.filter((m) => !gridMachineIds.has(m.id))

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-foreground">Plant Floor Map</h2>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Plant Layout — Zone Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={0}>
              <div
                className="grid gap-3 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(130px, 1fr))`,
                  maxWidth: "720px",
                }}
              >
                {grid.flat().map((machine, index) => {
                  if (!machine) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30"
                      >
                        <span className="text-xs text-muted-foreground">Empty</span>
                      </div>
                    )
                  }

                  return <MachineCell key={machine.id} machine={machine} onSelect={onMachineSelect} />
                })}
              </div>

              {/* Overflow machines that didn't fit the grid */}
              {overflowMachines.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2 text-center">Additional Machines</p>
                  <div
                    className="grid gap-3 mx-auto"
                    style={{
                      gridTemplateColumns: `repeat(${cols}, minmax(130px, 1fr))`,
                      maxWidth: "720px",
                    }}
                  >
                    {overflowMachines.map((machine) => (
                      <MachineCell key={machine.id} machine={machine} onSelect={onMachineSelect} />
                    ))}
                  </div>
                </div>
              )}
            </TooltipProvider>
          </div>

          {/* Legend */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-risk-low" />
              <span>Low Risk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-risk-medium" />
              <span>Medium Risk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-risk-high animate-pulse" />
              <span>High Risk</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded-full bg-muted-foreground/40" />
              <span>Offline</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function MachineCell({
  machine,
  onSelect,
}: {
  machine: Machine
  onSelect: (id: string) => void
}) {
  const isOffline = machine.isShutdown || machine.riskLevel === "Offline"

  const borderColor = isOffline
    ? "border-muted-foreground/30"
    : machine.riskLevel === "High"
    ? "border-risk-high"
    : machine.riskLevel === "Medium"
    ? "border-risk-medium"
    : "border-risk-low"

  const glowColor =
    !isOffline && machine.riskLevel === "High"
      ? "shadow-[0_0_12px_rgba(239,68,68,0.25)]"
      : !isOffline && machine.riskLevel === "Medium"
      ? "shadow-[0_0_12px_rgba(234,179,8,0.2)]"
      : ""

  const indicatorColor = isOffline
    ? "bg-muted-foreground/40"
    : machine.riskLevel === "High"
    ? "bg-risk-high"
    : machine.riskLevel === "Medium"
    ? "bg-risk-medium"
    : "bg-risk-low"

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={() => onSelect(machine.id)}
          className={`relative flex h-28 flex-col items-center justify-center gap-1.5 rounded-lg border-2 ${borderColor} ${glowColor} ${
            isOffline ? "bg-secondary/20 opacity-60" : "bg-secondary/50"
          } px-2 transition-all hover:bg-secondary hover:scale-[1.02] cursor-pointer`}
        >
          <div
            className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ${indicatorColor} ${
              !isOffline && machine.riskLevel === "High" ? "animate-pulse" : ""
            }`}
          />
          <span className="text-[10px] font-mono text-muted-foreground">{machine.id}</span>
          <span className="text-xs font-medium text-foreground text-center leading-tight line-clamp-2">
            {machine.name}
          </span>
          <span className="text-[10px] text-muted-foreground">{machine.type}</span>
          {isOffline && (
            <span className="text-[9px] text-muted-foreground/60 font-medium uppercase tracking-wide">
              Offline
            </span>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="bg-card border-border text-foreground">
        <div className="flex flex-col gap-1.5 p-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{machine.name}</span>
            <RiskBadge level={machine.riskLevel} />
          </div>
          <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
            <span>
              Anomaly Score:{" "}
              <span className="font-semibold text-foreground">
                {machine.anomalyScore.toFixed(2)}
              </span>
            </span>
            <span>
              Failure Window:{" "}
              <span className="text-foreground">{machine.predictedFailureWindow}</span>
            </span>
            {machine.currentLoad !== undefined && (
              <span>
                Current Load:{" "}
                <span className="text-foreground">{machine.currentLoad}%</span>
              </span>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
