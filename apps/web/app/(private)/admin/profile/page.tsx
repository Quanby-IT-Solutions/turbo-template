"use client"

import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import * as React from "react"
import { authApi } from "@/features/auth/api/auth-api"
import { Badge } from "@/core/components/ui/badge"
import { toast } from "sonner"
import { Skeleton } from "@/core/components/ui/skeleton"
import { organizationsApi, type Organization } from "@/features/organizations/api/organizations-api"
import type { User } from "@/services/api/types"
import { useRouter } from "next/navigation"
import { clearTokens } from "@/services/api/client"

type AdminProfile = User & {
  adminInfo?: {
    firstName?: string
    lastName?: string
    contactNumber?: string
  }
  organization?: Organization | null
  organizationId?: string | null
}

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = React.useState(false)
  const [profile, setProfile] = React.useState<AdminProfile | null>(null)
  const [orgLoading, setOrgLoading] = React.useState(false)
  const [orgDetails, setOrgDetails] = React.useState<Organization | null>(null)

  const loadProfile = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await authApi.getProfile()
      if (res.success && res.data) {
        setProfile(res.data as AdminProfile)
      } else if (res.error === "UNAUTHORIZED") {
        toast.error("Your session is invalid. Please log in again.")
        clearTokens()
        router.push("/login")
      } else if (res.error === "FORBIDDEN") {
        toast.error("You don't have access to this page.")
      } else {
        toast.error(res.message || "Failed to load profile")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }, [router])

  React.useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const organizationId = profile?.organizationId || profile?.organization?.id
  const organization = orgDetails || profile?.organization
  const firstName = profile?.adminInfo?.firstName || profile?.firstName || ""
  const lastName = profile?.adminInfo?.lastName || profile?.lastName || ""
  const phone = profile?.adminInfo?.contactNumber || ""

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  const loadOrganization = React.useCallback(async () => {
    if (!organizationId) {
      setOrgDetails(null)
      return
    }
    setOrgLoading(true)
    try {
      const res = await organizationsApi.getOrganizationById(organizationId)
      if (res.success && res.data) {
        setOrgDetails(res.data)
      } else {
        toast.error(res.message || "Failed to load organization")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load organization")
    } finally {
      setOrgLoading(false)
    }
  }, [organizationId])

  React.useEffect(() => {
    loadOrganization()
  }, [loadOrganization])

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarWrapper role="admin" variant="inset" />
      <SidebarInset>
        <RoleHeader 
          title="Organization Profile" 
          description="Manage your organization account information"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      This page shows the currently logged-in admin account.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {loading && !profile && (
                      <div className="space-y-3">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    )}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="first-name">First Name</Label>
                        <Input
                          id="first-name"
                          placeholder="John"
                          value={firstName}
                          disabled
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="last-name">Last Name</Label>
                        <Input
                          id="last-name"
                          placeholder="Doe"
                          value={lastName}
                          disabled
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="admin@example.com"
                        value={profile?.email || ""}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                          value={phone}
                        disabled
                      />
                    </div>
                    {profile && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="outline">{profile.role || "ADMIN"}</Badge>
                        <span>Signed in as {profile.email}</span>
                        {profile.id && <span className="text-xs text-muted-foreground">ID: {profile.id}</span>}
                      </div>
                    )}
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={loadProfile} disabled={loading}>
                        Refresh
                      </Button>
                      <Button disabled>Save Changes</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Organization</CardTitle>
                    <CardDescription>
                      Organization details linked to this admin account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {orgLoading && (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-4 w-40" />
                      </div>
                    )}
                    {!orgLoading && organization ? (
                      <>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-lg">{organization.name}</p>
                          <Badge>{organization.subscriptionTier}</Badge>
                          <Badge
                            variant={
                              organization.approvalStatus === "APPROVED"
                                ? "default"
                                : organization.approvalStatus === "PENDING"
                                  ? "secondary"
                                  : "destructive"
                            }
                          >
                            {organization.approvalStatus || "PENDING"}
                          </Badge>
                        </div>
                        <div className="grid gap-2 text-sm">
                          <p><span className="font-medium">Email:</span> {organization.email || "N/A"}</p>
                          <p><span className="font-medium">Phone:</span> {organization.phone || "N/A"}</p>
                          <p><span className="font-medium">Address:</span> {organization.address || "N/A"}</p>
                          <p><span className="font-medium">Website:</span> {organization.website || "N/A"}</p>
                          <p><span className="font-medium">Doctors:</span> {organization.currentDoctors} / {organization.maxDoctors ?? "∞"}</p>
                          <p><span className="font-medium">Subscription:</span> Active {organization.isSubscriptionActive ? "Yes" : "No"} • Start {formatDate(organization.subscriptionStartDate)} • End {formatDate(organization.subscriptionEndDate)}</p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No organization linked.</p>
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

