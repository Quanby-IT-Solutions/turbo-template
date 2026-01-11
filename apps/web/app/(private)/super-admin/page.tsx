"use client"

import * as React from "react"
import Link from "next/link"
import {
  IconArrowRight,
  IconBuildingEstate,
  IconChartBar,
  IconStethoscope,
  IconTrendingUp,
  IconUsers,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import { SectionCards } from "@/core/components/section-cards"
import { ChartAreaInteractive } from "@/core/components/chart-area-interactive"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/core/components/ui/card"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Button } from "@/core/components/ui/button"
import { Badge } from "@/core/components/ui/badge"
import { Skeleton } from "@/core/components/ui/skeleton"
import { superAdminApi, type PatientListItem } from "@/features/super-admin/api/super-admin-api"


const managementAreas = [
  {
    title: "Doctors",
    description: "Licensing, onboarding, and schedule governance.",
    icon: IconStethoscope,
    highlight: "42 active",
    delta: "+5 awaiting approval",
    href: "/super-admin/doctors",
  },
  {
    title: "Organizations",
    description: "Track plans, billing, and compliance readiness.",
    icon: IconBuildingEstate,
    highlight: "18 orgs",
    delta: "3 renewals due",
    href: "/super-admin/organization",
  },
  {
    title: "Patients",
    description: "Verification queue and safety escalations.",
    icon: IconUsers,
    highlight: "6,420 patients",
    delta: "92 pending checks",
    href: "/super-admin/patients",
  },
  {
    title: "Subscriptions",
    description: "Product tiers, usage caps, and expansion signals.",
    icon: IconChartBar,
    highlight: "4 plans live",
    delta: "Monthly MRR ↑ 12%",
    href: "/super-admin/subscriptions",
  },
]

const pipelineSummary = [
  {
    label: "Doctor approvals",
    metric: "09 pending",
    trend: "2 flagged this week",
  },
  {
    label: "Organization renewals",
    metric: "03 this month",
    trend: "All on track",
  },
  {
    label: "Patient verification",
    metric: "92 checks",
    trend: "Avg. < 24h SLA",
  },
  {
    label: "Subscription escalations",
    metric: "05 open",
    trend: "Handled daily",
  },
]

export default function SuperAdminPage() {
  const [pendingPatients, setPendingPatients] = React.useState<PatientListItem[]>([])
  const [isLoadingPatients, setIsLoadingPatients] = React.useState(true)

  React.useEffect(() => {
    const loadQueues = async () => {
      try {
        setIsLoadingPatients(true)
        const response = await superAdminApi.getPatientsPendingVerification({
          limit: 5,
          status: "PENDING",
        })

        if (response.success && response.data) {
          setPendingPatients(response.data.items)
        } else {
          toast.error(response.message || "Unable to load verification queue")
        }
      } catch (error) {
        console.error("Failed to load verification queue", error)
        toast.error("Failed to load verification queue")
      } finally {
        setIsLoadingPatients(false)
      }
    }

    loadQueues()
  }, [])

  // Convert management areas to SectionCards format for top metrics
  const metricCards = [
    {
      title: "Active Doctors",
      value: "42",
      trend: {
        value: "+5 pending",
        direction: "up" as const,
      },
      footer: {
        label: "5 awaiting approval",
        description: "Licensing and onboarding",
      },
    },
    {
      title: "Organizations",
      value: "18",
      trend: {
        value: "3 renewals",
        direction: "up" as const,
      },
      footer: {
        label: "3 renewals due this month",
        description: "Billing and compliance",
      },
    },
    {
      title: "Total Patients",
      value: "6,420",
      trend: {
        value: "92 pending",
        direction: "up" as const,
      },
      footer: {
        label: "92 verification checks pending",
        description: "Face scan and document review",
      },
    },
    {
      title: "Active Plans",
      value: "4",
      trend: {
        value: "+12% MRR",
        direction: "up" as const,
      },
      footer: {
        label: "Monthly MRR up 12%",
        description: "Subscription growth",
      },
    },
  ]

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarWrapper role="super-admin" variant="inset" />
      <SidebarInset>
        <RoleHeader
          title="Super Admin Control Center"
          description="Operate doctors, organizations, patients, and subscriptions from one professional overview."
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Dashboard-01 style metric cards */}
              <SectionCards cards={metricCards} />
              
              {/* Management areas with quick actions */}
              <div className="grid gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
                {managementAreas.map((area) => (
                  <Card
                    key={area.title}
                    className="border-primary/10 bg-gradient-to-br from-muted to-background"
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold">
                          <area.icon className="mr-2 inline size-4 text-primary" />
                          {area.title}
                        </CardTitle>
                        <Badge variant="outline" className="text-[11px]">
                          {area.delta}
                        </Badge>
                      </div>
                      <CardDescription suppressHydrationWarning>{area.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold">{area.highlight}</p>
                    </CardContent>
                    <CardFooter>
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href={area.href} suppressHydrationWarning>
                          Manage {area.title.toLowerCase()}
                          <IconArrowRight className="ml-2 size-4" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
              
              {/* Chart section - dashboard-01 style */}
              <div className="px-4 lg:px-6">
                <ChartAreaInteractive />
              </div>

              <div className="grid gap-6 px-4 lg:px-6 @3xl/main:grid-cols-3">
                <Card className="@3xl/main:col-span-2">
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Management pipeline</CardTitle>
                      <CardDescription suppressHydrationWarning>
                        Snapshot of the workstreams spanning doctors, organizations, patients, and subscriptions.
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/super-admin/reports" suppressHydrationWarning>
                        Open reports
                        <IconArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    {pipelineSummary.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-xl border bg-muted/30 p-4"
                      >
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="text-2xl font-semibold text-foreground">
                          {item.metric}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.trend}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Alerts & escalations</CardTitle>
                    <CardDescription suppressHydrationWarning>System signals that need a human decision.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      {
                        label: "Data residency review",
                        detail: "Org · Aster Clinic",
                        severity: "High priority",
                      },
                      {
                        label: "Doctor ID mismatch",
                        detail: "Dr. Alonzo Ramos",
                        severity: "Needs follow-up",
                      },
                      {
                        label: "Tier overage alert",
                        detail: "Acme Health · Premium",
                        severity: "Watch closely",
                      },
                    ].map((alert) => (
                      <div
                        key={alert.label}
                        className="rounded-lg border bg-amber-50/50 p-3 text-sm dark:bg-amber-500/10"
                      >
                        <p className="font-semibold">{alert.label}</p>
                        <p className="text-xs text-muted-foreground">{alert.detail}</p>
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                          {alert.severity}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="ghost" className="w-full justify-between text-sm">
                      <Link href="/super-admin/notifications" suppressHydrationWarning>
                        Open notification center
                        <IconArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>

              <div className="grid gap-6 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Patient verification queue</CardTitle>
                      <CardDescription suppressHydrationWarning>Face scan IDs and documents awaiting decision.</CardDescription>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/super-admin/patients" suppressHydrationWarning>
                        Review all
                        <IconArrowRight className="ml-2 size-4" />
                      </Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isLoadingPatients ? (
                      Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-14 rounded-lg" />
                      ))
                    ) : pendingPatients.length ? (
                      pendingPatients.map((patient) => (
                        <div
                          key={patient.id}
                          className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3 text-sm"
                        >
                          <div>
                            <p className="font-semibold">
                              {patient.patientInfo?.firstName
                                ? `${patient.patientInfo.firstName} ${patient.patientInfo?.lastName ?? ""}`.trim()
                                : patient.email}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Submitted {new Date(patient.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {patient.patientInfo?.verificationStatus ?? "PENDING"}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
                        No pending verifications—great job keeping the queue clear.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Subscription health</CardTitle>
                    <CardDescription suppressHydrationWarning>Plan utilization and guardrails.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Active MRR
                      </p>
                      <p className="text-3xl font-semibold">$128k</p>
                      <p className="text-xs text-muted-foreground">+12% vs last month</p>
                    </div>
                    <div className="space-y-3">
                      {[
                        {
                          label: "Premium tier headroom",
                          value: "78% capacity",
                          tone: "text-emerald-600 dark:text-emerald-300",
                        },
                        {
                          label: "Enterprise contracts",
                          value: "5 in negotiation",
                          tone: "text-blue-700 dark:text-blue-300",
                        },
                        {
                          label: "At-risk downgrades",
                          value: "2 flagged orgs",
                          tone: "text-amber-600 dark:text-amber-300",
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-lg border bg-muted/30 px-3 py-2 text-sm"
                        >
                          <p className="font-medium">{item.label}</p>
                          <p className={`text-xs ${item.tone}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="justify-between text-xs text-muted-foreground">
                    <span>Guardrails auto-refresh every 15 minutes</span>
                    <Link href="/super-admin/subscriptions" className="font-medium hover:underline" suppressHydrationWarning>
                      Adjust plan limits
                    </Link>
                  </CardFooter>
                </Card>
              </div>

            
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
