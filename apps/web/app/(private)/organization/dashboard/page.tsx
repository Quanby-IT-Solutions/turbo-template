"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/core/components/ui/sidebar"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import { SectionCards } from "@/core/components/section-cards"
import { ChartAreaInteractive } from "@/core/components/chart-area-interactive"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Skeleton } from "@/core/components/ui/skeleton"
import { authApi } from "@/features/auth/api/auth-api"
import { organizationsApi } from "@/features/organizations/api/organizations-api"
import type { Organization } from "@/features/organizations/api/organizations-api"
import type { User } from "@/services/api/types"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { toast } from "sonner"
import { ArrowRight } from "lucide-react"
import Link from "next/link"
import { IconBriefcase, IconUsers, IconSettings, IconCalendar, IconActivity, IconAlertTriangle, IconClipboardCheck } from "@tabler/icons-react"

type OrgUser = User & { organizationId?: string | null; organization?: Organization | null }

export default function OrganizationDashboardPage() {
  const [loading, setLoading] = React.useState(false)
  const [organization, setOrganization] = React.useState<Organization | null>(null)

  const loadData = React.useCallback(async () => {
    setLoading(true)
    try {
      const profileRes = await authApi.getProfile()
      if (!profileRes.success || !profileRes.data) {
        toast.error(profileRes.message || "Failed to load profile")
        return
      }
      const user = profileRes.data as OrgUser
      const orgId = user.organizationId || user.organization?.id
      if (!orgId) {
        toast.error("No organization linked to this account.")
        return
      }
      const orgRes = await organizationsApi.getOrganizationById(orgId)
      if (orgRes.success && orgRes.data) {
        setOrganization(orgRes.data)
      } else {
        toast.error(orgRes.message || "Failed to load organization")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load dashboard data")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadData()
  }, [loadData])

  const renderLimit = (value?: number | null) => {
    if (value === null) return "Unlimited"
    if (value === undefined) return "N/A"
    return value.toString()
  }

  if (loading || !organization) {
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
            title="Organization Dashboard"
            description="Overview of your organization activity"
          />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="grid gap-4 px-4 lg:px-6 md:grid-cols-2 xl:grid-cols-3">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                </div>
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    )
  }

  const pipelineCards = [
    { title: "Doctor approvals", value: "0 pending", hint: "Awaiting review", icon: <IconClipboardCheck className="h-4 w-4 text-muted-foreground" /> },
    { title: "Patient verification", value: "0 checks", hint: "Face scan / ID checks", icon: <IconActivity className="h-4 w-4 text-muted-foreground" /> },
    { title: "Subscription renewals", value: "0 this month", hint: "Upcoming renewals", icon: <IconCalendar className="h-4 w-4 text-muted-foreground" /> },
    { title: "Escalations", value: "0 open", hint: "Items needing attention", icon: <IconAlertTriangle className="h-4 w-4 text-muted-foreground" /> },
  ]

  const alertCards = [
    { title: "Data residency review", detail: "High priority", tag: "Org" },
    { title: "Doctor ID mismatch", detail: "Needs follow-up", tag: "Doctor" },
    { title: "Tier overage alert", detail: "Watch closely", tag: "Plan" },
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
      <SidebarWrapper role="organization" variant="inset" />
      <SidebarInset>
        <RoleHeader
          title="Organization Dashboard"
          description="Overview of your organization activity"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                  {/* Dashboard-01 style metric cards */}
                  <SectionCards
                    cards={[
                      {
                        title: "Active Doctors",
                        value: `${organization.currentDoctors} / ${renderLimit(organization.maxDoctors)}`,
                        trend: {
                          value: organization.currentDoctors < (organization.maxDoctors || 0) ? "Room to grow" : "At capacity",
                          direction: "up",
                        },
                        footer: {
                          label: `${organization.currentDoctors} of ${renderLimit(organization.maxDoctors)} doctors active`,
                          description: "Current vs. maximum allowed",
                        },
                      },
                      {
                        title: "Subscription Tier",
                        value: organization.subscriptionTier || "N/A",
                        trend: {
                          value: organization.isSubscriptionActive ? "Active" : "Inactive",
                          direction: organization.isSubscriptionActive ? "up" : "up",
                        },
                        footer: {
                          label: organization.isSubscriptionActive ? "Subscription is active" : "Subscription inactive",
                          description: organization.approvalStatus || "Pending approval",
                        },
                      },
                      {
                        title: "Patients per Doctor",
                        value: renderLimit(organization.maxPatientsPerDoctor),
                        trend: {
                          value: "Per doctor limit",
                          direction: "up",
                        },
                        footer: {
                          label: `${renderLimit(organization.maxPatientsPerDoctor)} patients allowed per doctor`,
                          description: "Capacity allocation",
                        },
                      },
                      {
                        title: "Face Scans",
                        value: renderLimit(organization.maxFaceScansPerDoctor),
                        trend: {
                          value: "Per doctor",
                          direction: "up",
                        },
                        footer: {
                          label: `${renderLimit(organization.maxFaceScansPerDoctor)} face scans per doctor`,
                          description: "Monthly allocation",
                        },
                      },
                    ]}
                  />
                  
                  {/* Chart section - dashboard-01 style */}
                  <div className="px-4 lg:px-6">
                    <ChartAreaInteractive />
                  </div>
                  
              <div className="grid gap-6 px-4 lg:px-6 @3xl/main:grid-cols-2">
                <Card>
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Capacity & limits</CardTitle>
                      <p className="text-sm text-muted-foreground">Organization resource allocation</p>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border bg-muted/40 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">
                        Doctors
                      </p>
                      <p className="text-3xl font-semibold">{organization.currentDoctors} / {renderLimit(organization.maxDoctors)}</p>
                      <p className="text-xs text-muted-foreground">Current vs. maximum allowed</p>
                    </div>
                    <div className="space-y-3">
                      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                        <p className="font-medium">Patients per Doctor</p>
                        <p className="text-xs text-muted-foreground">{renderLimit(organization.maxPatientsPerDoctor)} per doctor limit</p>
                      </div>
                      <div className="rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                        <p className="font-medium">Face Scans per Doctor</p>
                        <p className="text-xs text-muted-foreground">{renderLimit(organization.maxFaceScansPerDoctor)} per doctor allocation</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Organization profile</CardTitle>
                    <p className="text-sm text-muted-foreground">Basic organization information</p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-semibold">{organization.name}</p>
                      <p className="text-sm text-muted-foreground">{organization.email || "N/A"}</p>
                      <p className="text-sm text-muted-foreground">{organization.address || "No address set"}</p>
                    </div>
                    <div className="pt-2">
                      <Button asChild variant="outline" size="sm" className="w-full">
                        <Link href="/organization/profile" className="flex items-center gap-2">
                          Manage Profile <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 px-4 lg:px-6 @3xl/main:grid-cols-3">
                <Card className="@3xl/main:col-span-2">
                  <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>Management pipeline</CardTitle>
                      <p className="text-sm text-muted-foreground">Snapshot of key workstreams</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/organization/reports">Open reports</Link>
                    </Button>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2">
                    {pipelineCards.map((p) => (
                      <div
                        key={p.title}
                        className="rounded-xl border bg-muted/30 p-4"
                      >
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">
                          {p.title}
                        </p>
                        <p className="text-2xl font-semibold text-foreground">
                          {p.value}
                        </p>
                        <p className="text-xs text-muted-foreground">{p.hint}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Alerts & escalations</CardTitle>
                    <p className="text-sm text-muted-foreground">Items that need attention</p>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {alertCards.map((a) => (
                      <div
                        key={a.title}
                        className="rounded-lg border bg-amber-50/50 p-3 text-sm dark:bg-amber-500/10"
                      >
                        <p className="font-semibold">{a.title}</p>
                        <p className="text-xs text-muted-foreground">{a.detail}</p>
                        <p className="mt-1 text-xs text-amber-600 dark:text-amber-300">
                          {a.tag}
                        </p>
                      </div>
                    ))}
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="ghost" className="w-full justify-between text-sm">
                      <Link href="/organization/notifications">
                        Open notification center
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
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


