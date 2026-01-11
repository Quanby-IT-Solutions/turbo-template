"use client"

import {
  IconActivity,
  IconCalendarEvent,
  IconChecklist,
  IconHeartbeat,
} from "@tabler/icons-react"

import { Card, CardContent } from "@/core/components/ui/card"

export interface PatientDashboardStats {
  upcomingAppointments?: number
  pendingRequests?: number
  completedVisits?: number
  careTasksDue?: number
}

export function PatientDashboardCards({
  stats,
}: {
  stats?: PatientDashboardStats
}) {
  const {
    upcomingAppointments = 0,
    pendingRequests = 0,
    completedVisits = 0,
    careTasksDue = 0,
  } = stats || {}

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
      <MetricCard
        label="Upcoming sessions"
        value={upcomingAppointments}
        icon={IconCalendarEvent}
        helper="Confirmed video calls in the next 7 days"
      />
      <MetricCard
        label="Pending requests"
        value={pendingRequests}
        icon={IconChecklist}
        helper="Awaiting doctor confirmation"
      />
      <MetricCard
        label="Completed sessions"
        value={completedVisits}
        icon={IconHeartbeat}
        helper="Telehealth calls marked as done"
      />
      <MetricCard
        label="Face scan tasks"
        value={careTasksDue}
        icon={IconActivity}
        helper="Daily BioSense face-scan checks pending"
      />
    </div>
  )
}

function MetricCard({
  label,
  value,
  icon: Icon,
  helper,
}: {
  label: string
  value: number
  icon: typeof IconActivity
  helper: string
}) {
  return (
    <Card className="border-muted bg-card/70 backdrop-blur-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{helper}</p>
        </div>
        <span className="rounded-full bg-primary/10 p-3 text-primary">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  )
}
