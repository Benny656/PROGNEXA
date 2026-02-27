"use client"

import { useEffect, useState, useMemo } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchMaintenance } from "@/lib/api"
import type { MaintenanceTask, MachineType } from "@/lib/types"
import { cn } from "@/lib/utils"

type Priority = "Urgent" | "High" | "Medium" | "Low"

export function MaintenanceScheduler() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([])
  const [loading, setLoading] = useState(true)
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all")
  const [typeFilter, setTypeFilter] = useState<MachineType | "all">("all")

  useEffect(() => {
    fetchMaintenance().then((data) => {
      setTasks(data)
      setLoading(false)
    })
  }, [])

  const filteredTasks = useMemo(() => {
    return tasks
      .filter((t) => priorityFilter === "all" || t.priority === priorityFilter)
      .filter((t) => {
        if (typeFilter === "all") return true
        // infer type from machine name
        const name = t.machineName.toLowerCase()
        if (typeFilter === "Motor") return name.includes("motor")
        if (typeFilter === "Conveyor") return name.includes("conveyor")
        if (typeFilter === "Pump") return name.includes("pump")
        return true
      })
  }, [tasks, priorityFilter, typeFilter])

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
        <h2 className="text-lg font-semibold text-foreground">
          AI-Recommended Maintenance Schedule
        </h2>
        <div className="flex gap-3">
          <Select
            value={priorityFilter}
            onValueChange={(v) => setPriorityFilter(v as Priority | "all")}
          >
            <SelectTrigger className="w-32 bg-secondary border-border text-foreground">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border text-foreground">
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as MachineType | "all")}
          >
            <SelectTrigger className="w-32 bg-secondary border-border text-foreground">
              <SelectValue placeholder="Type" />
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
                  <TableHead className="text-muted-foreground">Recommended Action</TableHead>
                  <TableHead className="text-muted-foreground">Priority</TableHead>
                  <TableHead className="text-muted-foreground">Suggested Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTasks.map((task) => {
                  const isUrgent = task.priority === "Urgent"
                  return (
                    <TableRow
                      key={task.machineId}
                      className={cn(
                        "border-border",
                        isUrgent && "bg-risk-high/5"
                      )}
                    >
                      <TableCell className="font-mono text-sm text-foreground">
                        {task.machineId}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "font-medium",
                          isUrgent ? "text-risk-high" : "text-foreground"
                        )}
                      >
                        {task.machineName}
                      </TableCell>
                      <TableCell className="max-w-xs text-sm text-foreground">
                        {task.recommendedAction}
                      </TableCell>
                      <TableCell>
                        <PriorityBadge priority={task.priority} />
                      </TableCell>
                      <TableCell className="text-foreground">{task.suggestedDate}</TableCell>
                    </TableRow>
                  )
                })}
                {filteredTasks.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="py-8 text-center text-sm text-muted-foreground"
                    >
                      No tasks match the selected filters.
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

function PriorityBadge({ priority }: { priority: Priority }) {
  const styles = {
    Urgent: "bg-risk-high/15 text-risk-high",
    High: "bg-risk-high/10 text-risk-high",
    Medium: "bg-risk-medium/15 text-risk-medium",
    Low: "bg-risk-low/15 text-risk-low",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[priority]
      )}
    >
      {priority}
    </span>
  )
}
