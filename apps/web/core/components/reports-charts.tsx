"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
  CartesianGrid,
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
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
  Users,
  Calendar,
  Stethoscope,
  FlaskConical,
  Pill,
  HeartPulse,
  Activity,
  FileText,
  BarChart3,
} from "lucide-react"
import type { HealthcareAnalytics } from "@/services/api/reports"

// QHealth color palette - medical/healthcare theme
const qhealthColors = {
  primary: "#0ea5e9", // sky-500
  secondary: "#06b6d4", // cyan-500
  success: "#10b981", // emerald-500
  warning: "#f59e0b", // amber-500
  danger: "#ef4444", // red-500
  info: "#8b5cf6", // violet-500
  purple: "#a855f7", // purple-500
  pink: "#ec4899", // pink-500
  light: "#f1f5f9", // slate-100
  dark: "#1e293b", // slate-800
}

// ============================================================================
// PATIENT REGISTRATIONS CHARTS
// ============================================================================

export function PatientRegistrationsChart({ data }: { data: HealthcareAnalytics["patientRegistrations"] }) {
  if (!data) return null

  const pieData = [
    { name: "Verified", value: data.verifiedPatients, color: qhealthColors.success },
    { name: "Pending", value: data.pendingVerification, color: qhealthColors.warning },
    { name: "Other", value: Math.max(0, data.totalPatients - data.verifiedPatients - data.pendingVerification), color: qhealthColors.light },
  ].filter(item => item.value > 0)

  const chartConfig = {
    verified: { label: "Verified", color: qhealthColors.success },
    pending: { label: "Pending", color: qhealthColors.warning },
  } satisfies ChartConfig

  return (
    <Card className="border-l-4 border-l-emerald-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            <CardTitle className="text-lg font-semibold text-slate-800">
              Patient Registrations
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            +{data.newPatients} new
          </Badge>
        </div>
        <CardDescription>
          Patient verification status distribution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ChartContainer config={chartConfig} className="aspect-square max-h-[200px] flex-1">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                strokeWidth={4}
                stroke={qhealthColors.light}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ChartContainer>
          <div className="space-y-3">
            <div className="text-center">
              <div className="text-3xl font-bold text-emerald-700">{data.totalPatients}</div>
              <div className="text-xs text-slate-600">Total Patients</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(data.bySubscriptionTier || {}).slice(0, 4).map(([tier, count]) => (
                <div key={tier} className="text-center p-2 bg-slate-50 rounded">
                  <div className="font-semibold text-slate-700">{count}</div>
                  <div className="text-xs text-slate-500">{tier}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function PatientRegistrationsTrendChart({ data }: { data: HealthcareAnalytics["patientRegistrations"] }) {
  if (!data?.registrationTrend?.length) return null

  const chartConfig = {
    count: { label: "Registrations", color: qhealthColors.success },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800">
          Registration Trend
        </CardTitle>
        <CardDescription>
          New patient registrations over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart data={data.registrationTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={qhealthColors.light} />
            <XAxis
              dataKey="date"
              tick={{ fill: qhealthColors.dark, fontSize: 10 }}
              axisLine={{ stroke: qhealthColors.light }}
              tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
            <YAxis
              tick={{ fill: qhealthColors.dark, fontSize: 10 }}
              axisLine={{ stroke: qhealthColors.light }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke={qhealthColors.success}
              fill={qhealthColors.success}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// APPOINTMENTS & VISITS CHARTS
// ============================================================================

export function AppointmentsVisitsChart({ data }: { data: HealthcareAnalytics["appointmentsVisits"] }) {
  if (!data) return null

  const pieData = [
    { name: "Completed", value: data.completedVisits, color: qhealthColors.success },
    { name: "Confirmed", value: data.confirmedAppointments, color: qhealthColors.primary },
    { name: "Pending", value: data.pendingAppointments, color: qhealthColors.warning },
    { name: "Cancelled", value: data.cancelledAppointments, color: qhealthColors.danger },
    { name: "Rescheduled", value: data.rescheduledAppointments, color: qhealthColors.info },
  ].filter(item => item.value > 0)

  const completionRate = data.totalAppointments > 0 
    ? Math.round((data.completedVisits / data.totalAppointments) * 100) 
    : 0

  const chartConfig = {
    completed: { label: "Completed", color: qhealthColors.success },
    pending: { label: "Pending", color: qhealthColors.warning },
  } satisfies ChartConfig

  return (
    <Card className="border-l-4 border-l-sky-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-sky-600" />
            <CardTitle className="text-lg font-semibold text-slate-800">
              Appointments & Visits
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200">
            {completionRate}% completion
          </Badge>
        </div>
        <CardDescription>
          Appointment status breakdown
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ChartContainer config={chartConfig} className="aspect-square max-h-[200px] flex-1">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                innerRadius={50}
                strokeWidth={4}
                stroke={qhealthColors.light}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ChartContainer>
          <div className="space-y-2 min-w-[120px]">
            <div className="text-center mb-3">
              <div className="text-3xl font-bold text-sky-700">{data.totalAppointments}</div>
              <div className="text-xs text-slate-600">Total</div>
            </div>
            <div className="grid gap-1 text-sm">
              <div className="flex justify-between items-center p-1.5 bg-emerald-50 rounded">
                <span className="text-emerald-700">Completed</span>
                <span className="font-bold text-emerald-700">{data.completedVisits}</span>
              </div>
              <div className="flex justify-between items-center p-1.5 bg-amber-50 rounded">
                <span className="text-amber-700">Pending</span>
                <span className="font-bold text-amber-700">{data.pendingAppointments}</span>
              </div>
              <div className="flex justify-between items-center p-1.5 bg-red-50 rounded">
                <span className="text-red-700">Cancelled</span>
                <span className="font-bold text-red-700">{data.cancelledAppointments}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function AppointmentsTrendChart({ data }: { data: HealthcareAnalytics["appointmentsVisits"] }) {
  if (!data?.appointmentTrend?.length) return null

  const chartConfig = {
    scheduled: { label: "Scheduled", color: qhealthColors.primary },
    completed: { label: "Completed", color: qhealthColors.success },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800">
          Appointments Trend
        </CardTitle>
        <CardDescription>
          Scheduled vs completed appointments over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart data={data.appointmentTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={qhealthColors.light} />
            <XAxis
              dataKey="date"
              tick={{ fill: qhealthColors.dark, fontSize: 10 }}
              axisLine={{ stroke: qhealthColors.light }}
              tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
            <YAxis
              tick={{ fill: qhealthColors.dark, fontSize: 10 }}
              axisLine={{ stroke: qhealthColors.light }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="scheduled" stroke={qhealthColors.primary} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="completed" stroke={qhealthColors.success} strokeWidth={2} dot={false} />
            <Legend />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// DIAGNOSES & TREATMENTS CHARTS
// ============================================================================

export function DiagnosesTreatmentsChart({ data }: { data: HealthcareAnalytics["diagnosesTreatments"] }) {
  if (!data) return null

  const severityData = Object.entries(data.bySeverity || {}).map(([severity, count]) => ({
    name: severity,
    value: count,
    color: severity === "MILD" ? qhealthColors.success 
      : severity === "MODERATE" ? qhealthColors.warning 
      : severity === "SEVERE" ? qhealthColors.danger 
      : qhealthColors.info,
  }))

  const chartConfig = {
    active: { label: "Active", color: qhealthColors.warning },
    resolved: { label: "Resolved", color: qhealthColors.success },
  } satisfies ChartConfig

  return (
    <Card className="border-l-4 border-l-violet-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5 text-violet-600" />
            <CardTitle className="text-lg font-semibold text-slate-800">
              Diagnoses & Treatments
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-violet-50 text-violet-700 border-violet-200">
            {data.totalDiagnoses} total
          </Badge>
        </div>
        <CardDescription>
          Diagnosis severity distribution and status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <ChartContainer config={chartConfig} className="aspect-square max-h-[180px]">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={40}
                  strokeWidth={4}
                  stroke={qhealthColors.light}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ChartContainer>
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
              <div className="text-2xl font-bold text-amber-700">{data.activeDiagnoses}</div>
              <div className="text-xs text-amber-600">Active Diagnoses</div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="text-2xl font-bold text-emerald-700">{data.resolvedDiagnoses}</div>
              <div className="text-xs text-emerald-600">Resolved</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function TopDiagnosesChart({ data }: { data: HealthcareAnalytics["diagnosesTreatments"] }) {
  if (!data?.topDiagnoses?.length) return null

  const chartData = data.topDiagnoses.slice(0, 8)

  const chartConfig = {
    count: { label: "Cases", color: qhealthColors.info },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800">
          Top Diagnoses
        </CardTitle>
        <CardDescription>
          Most common diagnoses (aggregated, non-PHI)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={qhealthColors.light} />
            <XAxis type="number" tick={{ fill: qhealthColors.dark, fontSize: 10 }} />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: qhealthColors.dark, fontSize: 10 }}
              width={120}
              tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + "..." : value}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill={qhealthColors.info} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// LAB TEST UTILIZATION CHARTS
// ============================================================================

export function LabTestUtilizationChart({ data }: { data: HealthcareAnalytics["labTestUtilization"] }) {
  if (!data) return null

  const statusData = Object.entries(data.byStatus || {}).map(([status, count]) => ({
    name: status,
    value: count,
    color: status === "COMPLETED" ? qhealthColors.success 
      : status === "PENDING" ? qhealthColors.warning 
      : status === "IN_PROGRESS" ? qhealthColors.primary
      : qhealthColors.info,
  }))

  const chartConfig = {
    completed: { label: "Completed", color: qhealthColors.success },
    pending: { label: "Pending", color: qhealthColors.warning },
  } satisfies ChartConfig

  return (
    <Card className="border-l-4 border-l-cyan-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-cyan-600" />
            <CardTitle className="text-lg font-semibold text-slate-800">
              Laboratory Tests
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
            {data.totalLabRequests} requests
          </Badge>
        </div>
        <CardDescription>
          Lab test status and priority distribution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ChartContainer config={chartConfig} className="aspect-square max-h-[180px] flex-1">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={statusData}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                strokeWidth={4}
                stroke={qhealthColors.light}
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ChartContainer>
          <div className="space-y-2 min-w-[130px]">
            <div className="text-sm font-medium text-slate-600 mb-2">By Priority</div>
            {Object.entries(data.byPriority || {}).map(([priority, count]) => (
              <div key={priority} className="flex justify-between items-center p-2 bg-slate-50 rounded">
                <span className="text-slate-600 text-sm">{priority}</span>
                <span className="font-bold text-slate-700">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function LabTestTrendChart({ data }: { data: HealthcareAnalytics["labTestUtilization"] }) {
  if (!data?.labRequestTrend?.length) return null

  const chartConfig = {
    count: { label: "Lab Requests", color: qhealthColors.secondary },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800">
          Lab Test Trend
        </CardTitle>
        <CardDescription>
          Laboratory test requests over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart data={data.labRequestTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={qhealthColors.light} />
            <XAxis
              dataKey="date"
              tick={{ fill: qhealthColors.dark, fontSize: 10 }}
              axisLine={{ stroke: qhealthColors.light }}
              tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
            <YAxis
              tick={{ fill: qhealthColors.dark, fontSize: 10 }}
              axisLine={{ stroke: qhealthColors.light }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey="count"
              stroke={qhealthColors.secondary}
              fill={qhealthColors.secondary}
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// PRESCRIPTION & PHARMACY CHARTS
// ============================================================================

export function PrescriptionPharmacyChart({ data }: { data: HealthcareAnalytics["prescriptionPharmacy"] }) {
  if (!data) return null

  const barData = [
    { name: "Active", value: data.activePrescriptions, color: qhealthColors.success },
    { name: "Expired", value: data.expiredPrescriptions, color: qhealthColors.danger },
    { name: "Refills", value: data.totalRefills, color: qhealthColors.info },
  ]

  const chartConfig = {
    value: { label: "Count", color: qhealthColors.pink },
  } satisfies ChartConfig

  return (
    <Card className="border-l-4 border-l-pink-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pill className="h-5 w-5 text-pink-600" />
            <CardTitle className="text-lg font-semibold text-slate-800">
              Prescriptions & Pharmacy
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-pink-50 text-pink-700 border-pink-200">
            {data.totalPrescriptions} total
          </Badge>
        </div>
        <CardDescription>
          Prescription status and refill activity
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={barData}>
            <CartesianGrid strokeDasharray="3 3" stroke={qhealthColors.light} />
            <XAxis dataKey="name" tick={{ fill: qhealthColors.dark, fontSize: 12 }} />
            <YAxis tick={{ fill: qhealthColors.dark, fontSize: 10 }} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {barData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export function TopMedicationsChart({ data }: { data: HealthcareAnalytics["prescriptionPharmacy"] }) {
  if (!data?.topMedications?.length) return null

  const chartData = data.topMedications.slice(0, 8)

  const chartConfig = {
    count: { label: "Prescriptions", color: qhealthColors.pink },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800">
          Top Medications
        </CardTitle>
        <CardDescription>
          Most prescribed medications (aggregated, non-PHI)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke={qhealthColors.light} />
            <XAxis type="number" tick={{ fill: qhealthColors.dark, fontSize: 10 }} />
            <YAxis
              dataKey="name"
              type="category"
              tick={{ fill: qhealthColors.dark, fontSize: 10 }}
              width={120}
              tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + "..." : value}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" fill={qhealthColors.pink} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// LONGEVITY PROGRAM CHARTS
// ============================================================================

export function LongevityProgramChart({ data }: { data: HealthcareAnalytics["longevityProgram"] }) {
  if (!data) return null

  const riskData = [
    { name: "Low Risk", value: data.riskDistribution.low, color: qhealthColors.success },
    { name: "Moderate", value: data.riskDistribution.moderate, color: qhealthColors.warning },
    { name: "High Risk", value: data.riskDistribution.high, color: qhealthColors.danger },
  ].filter(item => item.value > 0)

  const chartConfig = {
    low: { label: "Low Risk", color: qhealthColors.success },
    moderate: { label: "Moderate", color: qhealthColors.warning },
    high: { label: "High Risk", color: qhealthColors.danger },
  } satisfies ChartConfig

  return (
    <Card className="border-l-4 border-l-rose-500">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-rose-600" />
            <CardTitle className="text-lg font-semibold text-slate-800">
              Longevity Program
            </CardTitle>
          </div>
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
            {data.totalHealthScans} scans
          </Badge>
        </div>
        <CardDescription>
          Health scan metrics and risk distribution
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <ChartContainer config={chartConfig} className="aspect-square max-h-[180px] flex-1">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
              <Pie
                data={riskData}
                dataKey="value"
                nameKey="name"
                innerRadius={40}
                strokeWidth={4}
                stroke={qhealthColors.light}
              >
                {riskData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Legend />
            </PieChart>
          </ChartContainer>
          <div className="grid grid-cols-1 gap-2 min-w-[140px]">
            <div className="p-2 bg-sky-50 rounded-lg border border-sky-100 text-center">
              <div className="flex items-center justify-center gap-1">
                <Activity className="h-4 w-4 text-sky-600" />
                <span className="text-lg font-bold text-sky-700">{data.averageWellnessScore}</span>
              </div>
              <div className="text-xs text-sky-600">Avg Wellness</div>
            </div>
            <div className="p-2 bg-amber-50 rounded-lg border border-amber-100 text-center">
              <div className="flex items-center justify-center gap-1">
                <Activity className="h-4 w-4 text-amber-600" />
                <span className="text-lg font-bold text-amber-700">{data.averageStressLevel}</span>
              </div>
              <div className="text-xs text-amber-600">Avg Stress</div>
            </div>
            <div className="p-2 bg-rose-50 rounded-lg border border-rose-100 text-center">
              <div className="flex items-center justify-center gap-1">
                <HeartPulse className="h-4 w-4 text-rose-600" />
                <span className="text-lg font-bold text-rose-700">{data.averageHeartRate}</span>
              </div>
              <div className="text-xs text-rose-600">Avg Heart Rate</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function HealthMetricsTrendChart({ data }: { data: HealthcareAnalytics["longevityProgram"] }) {
  if (!data?.healthMetricsTrend?.length) return null

  const chartConfig = {
    wellnessScore: { label: "Wellness", color: qhealthColors.success },
    stressLevel: { label: "Stress", color: qhealthColors.warning },
  } satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-800">
          Health Metrics Trend
        </CardTitle>
        <CardDescription>
          Average wellness and stress levels over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <LineChart data={data.healthMetricsTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke={qhealthColors.light} />
            <XAxis
              dataKey="date"
              tick={{ fill: qhealthColors.dark, fontSize: 10 }}
              axisLine={{ stroke: qhealthColors.light }}
              tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            />
            <YAxis
              tick={{ fill: qhealthColors.dark, fontSize: 10 }}
              axisLine={{ stroke: qhealthColors.light }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line type="monotone" dataKey="wellnessScore" stroke={qhealthColors.success} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="stressLevel" stroke={qhealthColors.warning} strokeWidth={2} dot={false} />
            <Legend />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// MAIN REPORTS CHARTS COMPONENT
// ============================================================================

interface ReportsChartsProps {
  reportData: HealthcareAnalytics | null | undefined
  showSampleData?: boolean
}

// Sample data for demonstration when no real data exists
const SAMPLE_DATA: HealthcareAnalytics = {
  patientRegistrations: {
    totalPatients: 1247,
    newPatients: 89,
    verifiedPatients: 1102,
    pendingVerification: 145,
    bySubscriptionTier: { FREE: 623, BASIC: 412, PREMIUM: 189, ENTERPRISE: 23 },
    registrationTrend: [
      { date: "2026-01-01", count: 12 },
      { date: "2026-01-08", count: 18 },
      { date: "2026-01-15", count: 24 },
      { date: "2026-01-22", count: 35 },
    ],
  },
  appointmentsVisits: {
    totalAppointments: 856,
    completedVisits: 712,
    cancelledAppointments: 67,
    pendingAppointments: 45,
    confirmedAppointments: 32,
    rescheduledAppointments: 0,
    byStatus: { COMPLETED: 712, CANCELLED: 67, PENDING: 45, CONFIRMED: 32 },
    appointmentTrend: [
      { date: "2026-01-01", scheduled: 45, completed: 38 },
      { date: "2026-01-08", scheduled: 52, completed: 47 },
      { date: "2026-01-15", scheduled: 61, completed: 55 },
      { date: "2026-01-22", scheduled: 48, completed: 44 },
    ],
  },
  diagnosesTreatments: {
    totalDiagnoses: 423,
    activeDiagnoses: 287,
    resolvedDiagnoses: 136,
    bySeverity: { MILD: 198, MODERATE: 156, SEVERE: 69 },
    topDiagnoses: [
      { name: "Hypertension", count: 89 },
      { name: "Type 2 Diabetes", count: 67 },
      { name: "Upper Respiratory Infection", count: 54 },
      { name: "Anxiety Disorder", count: 43 },
      { name: "Lower Back Pain", count: 38 },
      { name: "Allergic Rhinitis", count: 32 },
    ],
    diagnosisTrend: [
      { date: "2026-01-01", count: 28 },
      { date: "2026-01-08", count: 34 },
      { date: "2026-01-15", count: 41 },
      { date: "2026-01-22", count: 37 },
    ],
  },
  labTestUtilization: {
    totalLabRequests: 312,
    completedTests: 278,
    pendingTests: 34,
    byPriority: { NORMAL: 245, URGENT: 52, STAT: 15 },
    byStatus: { COMPLETED: 278, PENDING: 34 },
    labRequestTrend: [
      { date: "2026-01-01", count: 18 },
      { date: "2026-01-08", count: 24 },
      { date: "2026-01-15", count: 29 },
      { date: "2026-01-22", count: 22 },
    ],
  },
  prescriptionPharmacy: {
    totalPrescriptions: 534,
    activePrescriptions: 412,
    expiredPrescriptions: 122,
    totalRefills: 287,
    topMedications: [
      { name: "Metformin 500mg", count: 78 },
      { name: "Lisinopril 10mg", count: 65 },
      { name: "Amlodipine 5mg", count: 54 },
      { name: "Omeprazole 20mg", count: 48 },
      { name: "Atorvastatin 20mg", count: 42 },
      { name: "Metoprolol 50mg", count: 36 },
    ],
    prescriptionTrend: [
      { date: "2026-01-01", count: 32 },
      { date: "2026-01-08", count: 41 },
      { date: "2026-01-15", count: 38 },
      { date: "2026-01-22", count: 45 },
    ],
  },
  longevityProgram: {
    totalHealthScans: 189,
    averageWellnessScore: 72,
    averageStressLevel: 34,
    averageHeartRate: 74,
    riskDistribution: { low: 98, moderate: 67, high: 24 },
    healthMetricsTrend: [
      { date: "2026-01-01", wellnessScore: 68, stressLevel: 38 },
      { date: "2026-01-08", wellnessScore: 71, stressLevel: 35 },
      { date: "2026-01-15", wellnessScore: 74, stressLevel: 32 },
      { date: "2026-01-22", wellnessScore: 72, stressLevel: 34 },
    ],
  },
  period: {
    startDate: "2026-01-01T00:00:00Z",
    endDate: "2026-01-29T23:59:59Z",
  },
}

export function ReportsCharts({ reportData, showSampleData = false }: ReportsChartsProps) {
  const [useSampleData, setUseSampleData] = React.useState(showSampleData)
  
  const data = useSampleData ? SAMPLE_DATA : reportData
  const hasAnyData = data && (
    data.patientRegistrations || 
    data.appointmentsVisits || 
    data.diagnosesTreatments || 
    data.labTestUtilization || 
    data.prescriptionPharmacy || 
    data.longevityProgram
  )

  if (!hasAnyData) {
    return (
      <Card className="border-dashed border-2 border-slate-200">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 bg-slate-100 rounded-full mb-6">
            <Activity className="h-12 w-12 text-slate-400" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Analytics Data Available</h3>
          <p className="text-slate-500 mb-6 max-w-md">
            To view healthcare analytics, you need to create and generate a report first. 
            The dashboard will display aggregated, PHI-protected metrics.
          </p>
          
          <div className="bg-slate-50 rounded-lg p-6 max-w-lg w-full mb-6">
            <h4 className="font-medium text-slate-700 mb-3 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              How to get started:
            </h4>
            <ol className="text-sm text-slate-600 space-y-2 text-left list-decimal list-inside">
              <li>Click <strong>&quot;Create Report&quot;</strong> button above</li>
              <li>Select a report type (e.g., Patient Registrations)</li>
              <li>Choose your desired time period</li>
              <li>Click <strong>&quot;Generate&quot;</strong> on the created report</li>
              <li>Return to this dashboard to view analytics</li>
            </ol>
          </div>

          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setUseSampleData(true)}
              className="border-sky-300 text-sky-700 hover:bg-sky-50"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Preview with Sample Data
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Sample Data Banner */}
      {useSampleData && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-full">
              <Activity className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-medium text-amber-800">Viewing Sample Data</p>
              <p className="text-sm text-amber-600">This is demonstration data. Generate a real report to see your actual analytics.</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setUseSampleData(false)}
            className="border-amber-300 text-amber-700 hover:bg-amber-100"
          >
            Hide Sample
          </Button>
        </div>
      )}

      {/* Row 1: Patient Registrations & Appointments */}
      {(data.patientRegistrations || data.appointmentsVisits) && (
        <div className="grid gap-6 md:grid-cols-2">
          {data.patientRegistrations && (
            <PatientRegistrationsChart data={data.patientRegistrations} />
          )}
          {data.appointmentsVisits && (
            <AppointmentsVisitsChart data={data.appointmentsVisits} />
          )}
        </div>
      )}

      {/* Row 2: Trends */}
      {(data.patientRegistrations?.registrationTrend || data.appointmentsVisits?.appointmentTrend) && (
        <div className="grid gap-6 md:grid-cols-2">
          {data.patientRegistrations?.registrationTrend && (
            <PatientRegistrationsTrendChart data={data.patientRegistrations} />
          )}
          {data.appointmentsVisits?.appointmentTrend && (
            <AppointmentsTrendChart data={data.appointmentsVisits} />
          )}
        </div>
      )}

      {/* Row 3: Diagnoses & Lab Tests */}
      {(data.diagnosesTreatments || data.labTestUtilization) && (
        <div className="grid gap-6 md:grid-cols-2">
          {data.diagnosesTreatments && (
            <DiagnosesTreatmentsChart data={data.diagnosesTreatments} />
          )}
          {data.labTestUtilization && (
            <LabTestUtilizationChart data={data.labTestUtilization} />
          )}
        </div>
      )}

      {/* Row 4: Top Diagnoses & Lab Trend */}
      {(data.diagnosesTreatments?.topDiagnoses || data.labTestUtilization?.labRequestTrend) && (
        <div className="grid gap-6 md:grid-cols-2">
          {data.diagnosesTreatments?.topDiagnoses && (
            <TopDiagnosesChart data={data.diagnosesTreatments} />
          )}
          {data.labTestUtilization?.labRequestTrend && (
            <LabTestTrendChart data={data.labTestUtilization} />
          )}
        </div>
      )}

      {/* Row 5: Prescriptions & Longevity */}
      {(data.prescriptionPharmacy || data.longevityProgram) && (
        <div className="grid gap-6 md:grid-cols-2">
          {data.prescriptionPharmacy && (
            <PrescriptionPharmacyChart data={data.prescriptionPharmacy} />
          )}
          {data.longevityProgram && (
            <LongevityProgramChart data={data.longevityProgram} />
          )}
        </div>
      )}

      {/* Row 6: Top Medications & Health Metrics Trend */}
      {(data.prescriptionPharmacy?.topMedications || data.longevityProgram?.healthMetricsTrend) && (
        <div className="grid gap-6 md:grid-cols-2">
          {data.prescriptionPharmacy?.topMedications && (
            <TopMedicationsChart data={data.prescriptionPharmacy} />
          )}
          {data.longevityProgram?.healthMetricsTrend && (
            <HealthMetricsTrendChart data={data.longevityProgram} />
          )}
        </div>
      )}
    </div>
  )
}
