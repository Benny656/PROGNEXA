"use client"

import { cn } from "@/lib/utils"
import type { RiskLevel } from "@/lib/types"

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
        level === "Low" && "bg-risk-low/15 text-risk-low",
        level === "Medium" && "bg-risk-medium/15 text-risk-medium",
        level === "High" && "bg-risk-high/15 text-risk-high",
        className
      )}
    >
      {level}
    </span>
  )
}
