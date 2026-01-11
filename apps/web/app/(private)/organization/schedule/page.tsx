"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/core/components/ui/sidebar"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import { appointmentsApi } from "@/features/appointments/api/appointments-api"
import type { AppointmentRequest } from "@/services/api/types"
import { IconRefresh, IconChevronLeft, IconChevronRight } from "@tabler/icons-react"
import { toast } from "sonner"

const formatDate = (dateString: string) => {
  if (!dateString) return "—"
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

const formatTime = (timeString?: string | null) => {
  if (!timeString) return "—"
  const [h, m] = timeString.split(":")
  const hour = parseInt(h || "0", 10)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${m || "00"} ${ampm}`
}

const statusBadge = (status?: string) => {
  if (!status) return <Badge variant="outline">Unknown</Badge>
  const s = status.toUpperCase()
  if (s === "CONFIRMED" || s === "ACCEPTED") return <Badge className="bg-green-100 text-green-700" variant="outline">Confirmed</Badge>
  if (s === "PENDING") return <Badge className="bg-amber-100 text-amber-700" variant="outline">Pending</Badge>
  if (s === "REJECTED" || s === "CANCELLED") return <Badge className="bg-red-100 text-red-700" variant="outline">Cancelled</Badge>
  return <Badge variant="outline">{status}</Badge>
}

const getPatientName = (appt: AppointmentRequest) => {
  const info = appt.patient?.patientInfo
  if (!info) return "—"
  const fullName = (info as { fullName?: string }).fullName
  if (fullName) return fullName
  return `${info.firstName || ""} ${info.middleName || ""} ${info.lastName || ""}`.trim() || "—"
}

const getDoctorName = (appt: AppointmentRequest) => {
  const info = appt.doctor?.doctorInfo
  if (!info) return "—"
  return `${info.firstName || ""} ${info.lastName || ""}`.trim() || "—"
}

export default function OrganizationSchedulePage() {
  const [appointments, setAppointments] = React.useState<AppointmentRequest[]>([])
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [monthCursor, setMonthCursor] = React.useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const loadAppointments = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await appointmentsApi.getOrganizationAppointments()
      if (res.success && res.data) {
        setAppointments(res.data)
      } else {
        toast.error(res.message || "Failed to load schedules")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load schedules")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  const filtered = React.useMemo(() => {
    if (!search) return appointments
    const q = search.toLowerCase()
    return appointments.filter((a) =>
      getDoctorName(a).toLowerCase().includes(q) ||
      getPatientName(a).toLowerCase().includes(q) ||
      (a.reason || "").toLowerCase().includes(q) ||
      (a.status || "").toLowerCase().includes(q)
    )
  }, [appointments, search])

  const appointmentsByDate = React.useMemo(() => {
    const map = new Map<string, AppointmentRequest[]>()
    appointments.forEach((a) => {
      const key = a.requestedDate ? new Date(a.requestedDate).toISOString().split("T")[0] : ""
      if (!key) return
      if (!map.has(key)) map.set(key, [])
      map.get(key)?.push(a)
    })
    return map
  }, [appointments])

  const calendarDays = React.useMemo(() => {
    const year = monthCursor.getFullYear()
    const month = monthCursor.getMonth()
    const startOfMonth = new Date(year, month, 1)
    const endOfMonth = new Date(year, month + 1, 0)
    const startDay = startOfMonth.getDay() // 0-6 Sunday start
    const totalDays = endOfMonth.getDate()

    const days: Array<{ date: Date; label: number; inMonth: boolean; count: number }> = []

    // prev month padding
    for (let i = 0; i < startDay; i++) {
      const d = new Date(year, month, -startDay + i + 1)
      const iso = d.toISOString().split("T")[0]
      days.push({ date: d, label: d.getDate(), inMonth: false, count: appointmentsByDate.get(iso)?.length || 0 })
    }
    // current month
    for (let d = 1; d <= totalDays; d++) {
      const curr = new Date(year, month, d)
      const iso = curr.toISOString().split("T")[0]
      days.push({ date: curr, label: d, inMonth: true, count: appointmentsByDate.get(iso)?.length || 0 })
    }
    // pad to full weeks (multiple of 7)
    while (days.length % 7 !== 0) {
      const last = days[days.length - 1].date
      const next = new Date(last)
      next.setDate(last.getDate() + 1)
      const iso = next.toISOString().split("T")[0]
      days.push({ date: next, label: next.getDate(), inMonth: false, count: appointmentsByDate.get(iso)?.length || 0 })
    }
    return days
  }, [monthCursor, appointmentsByDate])

  const prevMonth = () => {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
  }
  const nextMonth = () => {
    setMonthCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
  }

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
          title="Schedule Management"
          description="All appointments across your organization's doctors"
        />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle>Calendar</CardTitle>
                <p className="text-sm text-muted-foreground">Monthly view of all doctor appointments</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevMonth} aria-label="Previous month">
                  <IconChevronLeft className="h-4 w-4" />
                </Button>
                <div className="min-w-[140px] text-center text-sm font-medium">
                  {monthCursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </div>
                <Button variant="outline" size="icon" onClick={nextMonth} aria-label="Next month">
                  <IconChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 text-xs font-semibold text-muted-foreground">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="px-2 py-1 text-center">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, idx) => (
                  <div
                    key={`${day.date.toISOString()}-${idx}`}
                    className={`rounded-md border px-2 py-2 min-h-[78px] flex flex-col gap-1 ${
                      day.inMonth ? "bg-background" : "bg-muted/40 text-muted-foreground"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span>{day.label}</span>
                      {day.count > 0 && (
                        <span className="text-[10px] rounded-full bg-primary/10 px-2 py-0.5 text-primary font-semibold">
                          {day.count}
                        </span>
                      )}
                    </div>
                    {day.count > 0 && (
                      <div className="space-y-1">
                        {(appointmentsByDate.get(day.date.toISOString().split("T")[0]) || []).slice(0, 2).map((appt) => (
                          <div key={appt.id} className="rounded bg-muted/60 px-2 py-1 text-[11px] leading-tight">
                            <div className="font-semibold">{getDoctorName(appt)}</div>
                            <div className="text-muted-foreground">{formatTime(appt.requestedTime)}</div>
                          </div>
                        ))}
                        {day.count > 2 && (
                          <div className="text-[11px] text-muted-foreground">+{day.count - 2} more</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>All doctor schedules</CardTitle>
                <p className="text-sm text-muted-foreground">View requests and confirmed appointments across the organization.</p>
              </div>
              <div className="flex flex-col gap-2 md:flex-row md:items-center">
                <Input
                  placeholder="Search by doctor, patient, status, reason"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full md:w-80"
                />
                <Button variant="outline" size="icon" onClick={loadAppointments}>
                  <IconRefresh className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground">No schedules found.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((appt) => (
                      <TableRow key={appt.id}>
                        <TableCell className="font-medium">
                          {getDoctorName(appt)}
                          <div className="text-xs text-muted-foreground">{appt.doctor?.doctorInfo?.specialization || "—"}</div>
                        </TableCell>
                        <TableCell>{getPatientName(appt)}</TableCell>
                        <TableCell>{formatDate(appt.requestedDate)}</TableCell>
                        <TableCell>{formatTime(appt.requestedTime)}</TableCell>
                        <TableCell>{statusBadge(appt.status)}</TableCell>
                        <TableCell className="max-w-xs truncate" title={appt.reason || ""}>
                          {appt.reason || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

