"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { RiskBadge } from "@/components/risk-badge"
import { fetchMachines, fetchPrediction } from "@/lib/api"
import type { Machine, Prediction, RiskLevel, MachineType } from "@/lib/types"

interface AnomalyPanelProps {
  onMachineSelect: (id: string) => void
}

export function AnomalyPanel({ onMachineSelect }: AnomalyPanelProps) {
  const [machines, setMachines] = useState<Machine[]>([])
  const [predictions, setPredictions] = useState<Record<string, Prediction>>({})
  const [loading, setLoading] = useState(true)
  const [riskFilter, setRiskFilter] = useState<RiskLevel | "all">("all")
  const [typeFilter, setTypeFilter] = useState<MachineType | "all">("all")

  useEffect(() => {
    fetchMachines().then(async (data) => {
      setMachines(data ?? [])
      // Fetch predictions for all flagged + offline machines
      const flagged = data.filter(
        (m) => m.riskLevel === "High" || m.riskLevel === "Medium" || m.riskLevel === "Offline"
      )
      const preds: Record<string, Prediction> = {}
      await Promise.all(
        flagged.map(async (m) => {
          const p = await fetchPrediction(m.id)
          preds[m.id] = p
        })
      )
      setPredictions(preds)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const flaggedMachines = useMemo(() => {
    return machines
      .filter((m) => m.riskLevel === "High" || m.riskLevel === "Medium" || m.riskLevel === "Offline")
      .filter((m) => riskFilter === "all" || m.riskLevel === riskFilter)
      .filter((m) => typeFilter === "all" || m.type === typeFilter)
      .sort((a, b) => {
        // High first, then Offline, then Medium
        const order: Record<string, number> = { High: 0, Offline: 1, Medium: 2, Low: 3 }
        return (order[a.riskLevel] ?? 3) - (order[b.riskLevel] ?? 3)
      })
  }, [machines, riskFilter, typeFilter])

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-foreground">Anomaly & Prediction Panel</h2>
        <div className="flex gap-3">
          <Select value={riskFilter} onValueChange={(v) => setRiskFilter(v as RiskLevel | "all")}>
            <SelectTrigger className="w-36 bg-secondary border-border text-foreground">
              <SelectValue placeholder="Risk Level" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="all">All Risk Levels</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Offline">Offline</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as MachineType | "all")}>
            <SelectTrigger className="w-32 bg-secondary border-border text-foreground">
              <SelectValue placeholder="Machine Type" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Motor">Motor</SelectItem>
              <SelectItem value="Conveyor">Conveyor</SelectItem>
              <SelectItem value="Pump">Pump</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="bg-card border-border">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-secondary/50">
                  <TableHead className="text-muted-foreground">Machine ID</TableHead>
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Anomaly Score</TableHead>
                  <TableHead className="text-muted-foreground">Risk Level</TableHead>
                  <TableHead className="text-muted-foreground">Failure Window</TableHead>
                  <TableHead className="text-muted-foreground">Top Sensor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flaggedMachines.map((machine) => {
                  const pred = predictions[machine.id]
                  const topSensor = pred?.contributingSensors?.[0]?.name ?? "N/A"
                  const isOffline = machine.riskLevel === "Offline"
                  return (
                    <TableRow
                      key={machine.id}
                      className={`cursor-pointer border-border hover:bg-secondary/50 ${isOffline ? "opacity-60" : ""}`}
                      onClick={() => onMachineSelect(machine.id)}
                    >
                      <TableCell className="font-mono text-sm text-foreground">{machine.id}</TableCell>
                      <TableCell className="font-medium text-foreground">{machine.name}</TableCell>
                      <TableCell>
                        <span className={`font-semibold ${
                          isOffline ? "text-muted-foreground" :
                          machine.anomalyScore > 0.7 ? "text-risk-high" : "text-risk-medium"
                        }`}>
                          {isOffline ? "—" : machine.anomalyScore.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell><RiskBadge level={machine.riskLevel} /></TableCell>
                      <TableCell className="text-foreground">
                        {isOffline ? "Offline" : machine.predictedFailureWindow}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {isOffline ? "—" : topSensor}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {flaggedMachines.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                      No machines match the selected filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
