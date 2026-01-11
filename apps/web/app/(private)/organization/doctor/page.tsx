"use client"

import * as React from "react"
import { SidebarProvider, SidebarInset } from "@/core/components/ui/sidebar"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/core/components/ui/table"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Avatar, AvatarFallback } from "@/core/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog"
import { Label } from "@/core/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import { authApi } from "@/features/auth/api/auth-api"
import { doctorsApi } from "@/features/doctors/api/doctors-api"
import { notificationsApi } from "@/features/notifications/api/notifications-api"
import type { Doctor } from "@/services/api/types"
import { IconRefresh, IconPlus, IconCheck } from "@tabler/icons-react"
import { toast } from "sonner"

type DoctorWithOrg = Doctor & {
  organization?: { id?: string | null } | null
  doctorInfo?: Doctor["doctorInfo"] & {
    currentPatients?: number
    maxPatients?: number
  }
}

export default function OrganizationDoctorPage() {
  const [loading, setLoading] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [doctors, setDoctors] = React.useState<DoctorWithOrg[]>([])
  const [orgId, setOrgId] = React.useState<string | null>(null)
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [existingDoctors, setExistingDoctors] = React.useState<DoctorWithOrg[]>([])
  const [existingSearch, setExistingSearch] = React.useState("")
  const [selectedExistingId, setSelectedExistingId] = React.useState<string>("")
  const [savingExisting, setSavingExisting] = React.useState(false)
  const [savingNew, setSavingNew] = React.useState(false)
  const [removingId, setRemovingId] = React.useState<string>("")
  const [newDoctor, setNewDoctor] = React.useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    specialization: "",
    qualifications: "",
    experience: "",
    contactNumber: "",
    address: "",
    bio: "",
  })

  const loadDoctors = React.useCallback(async (organizationId: string, searchTerm?: string) => {
    setLoading(true)
    try {
      const res = await doctorsApi.listDoctors({
        limit: 100,
        search: searchTerm,
        organizationId,
      })
      if (res.success && res.data) {
        setDoctors(res.data.items || [])
      } else {
        toast.error(res.message || "Failed to load doctors")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to load doctors")
    } finally {
      setLoading(false)
    }
  }, [])

  const loadExisting = React.useCallback(async () => {
    try {
      const res = await doctorsApi.listDoctors({ limit: 200 })
      if (res.success && res.data) {
        setExistingDoctors(res.data.items || [])
      }
    } catch (error) {
      console.error(error)
    }
  }, [])

  React.useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await authApi.getProfile()
        if (profileRes.success && profileRes.data) {
          const profile = profileRes.data as { organizationId?: string | null; organization?: { id?: string | null } | null }
          const orgIdFromProfile = profile?.organizationId || profile?.organization?.id || null
          if (!orgIdFromProfile) {
            toast.error("No organization linked to this account.")
            return
          }
          setOrgId(orgIdFromProfile)
          loadDoctors(orgIdFromProfile)
          loadExisting()
        } else {
          toast.error(profileRes.message || "Failed to load profile")
        }
      } catch (error) {
        console.error(error)
        toast.error("Failed to load profile")
      }
    }
    init()
  }, [loadDoctors, loadExisting])

  const filteredDoctors = React.useMemo(() => {
    if (!search) return doctors
    const q = search.toLowerCase()
    return doctors.filter((doc) =>
      `${doc.doctorInfo?.firstName || ""} ${doc.doctorInfo?.lastName || ""}`.toLowerCase().includes(q) ||
      (doc.email || "").toLowerCase().includes(q) ||
      (doc.doctorInfo?.specialization || "").toLowerCase().includes(q)
    )
  }, [doctors, search])

  const unlinkedDoctors = React.useMemo(() => {
    const q = existingSearch.toLowerCase()
    return existingDoctors
      .filter((d) => !d.organizationId)
      .filter((d) =>
        `${d.doctorInfo?.firstName || ""} ${d.doctorInfo?.lastName || ""}`.toLowerCase().includes(q) ||
        (d.email || "").toLowerCase().includes(q) ||
        (d.doctorInfo?.specialization || "").toLowerCase().includes(q)
      )
  }, [existingDoctors, existingSearch])

  const totalDoctors = doctors.length
  const pendingDoctors = doctors.filter((d) => d.doctorInfo?.approvalStatus === "PENDING").length
  const availableUnlinked = unlinkedDoctors.length

  const renderStatus = (approval?: string) => {
    if (approval === "APPROVED") return <Badge variant="outline" className="bg-green-100 text-green-700">Approved</Badge>
    if (approval === "REJECTED") return <Badge variant="outline" className="bg-red-100 text-red-700">Rejected</Badge>
    return <Badge variant="outline" className="bg-amber-100 text-amber-700">Pending</Badge>
  }

  const handleLinkExisting = async () => {
    if (!orgId || !selectedExistingId) {
      toast.error("Select a doctor to link.")
      return
    }
    setSavingExisting(true)
    try {
      const res = await doctorsApi.updateDoctor(selectedExistingId, { organizationId: orgId })
      if (res.success) {
        toast.success("Doctor linked to organization")
        notificationsApi.createTest({
          title: "Doctor linked",
          message: "An existing doctor was linked to your organization.",
          type: "DOCTOR_LINKED",
          priority: "MEDIUM",
        }).catch((err) => console.error("Failed to send notification", err))
        loadDoctors(orgId)
        setAddDialogOpen(false)
        setSelectedExistingId("")
      } else {
        toast.error(res.message || "Failed to link doctor")
      }
    } catch (error: unknown) {
      console.error(error)
      const err = error as { status?: number; response?: { status?: number } }
      const isForbidden = err?.status === 403 || err?.response?.status === 403
      toast.error(isForbidden ? "Insufficient permission to link this doctor" : "Failed to link doctor")
    } finally {
      setSavingExisting(false)
    }
  }

  const handleRemoveDoctor = async (doctorId: string) => {
    if (!orgId) {
      toast.error("Organization not found.")
      return
    }
    setRemovingId(doctorId)
    try {
      const res = await doctorsApi.updateDoctor(doctorId, { organizationId: null })
      if (res.success) {
        toast.success("Doctor removed from organization")
        notificationsApi.createTest({
          title: "Doctor removed",
          message: "A doctor was removed from your organization.",
          type: "DOCTOR_REMOVED",
          priority: "LOW",
        }).catch((err) => console.error("Failed to send notification", err))
        loadDoctors(orgId)
      } else {
        toast.error(res.message || "Failed to remove doctor")
      }
    } catch (error: unknown) {
      console.error(error)
      const err = error as { status?: number; response?: { status?: number } }
      const isForbidden = err?.status === 403 || err?.response?.status === 403
      toast.error(isForbidden ? "Insufficient permission to remove this doctor" : "Failed to remove doctor")
    } finally {
      setRemovingId("")
    }
  }

  const handleCreateDoctor = async () => {
    if (!orgId) {
      toast.error("Organization not found.")
      return
    }
    if (!newDoctor.firstName || !newDoctor.lastName || !newDoctor.email || !newDoctor.password || !newDoctor.specialization) {
      toast.error("Please fill required fields.")
      return
    }
    if (newDoctor.password !== newDoctor.confirmPassword) {
      toast.error("Passwords do not match.")
      return
    }
    setSavingNew(true)
    try {
      const res = await doctorsApi.createDoctor({
        email: newDoctor.email.trim(),
        password: newDoctor.password,
        organizationId: orgId,
        firstName: newDoctor.firstName.trim(),
        lastName: newDoctor.lastName.trim(),
        specialization: newDoctor.specialization.trim(),
        qualifications: newDoctor.qualifications.trim() || "N/A",
        experience: parseInt(newDoctor.experience || "0", 10) || 0,
        contactNumber: newDoctor.contactNumber.trim() || undefined,
        address: newDoctor.address.trim() || undefined,
        bio: newDoctor.bio.trim() || undefined,
      })
      if (res.success) {
        toast.success("Doctor account created")
        notificationsApi.createTest({
          title: "Doctor created",
          message: "A new doctor account was created for your organization.",
          type: "DOCTOR_CREATED",
          priority: "HIGH",
        }).catch((err) => console.error("Failed to send notification", err))
        loadDoctors(orgId)
        setAddDialogOpen(false)
        setNewDoctor({
          firstName: "",
          lastName: "",
          email: "",
          password: "",
          confirmPassword: "",
          specialization: "",
          qualifications: "",
          experience: "",
          contactNumber: "",
          address: "",
          bio: "",
        })
      } else {
        toast.error(res.message || "Failed to create doctor")
      }
    } catch (error) {
      console.error(error)
      toast.error("Failed to create doctor")
    } finally {
      setSavingNew(false)
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
      <SidebarWrapper role="organization" variant="inset" />
      <SidebarInset>
        <RoleHeader
          title="Doctor Management"
          description="View and manage doctors in your organization"
        />
        <div className="flex flex-1 flex-col gap-4 p-4 lg:p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <Card className="bg-muted/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Total doctors</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-semibold">{totalDoctors}</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Pending approvals</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-semibold">{pendingDoctors}</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground">Unlinked available</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-2xl font-semibold">{availableUnlinked}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Doctors</CardTitle>
                <p className="text-sm text-muted-foreground">Current doctors linked to your organization</p>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="flex gap-2">
                  <Input
                    placeholder="Search by name or email"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full md:w-64"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!orgId}
                    onClick={() => orgId && loadDoctors(orgId, search)}
                  >
                    <IconRefresh className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={() => setAddDialogOpen(true)} className="md:ml-2">
                  <IconPlus className="h-4 w-4 mr-2" />
                  Add doctor
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-6">
                  <div className="space-y-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="flex flex-col items-center gap-3 p-8 text-center">
                  <p className="text-sm text-muted-foreground">No doctors found.</p>
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <IconPlus className="mr-2 h-4 w-4" />
                    Add your first doctor
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Patients</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDoctors.map((doc) => (
                      <TableRow key={doc.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback>
                                {(doc.doctorInfo?.firstName?.[0] || "").toUpperCase()}
                                {(doc.doctorInfo?.lastName?.[0] || "").toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="leading-tight">
                              <div className="font-semibold">
                                {doc.doctorInfo?.firstName} {doc.doctorInfo?.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">{doc.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{doc.email}</TableCell>
                        <TableCell>{doc.doctorInfo?.specialization || "—"}</TableCell>
                        <TableCell>{renderStatus(doc.doctorInfo?.approvalStatus)}</TableCell>
                        <TableCell>
                          {doc.doctorInfo?.currentPatients ?? 0} / {doc.doctorInfo?.maxPatients ?? "∞"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={removingId === doc.id}
                            onClick={() => handleRemoveDoctor(doc.id)}
                          >
                            {removingId === doc.id ? "Removing..." : "Remove"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Add Doctor</DialogTitle>
                <DialogDescription>
                  Choose to link an existing doctor without an organization, or create a new doctor account.
                </DialogDescription>
              </DialogHeader>
              <Tabs defaultValue="link" className="mt-2">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="link">Link existing</TabsTrigger>
                  <TabsTrigger value="create">Create new</TabsTrigger>
                </TabsList>
                <TabsContent value="link" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm text-muted-foreground">Pick from doctors not currently linked to any organization.</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Search unlinked doctors"
                          value={existingSearch}
                          onChange={(e) => setExistingSearch(e.target.value)}
                          className="w-full sm:w-64"
                        />
                        <Button variant="outline" size="icon" onClick={loadExisting} aria-label="Refresh doctors">
                          <IconRefresh className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="max-h-64 overflow-y-auto rounded-md border">
                      {unlinkedDoctors.length === 0 ? (
                        <p className="p-3 text-sm text-muted-foreground">No unlinked doctors found.</p>
                      ) : (
                        <Table>
                          <TableBody>
                            {unlinkedDoctors.map((doc) => {
                              const selected = selectedExistingId === doc.id
                              return (
                                <TableRow
                                  key={doc.id}
                                  className={`cursor-pointer transition ${selected ? "bg-muted/60" : "hover:bg-muted/40"}`}
                                  onClick={() => setSelectedExistingId(doc.id)}
                                  aria-selected={selected}
                                >
                                  <TableCell className="w-[36px]">
                                    <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-white" : "border-muted-foreground/40"}`}>
                                      {selected && <IconCheck className="h-3 w-3" />}
                                    </span>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {doc.doctorInfo?.firstName} {doc.doctorInfo?.lastName}
                                    <div className="text-xs text-muted-foreground">{doc.email}</div>
                                  </TableCell>
                                  <TableCell className="text-sm">{doc.doctorInfo?.specialization || "—"}</TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      )}
                    </div>
                    <DialogFooter>
                      <Button onClick={handleLinkExisting} disabled={savingExisting || !selectedExistingId || !orgId}>
                        {savingExisting ? "Linking..." : "Link selected doctor"}
                      </Button>
                    </DialogFooter>
                  </div>
                </TabsContent>
                <TabsContent value="create" className="mt-4">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">Create a new doctor account and automatically assign it to your organization.</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-2">
                        <Label>First name *</Label>
                        <Input value={newDoctor.firstName} onChange={(e) => setNewDoctor((f) => ({ ...f, firstName: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Last name *</Label>
                        <Input value={newDoctor.lastName} onChange={(e) => setNewDoctor((f) => ({ ...f, lastName: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Email *</Label>
                        <Input type="email" value={newDoctor.email} onChange={(e) => setNewDoctor((f) => ({ ...f, email: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Password *</Label>
                        <Input type="password" value={newDoctor.password} onChange={(e) => setNewDoctor((f) => ({ ...f, password: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Confirm password *</Label>
                        <Input type="password" value={newDoctor.confirmPassword} onChange={(e) => setNewDoctor((f) => ({ ...f, confirmPassword: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Specialization *</Label>
                        <Input value={newDoctor.specialization} onChange={(e) => setNewDoctor((f) => ({ ...f, specialization: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Qualifications</Label>
                        <Input value={newDoctor.qualifications} onChange={(e) => setNewDoctor((f) => ({ ...f, qualifications: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Experience (years)</Label>
                        <Input type="number" value={newDoctor.experience} onChange={(e) => setNewDoctor((f) => ({ ...f, experience: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Contact number</Label>
                        <Input value={newDoctor.contactNumber} onChange={(e) => setNewDoctor((f) => ({ ...f, contactNumber: e.target.value }))} />
                      </div>
                      <div className="grid gap-2">
                        <Label>Address</Label>
                        <Input value={newDoctor.address} onChange={(e) => setNewDoctor((f) => ({ ...f, address: e.target.value }))} />
                      </div>
                      <div className="grid gap-2 md:col-span-2">
                        <Label>Bio</Label>
                        <Input value={newDoctor.bio} onChange={(e) => setNewDoctor((f) => ({ ...f, bio: e.target.value }))} />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={handleCreateDoctor} disabled={savingNew || !orgId}>
                        {savingNew ? "Creating..." : "Create doctor"}
                      </Button>
                    </DialogFooter>
                  </div>
                </TabsContent>
              </Tabs>
            </DialogContent>
          </Dialog>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

