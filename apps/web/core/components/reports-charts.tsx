"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card"
import type { ChartConfig } from "@/core/components/ui/chart"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/core/components/ui/chart"

// QHealth color palette - medical/healthcare theme
const qhealthColors = {
  primary: "#0ea5e9", // sky-500
  secondary: "#06b6d4", // cyan-500
  success: "#10b981", // emerald-500
  warning: "#f59e0b", // amber-500
  danger: "#ef4444", // red-500
  info: "#8b5cf6", // violet-500
  light: "#f1f5f9", // slate-100
  dark: "#1e293b", // slate-800
}

interface ReportData {
  totalAppointments?: number
  completedAppointments?: number
  cancelledAppointments?: number
  pendingAppointments?: number
  totalUsers?: number
  newUsers?: number
  totalConsultations?: number
  period?: {
    startDate: string
    endDate: string
  }
}

// Appointments Status Pie Chart
export function AppointmentsStatusChart({ reportData }: { reportData: ReportData }) {
  const data = [
    {
      name: "Completed",
      value: reportData.completedAppointments || 0,
      color: qhealthColors.success,
    },
    {
      name: "Pending",
      value: reportData.pendingAppointments || 0,
      color: qhealthColors.warning,
    },
    {
      name: "Cancelled",
      value: reportData.cancelledAppointments || 0,
      color: qhealthColors.danger,
    },
  ].filter(item => item.value > 0)

  const chartConfig = {
    completed: {
      label: "Completed",
      color: qhealthColors.success,
    },
    pending: {
      label: "Pending",
      color: qhealthColors.warning,
    },
    cancelled: {
      label: "Cancelled",
      color: qhealthColors.danger,
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800">
          Appointment Status Distribution
        </CardTitle>
        <CardDescription>
          Breakdown of appointment statuses for the selected period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[300px]">
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={60}
              strokeWidth={5}
              stroke={qhealthColors.light}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// User Activity Bar Chart
export function UserActivityChart({ reportData }: { reportData: ReportData }) {
  const data = [
    {
      category: "Total Users",
      count: reportData.totalUsers || 0,
      color: qhealthColors.primary,
    },
    {
      category: "New Users",
      count: reportData.newUsers || 0,
      color: qhealthColors.secondary,
    },
  ]

  const chartConfig = {
    count: {
      label: "Users",
      color: qhealthColors.primary,
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800">
          User Activity Overview
        </CardTitle>
        <CardDescription>
          Total registered users and new registrations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={qhealthColors.light} />
            <XAxis
              dataKey="category"
              tick={{ fill: qhealthColors.dark, fontSize: 12 }}
              axisLine={{ stroke: qhealthColors.light }}
            />
            <YAxis
              tick={{ fill: qhealthColors.dark, fontSize: 12 }}
              axisLine={{ stroke: qhealthColors.light }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{ fill: qhealthColors.light }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// Consultations Trend Area Chart
export function ConsultationsTrendChart({ reportData }: { reportData: ReportData }) {
  // Generate sample trend data based on total consultations
  // In a real implementation, this would come from historical data
  const totalConsultations = reportData.totalConsultations || 0
  const data = [
    { date: "Week 1", consultations: Math.floor(totalConsultations * 0.2) },
    { date: "Week 2", consultations: Math.floor(totalConsultations * 0.25) },
    { date: "Week 3", consultations: Math.floor(totalConsultations * 0.3) },
    { date: "Week 4", consultations: Math.floor(totalConsultations * 0.25) },
  ]

  const chartConfig = {
    consultations: {
      label: "Consultations",
      color: qhealthColors.info,
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800">
          Consultation Trends
        </CardTitle>
        <CardDescription>
          Weekly consultation activity over the reporting period
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={qhealthColors.light} />
            <XAxis
              dataKey="date"
              tick={{ fill: qhealthColors.dark, fontSize: 12 }}
              axisLine={{ stroke: qhealthColors.light }}
            />
            <YAxis
              tick={{ fill: qhealthColors.dark, fontSize: 12 }}
              axisLine={{ stroke: qhealthColors.light }}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{ stroke: qhealthColors.primary, strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="consultations"
              stroke={qhealthColors.info}
              fill={qhealthColors.info}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// Appointments vs Consultations Comparison Chart
export function AppointmentsVsConsultationsChart({ reportData }: { reportData: ReportData }) {
  const data = [
    {
      category: "Appointments",
      value: reportData.totalAppointments || 0,
      color: qhealthColors.primary,
    },
    {
      category: "Consultations",
      value: reportData.totalConsultations || 0,
      color: qhealthColors.secondary,
    },
  ]

  const chartConfig = {
    value: {
      label: "Count",
      color: qhealthColors.primary,
    },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800">
          Appointments vs Consultations
        </CardTitle>
        <CardDescription>
          Comparison of scheduled appointments and completed consultations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={data} layout="horizontal">
            <CartesianGrid strokeDasharray="3 3" stroke={qhealthColors.light} />
            <XAxis
              type="number"
              tick={{ fill: qhealthColors.dark, fontSize: 12 }}
              axisLine={{ stroke: qhealthColors.light }}
            />
            <YAxis
              dataKey="category"
              type="category"
              tick={{ fill: qhealthColors.dark, fontSize: 12 }}
              axisLine={{ stroke: qhealthColors.light }}
              width={100}
            />
            <ChartTooltip
              content={<ChartTooltipContent />}
              cursor={{ fill: qhealthColors.light }}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// Main Reports Charts Component
export function ReportsCharts({ reportData }: { reportData: ReportData }) {
  if (!reportData) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No report data available</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <AppointmentsStatusChart reportData={reportData} />
      <UserActivityChart reportData={reportData} />
      <ConsultationsTrendChart reportData={reportData} />
      <AppointmentsVsConsultationsChart reportData={reportData} />
    </div>
  )
}
