"use client"

import { useState, useMemo, useCallback } from "react"
import { useSession, signOut } from "next-auth/react"
import {
  LayoutDashboard, Cpu, AlertTriangle, Calendar,
  Settings, Search, Menu, X, Map, Zap, Power, LogOut,
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { DashboardPage } from "@/components/dashboard-page"
import { MachineDetailView } from "@/components/machine-detail-view"
import { AnomalyPanel } from "@/components/anomaly-panel"
import { PlantFloorMap } from "@/components/plant-floor-map"
import { MaintenanceScheduler } from "@/components/maintenance-scheduler"
import { SettingsPanel } from "@/components/settings-panel"
import { ShutdownPanel } from "@/components/shutdown-panel"
import Image from "next/image"

type NavItem =
  | "dashboard" | "machines" | "anomalies"
  | "floor-map" | "maintenance" | "shutdown" | "settings"

const navItems = [
  { id: "dashboard"   as NavItem, label: "Dashboard",          icon: LayoutDashboard },
  { id: "machines"    as NavItem, label: "Machine Overview",   icon: Cpu },
  { id: "anomalies"   as NavItem, label: "Anomaly Panel",      icon: AlertTriangle },
  { id: "floor-map"   as NavItem, label: "Plant Floor Map",    icon: Map },
  { id: "maintenance" as NavItem, label: "Maintenance Schedule", icon: Calendar },
  { id: "shutdown"    as NavItem, label: "Shutdown Control",   icon: Power },
  { id: "settings"    as NavItem, label: "Settings",           icon: Settings },
]

export default function AppShell() {
  const { data: session } = useSession()
  const [activeNav, setActiveNav] = useState<NavItem>("dashboard")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedMachineId, setSelectedMachineId] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleMachineSelect = useCallback((machineId: string) => {
    setSelectedMachineId(machineId)
    setActiveNav("machines")
  }, [])

  const handleBackToDashboard = useCallback(() => {
    setSelectedMachineId(null)
    setActiveNav("dashboard")
  }, [])

  const handleNavClick = useCallback((id: NavItem) => {
    setActiveNav(id)
    setSelectedMachineId(null)
    setSidebarOpen(false)
  }, [])

  const mainContent = useMemo(() => {
    if (activeNav === "machines" && selectedMachineId) {
      return <MachineDetailView machineId={selectedMachineId} onBack={handleBackToDashboard} />
    }
    switch (activeNav) {
      case "dashboard":   return <DashboardPage searchQuery={searchQuery} onMachineSelect={handleMachineSelect} />
      case "machines":    return <DashboardPage searchQuery={searchQuery} onMachineSelect={handleMachineSelect} />
      case "anomalies":   return <AnomalyPanel onMachineSelect={handleMachineSelect} />
      case "floor-map":   return <PlantFloorMap onMachineSelect={handleMachineSelect} />
      case "maintenance": return <MaintenanceScheduler />
      case "shutdown":    return <ShutdownPanel onMachineSelect={handleMachineSelect} />
      case "settings":    return <SettingsPanel />
      default:            return null
    }
  }, [activeNav, selectedMachineId, searchQuery, handleMachineSelect, handleBackToDashboard])

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-[#0a0f1c]/80 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-sidebar border-r border-border transition-transform duration-200 lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Zap className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-foreground">Prognexa</span>
          <Button variant="ghost" size="icon" className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          <ul className="flex flex-col gap-1">
            {navItems.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => handleNavClick(item.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                    activeNav === item.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User profile + sign out */}
        <div className="border-t border-border p-4 flex flex-col gap-3">
          {session?.user && (
            <div className="flex items-center gap-3">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name ?? "User"}
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {session.user.name?.[0] ?? "U"}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{session.user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{session.user.email}</p>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-risk-low animate-pulse" />
              System Online
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-card px-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {navItems.find((n) => n.id === activeNav)?.label ?? "Dashboard"}
            </span>
          </div>
          <div className="relative ml-auto flex w-full max-w-sm items-center">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search machines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-risk-low animate-pulse" />
            <span className="hidden sm:inline">Live</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{mainContent}</main>
      </div>
    </div>
  )
}
