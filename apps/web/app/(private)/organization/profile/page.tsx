"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/core/components/ui/sidebar"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Skeleton } from "@/core/components/ui/skeleton"
import { authApi } from "@/features/auth/api/auth-api"
import { organizationsApi, type Organization } from "@/features/organizations/api/organizations-api"
import type { User } from "@/services/api/types"
import { toast } from "sonner"
import { Button } from "@/core/components/ui/button"
import { Avatar, AvatarFallback } from "@/core/components/ui/avatar"
import { Badge } from "@/core/components/ui/badge"

type OrgUser = User & { organizationId?: string | null; organization?: Organization | null }

export default function OrganizationProfilePage() {
  const [loading, setLoading] = React.useState(false)
  const [profile, setProfile] = React.useState<OrgUser | null>(null)
  const [organization, setOrganization] = React.useState<Organization | null>(null)
  const [editMode, setEditMode] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState({
    name: "",
    address: "",
    phone: "",
  })

  const loadProfile = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await authApi.getProfile()
      if (res.success && res.data) {
        const user = res.data as OrgUser
        setProfile(user)
        const orgId = user.organizationId || user.organization?.id
        if (orgId) {
          const orgRes = await organizationsApi.getOrganizationById(orgId)
          if (orgRes.success && orgRes.data) {
            setOrganization(orgRes.data)
            setForm({
              name: orgRes.data.name || "",
              address: orgRes.data.address || "",
              phone: orgRes.data.phone || "",
            })
          }
        }
      } else {
        toast.error(res.message || "Failed to load profile")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    loadProfile()
  }, [loadProfile])

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString()
  }

  const avatarFallback = React.useMemo(() => {
    const name = organization?.name || "Org"
    const parts = name.trim().split(/\s+/)
    const initials =
      (parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1]?.[0] || "" : "")
    return initials.toUpperCase() || "O"
  }, [organization])

  const handleSave = async () => {
    if (!organization) return
    setSaving(true)
    try {
      const response = await organizationsApi.updateOrganization(organization.id, {
        name: form.name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
      })
      if (response.success && response.data) {
        setOrganization(response.data)
        setForm({
          name: response.data.name || "",
          address: response.data.address || "",
          phone: response.data.phone || "",
        })
        toast.success("Organization updated")
        setEditMode(false)
      } else {
        toast.error(response.message || "Failed to update organization")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to update organization")
    } finally {
      setSaving(false)
    }
  }

  const renderLimit = (value?: number | null) => {
    if (value === null) return "Unlimited"
    if (value === undefined) return "N/A"
    return value.toString()
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
          title="Organization Profile"
          description="Manage your organization details"
        />
        <div className="flex flex-1 flex-col p-4 lg:p-6">
          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                  {loading ? (
                    <Skeleton className="h-16 w-16 rounded-full" />
                  ) : (
                    <Avatar className="h-16 w-16 text-lg">
                      <AvatarFallback>{avatarFallback}</AvatarFallback>
                    </Avatar>
                  )}
                  <div className="space-y-1">
                    <p className="text-xl font-semibold">{organization?.name || "Organization"}</p>
                    <p className="text-sm text-muted-foreground">{organization?.email || profile?.email || ""}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{organization?.subscriptionTier || "Tier"}</Badge>
                      <Badge
                        variant={
                          organization?.approvalStatus === "APPROVED"
                            ? "default"
                            : organization?.approvalStatus === "PENDING"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {organization?.approvalStatus || "PENDING"}
                      </Badge>
                      <Badge variant={organization?.isSubscriptionActive ? "outline" : "destructive"}>
                        {organization?.isSubscriptionActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {editMode ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (organization) {
                            setForm({
                              name: organization.name || "",
                              address: organization.address || "",
                              phone: organization.phone || "",
                            })
                          }
                          setEditMode(false)
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving ? "Saving..." : "Save"}
                      </Button>
                    </>
                  ) : (
                    <Button variant="outline" onClick={() => setEditMode(true)}>
                      Edit
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="org-name">Organization Name</Label>
                        <Input
                          id="org-name"
                          value={editMode ? form.name : organization?.name || ""}
                          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                          placeholder="Your organization"
                          disabled={!editMode}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="org-email">Email</Label>
                        <Input
                          id="org-email"
                          value={organization?.email || ""}
                          placeholder="contact@org.com"
                          disabled
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-address">Address</Label>
                      <Input
                        id="org-address"
                        value={editMode ? form.address : organization?.address || ""}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        placeholder="Address"
                        disabled={!editMode}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org-phone">Phone</Label>
                      <Input
                        id="org-phone"
                        value={editMode ? form.phone : organization?.phone || ""}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="+1 555 123 4567"
                        disabled={!editMode}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">Subscription Start</p>
                      <p className="font-medium">{formatDate(organization?.subscriptionStartDate)}</p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">Subscription End</p>
                      <p className="font-medium">{formatDate(organization?.subscriptionEndDate)}</p>
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">Doctors</p>
                      <p className="font-medium">
                        {organization
                          ? `${organization.currentDoctors} / ${renderLimit(organization.maxDoctors)}`
                          : "N/A"}
                      </p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p className="text-muted-foreground">Patients per Doctor</p>
                      <p className="font-medium">{renderLimit(organization?.maxPatientsPerDoctor)}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Face Scans per Doctor</p>
                    <p className="font-medium">{renderLimit(organization?.maxFaceScansPerDoctor)}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}



