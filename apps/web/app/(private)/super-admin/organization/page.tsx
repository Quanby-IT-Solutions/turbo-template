"use client"

import * as React from "react"
import {
  IconBuilding,
  IconCheck,
  IconBriefcase,
  IconUsers,
  IconSearch,
  IconRefresh,
  IconPlus,
  IconEdit,
  IconTrash,
  IconPlayerPause,
  IconDotsVertical,
} from "@tabler/icons-react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select"
import { Label } from "@/core/components/ui/label"
import { organizationsApi } from "@/features/organizations/api/organizations-api"
import { subscriptionsApi } from "@/features/subscriptions/api/subscriptions-api"
import { doctorsApi } from "@/features/doctors/api/doctors-api"
import type { Organization, CreateOrganizationRequest } from "@/features/organizations/api/organizations-api"
import type { SubscriptionTierSetting } from "@/features/subscriptions/api/subscriptions-api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { clearTokens, getSessionToken } from "@/services/api/client"

interface DoctorListItem {
  id: string
  email: string
  organizationId?: string | null
  organization?: { id: string; name: string } | null
  doctorInfo?: {
    firstName: string
    lastName: string
    specialization?: string
  } | null
}

export default function OrganizationPage() {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [currentTime, setCurrentTime] = React.useState("")
  const [organizations, setOrganizations] = React.useState<Organization[]>([])
  const [loading, setLoading] = React.useState(true)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [isAddDoctorDialogOpen, setIsAddDoctorDialogOpen] = React.useState(false)
  const [selectedOrganization, setSelectedOrganization] = React.useState<Organization | null>(null)
  const [availableDoctors, setAvailableDoctors] = React.useState<DoctorListItem[]>([])
  const [loadingDoctors, setLoadingDoctors] = React.useState(false)
  const [doctorSearchQuery, setDoctorSearchQuery] = React.useState("")
  const [tierSettings, setTierSettings] = React.useState<SubscriptionTierSetting[]>([])
  const [statistics, setStatistics] = React.useState({
    totalOrganizations: 0,
    activeOrganizations: 0,
    totalDoctors: 0,
    totalPatients: 0,
  })
  const [approvingId, setApprovingId] = React.useState<string | null>(null)
  const [rejectingId, setRejectingId] = React.useState<string | null>(null)

  // Form state
  const [formData, setFormData] = React.useState<CreateOrganizationRequest>({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    subscriptionTier: "FREE",
    maxDoctors: undefined,
    maxPatientsPerDoctor: undefined,
    maxFaceScansPerDoctor: undefined,
    subscriptionStartDate: new Date().toISOString().split('T')[0],
    subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  })

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const ampm = hours >= 12 ? "PM" : "AM"
      const displayHours = hours % 12 || 12
      const displayMinutes = minutes.toString().padStart(2, "0")
      setCurrentTime(`${displayHours}:${displayMinutes} ${ampm}`)
    }
    updateTime()
    const interval = setInterval(updateTime, 60000)
    return () => clearInterval(interval)
  }, [])

  const fetchOrganizations = React.useCallback(async () => {
    try {
      setLoading(true)
      
      // Check if token exists before making request
      const token = getSessionToken()
      if (!token) {
        toast.error("No authentication token found. Please log in again.")
        clearTokens()
        router.push("/login")
        return
      }

      const [orgsResponse, statsResponse] = await Promise.all([
        organizationsApi.getOrganizations(),
        organizationsApi.getStatistics(),
      ])

      if (orgsResponse.success && orgsResponse.data) {
        setOrganizations(orgsResponse.data)
      } else if (orgsResponse.error === "UNAUTHORIZED") {
        toast.error("Your session is invalid. Please log in again.")
        clearTokens()
        router.push("/login")
      }

      if (statsResponse.success && statsResponse.data) {
        setStatistics(statsResponse.data)
      } else if (statsResponse.error === "UNAUTHORIZED") {
        toast.error("Your session is invalid. Please log in again.")
        clearTokens()
        router.push("/login")
      }
    } catch (error) {
      toast.error("Failed to load organizations")
      console.error("Error fetching organizations:", error)
    } finally {
      setLoading(false)
    }
  }, [router])

  const fetchTierSettings = React.useCallback(async () => {
    try {
      // Check if token exists before making request
      const token = getSessionToken()
      if (!token) {
        toast.error("No authentication token found. Please log in again.")
        clearTokens()
        router.push("/login")
        return
      }

      const response = await subscriptionsApi.listTierSettings()
      if (response.success && response.data) {
        const orgTiers = response.data.filter(
          (tier: SubscriptionTierSetting) => tier.entityType === "ORGANIZATION"
        )
        setTierSettings(orgTiers)
      } else if (response.error === "UNAUTHORIZED") {
        toast.error("Your session is invalid. Please log in again.")
        clearTokens()
        router.push("/login")
      }
    } catch (error) {
      console.error("Error fetching tier settings:", error)
    }
  }, [router])

  React.useEffect(() => {
    fetchOrganizations()
    fetchTierSettings()
  }, [fetchOrganizations, fetchTierSettings])

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good Morning"
    if (hour < 18) return "Good Afternoon"
    return "Good Evening"
  }

  const getFormattedDate = () => {
    const date = new Date()
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    return date.toLocaleDateString("en-US", options)
  }

  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.address?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreateOrganization = async () => {
    try {
      const response = await organizationsApi.createOrganization(formData)
      if (response.success) {
        toast.success("Organization created successfully")
        setIsDialogOpen(false)
        setFormData({
          name: "",
          description: "",
          address: "",
          phone: "",
          email: "",
          website: "",
          subscriptionTier: "FREE",
          maxDoctors: undefined,
          maxPatientsPerDoctor: undefined,
          maxFaceScansPerDoctor: undefined,
          subscriptionStartDate: new Date().toISOString().split('T')[0],
          subscriptionEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        })
        fetchOrganizations()
      } else {
        toast.error(response.message || "Failed to create organization")
      }
    } catch (error) {
      toast.error("Failed to create organization")
      console.error("Error creating organization:", error)
    }
  }

  const handleDeleteOrganization = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return

    try {
      const response = await organizationsApi.deleteOrganization(id)
      if (response.success) {
        toast.success("Organization deleted successfully")
        fetchOrganizations()
      } else {
        toast.error(response.message || "Failed to delete organization")
      }
    } catch (error) {
      toast.error("Failed to delete organization")
      console.error("Error deleting organization:", error)
    }
  }

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      const response = await organizationsApi.toggleOrganizationStatus(id, !currentStatus)
      if (response.success) {
        toast.success(`Organization ${!currentStatus ? "activated" : "deactivated"} successfully`)
        fetchOrganizations()
      } else {
        toast.error(response.message || "Failed to update organization status")
      }
    } catch (error) {
      toast.error("Failed to update organization status")
      console.error("Error toggling status:", error)
    }
  }

  const handleApproveOrganization = async (id: string) => {
    setApprovingId(id)
    try {
      const response = await organizationsApi.approveOrganization(id)
      if (response.success) {
        toast.success("Organization approved")
        fetchOrganizations()
      } else {
        toast.error(response.message || "Failed to approve organization")
      }
    } catch (error) {
      toast.error("Failed to approve organization")
      console.error("Error approving organization:", error)
    } finally {
      setApprovingId(null)
    }
  }

  const handleRejectOrganization = async (id: string) => {
    const reason = window.prompt("Enter rejection reason (optional)") || ""
    setRejectingId(id)
    try {
      const response = await organizationsApi.rejectOrganization(id, reason || undefined)
      if (response.success) {
        toast.success("Organization rejected")
        fetchOrganizations()
      } else {
        toast.error(response.message || "Failed to reject organization")
      }
    } catch (error) {
      toast.error("Failed to reject organization")
      console.error("Error rejecting organization:", error)
    } finally {
      setRejectingId(null)
    }
  }

  const handleOpenAddDoctorDialog = async (org: Organization) => {
    setSelectedOrganization(org)
    setIsAddDoctorDialogOpen(true)
    setLoadingDoctors(true)
    try {
      const response = await doctorsApi.listDoctors({ limit: 100 })
      if (response.success && response.data) {
        // Filter out doctors already assigned to this organization
        const unassignedDoctors = response.data.items.filter(
          (doctor: DoctorListItem) => !doctor.organizationId || doctor.organizationId !== org.id
        )
        setAvailableDoctors(unassignedDoctors)
      }
    } catch (error) {
      toast.error("Failed to load doctors")
      console.error("Error loading doctors:", error)
    } finally {
      setLoadingDoctors(false)
    }
  }

  const handleAssignDoctor = async (doctorId: string) => {
    if (!selectedOrganization) return

    try {
      const response = await doctorsApi.updateDoctor(doctorId, {
        organizationId: selectedOrganization.id,
      })
      if (response.success) {
        toast.success("Doctor assigned to organization successfully")
        setIsAddDoctorDialogOpen(false)
        setSelectedOrganization(null)
        fetchOrganizations()
        // Refresh the doctors list
        const doctorsResponse = await doctorsApi.listDoctors({ limit: 100 })
        if (doctorsResponse.success && doctorsResponse.data) {
          const unassignedDoctors = doctorsResponse.data.items.filter(
            (doctor: DoctorListItem) => !doctor.organizationId || doctor.organizationId !== selectedOrganization.id
          )
          setAvailableDoctors(unassignedDoctors)
        }
      } else {
        toast.error(response.message || "Failed to assign doctor")
      }
    } catch (error) {
      toast.error("Failed to assign doctor")
      console.error("Error assigning doctor:", error)
    }
  }

  const filteredAvailableDoctors = availableDoctors.filter((doctor) => {
    const searchLower = doctorSearchQuery.toLowerCase()
    const name = `${doctor.doctorInfo?.firstName || ""} ${doctor.doctorInfo?.lastName || ""}`.toLowerCase()
    const email = doctor.email?.toLowerCase() || ""
    const specialization = doctor.doctorInfo?.specialization?.toLowerCase() || ""
    return name.includes(searchLower) || email.includes(searchLower) || specialization.includes(searchLower)
  })

  const getTierBadgeVariant = (tier: string) => {
    switch (tier) {
      case "FREE":
        return "secondary"
      case "BASIC":
        return "default"
      case "PREMIUM":
        return "default"
      case "ENTERPRISE":
        return "default"
      default:
        return "secondary"
    }
  }

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })
  }

  const selectedTierSetting = tierSettings.find(
    (tier) => tier.tier === formData.subscriptionTier
  )

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
          title="Organization Management"
          description="Manage organizations and their settings"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              {/* Header Section */}
              <div className="px-4 lg:px-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h1 className="text-2xl font-bold mb-1">
                      {getGreeting()}, Super Admin
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Organization Management • {getFormattedDate()}
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    {currentTime}
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                  <Card>
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <IconBuilding className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statistics.totalOrganizations}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Total Organizations
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <IconCheck className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statistics.activeOrganizations}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Active Organizations
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <IconBriefcase className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statistics.totalDoctors}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Total Doctors
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <IconUsers className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{statistics.totalPatients}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Total Patients
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Organizations Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Organizations</h2>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={fetchOrganizations}>
                        <IconRefresh className="h-4 w-4" />
                      </Button>
                      <Button onClick={() => setIsDialogOpen(true)}>
                        <IconPlus className="h-4 w-4 mr-2" />
                        Add Organization
                      </Button>
                    </div>
                  </div>

                  {/* Search and Filter */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search organizations..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>

                  {/* Organizations Table */}
                  <Card>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>NAME</TableHead>
                            <TableHead>ADDRESS</TableHead>
                            <TableHead>CONTACT</TableHead>
                            <TableHead>TIER</TableHead>
                            <TableHead>DOCTORS</TableHead>
                            <TableHead>APPROVAL</TableHead>
                            <TableHead>STATUS</TableHead>
                            <TableHead>EXPIRES</TableHead>
                            <TableHead className="text-right">ACTIONS</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                Loading organizations...
                              </TableCell>
                            </TableRow>
                          ) : filteredOrganizations.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                No organizations found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredOrganizations.map((org) => (
                              <TableRow key={org.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{org.name}</p>
                                    <p className="text-sm text-muted-foreground">{org.description || "No description"}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">{org.address || "N/A"}</TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    <p>{org.phone || "N/A"}</p>
                                    <p className="text-muted-foreground">{org.email || "N/A"}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={getTierBadgeVariant(org.subscriptionTier)}
                                    className="text-xs font-semibold uppercase"
                                  >
                                    {org.subscriptionTier}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {org.currentDoctors} / {org.maxDoctors ?? "∞"}
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={
                                      org.approvalStatus === "APPROVED"
                                        ? "default"
                                        : org.approvalStatus === "PENDING"
                                          ? "secondary"
                                          : "destructive"
                                    }
                                  >
                                    {org.approvalStatus || "PENDING"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant={org.isActive ? "default" : "secondary"}
                                    className={
                                      org.isActive
                                        ? "bg-green-500 hover:bg-green-600"
                                        : ""
                                    }
                                  >
                                    {org.isActive ? "ACTIVE" : "INACTIVE"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {formatDate(org.subscriptionEndDate)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2 mb-2">
                                    {org.approvalStatus === "PENDING" && (
                                      <>
                                        <Button
                                          size="sm"
                                          onClick={() => handleApproveOrganization(org.id)}
                                          disabled={approvingId === org.id}
                                        >
                                          {approvingId === org.id ? "Approving..." : "Approve"}
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() => handleRejectOrganization(org.id)}
                                          disabled={rejectingId === org.id}
                                        >
                                          {rejectingId === org.id ? "Rejecting..." : "Reject"}
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <IconDotsVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                      <DropdownMenuItem
                                        onClick={() => handleOpenAddDoctorDialog(org)}
                                      >
                                        <IconPlus className="h-4 w-4 mr-2" />
                                        Add Doctor
                                      </DropdownMenuItem>
                                      <DropdownMenuItem>
                                        <IconEdit className="h-4 w-4 mr-2" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => handleToggleStatus(org.id, org.isActive)}
                                      >
                                        <IconPlayerPause className="h-4 w-4 mr-2" />
                                        {org.isActive ? "Deactivate" : "Activate"}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        className="text-destructive"
                                        onClick={() => handleDeleteOrganization(org.id, org.name)}
                                      >
                                        <IconTrash className="h-4 w-4 mr-2" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Create Organization Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Organization</DialogTitle>
            <DialogDescription>
              Add a new organization to the system. Configure subscription tier and limits.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter organization name"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Enter organization description"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Enter organization address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                placeholder="Enter website URL"
              />
            </div>

            <div className="border-t pt-4">
              <h3 className="text-sm font-semibold mb-4">Subscription Settings</h3>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="subscriptionTier">Subscription Tier *</Label>
                  <Select
                    value={formData.subscriptionTier}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        subscriptionTier: value as "FREE" | "BASIC" | "PREMIUM" | "ENTERPRISE" | "T",
                        maxDoctors: tierSettings.find((t) => t.tier === value)?.maxDoctors || undefined,
                        maxPatientsPerDoctor:
                          tierSettings.find((t) => t.tier === value)?.maxPatientsPerDoctor || undefined,
                        maxFaceScansPerDoctor:
                          tierSettings.find((t) => t.tier === value)?.maxFaceScansPerDoctor || undefined,
                      })
                    }
                  >
                    <SelectTrigger id="subscriptionTier">
                      <SelectValue placeholder="Select tier" />
                    </SelectTrigger>
                    <SelectContent>
                      {tierSettings.map((tier) => (
                        <SelectItem key={tier.id} value={tier.tier}>
                          {tier.displayName} ({tier.tier})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedTierSetting && (
                    <p className="text-xs text-muted-foreground">
                      {selectedTierSetting.description || "No description available"}
                    </p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxDoctors">
                    Max Doctors {selectedTierSetting?.maxDoctors !== null && selectedTierSetting?.maxDoctors !== undefined && `(Default: ${selectedTierSetting.maxDoctors})`}
                  </Label>
                  <Input
                    id="maxDoctors"
                    type="number"
                    value={formData.maxDoctors ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxDoctors: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder={selectedTierSetting?.maxDoctors?.toString() || "Unlimited"}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for unlimited (or use tier default)
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxPatientsPerDoctor">
                    Patients per Doctor {selectedTierSetting?.maxPatientsPerDoctor !== null && selectedTierSetting?.maxPatientsPerDoctor !== undefined && `(Default: ${selectedTierSetting.maxPatientsPerDoctor})`}
                  </Label>
                  <Input
                    id="maxPatientsPerDoctor"
                    type="number"
                    value={formData.maxPatientsPerDoctor ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxPatientsPerDoctor: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder={selectedTierSetting?.maxPatientsPerDoctor?.toString() || "Unlimited"}
                  />
                  <p className="text-xs text-muted-foreground">
                    Patients allowed for each doctor (leave empty to use tier default)
                  </p>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="maxFaceScansPerDoctor">
                    Face Scans per Doctor {selectedTierSetting?.maxFaceScansPerDoctor !== null && selectedTierSetting?.maxFaceScansPerDoctor !== undefined && `(Default: ${selectedTierSetting.maxFaceScansPerDoctor})`}
                  </Label>
                  <Input
                    id="maxFaceScansPerDoctor"
                    type="number"
                    value={formData.maxFaceScansPerDoctor ?? ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        maxFaceScansPerDoctor: e.target.value ? parseInt(e.target.value) : undefined,
                      })
                    }
                    placeholder={selectedTierSetting?.maxFaceScansPerDoctor?.toString() || "Unlimited"}
                  />
                  <p className="text-xs text-muted-foreground">
                    Per-doctor face scan pool distributed across their patients
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="subscriptionStartDate">Start Date</Label>
                    <Input
                      id="subscriptionStartDate"
                      type="date"
                      value={formData.subscriptionStartDate}
                      onChange={(e) =>
                        setFormData({ ...formData, subscriptionStartDate: e.target.value })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="subscriptionEndDate">End Date</Label>
                    <Input
                      id="subscriptionEndDate"
                      type="date"
                      value={formData.subscriptionEndDate}
                      onChange={(e) =>
                        setFormData({ ...formData, subscriptionEndDate: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrganization} disabled={!formData.name}>
              Create Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Doctor to Organization Dialog */}
      <Dialog open={isAddDoctorDialogOpen} onOpenChange={setIsAddDoctorDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Doctor to {selectedOrganization?.name}</DialogTitle>
            <DialogDescription>
              Select a doctor to assign to this organization. Only unassigned doctors are shown.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="mb-4">
              <Input
                placeholder="Search doctors by name, email, or specialization..."
                value={doctorSearchQuery}
                onChange={(e) => setDoctorSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            {loadingDoctors ? (
              <div className="text-center py-8 text-muted-foreground">Loading doctors...</div>
            ) : filteredAvailableDoctors.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {doctorSearchQuery ? "No doctors found matching your search" : "No available doctors to assign"}
              </div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredAvailableDoctors.map((doctor) => (
                  <Card key={doctor.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-semibold">
                          {doctor.doctorInfo?.firstName} {doctor.doctorInfo?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground">{doctor.email}</p>
                        <p className="text-sm text-muted-foreground">
                          {doctor.doctorInfo?.specialization}
                          {doctor.organizationId && doctor.organization && (
                            <span className="ml-2">
                              • Currently at: {doctor.organization.name}
                            </span>
                          )}
                        </p>
                      </div>
                      <Button
                        onClick={() => handleAssignDoctor(doctor.id)}
                        size="sm"
                      >
                        <IconPlus className="h-4 w-4 mr-2" />
                        Assign
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDoctorDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
