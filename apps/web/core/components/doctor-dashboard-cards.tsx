"use client"

import * as React from "react"
import { 
  IconUsers, 
  IconClock, 
  IconCalendar, 
  IconFileText,
  IconTrendingUp,
  IconTrendingDown,
  IconVideo
} from "@tabler/icons-react"

import { Badge } from "@/core/components/ui/badge"
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card"

interface DoctorDashboardStats {
  totalPatients?: number
  pendingAppointments?: number
  todayConsultations?: number
  upcomingAppointments?: number
  totalConsultations?: number
  recentLabRequests?: number
}

export function DoctorDashboardCards({ stats }: { stats?: DoctorDashboardStats }) {
  const {
    totalPatients = 0,
    pendingAppointments = 0,
    todayConsultations = 0,
    upcomingAppointments = 0,
    totalConsultations = 0,
    recentLabRequests = 0,
  } = stats || {}

  return (
    <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Total Patients</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {totalPatients.toLocaleString()}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
              <IconUsers className="size-3" />
              Active
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Patients under your care <IconUsers className="size-4" />
          </div>
          <div className="text-muted-foreground">
            All registered patients
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Pending Appointments</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {pendingAppointments}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="bg-orange-500/10 text-orange-700 border-orange-500/20">
              <IconClock className="size-3" />
              Awaiting
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Require your attention <IconClock className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Review and confirm appointments
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Today&apos;s Consultations</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {todayConsultations}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
              <IconVideo className="size-3" />
              Scheduled
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Consultations today <IconVideo className="size-4" />
          </div>
          <div className="text-muted-foreground">
            Check your schedule
          </div>
        </CardFooter>
      </Card>

      <Card className="@container/card">
        <CardHeader>
          <CardDescription>Upcoming Appointments</CardDescription>
          <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
            {upcomingAppointments}
          </CardTitle>
          <CardAction>
            <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
              <IconCalendar className="size-3" />
              This Week
            </Badge>
          </CardAction>
        </CardHeader>
        <CardFooter className="flex-col items-start gap-1.5 text-sm">
          <div className="line-clamp-1 flex gap-2 font-medium">
            Scheduled this week <IconCalendar className="size-4" />
          </div>
          <div className="text-muted-foreground">
            View full schedule
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
