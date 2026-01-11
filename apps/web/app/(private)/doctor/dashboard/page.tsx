"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconActivity,
  IconAlertTriangle,
  IconArrowRight,
  IconCalendar,
  IconClipboardCheck,
  IconClock,
  IconStethoscope,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { DoctorDashboardCards } from "@/core/components/doctor-dashboard-cards"
import { SectionCards } from "@/core/components/section-cards"
import { ChartAreaInteractive } from "@/core/components/chart-area-interactive"
import { RoleHeader } from "@/core/components/role-header"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { appointmentsApi } from "@/features/appointments/api/appointments-api"
import type { AppointmentRequest } from "@/services/api/types"
import { IconTrendingUp } from "@tabler/icons-react"

const formatAppointmentDate = (date?: string) => {
  if (!date) return "Date TBD"
  return new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  })
}

const formatAppointmentTime = (time?: string) => {
  if (!time) return "Time TBD"
  try {
    const [hours, minutes] = time.split(":").map(Number)
    const date = new Date()
    date.setHours(hours, minutes || 0, 0, 0)
    return date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    })
  } catch {
    return time
  }
}

const getPatientName = (patient?: AppointmentRequest["patient"]) => {
  const info = patient?.patientInfo
  if (!info) return patient?.email || "Unknown patient"
  const parts = [info.firstName, info.middleName, info.lastName].filter(Boolean)
  if (parts.length) return parts.join(" ")
  return info.fullName || patient?.email || "Unknown patient"
}

const statusBadgeClasses: Record<
  AppointmentRequest["status"],
  string
> = {
  PENDING:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  CONFIRMED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  REJECTED:
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  CANCELLED:
    "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400",
  RESCHEDULED:
    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
}

export default function DoctorDashboardPage() {
  const [appointments, setAppointments] = React.useState<AppointmentRequest[]>([])
  const [isLoadingAppointments, setIsLoadingAppointments] = React.useState(true)
  const [stats, setStats] = React.useState({
    totalPatients: 0,
    pendingAppointments: 0,
    todayConsultations: 0,
    upcomingAppointments: 0,
    totalConsultations: 0,
    recentLabRequests: 0,
  })

  React.useEffect(() => {
    const loadDashboard = async () => {
      try {
        setIsLoadingAppointments(true)
        const response = await appointmentsApi.getMyAppointments({ limit: 50 })

        if (response.success && response.data) {
          const data = [...response.data].sort((a, b) => {
            const dateA = new Date(a.requestedDate).getTime()
            const dateB = new Date(b.requestedDate).getTime()
            return dateA - dateB
          })

          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const endOfToday = new Date(today)
          endOfToday.setHours(23, 59, 59, 999)

          const nextWeek = new Date(today)
          nextWeek.setDate(nextWeek.getDate() + 7)

          const pendingAppointments = data.filter(
            (apt) => apt.status === "PENDING"
          )
          const confirmedAppointments = data.filter(
            (apt) => apt.status === "CONFIRMED"
          )
          const todayConsultations = confirmedAppointments.filter((apt) => {
            const scheduled = new Date(apt.requestedDate)
            return scheduled >= today && scheduled <= endOfToday
          })
          const upcomingAppointments = confirmedAppointments.filter((apt) => {
            const scheduled = new Date(apt.requestedDate)
            return scheduled >= today && scheduled <= nextWeek
          })

          setStats({
            totalPatients: new Set(data.map((apt) => apt.patientId)).size,
            pendingAppointments: pendingAppointments.length,
            todayConsultations: todayConsultations.length,
            upcomingAppointments: upcomingAppointments.length,
            totalConsultations: data.filter((apt) => apt.consultation).length,
            recentLabRequests: 0,
          })

          setAppointments(data)
        } else {
          toast.error(response.message || "Unable to load doctor dashboard")
        }
      } catch (error) {
        console.error("Failed to load doctor dashboard", error)
        toast.error("Failed to load doctor dashboard")
      } finally {
        setIsLoadingAppointments(false)
      }
    }

    loadDashboard()
  }, [])

  const todaysSchedule = React.useMemo(() => {
    if (!appointments.length) return []

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const endOfDay = new Date(today)
    endOfDay.setHours(23, 59, 59, 999)

    return appointments
      .filter((apt) => {
        if (apt.status !== "CONFIRMED") return false
        const scheduled = new Date(apt.requestedDate)
        return scheduled >= today && scheduled <= endOfDay
      })
      .slice(0, 5)
  }, [appointments])

  const awaitingConfirmation = React.useMemo(() => {
    return appointments.filter((apt) => apt.status === "PENDING").slice(0, 4)
  }, [appointments])

  const activePatients = React.useMemo(() => {
    const map = new Map<
      string,
      { name: string; lastInteraction: string; reason?: string }
    >()

    appointments.forEach((apt) => {
      if (map.has(apt.patientId)) return

      map.set(apt.patientId, {
        name: getPatientName(apt.patient),
        lastInteraction: formatAppointmentDate(apt.requestedDate),
        reason: apt.reason,
      })
    })

    return Array.from(map.values()).slice(0, 3)
  }, [appointments])

  const confirmationRate = React.useMemo(() => {
    if (!appointments.length) return null
    const confirmed = appointments.filter((apt) => apt.status === "CONFIRMED")
    return Math.round((confirmed.length / appointments.length) * 100)
  }, [appointments])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarWrapper role="doctor" variant="inset" />
      <SidebarInset>
        <RoleHeader
          title="Doctor Operations Hub"
          description="Monitor appointments, focus on patients, and stay ahead of priorities."
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Dashboard-01 style metric cards */}
              <SectionCards
                cards={[
                  {
                    title: "Total Patients",
                    value: stats.totalPatients.toString(),
                    trend: {
                      value: `${stats.totalPatients || 0} total`,
                      direction: "up",
                    },
                    footer: {
                      label: `${stats.totalPatients || 0} unique patients`,
                      description: "Patients with recent interactions",
                    },
                  },
                  {
                    title: "Pending Approvals",
                    value: stats.pendingAppointments.toString(),
                    trend: {
                      value: stats.pendingAppointments > 5 ? "High" : "Normal",
                      direction: stats.pendingAppointments > 5 ? "up" : "up",
                    },
                    footer: {
                      label: `${stats.pendingAppointments} awaiting confirmation`,
                      description: "Review pending requests",
                    },
                  },
                  {
                    title: "Today's Consultations",
                    value: stats.todayConsultations.toString(),
                    trend: {
                      value: "Scheduled",
                      direction: "up",
                    },
                    footer: {
                      label: `${stats.todayConsultations} consultations today`,
                      description: "Video calls and appointments",
                    },
                  },
                  {
                    title: "Confirmation Rate",
                    value: confirmationRate !== null ? `${confirmationRate}%` : "—",
                    trend: {
                      value: confirmationRate !== null && confirmationRate > 80 ? "Excellent" : "Good",
                      direction: "up",
                    },
                    footer: {
                      label: confirmationRate !== null ? `${confirmationRate}% confirmed` : "No data",
                      description: "Ratio of confirmed vs. total requests",
                    },
                  },
                ]}
              />
              
              {/* Legacy dashboard cards - keep for additional info */}
              <DoctorDashboardCards stats={stats} />
              
              {/* Chart section - dashboard-01 style */}
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>

              <div className="grid gap-6 px-4 lg:px-6 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <div>
                      <CardTitle>Today&apos;s telehealth schedule</CardTitle>
                      <CardDescription>
                        Join video consults and keep the day on track
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/doctor/meet-patients">
                        Launch studio
                        <IconArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {isLoadingAppointments ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                    ) : todaysSchedule.length ? (
                      todaysSchedule.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="rounded-lg border px-4 py-3 transition hover:border-primary/50 hover:bg-muted/40"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold">
                                {getPatientName(appointment.patient)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {appointment.reason || "Virtual consultation"}
                              </p>
                            </div>
                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20">
                              <IconVideo className="mr-1 size-3.5" />
                              Video
                            </Badge>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <IconCalendar className="size-3.5" />
                              {formatAppointmentDate(appointment.requestedDate)}
                            </span>
                            <span className="flex items-center gap-1">
                              <IconClock className="size-3.5" />
                              {formatAppointmentTime(appointment.requestedTime)}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No confirmed consultations scheduled for today.
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="justify-between text-xs text-muted-foreground">
                    <span>
                      Keep audio/video ready 5 minutes ahead of every consult.
                    </span>
                    <Link href="/doctor/schedule" className="font-medium hover:underline">
                      View full schedule
                    </Link>
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick actions</CardTitle>
                    <CardDescription>
                      Jump straight into the most common workflows
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/doctor/schedule">
                        <IconCalendar className="mr-2 size-4" />
                        Manage availability
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/doctor/patient-records">
                        <IconClipboardCheck className="mr-2 size-4" />
                        Review patient files
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/doctor/lab-requests">
                        <IconStethoscope className="mr-2 size-4" />
                        Approve lab requests
                      </Link>
                    </Button>
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <Link href="/doctor/notifications">
                        <IconUsers className="mr-2 size-4" />
                        Broadcast updates
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 px-4 lg:px-6 xl:grid-cols-3">
                <Card className="xl:col-span-2">
                  <CardHeader className="flex flex-row items-center justify-between gap-2">
                    <div>
                      <CardTitle>Awaiting confirmation</CardTitle>
                      <CardDescription>
                        Review pending requests before patients lose momentum
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href="/doctor/lab-requests">
                        View queue
                        <IconArrowRight className="ml-1.5 size-4" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isLoadingAppointments ? (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    ) : awaitingConfirmation.length ? (
                      awaitingConfirmation.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3"
                        >
                          <div>
                            <p className="text-sm font-medium">
                              {getPatientName(appointment.patient)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatAppointmentDate(appointment.requestedDate)} ·{" "}
                              {formatAppointmentTime(appointment.requestedTime)}
                            </p>
                            {appointment.reason && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {appointment.reason}
                              </p>
                            )}
                          </div>
                          <Badge className={statusBadgeClasses[appointment.status]}>
                            {appointment.status.toLowerCase()}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        You&apos;re all caught up—no pending approvals.
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="text-xs text-muted-foreground">
                    Confirming within 30 minutes keeps patient satisfaction high.
                  </CardFooter>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Practice signals</CardTitle>
                    <CardDescription>
                      High-level indicators updated live
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border bg-muted/30 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Confirmation rate
                      </p>
                      <p className="text-3xl font-semibold">
                        {confirmationRate !== null ? `${confirmationRate}%` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Ratio of confirmed vs. total requests this week
                      </p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300">
                          <IconActivity className="size-4" />
                          Wait time trend
                        </div>
                        <span className="text-xs text-emerald-700 dark:text-emerald-300">
                          ↓ steady
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-blue-500/10 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 font-medium text-blue-900 dark:text-blue-200">
                          <IconUsers className="size-4" />
                          Active patients
                        </div>
                        <span className="text-xs text-blue-900 dark:text-blue-100">
                          {stats.totalPatients || "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between rounded-lg bg-orange-500/10 px-3 py-2 text-sm">
                        <div className="flex items-center gap-2 font-medium text-orange-900 dark:text-orange-200">
                          <IconAlertTriangle className="size-4" />
                          Escalations
                        </div>
                        <span className="text-xs text-orange-900 dark:text-orange-100">
                          {stats.pendingAppointments > 5 ? "Review queue" : "Stable"}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent patient touchpoints</CardTitle>
                    <CardDescription>
                      Quick context before you jump back into their chart
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    {isLoadingAppointments ? (
                      <>
                        <Skeleton className="h-24 rounded-lg" />
                        <Skeleton className="h-24 rounded-lg" />
                      </>
                    ) : activePatients.length ? (
                      activePatients.map((patient) => (
                        <div
                          key={patient.name}
                          className="rounded-xl border bg-muted/20 p-4"
                        >
                          <p className="text-sm font-semibold">{patient.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Last seen {patient.lastInteraction}
                          </p>
                          {patient.reason && (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {patient.reason}
                            </p>
                          )}
                          <div className="mt-3 flex items-center gap-2 text-xs">
                            <IconClipboardCheck className="size-3.5 text-muted-foreground" />
                            Chart ready in records
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="col-span-2 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        Patient insights will appear once appointments start flowing in.
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}


