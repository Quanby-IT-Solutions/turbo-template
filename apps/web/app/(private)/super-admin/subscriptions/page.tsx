"use client"

import * as React from "react"
import {
  IconBuilding,
  IconUser,
  IconUsers,
  IconSearch,
  IconRefresh,
  IconEdit,
  IconCheck,
  IconX,
  IconTrash,
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
import { Label } from "@/core/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/core/components/ui/tabs"
import {
  type DoctorSubscription,
  type OrganizationSubscription,
  type PatientSubscription,
  type SubscriptionEntityType,
  type SubscriptionTierSetting,
  type SubscriptionTier,
  type TierSettingRequest,
  type TierSettingUpdateRequest,
  type UpdateSubscriptionRequest,
  subscriptionsApi,
} from "@/features/subscriptions/api/subscriptions-api"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { clearTokens, getSessionToken } from "@/services/api/client"

type SubscriptionTab = "organizations" | "doctors" | "patients" | "tiers"

export default function SubscriptionsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = React.useState<SubscriptionTab>("organizations")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [filterTier, setFilterTier] = React.useState<SubscriptionTier | "all">("all")
  const [activeOnly, setActiveOnly] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [organizations, setOrganizations] = React.useState<OrganizationSubscription[]>([])
  const [doctors, setDoctors] = React.useState<DoctorSubscription[]>([])
  const [patients, setPatients] = React.useState<PatientSubscription[]>([])
  const [selectedItem, setSelectedItem] = React.useState<OrganizationSubscription | DoctorSubscription | PatientSubscription | null>(null)
  const [editDialogOpen, setEditDialogOpen] = React.useState(false)
  const [editForm, setEditForm] = React.useState({
    subscriptionTier: "FREE" as SubscriptionTier,
    maxDoctors: "",
    maxPatientsPerDoctor: "",
    maxFaceScansPerDoctor: "",
    maxPatients: "",
    maxFaceScans: "",
    subscriptionStartDate: "",
    subscriptionEndDate: "",
    isSubscriptionActive: true,
  })
  const [tierSettings, setTierSettings] = React.useState<SubscriptionTierSetting[]>([])
  const [tiersLoading, setTiersLoading] = React.useState(false)
  const [tierDialogOpen, setTierDialogOpen] = React.useState(false)
  const [tierDialogMode, setTierDialogMode] = React.useState<"create" | "edit">("create")
  const [editingTierSetting, setEditingTierSetting] = React.useState<SubscriptionTierSetting | null>(null)
  const [tierForm, setTierForm] = React.useState({
    tier: "FREE" as SubscriptionTier,
    entityType: "ORGANIZATION" as SubscriptionEntityType,
    displayName: "",
    description: "",
    maxDoctors: "",
    maxPatients: "",
    maxFaceScans: "",
    maxPatientsPerDoctor: "",
    maxFaceScansPerDoctor: "",
  })

  const isOrganizationItem = (
    item: OrganizationSubscription | DoctorSubscription | PatientSubscription | null,
  ): item is OrganizationSubscription => Boolean(item && "maxDoctors" in item)

  const isDoctorItem = (
    item: OrganizationSubscription | DoctorSubscription | PatientSubscription | null,
  ): item is DoctorSubscription => Boolean(item && "maxPatients" in item)

  const isPatientItem = (
    item: OrganizationSubscription | DoctorSubscription | PatientSubscription | null,
  ): item is PatientSubscription => Boolean(item && !("maxDoctors" in item) && !("maxPatients" in item))

  const formatLimitValue = (value: number | null | undefined) =>
    typeof value === "number" ? value.toString() : ""

  const getSelectedEntityName = () => {
    if (!selectedItem) return ""
    if (isOrganizationItem(selectedItem)) {
      return selectedItem.name
    }
    return `${selectedItem.firstName} ${selectedItem.lastName}`
  }

  const loadSubscriptions = React.useCallback(async () => {
    setLoading(true)
    try {
      // Check if token exists before making request
      const token = getSessionToken()
      if (!token) {
        toast.error("No authentication token found. Please log in again.")
        clearTokens()
        router.push("/login")
        return
      }

      const response = await subscriptionsApi.getAllSubscriptions({
        type: activeTab === "organizations" ? "organization" : activeTab === "doctors" ? "doctor" : "patient",
        tier: filterTier !== "all" ? filterTier : undefined,
        activeOnly,
      })

      if (response.success && response.data) {
        if (activeTab === "organizations") {
          setOrganizations(response.data.organizations ?? [])
        } else if (activeTab === "doctors") {
          setDoctors(response.data.doctors ?? [])
        } else {
          setPatients(response.data.patients ?? [])
        }
      } else if (response.error === "UNAUTHORIZED") {
        toast.error("Your session is invalid. Please log in again.")
        clearTokens()
        router.push("/login")
      } else {
        toast.error(response.message || "Failed to load subscriptions")
      }
    } catch (error) {
      toast.error("Failed to load subscriptions")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [activeTab, filterTier, activeOnly, router])

  const loadTierSettings = React.useCallback(async () => {
    setTiersLoading(true)
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
        setTierSettings(response.data)
      } else if (response.error === "UNAUTHORIZED") {
        toast.error("Your session is invalid. Please log in again.")
        clearTokens()
        router.push("/login")
      } else {
        toast.error(response.message || "Failed to load tier settings")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load tier settings")
    } finally {
      setTiersLoading(false)
    }
  }, [router])

  React.useEffect(() => {
    if (activeTab === "tiers") {
      loadTierSettings()
    } else {
      loadSubscriptions()
    }
  }, [activeTab, loadSubscriptions, loadTierSettings])

  const handleEdit = (item: OrganizationSubscription | DoctorSubscription | PatientSubscription) => {
    setSelectedItem(item)

    const maxDoctorsValue = isOrganizationItem(item) ? formatLimitValue(item.maxDoctors) : ""
    const maxPatientsPerDoctorValue = isOrganizationItem(item)
      ? formatLimitValue(item.maxPatientsPerDoctor)
      : ""
    const maxFaceScansPerDoctorValue = isOrganizationItem(item)
      ? formatLimitValue(item.maxFaceScansPerDoctor)
      : ""
    const maxPatientsValue = isDoctorItem(item) ? formatLimitValue(item.maxPatients) : ""

    let maxFaceScansValue = ""
    if (isDoctorItem(item) || isPatientItem(item)) {
      maxFaceScansValue = formatLimitValue(item.maxFaceScans)
    }

    setEditForm({
      subscriptionTier: item.subscriptionTier,
      maxDoctors: maxDoctorsValue,
      maxPatientsPerDoctor: maxPatientsPerDoctorValue,
      maxFaceScansPerDoctor: maxFaceScansPerDoctorValue,
      maxPatients: maxPatientsValue,
      maxFaceScans: maxFaceScansValue,
      subscriptionStartDate: item.subscriptionStartDate ? new Date(item.subscriptionStartDate).toISOString().split("T")[0] : "",
      subscriptionEndDate: item.subscriptionEndDate ? new Date(item.subscriptionEndDate).toISOString().split("T")[0] : "",
      isSubscriptionActive: item.isSubscriptionActive ?? true,
    })
    setEditDialogOpen(true)
  }

  const handleSave = async () => {
    if (!selectedItem) return

    setLoading(true)
    try {
      const updateData: UpdateSubscriptionRequest = {
        subscriptionTier: editForm.subscriptionTier,
        isSubscriptionActive: editForm.isSubscriptionActive,
      }

      if (activeTab === "organizations" && isOrganizationItem(selectedItem)) {
        updateData.maxDoctors = editForm.maxDoctors === "" ? null : parseInt(editForm.maxDoctors) || null
        updateData.maxPatientsPerDoctor =
          editForm.maxPatientsPerDoctor === "" ? null : parseInt(editForm.maxPatientsPerDoctor) || null
        updateData.maxFaceScansPerDoctor =
          editForm.maxFaceScansPerDoctor === "" ? null : parseInt(editForm.maxFaceScansPerDoctor) || null
        updateData.subscriptionStartDate = editForm.subscriptionStartDate || undefined
        updateData.subscriptionEndDate = editForm.subscriptionEndDate || undefined

        const response = await subscriptionsApi.updateOrganizationSubscription(selectedItem.id, updateData)
        if (response.success) {
          toast.success("Organization subscription updated successfully")
          setEditDialogOpen(false)
          loadSubscriptions()
        } else {
          toast.error(response.message || "Failed to update subscription")
        }
      } else if (activeTab === "doctors" && isDoctorItem(selectedItem)) {
        updateData.maxPatients = editForm.maxPatients === "" ? null : parseInt(editForm.maxPatients) || null
        updateData.maxFaceScans = editForm.maxFaceScans === "" ? null : parseInt(editForm.maxFaceScans) || null
        updateData.subscriptionStartDate = editForm.subscriptionStartDate || undefined
        updateData.subscriptionEndDate = editForm.subscriptionEndDate || undefined

        const response = await subscriptionsApi.updateDoctorSubscription(selectedItem.userId, updateData)
        if (response.success) {
          toast.success("Doctor subscription updated successfully")
          setEditDialogOpen(false)
          loadSubscriptions()
        } else {
          toast.error(response.message || "Failed to update subscription")
        }
      } else if (isPatientItem(selectedItem)) {
        updateData.maxFaceScans = editForm.maxFaceScans === "" ? null : parseInt(editForm.maxFaceScans) || null
        updateData.subscriptionStartDate = editForm.subscriptionStartDate || undefined
        updateData.subscriptionEndDate = editForm.subscriptionEndDate || undefined

        const response = await subscriptionsApi.updatePatientSubscription(selectedItem.userId, updateData)
        if (response.success) {
          toast.success("Patient subscription updated successfully")
          setEditDialogOpen(false)
          loadSubscriptions()
        } else {
          toast.error(response.message || "Failed to update subscription")
        }
      }
    } catch (error) {
      toast.error("Failed to update subscription")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const getTierBadgeColor = (tier: SubscriptionTier) => {
    switch (tier) {
      case "FREE":
        return "bg-gray-500"
      case "BASIC":
        return "bg-blue-500"
      case "PREMIUM":
        return "bg-purple-500"
      case "ENTERPRISE":
        return "bg-green-500"
      case "T":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const filteredOrganizations = organizations.filter((org) =>
    org.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredDoctors = doctors.filter((doc) =>
    `${doc.firstName} ${doc.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPatients = patients.filter((pat) =>
    `${pat.firstName} ${pat.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pat.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredTierSettings = tierSettings.filter((setting) => {
    const matchesSearch =
      setting.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      setting.tier.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSearch
  })

  const tierFormLimitFields = React.useMemo(() => {
    if (tierForm.entityType === "ORGANIZATION") {
      return {
        showMaxDoctors: true,
        showMaxPatients: false,
        showMaxFaceScans: false,
        showMaxPatientsPerDoctor: true,
        showMaxFaceScansPerDoctor: true,
      }
    }
    if (tierForm.entityType === "DOCTOR") {
      return {
        showMaxDoctors: false,
        showMaxPatients: true,
        showMaxFaceScans: true,
        showMaxPatientsPerDoctor: false,
        showMaxFaceScansPerDoctor: false,
      }
    }
    return {
      showMaxDoctors: false,
      showMaxPatients: false,
      showMaxFaceScans: true,
      showMaxPatientsPerDoctor: false,
      showMaxFaceScansPerDoctor: false,
    }
  }, [tierForm.entityType])

  const resetTierForm = () => {
    setTierForm({
      tier: "FREE",
      entityType: "ORGANIZATION",
      displayName: "",
      description: "",
      maxDoctors: "",
      maxPatients: "",
      maxFaceScans: "",
      maxPatientsPerDoctor: "",
      maxFaceScansPerDoctor: "",
    })
    setEditingTierSetting(null)
    setTierDialogMode("create")
  }

  const openCreateTierDialog = () => {
    resetTierForm()
    setTierDialogMode("create")
    setTierDialogOpen(true)
  }

  const openEditTierDialog = (setting: SubscriptionTierSetting) => {
    setEditingTierSetting(setting)
    setTierDialogMode("edit")
    setTierForm({
      tier: setting.tier,
      entityType: setting.entityType,
      displayName: setting.displayName,
      description: setting.description ?? "",
      maxDoctors: formatLimitValue(setting.maxDoctors) ?? "",
      maxPatients: formatLimitValue(setting.maxPatients) ?? "",
      maxFaceScans: formatLimitValue(setting.maxFaceScans) ?? "",
      maxPatientsPerDoctor: formatLimitValue(setting.maxPatientsPerDoctor) ?? "",
      maxFaceScansPerDoctor: formatLimitValue(setting.maxFaceScansPerDoctor) ?? "",
    })
    setTierDialogOpen(true)
  }

  const handleTierFormSubmit = async () => {
    try {
      setTiersLoading(true)
      const payload: TierSettingRequest | TierSettingUpdateRequest =
        tierDialogMode === "create"
          ? {
              tier: tierForm.tier,
              entityType: tierForm.entityType,
              displayName: tierForm.displayName.trim(),
              description: tierForm.description?.trim() || undefined,
              maxDoctors:
                tierForm.maxDoctors === "" ? null : parseInt(tierForm.maxDoctors, 10) || null,
              maxPatients:
                tierForm.maxPatients === "" ? null : parseInt(tierForm.maxPatients, 10) || null,
              maxFaceScans:
                tierForm.maxFaceScans === "" ? null : parseInt(tierForm.maxFaceScans, 10) || null,
              maxPatientsPerDoctor:
                tierForm.maxPatientsPerDoctor === ""
                  ? null
                  : parseInt(tierForm.maxPatientsPerDoctor, 10) || null,
              maxFaceScansPerDoctor:
                tierForm.maxFaceScansPerDoctor === ""
                  ? null
                  : parseInt(tierForm.maxFaceScansPerDoctor, 10) || null,
            }
          : {
              displayName: tierForm.displayName.trim(),
              description: tierForm.description?.trim() || undefined,
              maxDoctors:
                tierForm.maxDoctors === "" ? null : parseInt(tierForm.maxDoctors, 10) || null,
              maxPatients:
                tierForm.maxPatients === "" ? null : parseInt(tierForm.maxPatients, 10) || null,
              maxFaceScans:
                tierForm.maxFaceScans === "" ? null : parseInt(tierForm.maxFaceScans, 10) || null,
              maxPatientsPerDoctor:
                tierForm.maxPatientsPerDoctor === ""
                  ? null
                  : parseInt(tierForm.maxPatientsPerDoctor, 10) || null,
              maxFaceScansPerDoctor:
                tierForm.maxFaceScansPerDoctor === ""
                  ? null
                  : parseInt(tierForm.maxFaceScansPerDoctor, 10) || null,
            }

      const response =
        tierDialogMode === "create"
          ? await subscriptionsApi.createTierSetting(payload as TierSettingRequest)
          : await subscriptionsApi.updateTierSetting(
              editingTierSetting!.id,
              payload as TierSettingUpdateRequest,
            )

      if (response.success) {
        toast.success(
          `Tier ${tierDialogMode === "create" ? "created" : "updated"} successfully`,
        )
        setTierDialogOpen(false)
        resetTierForm()
        loadTierSettings()
      } else {
        toast.error(response.message || "Failed to save tier setting")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to save tier setting")
    } finally {
      setTiersLoading(false)
    }
  }

  const handleDeleteTierSetting = async (setting: SubscriptionTierSetting) => {
    const confirmed =
      typeof window !== "undefined"
        ? window.confirm(
            `Delete tier setting "${setting.displayName}" for ${setting.entityType.toLowerCase()}s?`,
          )
        : false
    if (!confirmed) return

    try {
      setTiersLoading(true)
      const response = await subscriptionsApi.deleteTierSetting(setting.id)
      if (response.success) {
        toast.success("Tier setting deleted")
        loadTierSettings()
      } else {
        toast.error(response.message || "Failed to delete tier setting")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to delete tier setting")
    } finally {
      setTiersLoading(false)
    }
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
      <SidebarWrapper role="super-admin" variant="inset" />
      <SidebarInset>
        <RoleHeader
          title="Subscription Management"
          description="Manage subscriptions for organizations, doctors, and patients"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mb-6">
                  <Card>
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <IconBuilding className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{organizations.length}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Organizations
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="flex items-center gap-4 p-6">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <IconUser className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{doctors.length}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Doctors
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
                        <p className="text-2xl font-bold">{patients.length}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">
                          Patients
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6">
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="relative flex-1">
                        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          placeholder="Search..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                      <Select value={filterTier} onValueChange={(value) => setFilterTier(value as SubscriptionTier | "all")}>
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Filter by tier" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Tiers</SelectItem>
                          <SelectItem value="FREE">Free</SelectItem>
                          <SelectItem value="BASIC">Basic</SelectItem>
                          <SelectItem value="PREMIUM">Premium</SelectItem>
                          <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                          <SelectItem value="T">T Tier</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant={activeOnly ? "default" : "outline"}
                        onClick={() => setActiveOnly(!activeOnly)}
                      >
                        {activeOnly ? <IconCheck className="h-4 w-4 mr-2" /> : <IconX className="h-4 w-4 mr-2" />}
                        Active Only
                      </Button>
                      <Button variant="outline" size="icon" onClick={loadSubscriptions}>
                        <IconRefresh className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SubscriptionTab)}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="organizations">Organizations</TabsTrigger>
                    <TabsTrigger value="doctors">Doctors</TabsTrigger>
                    <TabsTrigger value="patients">Patients</TabsTrigger>
                    <TabsTrigger value="tiers">Tier Settings</TabsTrigger>
                  </TabsList>

                  <TabsContent value="organizations">
                    <Card>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>ORGANIZATION</TableHead>
                              <TableHead>TIER</TableHead>
                              <TableHead>DOCTORS</TableHead>
                          <TableHead>LIMITS</TableHead>
                              <TableHead>STATUS</TableHead>
                              <TableHead>EXPIRES</TableHead>
                              <TableHead className="text-right">ACTIONS</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loading ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                  Loading...
                                </TableCell>
                              </TableRow>
                            ) : filteredOrganizations.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                  No organizations found
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredOrganizations.map((org) => (
                                <TableRow key={org.id}>
                                  <TableCell className="font-medium">{org.name}</TableCell>
                                  <TableCell>
                                    <Badge className={getTierBadgeColor(org.subscriptionTier)}>
                                      {org.subscriptionTier}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {org.currentDoctors} / {org.maxDoctors ?? "∞"}
                                  </TableCell>
                                <TableCell>
                                  <div className="text-sm space-y-1">
                                    <p>Doctors: {org.maxDoctors ?? "Unlimited"}</p>
                                    <p>Patients/Doctor: {org.maxPatientsPerDoctor ?? "Unlimited"}</p>
                                    <p>Face Scans/Doctor: {org.maxFaceScansPerDoctor ?? "Unlimited"}</p>
                                  </div>
                                </TableCell>
                                  <TableCell>
                                    <Badge variant={org.isSubscriptionActive ? "default" : "secondary"}>
                                      {org.isSubscriptionActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {org.subscriptionEndDate
                                      ? new Date(org.subscriptionEndDate).toLocaleDateString()
                                      : "Never"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(org)}
                                    >
                                      <IconEdit className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="doctors">
                    <Card>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>DOCTOR</TableHead>
                              <TableHead>ORGANIZATION</TableHead>
                              <TableHead>TIER</TableHead>
                              <TableHead>PATIENTS</TableHead>
                              <TableHead>FACE SCANS</TableHead>
                              <TableHead>STATUS</TableHead>
                              <TableHead className="text-right">ACTIONS</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loading ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                  Loading...
                                </TableCell>
                              </TableRow>
                            ) : filteredDoctors.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                  No doctors found
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredDoctors.map((doc) => (
                                <TableRow key={doc.id}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{doc.firstName} {doc.lastName}</p>
                                      <p className="text-sm text-muted-foreground">{doc.user?.email}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>{doc.user?.organization?.name || "N/A"}</TableCell>
                                  <TableCell>
                                    <Badge className={getTierBadgeColor(doc.subscriptionTier)}>
                                      {doc.subscriptionTier}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {doc.currentPatients} / {doc.maxPatients ?? "∞"}
                                  </TableCell>
                                  <TableCell>
                                    {doc.currentFaceScans} / {doc.maxFaceScans ?? "∞"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={doc.isSubscriptionActive ? "default" : "secondary"}>
                                      {doc.isSubscriptionActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(doc)}
                                    >
                                      <IconEdit className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="patients">
                    <Card>
                      <CardContent className="p-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>PATIENT</TableHead>
                              <TableHead>TIER</TableHead>
                              <TableHead>FACE SCANS</TableHead>
                              <TableHead>STATUS</TableHead>
                              <TableHead>EXPIRES</TableHead>
                              <TableHead className="text-right">ACTIONS</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {loading ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                  Loading...
                                </TableCell>
                              </TableRow>
                            ) : filteredPatients.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                  No patients found
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredPatients.map((pat) => (
                                <TableRow key={pat.id}>
                                  <TableCell>
                                    <div>
                                      <p className="font-medium">{pat.firstName} {pat.lastName}</p>
                                      <p className="text-sm text-muted-foreground">{pat.user?.email}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge className={getTierBadgeColor(pat.subscriptionTier)}>
                                      {pat.subscriptionTier}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {pat.currentFaceScans} / {pat.maxFaceScans ?? "∞"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant={pat.isSubscriptionActive ? "default" : "secondary"}>
                                      {pat.isSubscriptionActive ? "Active" : "Inactive"}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {pat.subscriptionEndDate
                                      ? new Date(pat.subscriptionEndDate).toLocaleDateString()
                                      : "Never"}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleEdit(pat)}
                                    >
                                      <IconEdit className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="tiers">
                    <Card>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h2 className="text-lg font-semibold">Tier Settings</h2>
                            <p className="text-sm text-muted-foreground">
                              Manage default limits for each subscription tier and entity type
                            </p>
                          </div>
                          <Button onClick={openCreateTierDialog}>
                            Add Tier Setting
                          </Button>
                        </div>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>TIER</TableHead>
                                <TableHead>ENTITY TYPE</TableHead>
                                <TableHead>DISPLAY NAME</TableHead>
                                <TableHead>DESCRIPTION</TableHead>
                                <TableHead>LIMITS</TableHead>
                                <TableHead className="text-right">ACTIONS</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {tiersLoading ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-8">
                                    Loading tier settings...
                                  </TableCell>
                                </TableRow>
                              ) : filteredTierSettings.length === 0 ? (
                                <TableRow>
                                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No tier settings found
                                  </TableCell>
                                </TableRow>
                              ) : (
                                filteredTierSettings.map((setting) => (
                                  <TableRow key={setting.id}>
                                    <TableCell>
                                      <Badge className={getTierBadgeColor(setting.tier)}>
                                        {setting.tier}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      <Badge variant="outline">
                                        {setting.entityType}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                      {setting.displayName}
                                    </TableCell>
                                    <TableCell>
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {setting.description || "—"}
                                      </p>
                                    </TableCell>
                                    <TableCell>
                                      <div className="text-sm">
                                        {setting.entityType === "ORGANIZATION" && (
                                          <>
                                            <p>Max Doctors: {setting.maxDoctors ?? "Unlimited"}</p>
                                            <p>Patients/Doctor: {setting.maxPatientsPerDoctor ?? "Unlimited"}</p>
                                            <p>Face Scans/Doctor: {setting.maxFaceScansPerDoctor ?? "Unlimited"}</p>
                                          </>
                                        )}
                                        {setting.entityType === "DOCTOR" && (
                                          <>
                                            <p>Max Patients: {setting.maxPatients ?? "Unlimited"}</p>
                                            <p>Max Face Scans: {setting.maxFaceScans ?? "Unlimited"}</p>
                                          </>
                                        )}
                                        {setting.entityType === "PATIENT" && (
                                          <p>Max Face Scans: {setting.maxFaceScans ?? "Unlimited"}</p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openEditTierDialog(setting)}
                                      >
                                        <IconEdit className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-destructive"
                                        onClick={() => handleDeleteTierSetting(setting)}
                                      >
                                        <IconTrash className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))
                              )}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>

                {/* Edit Dialog */}
                <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        Edit Subscription {selectedItem ? `- ${getSelectedEntityName()}` : ""}
                      </DialogTitle>
                      <DialogDescription>
                        Update subscription tier and limits
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="tier">Subscription Tier</Label>
                        <Select
                          value={editForm.subscriptionTier}
                          onValueChange={(value) => setEditForm({ ...editForm, subscriptionTier: value as SubscriptionTier })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FREE">Free</SelectItem>
                            <SelectItem value="BASIC">Basic</SelectItem>
                            <SelectItem value="PREMIUM">Premium</SelectItem>
                            <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                            <SelectItem value="T">T Tier</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {activeTab === "organizations" && (
                        <div className="grid gap-2">
                          <Label htmlFor="maxDoctors">Max Doctors (leave empty for unlimited)</Label>
                          <Input
                            id="maxDoctors"
                            type="number"
                            value={editForm.maxDoctors}
                            onChange={(e) => setEditForm({ ...editForm, maxDoctors: e.target.value })}
                            placeholder="Unlimited"
                          />
                          <Label htmlFor="maxPatientsPerDoctor">Patients per Doctor (leave empty for unlimited)</Label>
                          <Input
                            id="maxPatientsPerDoctor"
                            type="number"
                            value={editForm.maxPatientsPerDoctor}
                            onChange={(e) =>
                              setEditForm({ ...editForm, maxPatientsPerDoctor: e.target.value })
                            }
                            placeholder="Unlimited"
                          />
                          <Label htmlFor="maxFaceScansPerDoctor">Face Scans per Doctor (leave empty for unlimited)</Label>
                          <Input
                            id="maxFaceScansPerDoctor"
                            type="number"
                            value={editForm.maxFaceScansPerDoctor}
                            onChange={(e) =>
                              setEditForm({ ...editForm, maxFaceScansPerDoctor: e.target.value })
                            }
                            placeholder="Unlimited"
                          />
                        </div>
                      )}

                      {activeTab === "doctors" && (
                        <>
                          <div className="grid gap-2">
                            <Label htmlFor="maxPatients">Max Patients (leave empty for unlimited)</Label>
                            <Input
                              id="maxPatients"
                              type="number"
                              value={editForm.maxPatients}
                              onChange={(e) => setEditForm({ ...editForm, maxPatients: e.target.value })}
                              placeholder="Unlimited"
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label htmlFor="maxFaceScans">Max Face Scans (leave empty for unlimited)</Label>
                            <Input
                              id="maxFaceScans"
                              type="number"
                              value={editForm.maxFaceScans}
                              onChange={(e) => setEditForm({ ...editForm, maxFaceScans: e.target.value })}
                              placeholder="Unlimited"
                            />
                          </div>
                        </>
                      )}

                      {activeTab === "patients" && (
                        <div className="grid gap-2">
                          <Label htmlFor="maxFaceScans">Max Face Scans (leave empty for unlimited)</Label>
                          <Input
                            id="maxFaceScans"
                            type="number"
                            value={editForm.maxFaceScans}
                            onChange={(e) => setEditForm({ ...editForm, maxFaceScans: e.target.value })}
                            placeholder="Unlimited"
                          />
                        </div>
                      )}

                      <div className="grid gap-2">
                        <Label htmlFor="startDate">Subscription Start Date</Label>
                        <Input
                          id="startDate"
                          type="date"
                          value={editForm.subscriptionStartDate}
                          onChange={(e) => setEditForm({ ...editForm, subscriptionStartDate: e.target.value })}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="endDate">Subscription End Date</Label>
                        <Input
                          id="endDate"
                          type="date"
                          value={editForm.subscriptionEndDate}
                          onChange={(e) => setEditForm({ ...editForm, subscriptionEndDate: e.target.value })}
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="isActive"
                          checked={editForm.isSubscriptionActive}
                          onChange={(e) => setEditForm({ ...editForm, isSubscriptionActive: e.target.checked })}
                          className="rounded"
                        />
                        <Label htmlFor="isActive">Subscription Active</Label>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Tier Setting Dialog */}
                <Dialog
                  open={tierDialogOpen}
                  onOpenChange={(open) => {
                    setTierDialogOpen(open)
                    if (!open) {
                      resetTierForm()
                    }
                  }}
                >
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>
                        {tierDialogMode === "create" ? "Create Tier Setting" : `Edit Tier Setting - ${tierForm.displayName}`}
                      </DialogTitle>
                      <DialogDescription>
                        Configure limits for this tier and entity type
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="tierSelect">Subscription Tier</Label>
                        <Select
                          value={tierForm.tier}
                          onValueChange={(value) => setTierForm((prev) => ({ ...prev, tier: value as SubscriptionTier }))}
                          disabled={tierDialogMode === "edit"}
                        >
                          <SelectTrigger id="tierSelect">
                            <SelectValue placeholder="Select tier" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="FREE">Free</SelectItem>
                            <SelectItem value="BASIC">Basic</SelectItem>
                            <SelectItem value="PREMIUM">Premium</SelectItem>
                            <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                            <SelectItem value="T">T Tier</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="entityType">Entity Type</Label>
                        <Select
                          value={tierForm.entityType}
                          onValueChange={(value) => setTierForm((prev) => ({
                            ...prev,
                            entityType: value as SubscriptionEntityType,
                          }))}
                          disabled={tierDialogMode === "edit"}
                        >
                          <SelectTrigger id="entityType">
                            <SelectValue placeholder="Select entity type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ORGANIZATION">Organization</SelectItem>
                            <SelectItem value="DOCTOR">Doctor</SelectItem>
                            <SelectItem value="PATIENT">Patient</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="displayName">Display Name</Label>
                        <Input
                          id="displayName"
                          value={tierForm.displayName}
                          onChange={(e) => setTierForm((prev) => ({ ...prev, displayName: e.target.value }))}
                          placeholder="Enter display name"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          value={tierForm.description}
                          onChange={(e) => setTierForm((prev) => ({ ...prev, description: e.target.value }))}
                          placeholder="Short description (optional)"
                        />
                      </div>
                      {tierFormLimitFields.showMaxDoctors && (
                        <div className="grid gap-2">
                          <Label htmlFor="tierMaxDoctors">Max Doctors (leave empty for unlimited)</Label>
                          <Input
                            id="tierMaxDoctors"
                            type="number"
                            value={tierForm.maxDoctors}
                            onChange={(e) => setTierForm((prev) => ({ ...prev, maxDoctors: e.target.value }))}
                            placeholder="Unlimited"
                          />
                        </div>
                      )}
                      {tierFormLimitFields.showMaxPatientsPerDoctor && (
                        <div className="grid gap-2">
                          <Label htmlFor="tierMaxPatientsPerDoctor">Patients per Doctor (leave empty for unlimited)</Label>
                          <Input
                            id="tierMaxPatientsPerDoctor"
                            type="number"
                            value={tierForm.maxPatientsPerDoctor}
                            onChange={(e) =>
                              setTierForm((prev) => ({ ...prev, maxPatientsPerDoctor: e.target.value }))
                            }
                            placeholder="Unlimited"
                          />
                        </div>
                      )}
                      {tierFormLimitFields.showMaxFaceScansPerDoctor && (
                        <div className="grid gap-2">
                          <Label htmlFor="tierMaxFaceScansPerDoctor">Face Scans per Doctor (leave empty for unlimited)</Label>
                          <Input
                            id="tierMaxFaceScansPerDoctor"
                            type="number"
                            value={tierForm.maxFaceScansPerDoctor}
                            onChange={(e) =>
                              setTierForm((prev) => ({ ...prev, maxFaceScansPerDoctor: e.target.value }))
                            }
                            placeholder="Unlimited"
                          />
                        </div>
                      )}
                      {tierFormLimitFields.showMaxPatients && (
                        <div className="grid gap-2">
                          <Label htmlFor="tierMaxPatients">Max Patients (leave empty for unlimited)</Label>
                          <Input
                            id="tierMaxPatients"
                            type="number"
                            value={tierForm.maxPatients}
                            onChange={(e) => setTierForm((prev) => ({ ...prev, maxPatients: e.target.value }))}
                            placeholder="Unlimited"
                          />
                        </div>
                      )}
                      {tierFormLimitFields.showMaxFaceScans && (
                        <div className="grid gap-2">
                          <Label htmlFor="tierMaxFaceScans">Max Face Scans (leave empty for unlimited)</Label>
                          <Input
                            id="tierMaxFaceScans"
                            type="number"
                            value={tierForm.maxFaceScans}
                            onChange={(e) => setTierForm((prev) => ({ ...prev, maxFaceScans: e.target.value }))}
                            placeholder="Unlimited"
                          />
                        </div>
                      )}
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setTierDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleTierFormSubmit} disabled={tiersLoading}>
                        {tiersLoading ? "Saving..." : "Save Tier"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

