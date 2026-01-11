"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/core/components/ui/sidebar"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Badge } from "@/core/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/core/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { authApi } from "@/features/auth/api/auth-api"
import { doctorsApi } from "@/features/doctors/api/doctors-api"
import { appointmentsApi } from "@/features/appointments/api/appointments-api"
import type { Doctor } from "@/services/api/types"
import type { AppointmentRequest } from "@/services/api/types"
import {
  IconDownload,
  IconRefresh,
  IconReportAnalytics,
  IconActivity,
  IconUsers,
  IconCalendar,
  IconAlertTriangle,
  IconChartBar,
} from "@tabler/icons-react"

const reportDefinitions = [
  {
    title: "Doctor Performance",
    description: "Appointments handled, cancellations, reschedules, average response times.",
    tags: ["appointments", "doctors"],
  },
  {
    title: "Patient Utilization",
    description: "Active patients, visit frequency, completion rates by department or doctor.",
    tags: ["patients", "usage"],
  },
  {
    title: "Subscription & Capacity",
    description: "Doctors vs plan limits, patient load per doctor, face-scan usage (if applicable).",
    tags: ["subscription", "capacity"],
  },
  {
    title: "Financial (Placeholder)",
    description: "Billing, invoices, payouts. (Add once financial data is available.)",
    tags: ["finance", "placeholder"],
  },
  {
    title: "Audit & Access",
    description: "User logins, role changes, approvals/rejections, sensitive data access.",
    tags: ["audit", "security"],
  },
]

export default function OrganizationReportsPage() {
  const [loading, setLoading] = React.useState(false)
  const [appointments, setAppointments] = React.useState<AppointmentRequest[]>([])
  const [appointmentsLoading, setAppointmentsLoading] = React.useState(false)
  const [doctors, setDoctors] = React.useState<Doctor[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = React.useState<string>("all")
  const [activeTab, setActiveTab] = React.useState<"org" | "doctor">("org")

  const stats = React.useMemo(() => {
    const total = appointments.length
    const pending = appointments.filter((a) => a.status?.toUpperCase() === "PENDING").length
    const confirmed = appointments.filter((a) => {
      const s = a.status?.toUpperCase()
      return s === "CONFIRMED" || s === "ACCEPTED"
    }).length
    const cancelled = appointments.filter((a) => {
      const s = a.status?.toUpperCase()
      return s === "CANCELLED" || s === "REJECTED"
    }).length
    const rescheduled = appointments.filter((a) => a.status?.toUpperCase() === "RESCHEDULED").length
    const noShow = appointments.filter((a) => a.status?.toUpperCase() === "NO_SHOW" || a.status?.toUpperCase() === "NO-SHOW").length

    const recent7d = appointments.filter((a) => {
      if (!a.requestedDate) return false
      const d = new Date(a.requestedDate)
      const now = new Date()
      const diff = now.getTime() - d.getTime()
      return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
    }).length

    const totalActions = total
    const escalations = cancelled + rescheduled + noShow

    return {
      total,
      pending,
      confirmed,
      cancelled,
      rescheduled,
      noShow,
      recent7d,
      totalActions,
      escalations,
    }
  }, [appointments])

  const performance = React.useMemo(() => {
    const total = stats.total || 1
    return [
      { label: "Completed", value: Math.round((stats.confirmed / total) * 100), color: "bg-emerald-500" },
      { label: "Cancelled", value: Math.round((stats.cancelled / total) * 100), color: "bg-amber-500" },
      { label: "Rescheduled", value: Math.round((stats.rescheduled / total) * 100), color: "bg-blue-500" },
      { label: "No-shows", value: Math.round((stats.noShow / total) * 100), color: "bg-rose-500" },
    ]
  }, [stats])

  const appointmentTrend = React.useMemo(() => {
    // Last 4 weeks trend
    const now = new Date()
    const weeks: { label: string; key: string }[] = []
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i * 7)
      const day = d.getDay()
      const monday = new Date(d)
      const diff = (day + 6) % 7
      monday.setDate(d.getDate() - diff)
      const key = monday.toISOString().split("T")[0]
      const label = monday.toLocaleDateString("en-US", { month: "short", day: "numeric" })
      weeks.push({ key, label })
    }

    const map = new Map<string, number>()
    weeks.forEach((w) => map.set(w.key, 0))
    appointments.forEach((a) => {
      if (!a.requestedDate) return
      const d = new Date(a.requestedDate)
      const day = d.getDay()
      const monday = new Date(d)
      const diff = (day + 6) % 7
      monday.setDate(d.getDate() - diff)
      const key = monday.toISOString().split("T")[0]
      if (map.has(key)) {
        map.set(key, (map.get(key) || 0) + 1)
      }
    })

    return weeks.map((w) => ({ week: w.label, value: map.get(w.key) || 0 }))
  }, [appointments])

  React.useEffect(() => {
    const load = async () => {
      try {
        const profile = await authApi.getProfile()
        const orgData = profile.data as { organizationId?: string | null; organization?: { id?: string | null } | null } | undefined
        const orgId = orgData?.organizationId || orgData?.organization?.id
        const res = await doctorsApi.listDoctors({ limit: 200, organizationId: orgId || undefined })
        if (res.success && res.data) {
          setDoctors(res.data.items || [])
        }
      } catch (error) {
        console.error("Failed to load doctors", error)
      }
    }
    load()
  }, [])

  React.useEffect(() => {
    const loadAppointments = async () => {
      setAppointmentsLoading(true)
      try {
        const res = await appointmentsApi.getOrganizationAppointments()
        if (res.success && res.data) {
          setAppointments(res.data)
        } else {
          console.error("Failed to load appointments", res.message)
        }
      } catch (error) {
        console.error("Failed to load appointments", error)
      } finally {
        setAppointmentsLoading(false)
      }
    }
    loadAppointments()
  }, [])

  // Placeholder until wired to backend
  const handleGenerate = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800) // placeholder
  }
  const handleGenerateDoctor = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800) // placeholder per doctor
  }

  const dataLoading = appointmentsLoading

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarWrapper role="organization" variant="inset" />
      <SidebarInset>
        <RoleHeader
          title="Reports"
          description="Generate and review organization-wide insights."
        />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-background shadow-sm ring-1 ring-border/60">
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">Doctor actions</CardTitle>
                <IconActivity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-semibold">
                  {dataLoading ? <Skeleton className="h-6 w-16" /> : stats.totalActions}
                </div>
                <p className="text-xs text-muted-foreground">Appointments updated, statuses changed</p>
              </CardContent>
            </Card>
            <Card className="bg-background shadow-sm ring-1 ring-border/60">
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">Schedules (7d)</CardTitle>
                <IconCalendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-semibold">
                  {dataLoading ? <Skeleton className="h-6 w-16" /> : stats.recent7d}
                </div>
                <p className="text-xs text-muted-foreground">New or updated slots</p>
              </CardContent>
            </Card>
            <Card className="bg-background shadow-sm ring-1 ring-border/60">
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pending appointments</CardTitle>
                <IconUsers className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-semibold">
                  {dataLoading ? <Skeleton className="h-6 w-16" /> : stats.pending}
                </div>
                <p className="text-xs text-muted-foreground">Awaiting doctor action</p>
              </CardContent>
            </Card>
            <Card className="bg-background shadow-sm ring-1 ring-border/60">
              <CardHeader className="flex items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">Escalations</CardTitle>
                <IconAlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-3xl font-semibold">
                  {dataLoading ? <Skeleton className="h-6 w-16" /> : stats.escalations}
                </div>
                <p className="text-xs text-muted-foreground">Reschedules or repeated cancellations</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <IconChartBar className="h-5 w-5 text-primary" />
                <div>
                  <CardTitle>Performance breakdown</CardTitle>
                  <p className="text-sm text-muted-foreground">Completion vs cancellations vs reschedules</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-[2fr,1fr]">
              <div className="space-y-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between rounded-lg border bg-muted/50 p-3">
                  <div>
                    <p className="text-sm font-semibold">Filter by doctor</p>
                    <p className="text-xs text-muted-foreground">Generate per-doctor insights</p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                      <SelectTrigger className="w-56">
                        <SelectValue placeholder="Select doctor" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All doctors</SelectItem>
                        {doctors.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.doctorInfo?.firstName} {d.doctorInfo?.lastName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={handleGenerateDoctor} disabled={loading}>
                      <IconDownload className="mr-2 h-4 w-4" />
                      {loading ? "Preparing..." : "Generate"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3 rounded-lg border bg-background p-4 shadow-sm">
                  <div className="h-12 w-full overflow-hidden rounded-full bg-muted">
                    <div className="flex h-full w-full">
                      {performance.map((p) => (
                        <div
                          key={p.label}
                          className={`${p.color} h-full`}
                          style={{ width: `${p.value}%` }}
                          title={`${p.label}: ${p.value}%`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {performance.map((p) => (
                      <div key={p.label} className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
                        <span className={`h-3 w-3 rounded-full ${p.color}`} />
                        <div>
                          <div className="font-medium">{p.value}%</div>
                          <div className="text-xs text-muted-foreground">{p.label}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 rounded-lg border bg-background p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-muted-foreground">Weekly appointment trend</p>
                </div>
                <div className="flex items-end gap-2">
                  {appointmentTrend.map((w) => (
                    <div key={w.week} className="flex flex-1 flex-col items-center gap-1">
                      <div
                        className="w-full rounded-md bg-primary/10"
                        style={{ height: `${w.value * 3}px` }}
                      >
                        <div
                          className="h-full w-full rounded-md bg-primary"
                          style={{ height: "100%" }}
                          title={`${w.week}: ${w.value}`}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{w.week}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <IconReportAnalytics className="h-5 w-5 text-primary" />
                <CardTitle>Available reports</CardTitle>
              </div>
              <Button variant="outline" size="icon" onClick={() => setLoading(true)}>
                <IconRefresh className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "org" | "doctor")} className="w-full">
                <TabsList className="w-full justify-start gap-2 px-2">
                  <TabsTrigger value="org">Organization</TabsTrigger>
                  <TabsTrigger value="doctor">Per doctor</TabsTrigger>
                </TabsList>
                <TabsContent value="org">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Report</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Tags</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportDefinitions.map((report) => (
                        <TableRow key={report.title}>
                          <TableCell className="font-semibold">{report.title}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{report.description}</TableCell>
                          <TableCell className="space-x-1">
                            {report.tags.map((t) => (
                              <Badge key={t} variant="outline" className="text-xs">
                                {t}
                              </Badge>
                            ))}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={handleGenerate}
                              disabled={loading}
                            >
                              <IconDownload className="mr-2 h-4 w-4" />
                              {loading ? "Preparing..." : "Generate"}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TabsContent>
                <TabsContent value="doctor">
                  <div className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold">Select doctor</p>
                          <p className="text-xs text-muted-foreground">Generate appointment report for a specific doctor</p>
                        </div>
                        <div className="flex gap-2">
                          <Select value={selectedDoctorId} onValueChange={setSelectedDoctorId}>
                            <SelectTrigger className="w-56">
                              <SelectValue placeholder="Select doctor" />
                            </SelectTrigger>
                            <SelectContent>
                              {doctors.map((d) => (
                                <SelectItem key={d.id} value={d.id}>
                                  {d.doctorInfo?.firstName} {d.doctorInfo?.lastName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleGenerateDoctor}
                            disabled={loading || selectedDoctorId === "all"}
                          >
                            <IconDownload className="mr-2 h-4 w-4" />
                            {loading ? "Preparing..." : "Generate"}
                          </Button>
                        </div>
                      </div>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {doctors.map((d) => (
                            <TableRow key={d.id}>
                              <TableCell className="font-semibold">
                                {d.doctorInfo?.firstName} {d.doctorInfo?.lastName}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{d.email}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={handleGenerateDoctor}
                                  disabled={loading}
                                >
                                  <IconDownload className="mr-2 h-4 w-4" />
                                  {loading ? "Preparing..." : "Generate"}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
              {loading && (
                <div className="p-4">
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="mt-2 h-3 w-1/4" />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

