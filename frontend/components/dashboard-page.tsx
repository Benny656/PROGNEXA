"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Cpu, AlertTriangle, ShieldAlert, ShieldCheck, ArrowRightLeft, Clock, PowerOff,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { RiskBadge } from "@/components/risk-badge"
import { fetchMachines, fetchRedistributionLog } from "@/lib/api"
import { mockAnomalyAlerts } from "@/lib/mock-data"
import type { Machine, AnomalyAlert, RedistributionEvent } from "@/lib/types"

interface DashboardPageProps {
  searchQuery: string
  onMachineSelect: (id: string) => void
}

export function DashboardPage({ searchQuery, onMachineSelect }: DashboardPageProps) {
  const [machines, setMachines] = useState<Machine[]>([])
  const [redistLog, setRedistLog] = useState<RedistributionEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchMachines(), fetchRedistributionLog()]).then(([ms, log]) => {
      setMachines(ms ?? [])
      setRedistLog(log ?? [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const filteredMachines = useMemo(() => {
    if (!searchQuery.trim()) return machines
    const q = searchQuery.toLowerCase()
    return machines.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q) ||
        m.riskLevel.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q)
    )
  }, [machines, searchQuery])

  const totalMachines = machines.length
  const highRisk      = machines.filter((m) => m.riskLevel === "High").length
  const mediumRisk    = machines.filter((m) => m.riskLevel === "Medium").length
  const offlineMachines = machines.filter((m) => m.riskLevel === "Offline" || m.isShutdown).length
  const okMachines    = machines.filter((m) => m.riskLevel === "Low").length

  // Show redistribution banners: from live log OR from high-risk machines
  const highRiskMachines = filteredMachines.filter((m) => m.riskLevel === "High")
  const offlineList      = filteredMachines.filter((m) => m.riskLevel === "Offline" || m.isShutdown)

  // Recent redistribution events (last 3)
  const recentEvents = redistLog.slice(0, 3)

  if (loading) return <DashboardSkeleton />

  return (
    <div className="flex flex-col gap-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard title="Total Machines" value={totalMachines}
          icon={<Cpu className="h-5 w-5 text-primary" />} accent="primary" />
        <SummaryCard title="High Risk" value={highRisk}
          icon={<ShieldAlert className="h-5 w-5 text-risk-high" />} accent="high" />
        <SummaryCard title="Medium Risk" value={mediumRisk}
          icon={<AlertTriangle className="h-5 w-5 text-risk-medium" />} accent="medium" />
        <SummaryCard title="Machines OK" value={okMachines}
          icon={<ShieldCheck className="h-5 w-5 text-risk-low" />} accent="low" />
      </div>

      {/* Offline machine banners */}
      {offlineList.map((m) => (
        <div key={m.id} className="flex items-start gap-3 rounded-lg border border-muted-foreground/20 bg-muted/20 p-4">
          <PowerOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-muted-foreground">Machine Offline: {m.name}</p>
            <p className="mt-1 text-muted-foreground/70">
              This machine is currently shut down. Its workload has been redistributed to healthy machines.
            </p>
          </div>
        </div>
      ))}

      {/* Live redistribution event banners */}
      {recentEvents.filter(e => e.reason === "shutdown" || e.reason === "high_risk").map((event, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg border border-risk-high/30 bg-risk-high/5 p-4">
          <ArrowRightLeft className="mt-0.5 h-5 w-5 shrink-0 text-risk-high" />
          <div className="flex-1 text-sm">
            <p className="font-medium text-risk-high">
              Auto Redistribution — {event.source_machine}
              {event.reason === "shutdown" ? " (Shutdown)" : " (High Risk)"}
            </p>
            {event.redistributed_to?.length > 0 && (
              <p className="mt-1 text-muted-foreground">
                Load absorbed by:{" "}
                {event.redistributed_to.map((a) => `${a.name} (+${a.load_added}%)`).join(", ")}
              </p>
            )}
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(event.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
      ))}

      {/* High-risk machines without a log entry yet */}
      {highRiskMachines
        .filter(m => !recentEvents.some(e => e.source_machine === m.name))
        .map((m) => (
          <div key={m.id} className="flex items-start gap-3 rounded-lg border border-risk-high/30 bg-risk-high/5 p-4">
            <ArrowRightLeft className="mt-0.5 h-5 w-5 shrink-0 text-risk-high" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-risk-high">High Risk Alert: {m.name}</p>
              <p className="mt-1 text-muted-foreground">
                Anomaly score {m.anomalyScore.toFixed(2)} — workload redistribution recommended.{" "}
                Predicted failure: {m.predictedFailureWindow}
              </p>
            </div>
          </div>
        ))}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Machine list */}
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Machine Fleet
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {filteredMachines.map((machine) => (
              <MachineCard key={machine.id} machine={machine} onClick={() => onMachineSelect(machine.id)} />
            ))}
            {filteredMachines.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted-foreground">
                No machines match your search.
              </p>
            )}
          </div>
        </div>

        {/* Anomaly alerts */}
        <div>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Real-time Anomaly Alerts
          </h2>
          <Card className="bg-card border-border">
            <ScrollArea className="h-[480px]">
              <div className="flex flex-col gap-2 p-4">
                {mockAnomalyAlerts.map((alert) => (
                  <AnomalyAlertCard
                    key={alert.machineId + alert.timestamp}
                    alert={alert}
                    onClick={() => onMachineSelect(alert.machineId)}
                  />
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ title, value, icon, accent }: {
  title: string; value: number; icon: React.ReactNode
  accent: "primary" | "high" | "medium" | "low"
}) {
  const borderColor = {
    primary: "border-primary/30", high: "border-risk-high/30",
    medium: "border-risk-medium/30", low: "border-risk-low/30",
  }[accent]
  return (
    <Card className={`bg-card border ${borderColor}`}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary">
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function MachineCard({ machine, onClick }: { machine: Machine; onClick: () => void }) {
  const isOffline = machine.riskLevel === "Offline" || machine.isShutdown
  return (
    <Card
      className={`bg-card border-border cursor-pointer transition-colors hover:border-primary/40 hover:bg-secondary/50 ${isOffline ? "opacity-60" : ""}`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">{machine.id}</p>
            <p className="mt-0.5 truncate font-medium text-foreground text-sm">{machine.name}</p>
          </div>
          <RiskBadge level={machine.riskLevel} />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Cpu className="h-3 w-3" />{machine.type}
          </span>
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />{machine.lastMaintenance}
          </span>
        </div>
        {!isOffline && machine.riskLevel !== "Low" && (
          <p className="mt-2 text-xs font-medium text-risk-high">
            Failure window: {machine.predictedFailureWindow}
          </p>
        )}
        {isOffline && (
          <p className="mt-2 text-xs font-medium text-muted-foreground flex items-center gap-1">
            <PowerOff className="h-3 w-3" /> Machine offline
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function AnomalyAlertCard({ alert, onClick }: { alert: AnomalyAlert; onClick: () => void }) {
  const timeAgo = getTimeAgo(alert.timestamp)
  return (
    <button
      onClick={onClick}
      className="flex w-full items-start gap-3 rounded-lg border border-border bg-secondary/50 p-3 text-left transition-colors hover:border-primary/40"
    >
      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
        alert.riskLevel === "High" ? "bg-risk-high" :
        alert.riskLevel === "Medium" ? "bg-risk-medium" : "bg-risk-low"
      }`} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{alert.machineName}</p>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Score: {alert.anomalyScore.toFixed(2)}</span>
          <span>{timeAgo}</span>
        </div>
      </div>
      <RiskBadge level={alert.riskLevel} />
    </button>
  )
}

function getTimeAgo(timestamp: string) {
  const diff = Date.now() - new Date(timestamp).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-card border-border">
            <CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
