"use client"

import { useEffect, useState, useCallback } from "react"
import { Power, PowerOff, ArrowRightLeft, Clock, RefreshCw, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchMachines, shutdownMachine, restoreMachine, fetchRedistributionLog } from "@/lib/api"
import type { Machine, RedistributionEvent } from "@/lib/types"

interface ShutdownPanelProps {
  onMachineSelect: (id: string) => void
}

export function ShutdownPanel({ onMachineSelect }: ShutdownPanelProps) {
  const [machines, setMachines] = useState<Machine[]>([])
  const [loading, setLoading] = useState(true)
  const [log, setLog] = useState<RedistributionEvent[]>([])
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [shutdownSet, setShutdownSet] = useState<Set<string>>(new Set())
  const [lastEvent, setLastEvent] = useState<RedistributionEvent | null>(null)

  const loadData = useCallback(async () => {
    const [ms, events] = await Promise.all([fetchMachines(), fetchRedistributionLog()])
    setMachines(ms)
    setLog(events)
    setLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleShutdown = async (machine: Machine) => {
    setProcessingId(machine.id)
    const event = await shutdownMachine(machine.id)
    setShutdownSet((prev) => new Set(prev).add(machine.id))
    if (event) {
      setLastEvent(event)
      setLog((prev) => [event, ...prev])
    }
    setProcessingId(null)
  }

  const handleRestore = async (machine: Machine) => {
    setProcessingId(machine.id)
    await restoreMachine(machine.id)
    setShutdownSet((prev) => {
      const next = new Set(prev)
      next.delete(machine.id)
      return next
    })
    const restoredEvent: RedistributionEvent = {
      status: "Machine restored",
      reason: "restore",
      source_machine_id: machine.id,
      source_machine: machine.name,
      load_redistributed: 0,
      redistributed_to: [],
      timestamp: new Date().toISOString(),
      message: `${machine.name} is back online`,
    }
    setLog((prev) => [restoredEvent, ...prev])
    setLastEvent(null)
    setProcessingId(null)
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Power className="h-6 w-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Shutdown Control</h1>
            <p className="text-sm text-muted-foreground">
              Take machines offline — load is automatically redistributed to healthy neighbours
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={loadData}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
      </div>

      {/* Last redistribution event banner */}
      {lastEvent && (
        <div className="flex items-start gap-3 rounded-lg border border-risk-high/30 bg-risk-high/5 p-4">
          <ArrowRightLeft className="mt-0.5 h-5 w-5 shrink-0 text-risk-high" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-risk-high">
              Auto-Redistribution: {lastEvent.source_machine}
            </p>
            <p className="mt-1 text-muted-foreground">
              {lastEvent.redistributed_to.length > 0
                ? `Load absorbed by: ${lastEvent.redistributed_to
                    .map((m) => `${m.name} (+${m.load_added}%)`)
                    .join(", ")}`
                : "No available machines found to absorb load."}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(lastEvent.timestamp).toLocaleTimeString()}
            </p>
          </div>
          <button onClick={() => setLastEvent(null)} className="text-muted-foreground hover:text-foreground text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Machine grid */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Machine Fleet
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {machines.map((machine) => {
            const isDown = shutdownSet.has(machine.id) || machine.isShutdown
            const isProcessing = processingId === machine.id

            return (
              <Card
                key={machine.id}
                className={`bg-card border transition-all ${
                  isDown ? "border-muted opacity-70" : "border-border"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{machine.id}</p>
                      <p className="mt-0.5 truncate font-medium text-foreground text-sm">
                        {machine.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{machine.type}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {isDown ? (
                        <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground">
                          Offline
                        </Badge>
                      ) : (
                        <Badge
                          variant={
                            machine.riskLevel === "High"
                              ? "destructive"
                              : machine.riskLevel === "Medium"
                              ? "outline"
                              : "secondary"
                          }
                          className="text-[10px]"
                        >
                          {machine.riskLevel}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      className="text-xs text-muted-foreground hover:text-primary underline-offset-2 hover:underline"
                      onClick={() => onMachineSelect(machine.id)}
                    >
                      View details
                    </button>
                    {isDown ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-risk-low border-risk-low/30 hover:bg-risk-low/10"
                        disabled={isProcessing}
                        onClick={() => handleRestore(machine)}
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <><Power className="h-3 w-3 mr-1" /> Restore</>
                        )}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs text-risk-high border-risk-high/30 hover:bg-risk-high/10"
                        disabled={isProcessing}
                        onClick={() => handleShutdown(machine)}
                      >
                        {isProcessing ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : (
                          <><PowerOff className="h-3 w-3 mr-1" /> Shutdown</>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Redistribution log */}
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Redistribution History
        </h2>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Recent shutdown and redistribution events
            </CardTitle>
          </CardHeader>
          <ScrollArea className="h-72">
            <div className="flex flex-col gap-2 p-4 pt-0">
              {log.length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">
                  No events yet. Shut down a machine to see redistribution in action.
                </p>
              )}
              {log.map((event, i) => (
                <div
                  key={i}
                  className="rounded-md border border-border bg-secondary/40 p-3 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {event.reason === "shutdown" ? (
                        <PowerOff className="h-3 w-3 text-risk-high" />
                      ) : event.reason === "restore" ? (
                        <Power className="h-3 w-3 text-risk-low" />
                      ) : (
                        <AlertTriangle className="h-3 w-3 text-risk-medium" />
                      )}
                      <span className="font-medium text-foreground">{event.source_machine}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{event.status}</p>
                  {event.redistributed_to && event.redistributed_to.length > 0 && (
                    <p className="mt-1 text-muted-foreground">
                      → {event.redistributed_to.map((m) => `${m.name} (+${m.load_added}%)`).join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  )
}
