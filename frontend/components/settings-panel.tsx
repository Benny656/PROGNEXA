"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Settings,
  Bell,
  Server,
  RefreshCw,
  CheckCircle2,
  Zap,
  AlertTriangle,
  Info,
} from "lucide-react"

const DEFAULT_API = "https://brain-wave-hackathon-project-production.up.railway.app"

export function SettingsPanel() {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API)
  const [apiSaved, setApiSaved] = useState(false)
  const [apiStatus, setApiStatus] = useState<"idle" | "checking" | "online" | "offline">("idle")

  // Notification preferences
  const [notifyHighRisk, setNotifyHighRisk] = useState(true)
  const [notifyShutdown, setNotifyShutdown] = useState(true)
  const [notifyRedistribution, setNotifyRedistribution] = useState(true)
  const [notifyMediumRisk, setNotifyMediumRisk] = useState(false)

  // Display preferences
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState("30")
  const [showAnomalyScore, setShowAnomalyScore] = useState(true)
  const [compactMode, setCompactMode] = useState(false)

  // Risk thresholds
  const [highThreshold, setHighThreshold] = useState("0.6")
  const [mediumThreshold, setMediumThreshold] = useState("0.3")
  const [thresholdSaved, setThresholdSaved] = useState(false)

  const handleSaveApi = () => {
    setApiSaved(true)
    setTimeout(() => setApiSaved(false), 2000)
  }

  const handleTestConnection = async () => {
    setApiStatus("checking")
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(`${apiUrl}/health`, { signal: controller.signal })
      clearTimeout(timeout)
      setApiStatus(res.ok ? "online" : "offline")
    } catch {
      setApiStatus("offline")
    }
    setTimeout(() => setApiStatus("idle"), 3000)
  }

  const handleSaveThresholds = () => {
    setThresholdSaved(true)
    setTimeout(() => setThresholdSaved(false), 2000)
  }

  const handleResetDefaults = () => {
    setApiUrl(DEFAULT_API)
    setNotifyHighRisk(true)
    setNotifyShutdown(true)
    setNotifyRedistribution(true)
    setNotifyMediumRisk(false)
    setAutoRefresh(true)
    setRefreshInterval("30")
    setShowAnomalyScore(true)
    setCompactMode(false)
    setHighThreshold("0.6")
    setMediumThreshold("0.3")
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-xl font-bold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">Configure Prognexa to match your environment</p>
        </div>
      </div>

      {/* API Configuration */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Backend API</CardTitle>
          </div>
          <CardDescription className="text-xs">
            URL of your Flask backend deployed on Railway
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="api-url" className="text-xs text-muted-foreground">API Base URL</Label>
            <div className="flex gap-2">
              <Input
                id="api-url"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="bg-secondary border-border text-foreground text-sm font-mono"
                placeholder="https://your-backend.up.railway.app"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestConnection}
                disabled={apiStatus === "checking"}
                className="shrink-0"
              >
                {apiStatus === "checking" ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  "Test"
                )}
              </Button>
              <Button size="sm" onClick={handleSaveApi} className="shrink-0">
                {apiSaved ? <CheckCircle2 className="h-3.5 w-3.5" /> : "Save"}
              </Button>
            </div>
          </div>
          {apiStatus === "online" && (
            <div className="flex items-center gap-2 text-xs text-risk-low">
              <div className="h-2 w-2 rounded-full bg-risk-low" />
              Backend is reachable
            </div>
          )}
          {apiStatus === "offline" && (
            <div className="flex items-center gap-2 text-xs text-risk-high">
              <div className="h-2 w-2 rounded-full bg-risk-high" />
              Backend unreachable — falling back to mock data
            </div>
          )}
          <div className="flex items-start gap-2 rounded-md bg-secondary/50 p-3 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            If the backend is unreachable, Prognexa automatically uses built-in mock data so the dashboard always works.
          </div>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Alert Preferences</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Choose which events trigger dashboard alerts
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {[
            {
              id: "notify-high",
              label: "High Risk Alerts",
              desc: "Machine anomaly score exceeds 0.6",
              value: notifyHighRisk,
              set: setNotifyHighRisk,
              badge: "High",
              badgeColor: "destructive" as const,
            },
            {
              id: "notify-shutdown",
              label: "Machine Shutdown Events",
              desc: "Machine goes offline or is powered down",
              value: notifyShutdown,
              set: setNotifyShutdown,
              badge: "Shutdown",
              badgeColor: "destructive" as const,
            },
            {
              id: "notify-redistribution",
              label: "Workload Redistribution",
              desc: "Load automatically shifted to healthy machines",
              value: notifyRedistribution,
              set: setNotifyRedistribution,
              badge: "Auto",
              badgeColor: "secondary" as const,
            },
            {
              id: "notify-medium",
              label: "Medium Risk Alerts",
              desc: "Machine anomaly score between 0.3 and 0.6",
              value: notifyMediumRisk,
              set: setNotifyMediumRisk,
              badge: "Medium",
              badgeColor: "secondary" as const,
            },
          ].map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <Label htmlFor={item.id} className="text-sm text-foreground cursor-pointer">
                    {item.label}
                  </Label>
                  <Badge variant={item.badgeColor} className="text-[10px] px-1.5 py-0">
                    {item.badge}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <Switch
                id={item.id}
                checked={item.value}
                onCheckedChange={item.set}
                className="shrink-0"
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Display Preferences */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Display & Refresh</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="auto-refresh" className="text-sm text-foreground cursor-pointer">
                Auto-Refresh Dashboard
              </Label>
              <p className="text-xs text-muted-foreground">Automatically reload machine data</p>
            </div>
            <Switch id="auto-refresh" checked={autoRefresh} onCheckedChange={setAutoRefresh} />
          </div>
          {autoRefresh && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="refresh-interval" className="text-xs text-muted-foreground">
                Refresh Interval (seconds)
              </Label>
              <Input
                id="refresh-interval"
                type="number"
                min="10"
                max="300"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(e.target.value)}
                className="bg-secondary border-border text-foreground w-32"
              />
            </div>
          )}
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="show-score" className="text-sm text-foreground cursor-pointer">
                Show Anomaly Score
              </Label>
              <p className="text-xs text-muted-foreground">Display numeric score on machine cards</p>
            </div>
            <Switch id="show-score" checked={showAnomalyScore} onCheckedChange={setShowAnomalyScore} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="compact" className="text-sm text-foreground cursor-pointer">
                Compact Mode
              </Label>
              <p className="text-xs text-muted-foreground">Reduce card padding for more machines on screen</p>
            </div>
            <Switch id="compact" checked={compactMode} onCheckedChange={setCompactMode} />
          </div>
        </CardContent>
      </Card>

      {/* Risk Thresholds */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-semibold">Risk Thresholds</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Anomaly score boundaries that define risk levels (0.0 – 1.0)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="medium-threshold" className="text-xs text-muted-foreground">
                Low → Medium boundary
              </Label>
              <Input
                id="medium-threshold"
                type="number"
                min="0.1"
                max="0.5"
                step="0.05"
                value={mediumThreshold}
                onChange={(e) => setMediumThreshold(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
              <p className="text-[10px] text-muted-foreground">Default: 0.3</p>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="high-threshold" className="text-xs text-muted-foreground">
                Medium → High boundary
              </Label>
              <Input
                id="high-threshold"
                type="number"
                min="0.4"
                max="0.9"
                step="0.05"
                value={highThreshold}
                onChange={(e) => setHighThreshold(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
              <p className="text-[10px] text-muted-foreground">Default: 0.6</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSaveThresholds}>
              {thresholdSaved ? <><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Saved</> : "Save Thresholds"}
            </Button>
          </div>

          {/* Visual threshold legend */}
          <div className="flex flex-col gap-1.5 rounded-md bg-secondary/50 p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Current ranges</p>
            <div className="flex items-center gap-2 text-xs">
              <div className="h-2.5 w-2.5 rounded-full bg-risk-low" />
              <span className="text-foreground">Low: 0.0 – {mediumThreshold}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="h-2.5 w-2.5 rounded-full bg-risk-medium" />
              <span className="text-foreground">Medium: {mediumThreshold} – {highThreshold}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <div className="h-2.5 w-2.5 rounded-full bg-risk-high" />
              <span className="text-foreground">High: {highThreshold} – 1.0</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reset */}
      <div className="flex justify-end pb-4">
        <Button variant="outline" size="sm" onClick={handleResetDefaults} className="text-muted-foreground">
          Reset All to Defaults
        </Button>
      </div>
    </div>
  )
}
