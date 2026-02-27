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

export function PlantFloorMap({ onMachineSelect }: PlantFloorMapProps) {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMachines().then((data) => {
      setMachines(data)
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

  // Build a grid: 3 rows x 4 cols based on machine locations
  const rows = 3
  const cols = 4
  const grid: (Machine | null)[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => null)
  )
  machines.forEach((m) => {
    if (m.location.row < rows && m.location.col < cols) {
      grid[m.location.row][m.location.col] = m
    }
  })

  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-lg font-semibold text-foreground">Plant Floor Map</h2>

      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Plant Layout - Zone Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <TooltipProvider delayDuration={0}>
              <div
                className="grid gap-3 mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${cols}, minmax(140px, 1fr))`,
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

                  const borderColor =
                    machine.riskLevel === "High"
                      ? "border-risk-high"
                      : machine.riskLevel === "Medium"
                      ? "border-risk-medium"
                      : "border-risk-low"

                  const glowColor =
                    machine.riskLevel === "High"
                      ? "shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                      : machine.riskLevel === "Medium"
                      ? "shadow-[0_0_12px_rgba(234,179,8,0.2)]"
                      : ""

                  const indicatorColor =
                    machine.riskLevel === "High"
                      ? "bg-risk-high"
                      : machine.riskLevel === "Medium"
                      ? "bg-risk-medium"
                      : "bg-risk-low"

                  return (
                    <Tooltip key={machine.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onMachineSelect(machine.id)}
                          className={`relative flex h-28 flex-col items-center justify-center gap-1.5 rounded-lg border-2 ${borderColor} ${glowColor} bg-secondary/50 px-2 transition-all hover:bg-secondary hover:scale-[1.02] cursor-pointer`}
                        >
                          <div
                            className={`absolute right-2 top-2 h-2.5 w-2.5 rounded-full ${indicatorColor} ${
                              machine.riskLevel === "High" ? "animate-pulse" : ""
                            }`}
                          />
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {machine.id}
                          </span>
                          <span className="text-xs font-medium text-foreground text-center leading-tight line-clamp-2">
                            {machine.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {machine.type}
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="bg-card border-border text-foreground"
                      >
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
                              <span className="text-foreground">
                                {machine.predictedFailureWindow}
                              </span>
                            </span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  )
                })}
              </div>
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
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
