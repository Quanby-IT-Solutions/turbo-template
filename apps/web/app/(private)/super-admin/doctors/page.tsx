"use client"

import * as React from "react"
import {
  IconPlus,
  IconEye,
  IconEdit,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconX,
  IconDotsVertical,
  IconBuilding,
} from "@tabler/icons-react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
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
import { doctorsApi } from "@/features/doctors/api/doctors-api"
import { organizationsApi } from "@/features/organizations/api/organizations-api"
import type { Organization } from "@/features/organizations/api/organizations-api"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/core/components/ui/dialog"
import { Textarea } from "@/core/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"

interface Doctor {
  id: string
  email: string
  organizationId?: string | null
  organization?: {
    id: string
    name: string
  } | null
  doctorInfo: {
    firstName: string
    middleName?: string
    lastName: string
    specialization: string
    qualifications: string
    experience: number
    contactNumber: string
    approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
    approvalRejectionReason?: string
    prcIdImage?: string | null
    ptrIdImage?: string | null
    medicalLicenseImage?: string | null
  }
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = React.useState<Doctor[]>([])
  const [loading, setLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [specializationFilter, setSpecializationFilter] = React.useState("")
  const [statusFilter, setStatusFilter] = React.useState<string>("all")
  const [minExperience, setMinExperience] = React.useState("0")
  const [maxExperience, setMaxExperience] = React.useState("50")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [itemsPerPage, setItemsPerPage] = React.useState(10)
  const [total, setTotal] = React.useState(0)
  const [approvingId, setApprovingId] = React.useState<string | null>(null)
  const [rejectingId, setRejectingId] = React.useState<string | null>(null)
  const [rejectionReason, setRejectionReason] = React.useState("")
  const [viewDocumentDialogOpen, setViewDocumentDialogOpen] = React.useState(false)
  const [documentImage, setDocumentImage] = React.useState<string | null>(null)
  const [documentTitle, setDocumentTitle] = React.useState<string>("")
  const [selectedDoctor, setSelectedDoctor] = React.useState<Doctor | null>(null)
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = React.useState(false)
  const [isAssignOrgDialogOpen, setIsAssignOrgDialogOpen] = React.useState(false)
  const [organizations, setOrganizations] = React.useState<Organization[]>([])
  const [loadingOrgs, setLoadingOrgs] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [editingDoctor, setEditingDoctor] = React.useState<Doctor | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  const [deletingDoctor, setDeletingDoctor] = React.useState<Doctor | null>(null)
  const [processing, setProcessing] = React.useState(false)
  const [isAddDoctorDialogOpen, setIsAddDoctorDialogOpen] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  
  // Add doctor form state
  const [newDoctorEmail, setNewDoctorEmail] = React.useState("")
  const [newDoctorPassword, setNewDoctorPassword] = React.useState("")
  const [newDoctorFirstName, setNewDoctorFirstName] = React.useState("")
  const [newDoctorMiddleName, setNewDoctorMiddleName] = React.useState("")
  const [newDoctorLastName, setNewDoctorLastName] = React.useState("")
  const [newDoctorGender, setNewDoctorGender] = React.useState("")
  const [newDoctorDateOfBirth, setNewDoctorDateOfBirth] = React.useState("")
  const [newDoctorContactNumber, setNewDoctorContactNumber] = React.useState("")
  const [newDoctorAddress, setNewDoctorAddress] = React.useState("")
  const [newDoctorBio, setNewDoctorBio] = React.useState("")
  const [newDoctorSpecialization, setNewDoctorSpecialization] = React.useState("")
  const [newDoctorQualifications, setNewDoctorQualifications] = React.useState("")
  const [newDoctorExperience, setNewDoctorExperience] = React.useState("")
  const [newDoctorOrganizationId, setNewDoctorOrganizationId] = React.useState<string | null>(null)
  
  // Edit form state
  const [editFirstName, setEditFirstName] = React.useState("")
  const [editMiddleName, setEditMiddleName] = React.useState("")
  const [editLastName, setEditLastName] = React.useState("")
  const [editSpecialization, setEditSpecialization] = React.useState("")
  const [editQualifications, setEditQualifications] = React.useState("")
  const [editExperience, setEditExperience] = React.useState("")
  const [editContactNumber, setEditContactNumber] = React.useState("")

  const fetchDoctors = React.useCallback(async () => {
    setLoading(true)
    try {
      const response = await doctorsApi.listDoctors({
        page: currentPage,
        limit: itemsPerPage,
        search: searchQuery || undefined,
      })
      
      if (response.success && response.data) {
        setDoctors(response.data.items || [])
        setTotal(response.data.total || 0)
      } else {
        toast.error(response.message || "Failed to fetch doctors")
      }
    } catch (error) {
      toast.error("Failed to fetch doctors")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, itemsPerPage, searchQuery])

  React.useEffect(() => {
    fetchDoctors()
  }, [fetchDoctors])

  const filteredDoctors = doctors.filter((doctor) => {
    const matchesSearch = 
      !searchQuery ||
      `${doctor.doctorInfo.firstName} ${doctor.doctorInfo.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doctor.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesSpecialization = 
      !specializationFilter || 
      doctor.doctorInfo.specialization.toLowerCase().includes(specializationFilter.toLowerCase())
    const matchesStatus = 
      statusFilter === "all" || 
      doctor.doctorInfo.approvalStatus === statusFilter.toUpperCase()
    const matchesExperience = 
      doctor.doctorInfo.experience >= parseInt(minExperience) && 
      doctor.doctorInfo.experience <= parseInt(maxExperience)
    return matchesSearch && matchesSpecialization && matchesStatus && matchesExperience
  })

  const totalPages = Math.ceil(total / itemsPerPage)
  const startResult = total > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0
  const endResult = Math.min(currentPage * itemsPerPage, total)

  const handleClearFilters = () => {
    setSearchQuery("")
    setSpecializationFilter("")
    setStatusFilter("all")
    setMinExperience("0")
    setMaxExperience("50")
    setCurrentPage(1)
  }

  const handleApprove = async (id: string) => {
    setApprovingId(id)
    try {
      const response = await doctorsApi.approveDoctor(id)
      if (response.success) {
        toast.success("Doctor approved successfully")
        fetchDoctors()
      } else {
        toast.error(response.message || "Failed to approve doctor")
      }
    } catch (error) {
      toast.error("Failed to approve doctor")
      console.error(error)
    } finally {
      setApprovingId(null)
    }
  }

  const handleReject = async () => {
    if (!rejectingId) return
    
    try {
      const response = await doctorsApi.rejectDoctor(rejectingId, rejectionReason || undefined)
      if (response.success) {
        toast.success("Doctor rejected successfully")
        setRejectingId(null)
        setRejectionReason("")
        fetchDoctors()
      } else {
        toast.error(response.message || "Failed to reject doctor")
      }
    } catch (error) {
      toast.error("Failed to reject doctor")
      console.error(error)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    
    setProcessing(true)
    try {
      const response = await doctorsApi.deleteDoctor(deletingId)
      if (response.success) {
        toast.success("Doctor deleted successfully")
        setDeletingId(null)
        setDeletingDoctor(null)
        await fetchDoctors()
      } else {
        toast.error(response.message || "Failed to delete doctor")
      }
    } catch (error) {
      toast.error("Failed to delete doctor")
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
            Approved
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
            Pending
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
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
          title="Doctor Management" 
          description="Manage all doctors in the QHealth system"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {/* Header with Add Doctor button */}
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">Doctor Management</h1>
                    <p className="text-sm text-muted-foreground">
                      Manage all doctors in the QHealth system
                    </p>
                  </div>
                  <Button onClick={async () => {
                    setIsAddDoctorDialogOpen(true)
                    // Load organizations for assignment
                    setLoadingOrgs(true)
                    try {
                      const response = await organizationsApi.getOrganizations()
                      if (response.success && response.data) {
                        setOrganizations(response.data)
                      }
                    } catch {
                      toast.error("Failed to load organizations")
                    } finally {
                      setLoadingOrgs(false)
                    }
                  }}>
                    <IconPlus className="h-4 w-4 mr-2" />
                    Add New Doctor
                  </Button>
                </div>

                {/* Filter Section */}
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Filter Doctors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                      <div>
                        <Label htmlFor="search" className="mb-2 block text-sm font-medium">
                          Search
                        </Label>
                        <Input
                          id="search"
                          placeholder="Search by name or email..."
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.target.value)
                            setCurrentPage(1)
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="specialization" className="mb-2 block text-sm font-medium">
                          Specialization
                        </Label>
                        <Input
                          id="specialization"
                          placeholder="Filter by specialization..."
                          value={specializationFilter}
                          onChange={(e) => {
                            setSpecializationFilter(e.target.value)
                            setCurrentPage(1)
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="status" className="mb-2 block text-sm font-medium">
                          Approval Status
                        </Label>
                        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value || "all")}>
                          <SelectTrigger id="status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="min-exp" className="mb-2 block text-sm font-medium">
                          Min Experience (years)
                        </Label>
                        <Input
                          id="min-exp"
                          type="number"
                          value={minExperience}
                          onChange={(e) => {
                            setMinExperience(e.target.value)
                            setCurrentPage(1)
                          }}
                        />
                      </div>
                      <div>
                        <Label htmlFor="max-exp" className="mb-2 block text-sm font-medium">
                          Max Experience (years)
                        </Label>
                        <Input
                          id="max-exp"
                          type="number"
                          value={maxExperience}
                          onChange={(e) => {
                            setMaxExperience(e.target.value)
                            setCurrentPage(1)
                          }}
                        />
                      </div>
                    </div>
                    <div className="mt-4">
                      <Button variant="outline" onClick={handleClearFilters}>
                        Clear Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Doctors Table */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Doctors</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                          Showing {startResult} to {endResult} of {total} doctors
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {loading ? (
                      <div className="p-8 text-center text-muted-foreground">
                        Loading doctors...
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>NAME</TableHead>
                            <TableHead>EMAIL</TableHead>
                            <TableHead>SPECIALIZATION</TableHead>
                            <TableHead>EXPERIENCE</TableHead>
                            <TableHead>CONTACT</TableHead>
                            <TableHead>STATUS</TableHead>
                            <TableHead className="text-right">ACTIONS</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredDoctors.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                No doctors found
                              </TableCell>
                            </TableRow>
                          ) : (
                            filteredDoctors.map((doctor) => (
                              <TableRow key={doctor.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">
                                      {doctor.doctorInfo.firstName} {doctor.doctorInfo.middleName} {doctor.doctorInfo.lastName}
                                    </p>
                                    <p className="text-sm text-muted-foreground">{doctor.doctorInfo.qualifications}</p>
                                  </div>
                                </TableCell>
                                <TableCell>{doctor.email}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                                    {doctor.doctorInfo.specialization}
                                  </Badge>
                                </TableCell>
                                <TableCell>{doctor.doctorInfo.experience} years</TableCell>
                                <TableCell>{doctor.doctorInfo.contactNumber}</TableCell>
                                <TableCell>
                                  {getStatusBadge(doctor.doctorInfo.approvalStatus)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-end">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger {...({ asChild: true } as any)}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          disabled={approvingId === doctor.id}
                                        >
                                          <IconDotsVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        {doctor.doctorInfo.approvalStatus === 'PENDING' && (
                                          <>
                                            <DropdownMenuItem
                                              onClick={() => handleApprove(doctor.id)}
                                              disabled={approvingId === doctor.id}
                                              className="text-green-600 focus:text-green-700"
                                            >
                                              <IconCheck className="h-4 w-4 mr-2" />
                                              Approve
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                              onClick={() => setRejectingId(doctor.id)}
                                              disabled={approvingId === doctor.id}
                                              className="text-red-600 focus:text-red-700"
                                            >
                                              <IconX className="h-4 w-4 mr-2" />
                                              Reject
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                          </>
                                        )}
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedDoctor(doctor)
                                            setViewDetailsDialogOpen(true)
                                          }}
                                        >
                                          <IconEye className="h-4 w-4 mr-2" />
                                          View Details
                                        </DropdownMenuItem>
                                        {(doctor.doctorInfo.prcIdImage || doctor.doctorInfo.ptrIdImage || doctor.doctorInfo.medicalLicenseImage) && (
                                          <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel>Documents</DropdownMenuLabel>
                                            {doctor.doctorInfo.prcIdImage && (
                                              <DropdownMenuItem
                                                onClick={() => {
                                                  setDocumentImage(doctor.doctorInfo.prcIdImage || null)
                                                  setDocumentTitle("PRC ID")
                                                  setSelectedDoctor(doctor)
                                                  setViewDocumentDialogOpen(true)
                                                }}
                                              >
                                                <IconEye className="h-4 w-4 mr-2" />
                                                View PRC ID
                                              </DropdownMenuItem>
                                            )}
                                            {doctor.doctorInfo.ptrIdImage && (
                                              <DropdownMenuItem
                                                onClick={() => {
                                                  setDocumentImage(doctor.doctorInfo.ptrIdImage || null)
                                                  setDocumentTitle("PTR ID")
                                                  setSelectedDoctor(doctor)
                                                  setViewDocumentDialogOpen(true)
                                                }}
                                              >
                                                <IconEye className="h-4 w-4 mr-2" />
                                                View PTR ID
                                              </DropdownMenuItem>
                                            )}
                                            {doctor.doctorInfo.medicalLicenseImage && (
                                              <DropdownMenuItem
                                                onClick={() => {
                                                  setDocumentImage(doctor.doctorInfo.medicalLicenseImage || null)
                                                  setDocumentTitle("Medical License")
                                                  setSelectedDoctor(doctor)
                                                  setViewDocumentDialogOpen(true)
                                                }}
                                              >
                                                <IconEye className="h-4 w-4 mr-2" />
                                                View Medical License
                                              </DropdownMenuItem>
                                            )}
                                          </>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            // Fetch fresh doctor data to get latest organizationId
                                            try {
                                              const doctorResponse = await doctorsApi.getDoctorById(doctor.id)
                                              if (doctorResponse.success && doctorResponse.data) {
                                                setSelectedDoctor(doctorResponse.data as Doctor)
                                              } else {
                                                setSelectedDoctor(doctor)
                                              }
                                            } catch {
                                              setSelectedDoctor(doctor)
                                            }
                                            setIsAssignOrgDialogOpen(true)
                                            setLoadingOrgs(true)
                                            try {
                                              const response = await organizationsApi.getOrganizations()
                                              if (response.success && response.data) {
                                                setOrganizations(response.data)
                                              }
                                            } catch {
                                              toast.error("Failed to load organizations")
                                            } finally {
                                              setLoadingOrgs(false)
                                            }
                                          }}
                                        >
                                          <IconBuilding className="h-4 w-4 mr-2" />
                                          Assign to Organization
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setEditingDoctor(doctor)
                                            setEditFirstName(doctor.doctorInfo.firstName)
                                            setEditMiddleName(doctor.doctorInfo.middleName || "")
                                            setEditLastName(doctor.doctorInfo.lastName)
                                            setEditSpecialization(doctor.doctorInfo.specialization)
                                            setEditQualifications(doctor.doctorInfo.qualifications)
                                            setEditExperience(doctor.doctorInfo.experience.toString())
                                            setEditContactNumber(doctor.doctorInfo.contactNumber)
                                            setIsEditDialogOpen(true)
                                          }}
                                        >
                                          <IconEdit className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setDeletingDoctor(doctor)
                                            setDeletingId(doctor.id)
                                          }}
                                          className="text-destructive focus:text-destructive"
                                        >
                                          <IconTrash className="h-4 w-4 mr-2" />
                                          Delete
                                        </DropdownMenuItem>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {startResult} to {endResult} of {total} results
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1 || loading}
                        className="disabled:text-muted-foreground"
                      >
                        <IconChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant={currentPage === 1 ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(1)}
                        disabled={loading}
                      >
                        1
                      </Button>
                      {totalPages > 1 && (
                        <Button
                          variant={currentPage === 2 ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(2)}
                          disabled={loading}
                        >
                          2
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage >= totalPages || loading}
                        className="disabled:text-muted-foreground"
                      >
                        Next
                        <IconChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Show:</span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                          if (value) {
                            setItemsPerPage(parseInt(value))
                            setCurrentPage(1)
                          }
                        }}
                        disabled={loading}
                      >
                        <SelectTrigger className="w-20 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="20">20</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                      <span className="text-sm text-muted-foreground">per page</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Reject Dialog */}
      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Doctor</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this doctor&apos;s application.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Enter reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRejectingId(null)
              setRejectionReason("")
            }}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject}>
              Reject Doctor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsDialogOpen} onOpenChange={(open) => {
        setViewDetailsDialogOpen(open)
        if (!open) {
          setSelectedDoctor(null)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Doctor Details</DialogTitle>
            <DialogDescription>
              {selectedDoctor && (
                <span>
                  Complete information for Dr. {selectedDoctor.doctorInfo.firstName} {selectedDoctor.doctorInfo.middleName || ""} {selectedDoctor.doctorInfo.lastName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedDoctor && (
            <div className="py-4 space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Full Name</Label>
                    <p className="text-sm font-medium">
                      {selectedDoctor.doctorInfo.firstName} {selectedDoctor.doctorInfo.middleName || ""} {selectedDoctor.doctorInfo.lastName}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Email</Label>
                    <p className="text-sm font-medium">{selectedDoctor.email}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Specialization</Label>
                    <p className="text-sm font-medium">{selectedDoctor.doctorInfo.specialization}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Contact Number</Label>
                    <p className="text-sm font-medium">{selectedDoctor.doctorInfo.contactNumber}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Experience</Label>
                    <p className="text-sm font-medium">{selectedDoctor.doctorInfo.experience} {selectedDoctor.doctorInfo.experience === 1 ? "year" : "years"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Approval Status</Label>
                    <div className="mt-1">
                      {selectedDoctor.doctorInfo.approvalStatus === "APPROVED" && (
                        <Badge className="bg-green-500 hover:bg-green-600">Approved</Badge>
                      )}
                      {selectedDoctor.doctorInfo.approvalStatus === "PENDING" && (
                        <Badge className="bg-yellow-500 hover:bg-yellow-600">Pending</Badge>
                      )}
                      {selectedDoctor.doctorInfo.approvalStatus === "REJECTED" && (
                        <Badge className="bg-red-500 hover:bg-red-600">Rejected</Badge>
                      )}
                    </div>
                  </div>
                </div>
                {selectedDoctor.doctorInfo.qualifications && (
                  <div>
                    <Label className="text-muted-foreground">Qualifications</Label>
                    <p className="text-sm font-medium mt-1">{selectedDoctor.doctorInfo.qualifications}</p>
                  </div>
                )}
                {selectedDoctor.doctorInfo.approvalStatus === "REJECTED" && selectedDoctor.doctorInfo.approvalRejectionReason && (
                  <div>
                    <Label className="text-muted-foreground">Rejection Reason</Label>
                    <p className="text-sm font-medium mt-1 text-red-600">{selectedDoctor.doctorInfo.approvalRejectionReason}</p>
                  </div>
                )}
              </div>

              {/* Documents Section */}
              <div className="space-y-4 border-t pt-4">
                <h3 className="text-lg font-semibold">Uploaded Documents</h3>
                <div className="grid grid-cols-1 gap-3">
                  {selectedDoctor.doctorInfo.prcIdImage ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                          <IconEye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">PRC ID</p>
                          <p className="text-sm text-muted-foreground">Professional Regulation Commission ID</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDocumentImage(selectedDoctor.doctorInfo.prcIdImage || null)
                          setDocumentTitle("PRC ID")
                          setViewDocumentDialogOpen(true)
                          setViewDetailsDialogOpen(false)
                        }}
                      >
                        <IconEye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 border rounded-lg opacity-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                          <IconEye className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">PRC ID</p>
                          <p className="text-sm text-muted-foreground">Not uploaded</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDoctor.doctorInfo.ptrIdImage ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                          <IconEye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">PTR ID</p>
                          <p className="text-sm text-muted-foreground">Professional Tax Receipt ID</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDocumentImage(selectedDoctor.doctorInfo.ptrIdImage || null)
                          setDocumentTitle("PTR ID")
                          setViewDocumentDialogOpen(true)
                          setViewDetailsDialogOpen(false)
                        }}
                      >
                        <IconEye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 border rounded-lg opacity-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                          <IconEye className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">PTR ID</p>
                          <p className="text-sm text-muted-foreground">Not uploaded</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDoctor.doctorInfo.medicalLicenseImage ? (
                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded">
                          <IconEye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium">Medical License</p>
                          <p className="text-sm text-muted-foreground">Medical License Document</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setDocumentImage(selectedDoctor.doctorInfo.medicalLicenseImage || null)
                          setDocumentTitle("Medical License")
                          setViewDocumentDialogOpen(true)
                          setViewDetailsDialogOpen(false)
                        }}
                      >
                        <IconEye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 border rounded-lg opacity-50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                          <IconEye className="h-5 w-5 text-gray-400" />
                        </div>
                        <div>
                          <p className="font-medium text-muted-foreground">Medical License</p>
                          <p className="text-sm text-muted-foreground">Not uploaded</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewDetailsDialogOpen(false)
                setSelectedDoctor(null)
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={viewDocumentDialogOpen} onOpenChange={setViewDocumentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{documentTitle}</DialogTitle>
            <DialogDescription>
              {selectedDoctor && (
                <span>
                  Document for Dr. {selectedDoctor.doctorInfo.firstName} {selectedDoctor.doctorInfo.lastName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center items-center bg-muted/50 rounded-lg min-h-[400px]">
            {documentImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={documentImage}
                alt={documentTitle}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            ) : (
              <div className="text-muted-foreground">No document available</div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewDocumentDialogOpen(false)
                setDocumentImage(null)
                setDocumentTitle("")
                setSelectedDoctor(null)
              }}
            >
              Close
            </Button>
            {documentImage && selectedDoctor && (
              <Button
                variant="outline"
                onClick={() => {
                  if (documentImage) {
                    const link = document.createElement('a')
                    link.href = documentImage
                    const fileName = `${documentTitle.toLowerCase().replace(/\s+/g, '-')}-${selectedDoctor.doctorInfo.firstName}-${selectedDoctor.doctorInfo.lastName}.png`
                    link.download = fileName
                    document.body.appendChild(link)
                    link.click()
                    document.body.removeChild(link)
                  }
                }}
              >
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Doctor Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) {
          setEditingDoctor(null)
          setEditFirstName("")
          setEditMiddleName("")
          setEditLastName("")
          setEditSpecialization("")
          setEditQualifications("")
          setEditExperience("")
          setEditContactNumber("")
        }
      }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Doctor Information</DialogTitle>
            <DialogDescription>
              Update the doctor&apos;s information. Changes will be saved to the database.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-firstname">First Name *</Label>
                <Input
                  id="edit-firstname"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="First Name"
                />
              </div>
              <div>
                <Label htmlFor="edit-middlename">Middle Name</Label>
                <Input
                  id="edit-middlename"
                  value={editMiddleName}
                  onChange={(e) => setEditMiddleName(e.target.value)}
                  placeholder="Middle Name"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="edit-lastname">Last Name *</Label>
              <Input
                id="edit-lastname"
                value={editLastName}
                onChange={(e) => setEditLastName(e.target.value)}
                placeholder="Last Name"
              />
            </div>
            <div>
              <Label htmlFor="edit-specialization">Specialization *</Label>
              <Input
                id="edit-specialization"
                value={editSpecialization}
                onChange={(e) => setEditSpecialization(e.target.value)}
                placeholder="Specialization"
              />
            </div>
            <div>
              <Label htmlFor="edit-qualifications">Qualifications *</Label>
              <Textarea
                id="edit-qualifications"
                value={editQualifications}
                onChange={(e) => setEditQualifications(e.target.value)}
                placeholder="Qualifications"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit-experience">Experience (years) *</Label>
                <Input
                  id="edit-experience"
                  type="number"
                  value={editExperience}
                  onChange={(e) => setEditExperience(e.target.value)}
                  placeholder="Years of experience"
                  min="0"
                />
              </div>
              <div>
                <Label htmlFor="edit-contact">Contact Number *</Label>
                <Input
                  id="edit-contact"
                  value={editContactNumber}
                  onChange={(e) => setEditContactNumber(e.target.value)}
                  placeholder="Contact Number"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setEditingDoctor(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!editingDoctor) return
                
                // Validation
                if (!editFirstName.trim() || !editLastName.trim() || !editSpecialization.trim() || 
                    !editQualifications.trim() || !editExperience || !editContactNumber.trim()) {
                  toast.error("Please fill in all required fields")
                  return
                }

                const experienceNum = parseInt(editExperience)
                if (isNaN(experienceNum) || experienceNum < 0) {
                  toast.error("Experience must be a valid number")
                  return
                }

                setSaving(true)
                try {
                  const response = await doctorsApi.updateDoctor(editingDoctor.id, {
                    firstName: editFirstName.trim(),
                    middleName: editMiddleName.trim() || undefined,
                    lastName: editLastName.trim(),
                    specialization: editSpecialization.trim(),
                    qualifications: editQualifications.trim(),
                    experience: experienceNum,
                    contactNumber: editContactNumber.trim(),
                  })
                  
                  if (response.success) {
                    toast.success("Doctor information updated successfully")
                    setIsEditDialogOpen(false)
                    setEditingDoctor(null)
                    await fetchDoctors()
                  } else {
                    toast.error(response.message || "Failed to update doctor")
                  }
                } catch (error) {
                  toast.error("Failed to update doctor")
                  console.error(error)
                } finally {
                  setSaving(false)
                }
              }}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Doctor Dialog */}
      <Dialog open={isAddDoctorDialogOpen} onOpenChange={(open) => {
        setIsAddDoctorDialogOpen(open)
        if (!open) {
          // Reset form
          setNewDoctorEmail("")
          setNewDoctorPassword("")
          setNewDoctorFirstName("")
          setNewDoctorMiddleName("")
          setNewDoctorLastName("")
          setNewDoctorGender("")
          setNewDoctorDateOfBirth("")
          setNewDoctorContactNumber("")
          setNewDoctorAddress("")
          setNewDoctorBio("")
          setNewDoctorSpecialization("")
          setNewDoctorQualifications("")
          setNewDoctorExperience("")
          setNewDoctorOrganizationId(null)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Add New Doctor</DialogTitle>
            <DialogDescription>
              Create a new doctor account. The doctor will need to verify their email and complete their profile.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Account Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Account Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-doctor-email">Email *</Label>
                  <Input
                    id="new-doctor-email"
                    type="email"
                    value={newDoctorEmail}
                    onChange={(e) => setNewDoctorEmail(e.target.value)}
                    placeholder="doctor@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="new-doctor-password">Password *</Label>
                  <Input
                    id="new-doctor-password"
                    type="password"
                    value={newDoctorPassword}
                    onChange={(e) => setNewDoctorPassword(e.target.value)}
                    placeholder="Password (min 8 characters)"
                  />
                </div>
              </div>
            </div>

            {/* Personal Information */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-doctor-firstname">First Name *</Label>
                  <Input
                    id="new-doctor-firstname"
                    value={newDoctorFirstName}
                    onChange={(e) => setNewDoctorFirstName(e.target.value)}
                    placeholder="First Name"
                  />
                </div>
                <div>
                  <Label htmlFor="new-doctor-middlename">Middle Name</Label>
                  <Input
                    id="new-doctor-middlename"
                    value={newDoctorMiddleName}
                    onChange={(e) => setNewDoctorMiddleName(e.target.value)}
                    placeholder="Middle Name"
                  />
                </div>
                <div>
                  <Label htmlFor="new-doctor-lastname">Last Name *</Label>
                  <Input
                    id="new-doctor-lastname"
                    value={newDoctorLastName}
                    onChange={(e) => setNewDoctorLastName(e.target.value)}
                    placeholder="Last Name"
                  />
                </div>
                <div>
                  <Label htmlFor="new-doctor-gender">Gender</Label>
                  <Select value={newDoctorGender} onValueChange={(value) => setNewDoctorGender(value || "")}>
                    <SelectTrigger id="new-doctor-gender">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="new-doctor-dob">Date of Birth</Label>
                  <Input
                    id="new-doctor-dob"
                    type="date"
                    value={newDoctorDateOfBirth}
                    onChange={(e) => setNewDoctorDateOfBirth(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="new-doctor-contact">Contact Number *</Label>
                  <Input
                    id="new-doctor-contact"
                    value={newDoctorContactNumber}
                    onChange={(e) => setNewDoctorContactNumber(e.target.value)}
                    placeholder="Contact Number"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="new-doctor-address">Address</Label>
                  <Textarea
                    id="new-doctor-address"
                    value={newDoctorAddress}
                    onChange={(e) => setNewDoctorAddress(e.target.value)}
                    placeholder="Address"
                    rows={2}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="new-doctor-bio">Bio</Label>
                  <Textarea
                    id="new-doctor-bio"
                    value={newDoctorBio}
                    onChange={(e) => setNewDoctorBio(e.target.value)}
                    placeholder="Doctor bio"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Professional Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="new-doctor-specialization">Specialization *</Label>
                  <Input
                    id="new-doctor-specialization"
                    value={newDoctorSpecialization}
                    onChange={(e) => setNewDoctorSpecialization(e.target.value)}
                    placeholder="Specialization"
                  />
                </div>
                <div>
                  <Label htmlFor="new-doctor-experience">Experience (years) *</Label>
                    <Input
                      id="new-doctor-experience"
                      type="number"
                      value={newDoctorExperience}
                      onChange={(e) => setNewDoctorExperience(e.target.value)}
                      placeholder="Years of experience"
                      min="0"
                    />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="new-doctor-qualifications">Qualifications *</Label>
                  <Textarea
                    id="new-doctor-qualifications"
                    value={newDoctorQualifications}
                    onChange={(e) => setNewDoctorQualifications(e.target.value)}
                    placeholder="Qualifications"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* Organization Assignment */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Organization Assignment (Optional)</h3>
              <div>
                <Label htmlFor="new-doctor-organization">Assign to Organization</Label>
                <Select 
                  value={newDoctorOrganizationId || ""} 
                  onValueChange={(value) => setNewDoctorOrganizationId(value || null)}
                >
                  <SelectTrigger id="new-doctor-organization">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None (Unassigned)</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddDoctorDialogOpen(false)
              }}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              onClick={async () => {
                // Validation
                if (!newDoctorEmail.trim() || !newDoctorPassword.trim() || 
                    !newDoctorFirstName.trim() || !newDoctorLastName.trim() ||
                    !newDoctorContactNumber.trim() || !newDoctorSpecialization.trim() ||
                    !newDoctorQualifications.trim() || !newDoctorExperience) {
                  toast.error("Please fill in all required fields")
                  return
                }

                if (newDoctorPassword.length < 8) {
                  toast.error("Password must be at least 8 characters long")
                  return
                }

                const experienceNum = parseInt(newDoctorExperience)
                if (isNaN(experienceNum) || experienceNum < 0) {
                  toast.error("Experience must be a valid number")
                  return
                }

                setCreating(true)
                try {
                  const response = await doctorsApi.createDoctor({
                    email: newDoctorEmail.trim(),
                    password: newDoctorPassword,
                    firstName: newDoctorFirstName.trim(),
                    middleName: newDoctorMiddleName.trim() || undefined,
                    lastName: newDoctorLastName.trim(),
                    gender: newDoctorGender || undefined,
                    dateOfBirth: newDoctorDateOfBirth || undefined,
                    contactNumber: newDoctorContactNumber.trim(),
                    address: newDoctorAddress.trim() || undefined,
                    bio: newDoctorBio.trim() || undefined,
                    specialization: newDoctorSpecialization.trim(),
                    qualifications: newDoctorQualifications.trim(),
                    experience: experienceNum,
                    organizationId: newDoctorOrganizationId || null,
                  })
                  
                  if (response.success) {
                    toast.success("Doctor created successfully")
                    setIsAddDoctorDialogOpen(false)
                    // Reset form
                    setNewDoctorEmail("")
                    setNewDoctorPassword("")
                    setNewDoctorFirstName("")
                    setNewDoctorMiddleName("")
                    setNewDoctorLastName("")
                    setNewDoctorGender("")
                    setNewDoctorDateOfBirth("")
                    setNewDoctorContactNumber("")
                    setNewDoctorAddress("")
                    setNewDoctorBio("")
                    setNewDoctorSpecialization("")
                    setNewDoctorQualifications("")
                    setNewDoctorExperience("")
                    setNewDoctorOrganizationId(null)
                    await fetchDoctors()
                  } else {
                    toast.error(response.message || "Failed to create doctor")
                  }
                } catch (error: any) {
                  toast.error(error.message || "Failed to create doctor")
                  console.error(error)
                } finally {
                  setCreating(false)
                }
              }}
              disabled={creating}
            >
              {creating ? "Creating..." : "Create Doctor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Doctor</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this doctor? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingDoctor && (
            <div className="mt-2 mb-4">
              <p className="font-medium">
                {deletingDoctor.doctorInfo.firstName} {deletingDoctor.doctorInfo.middleName || ""} {deletingDoctor.doctorInfo.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{deletingDoctor.email}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Specialization: {deletingDoctor.doctorInfo.specialization}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeletingId(null)
                setDeletingDoctor(null)
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={processing}
            >
              {processing ? 'Deleting...' : 'Delete Doctor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Organization Dialog */}
      <Dialog open={isAssignOrgDialogOpen} onOpenChange={setIsAssignOrgDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Assign {selectedDoctor?.doctorInfo?.firstName} {selectedDoctor?.doctorInfo?.lastName} to Organization
            </DialogTitle>
            <DialogDescription>
              Select an organization to assign this doctor to. You can also remove the assignment by selecting &quot;None&quot;.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {loadingOrgs ? (
              <div className="text-center py-8 text-muted-foreground">Loading organizations...</div>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                <Card
                  className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !selectedDoctor?.organizationId ? "bg-primary/5 border-primary/20" : ""
                  }`}
                  onClick={async () => {
                    if (!selectedDoctor) return
                    try {
                      const response = await doctorsApi.updateDoctor(selectedDoctor.id, {
                        organizationId: null,
                      })
                      if (response.success) {
                        toast.success("Doctor removed from organization")
                        // Update selectedDoctor to reflect the change
                        if (selectedDoctor) {
                          setSelectedDoctor({ ...selectedDoctor, organizationId: null, organization: null })
                        }
                        setIsAssignOrgDialogOpen(false)
                        await fetchDoctors()
                      } else {
                        toast.error(response.message || "Failed to remove doctor from organization")
                      }
                    } catch (error) {
                      toast.error("Failed to remove doctor from organization")
                      console.error("Error removing doctor from organization:", error)
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">None (Unassigned)</p>
                      <p className="text-sm text-muted-foreground">Remove doctor from any organization</p>
                    </div>
                    {!selectedDoctor?.organizationId && (
                      <IconCheck className="h-5 w-5 text-primary" />
                    )}
                  </div>
                </Card>
                {organizations.map((org) => {
                  const isAssigned = selectedDoctor?.organizationId === org.id
                  return (
                    <Card
                      key={org.id}
                      className={`p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                        isAssigned ? "bg-primary/5 border-primary/20" : ""
                      }`}
                      onClick={async () => {
                        if (!selectedDoctor) return
                        try {
                          const response = await doctorsApi.updateDoctor(selectedDoctor.id, {
                            organizationId: org.id,
                          })
                        if (response.success) {
                          toast.success(`Doctor assigned to ${org.name} successfully`)
                          // Update selectedDoctor to reflect the change
                          if (selectedDoctor) {
                            setSelectedDoctor({
                              ...selectedDoctor,
                              organizationId: org.id,
                              organization: { id: org.id, name: org.name },
                            })
                          }
                          setIsAssignOrgDialogOpen(false)
                          await fetchDoctors()
                        } else {
                            toast.error(response.message || "Failed to assign doctor")
                          }
                        } catch (error) {
                          toast.error("Failed to assign doctor")
                          console.error("Error assigning doctor:", error)
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-semibold">{org.name}</p>
                          <p className="text-sm text-muted-foreground">{org.description || "No description"}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {org.currentDoctors} / {org.maxDoctors ?? "∞"} doctors
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{org.subscriptionTier}</Badge>
                          {isAssigned && (
                            <IconCheck className="h-5 w-5 text-primary" />
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignOrgDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  )
}
