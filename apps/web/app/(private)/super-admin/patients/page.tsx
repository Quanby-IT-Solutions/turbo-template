"use client"

import * as React from "react"
import {
  IconSearch,
  IconEdit,
  IconTrash,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconX,
  IconEye,
  IconFilter,
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
import { Textarea } from "@/core/components/ui/textarea"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/core/components/ui/dropdown-menu"
import { superAdminApi, type PatientListItem } from "@/features/super-admin/api/super-admin-api"
import { patientsApi } from "@/features/patients/api/patients-api"
import { toast } from "sonner"

type VerificationStatus = 'NOT_VERIFIED' | 'PENDING' | 'VERIFIED' | 'REJECTED' | 'ALL'

export default function PatientsPage() {
  const [searchQuery, setSearchQuery] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [verificationFilter, setVerificationFilter] = React.useState<VerificationStatus>('ALL')
  const [patients, setPatients] = React.useState<PatientListItem[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [selectedPatient, setSelectedPatient] = React.useState<PatientListItem | null>(null)
  const [verifyDialogOpen, setVerifyDialogOpen] = React.useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false)
  const [viewDocumentDialogOpen, setViewDocumentDialogOpen] = React.useState(false)
  const [documentImage, setDocumentImage] = React.useState<string | null>(null)
  const [documentPatientName, setDocumentPatientName] = React.useState<string>("")
  const [rejectionReason, setRejectionReason] = React.useState("")
  const [processing, setProcessing] = React.useState(false)
  const [viewDetailsDialogOpen, setViewDetailsDialogOpen] = React.useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false)
  const [editingPatient, setEditingPatient] = React.useState<PatientListItem | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)
  
  // Edit form state
  const [editFirstName, setEditFirstName] = React.useState("")
  const [editMiddleName, setEditMiddleName] = React.useState("")
  const [editLastName, setEditLastName] = React.useState("")
  const [editContactNumber, setEditContactNumber] = React.useState("")
  const [editPhilHealthId, setEditPhilHealthId] = React.useState("")
  const [editGender, setEditGender] = React.useState("")
  const [editDateOfBirth, setEditDateOfBirth] = React.useState("")
  const [editAddress, setEditAddress] = React.useState("")
  const [editWeight, setEditWeight] = React.useState("")
  const [editHeight, setEditHeight] = React.useState("")
  const [editBloodType, setEditBloodType] = React.useState("")
  const [editMedicalHistory, setEditMedicalHistory] = React.useState("")
  const [editAllergies, setEditAllergies] = React.useState("")
  const [editMedications, setEditMedications] = React.useState("")
  const [editPhilHealthStatus, setEditPhilHealthStatus] = React.useState("")
  const [editPhilHealthCategory, setEditPhilHealthCategory] = React.useState("")
  const [fullPatientDetails, setFullPatientDetails] = React.useState<any>(null)
  const [loadingDetails, setLoadingDetails] = React.useState(false)
  const itemsPerPage = 10

  const totalPages = Math.ceil(total / itemsPerPage)

  // Fetch patients
  const fetchPatients = React.useCallback(async () => {
    setLoading(true)
    try {
      const status = verificationFilter === 'ALL' ? undefined : verificationFilter
      const response = await superAdminApi.getPatientsPendingVerification({
        page: currentPage,
        limit: itemsPerPage,
        status,
      })
      
      if (response.success && response.data) {
        // Filter by search query on client side
        let filtered = response.data.items
        if (searchQuery) {
          filtered = filtered.filter((patient) => {
            const name = patient.patientInfo 
              ? `${patient.patientInfo.firstName} ${patient.patientInfo.lastName}` 
              : ''
            return (
              name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              patient.email.toLowerCase().includes(searchQuery.toLowerCase())
            )
          })
        }
        setPatients(filtered)
        setTotal(response.data.total)
      } else {
        toast.error(response.message || 'Failed to fetch patients')
      }
    } catch (error) {
      toast.error('An error occurred while fetching patients')
      console.error('Error fetching patients:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, verificationFilter, searchQuery, itemsPerPage])

  React.useEffect(() => {
    fetchPatients()
  }, [fetchPatients])

  const handleVerify = async () => {
    if (!selectedPatient) return
    
    setProcessing(true)
    try {
      const response = await superAdminApi.updatePatientVerificationStatus(selectedPatient.id, {
        status: 'VERIFIED',
      })
      
      if (response.success) {
        toast.success('Patient verified successfully')
        setVerifyDialogOpen(false)
        setSelectedPatient(null)
        fetchPatients()
      } else {
        toast.error(response.message || 'Failed to verify patient')
      }
    } catch (error) {
      toast.error('An error occurred while verifying patient')
      console.error('Error verifying patient:', error)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedPatient || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason')
      return
    }
    
    setProcessing(true)
    try {
      const response = await superAdminApi.updatePatientVerificationStatus(selectedPatient.id, {
        status: 'REJECTED',
        rejectionReason: rejectionReason.trim(),
      })
      
      if (response.success) {
        toast.success('Patient verification rejected')
        setRejectDialogOpen(false)
        setRejectionReason("")
        setSelectedPatient(null)
        fetchPatients()
      } else {
        toast.error(response.message || 'Failed to reject patient')
      }
    } catch (error) {
      toast.error('An error occurred while rejecting patient')
      console.error('Error rejecting patient:', error)
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
            VERIFIED
          </Badge>
        )
      case 'PENDING':
        return (
          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
            PENDING
          </Badge>
        )
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-red-500/10 text-red-700 border-red-500/20">
            REJECTED
          </Badge>
        )
      case 'NOT_VERIFIED':
      default:
        return (
          <Badge variant="outline" className="bg-gray-500/10 text-gray-700 border-gray-500/20">
            NOT VERIFIED
          </Badge>
        )
    }
  }

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1)
    }
  }

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1)
    }
  }

  const handleEdit = async () => {
    if (!editingPatient) return
    
    // Validation
    if (!editFirstName.trim() || !editLastName.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    setSaving(true)
    try {
      const updateData: any = {
        firstName: editFirstName.trim(),
        middleName: editMiddleName.trim() || undefined,
        lastName: editLastName.trim(),
        gender: editGender || undefined,
        dateOfBirth: editDateOfBirth || undefined,
        contactNumber: editContactNumber.trim() || undefined,
        address: editAddress.trim() || undefined,
        weight: editWeight ? parseFloat(editWeight) : undefined,
        height: editHeight ? parseFloat(editHeight) : undefined,
        bloodType: editBloodType.trim() || undefined,
        medicalHistory: editMedicalHistory.trim() || undefined,
        allergies: editAllergies.trim() || undefined,
        medications: editMedications.trim() || undefined,
        philHealthId: editPhilHealthId.trim() || undefined,
        philHealthStatus: editPhilHealthStatus.trim() || undefined,
        philHealthCategory: editPhilHealthCategory.trim() || undefined,
      }

      const response = await patientsApi.updatePatient(editingPatient.id, updateData)
      
      if (response.success) {
        toast.success("Patient information updated successfully")
        setIsEditDialogOpen(false)
        setEditingPatient(null)
        await fetchPatients()
      } else {
        toast.error(response.message || "Failed to update patient")
      }
    } catch (error) {
      toast.error("Failed to update patient")
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingId) return
    
    setProcessing(true)
    try {
      const response = await patientsApi.deletePatient(deletingId)
      if (response.success) {
        toast.success("Patient deleted successfully")
        setDeletingId(null)
        setSelectedPatient(null)
        await fetchPatients()
      } else {
        toast.error(response.message || "Failed to delete patient")
      }
    } catch (error) {
      toast.error("Failed to delete patient")
      console.error(error)
    } finally {
      setProcessing(false)
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
          title="Patient Management" 
          description="Manage patients and verify their accounts"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {/* Header */}
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Patient Management</h2>
                </div>

                {/* Search and Filter */}
                <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search patients by name or email..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value)
                        setCurrentPage(1)
                      }}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <IconFilter className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={verificationFilter}
                      onValueChange={(value) => {
                        setVerificationFilter(value as VerificationStatus)
                        setCurrentPage(1)
                      }}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Patients</SelectItem>
                        <SelectItem value="NOT_VERIFIED">Not Verified</SelectItem>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="VERIFIED">Verified</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Patients Table */}
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>NAME</TableHead>
                          <TableHead>EMAIL</TableHead>
                          <TableHead>PHILHEALTH ID</TableHead>
                          <TableHead>VERIFICATION STATUS</TableHead>
                          <TableHead>DOCUMENT</TableHead>
                          <TableHead className="text-right">ACTIONS</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              Loading...
                            </TableCell>
                          </TableRow>
                        ) : patients.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                              No patients found
                            </TableCell>
                          </TableRow>
                        ) : (
                          patients.map((patient) => {
                            const name = patient.patientInfo
                              ? `${patient.patientInfo.firstName} ${patient.patientInfo.lastName}`
                              : 'N/A'
                            const status = patient.patientInfo?.verificationStatus || 'NOT_VERIFIED'
                            const hasDocument = !!patient.patientInfo?.philHealthIdImage

                            return (
                              <TableRow key={patient.id}>
                                <TableCell className="font-medium">{name}</TableCell>
                                <TableCell>{patient.email}</TableCell>
                                <TableCell>{patient.patientInfo?.philHealthId || 'N/A'}</TableCell>
                                <TableCell>{getStatusBadge(status)}</TableCell>
                                <TableCell>
                                  {hasDocument ? (
                                    <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20">
                                      Uploaded
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="bg-gray-500/10 text-gray-700 border-gray-500/20">
                                      Not Uploaded
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center justify-end">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger {...({ asChild: true } as any)}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                        >
                                          <IconDotsVertical className="h-4 w-4" />
                                        </Button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end">
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            setSelectedPatient(patient)
                                            setViewDetailsDialogOpen(true)
                                            // Fetch full patient details
                                            setLoadingDetails(true)
                                            try {
                                              const response = await patientsApi.getPatientById(patient.id)
                                              if (response.success && response.data) {
                                                setFullPatientDetails(response.data)
                                              }
                                            } catch (error) {
                                              console.error("Failed to fetch patient details:", error)
                                            } finally {
                                              setLoadingDetails(false)
                                            }
                                          }}
                                        >
                                          <IconEye className="h-4 w-4 mr-2" />
                                          View Details
                                        </DropdownMenuItem>
                                        {hasDocument && (
                                          <DropdownMenuItem
                                            onClick={() => {
                                              if (patient.patientInfo?.philHealthIdImage) {
                                                setDocumentImage(patient.patientInfo.philHealthIdImage)
                                                setDocumentPatientName(name)
                                                setViewDocumentDialogOpen(true)
                                              }
                                            }}
                                          >
                                            <IconEye className="h-4 w-4 mr-2" />
                                            View PhilHealth ID
                                          </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedPatient(patient)
                                            setVerifyDialogOpen(true)
                                          }}
                                          className="text-green-600 focus:text-green-700"
                                        >
                                          <IconCheck className="h-4 w-4 mr-2" />
                                          Verify
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedPatient(patient)
                                            setRejectDialogOpen(true)
                                          }}
                                          className="text-red-600 focus:text-red-700"
                                        >
                                          <IconX className="h-4 w-4 mr-2" />
                                          Reject
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={async () => {
                                            setEditingPatient(patient)
                                            // Fetch full patient details for editing
                                            try {
                                              const response = await patientsApi.getPatientById(patient.id)
                                              if (response.success && response.data) {
                                                const patientData = response.data.patientInfo || {}
                                                setEditFirstName(patientData.firstName || "")
                                                setEditMiddleName(patientData.middleName || "")
                                                setEditLastName(patientData.lastName || "")
                                                setEditGender(patientData.gender || "")
                                                setEditDateOfBirth(patientData.dateOfBirth ? (new Date(patientData.dateOfBirth).toISOString().split('T')[0] || "") : "")
                                                setEditContactNumber(patientData.contactNumber || "")
                                                setEditAddress(patientData.address || "")
                                                setEditWeight(patientData.weight?.toString() || "")
                                                setEditHeight(patientData.height?.toString() || "")
                                                setEditBloodType(patientData.bloodType || "")
                                                setEditMedicalHistory(patientData.medicalHistory || "")
                                                setEditAllergies(patientData.allergies || "")
                                                setEditMedications(patientData.medications || "")
                                                setEditPhilHealthId(patientData.philHealthId || "")
                                                setEditPhilHealthStatus(patientData.philHealthStatus || "")
                                                setEditPhilHealthCategory(patientData.philHealthCategory || "")
                                              } else {
                                                // Fallback to partial data
                                                setEditFirstName(patient.patientInfo?.firstName || "")
                                                setEditMiddleName(patient.patientInfo?.middleName || "")
                                                setEditLastName(patient.patientInfo?.lastName || "")
                                                setEditContactNumber(patient.patientInfo?.contactNumber || "")
                                                setEditPhilHealthId(patient.patientInfo?.philHealthId || "")
                                              }
                                            } catch (error) {
                                              console.error("Failed to fetch patient details:", error)
                                              // Fallback to partial data
                                              setEditFirstName(patient.patientInfo?.firstName || "")
                                              setEditMiddleName(patient.patientInfo?.middleName || "")
                                              setEditLastName(patient.patientInfo?.lastName || "")
                                              setEditContactNumber(patient.patientInfo?.contactNumber || "")
                                              setEditPhilHealthId(patient.patientInfo?.philHealthId || "")
                                            }
                                            setIsEditDialogOpen(true)
                                          }}
                                        >
                                          <IconEdit className="h-4 w-4 mr-2" />
                                          Edit
                                        </DropdownMenuItem>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedPatient(patient)
                                            setDeletingId(patient.id)
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
                            )
                          })
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Pagination */}
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Showing {patients.length} of {total} patients
                  </div>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePrevPage}
                      disabled={currentPage === 1 || loading}
                      className="disabled:text-muted-foreground"
                    >
                      <IconChevronLeft className="h-4 w-4 mr-1" />
                      Prev
                    </Button>
                    <div className="rounded-md border bg-muted px-3 py-1.5 text-sm font-medium">
                      Page {currentPage} of {totalPages || 1}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage >= totalPages || loading}
                      className="disabled:text-muted-foreground"
                    >
                      Next
                      <IconChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>

      {/* Verify Dialog */}
      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify Patient</DialogTitle>
            <DialogDescription>
              Are you sure you want to verify this patient's account?
            </DialogDescription>
          </DialogHeader>
          {selectedPatient?.patientInfo && (
            <div className="mt-2 mb-4">
              <p className="font-medium">
                {selectedPatient.patientInfo.firstName} {selectedPatient.patientInfo.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{selectedPatient.email}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setVerifyDialogOpen(false)
                setSelectedPatient(null)
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button onClick={handleVerify} disabled={processing}>
              {processing ? 'Verifying...' : 'Verify Patient'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Patient Verification</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this patient's verification.
            </DialogDescription>
          </DialogHeader>
          {selectedPatient?.patientInfo && (
            <div className="mt-2 mb-4">
              <p className="font-medium">
                {selectedPatient.patientInfo.firstName} {selectedPatient.patientInfo.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{selectedPatient.email}</p>
            </div>
          )}
          <div className="py-4">
            <Label htmlFor="rejection-reason">Rejection Reason *</Label>
            <Textarea
              id="rejection-reason"
              placeholder="Enter the reason for rejection..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false)
                setSelectedPatient(null)
                setRejectionReason("")
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? 'Rejecting...' : 'Reject Verification'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={viewDetailsDialogOpen} onOpenChange={(open) => {
        setViewDetailsDialogOpen(open)
        if (!open) {
          setSelectedPatient(null)
          setFullPatientDetails(null)
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Patient Details</DialogTitle>
            <DialogDescription>
              {fullPatientDetails?.patientInfo && (
                <span>
                  Complete information for {fullPatientDetails.patientInfo.firstName} {fullPatientDetails.patientInfo.middleName || ""} {fullPatientDetails.patientInfo.lastName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          {loadingDetails ? (
            <div className="py-8 text-center text-muted-foreground">Loading patient details...</div>
          ) : (fullPatientDetails || selectedPatient) ? (
            <div className="py-4 space-y-6">
              {(() => {
                const patient = fullPatientDetails || selectedPatient
                const patientInfo = fullPatientDetails?.patientInfo || selectedPatient?.patientInfo
                return (
                  <>
                    {/* Personal Information */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Personal Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Full Name</Label>
                          <p className="text-sm font-medium">
                            {patientInfo?.firstName} {patientInfo?.middleName || ""} {patientInfo?.lastName}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Email</Label>
                          <p className="text-sm font-medium">{patient?.email || fullPatientDetails?.email}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Gender</Label>
                          <p className="text-sm font-medium">{patientInfo?.gender || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Date of Birth</Label>
                          <p className="text-sm font-medium">
                            {patientInfo?.dateOfBirth ? new Date(patientInfo.dateOfBirth).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Contact Number</Label>
                          <p className="text-sm font-medium">{patientInfo?.contactNumber || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Address</Label>
                          <p className="text-sm font-medium">{patientInfo?.address || "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Health Information */}
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-lg font-semibold">Health Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Weight (kg)</Label>
                          <p className="text-sm font-medium">{patientInfo?.weight || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Height (cm)</Label>
                          <p className="text-sm font-medium">{patientInfo?.height || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Blood Type</Label>
                          <p className="text-sm font-medium">{patientInfo?.bloodType || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Medical History</Label>
                          <p className="text-sm font-medium">{patientInfo?.medicalHistory || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Allergies</Label>
                          <p className="text-sm font-medium">{patientInfo?.allergies || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Medications</Label>
                          <p className="text-sm font-medium">{patientInfo?.medications || "N/A"}</p>
                        </div>
                      </div>
                    </div>

                    {/* PhilHealth Information */}
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-lg font-semibold">PhilHealth Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">PhilHealth ID</Label>
                          <p className="text-sm font-medium">{patientInfo?.philHealthId || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">PhilHealth Status</Label>
                          <p className="text-sm font-medium">{patientInfo?.philHealthStatus || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">PhilHealth Category</Label>
                          <p className="text-sm font-medium">{patientInfo?.philHealthCategory || "N/A"}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">PhilHealth ID Verified</Label>
                          <p className="text-sm font-medium">
                            {patientInfo?.philHealthIdVerified ? "Yes" : "No"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Member Since</Label>
                          <p className="text-sm font-medium">
                            {patientInfo?.philHealthMemberSince ? new Date(patientInfo.philHealthMemberSince).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Expiry Date</Label>
                          <p className="text-sm font-medium">
                            {patientInfo?.philHealthExpiry ? new Date(patientInfo.philHealthExpiry).toLocaleDateString() : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Verification Status */}
                    <div className="space-y-4 border-t pt-4">
                      <h3 className="text-lg font-semibold">Verification Status</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Verification Status</Label>
                          <div className="mt-1">
                            {getStatusBadge(patientInfo?.verificationStatus || 'NOT_VERIFIED')}
                          </div>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Status Updated At</Label>
                          <p className="text-sm font-medium">
                            {patientInfo?.verificationStatusUpdatedAt ? new Date(patientInfo.verificationStatusUpdatedAt).toLocaleString() : "N/A"}
                          </p>
                        </div>
                        {patientInfo?.verificationStatus === "REJECTED" && patientInfo?.verificationRejectionReason && (
                          <div className="col-span-2">
                            <Label className="text-muted-foreground">Rejection Reason</Label>
                            <p className="text-sm font-medium mt-1 text-red-600">{patientInfo.verificationRejectionReason}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Subscription Information */}
                    {patientInfo?.subscriptionTier && (
                      <div className="space-y-4 border-t pt-4">
                        <h3 className="text-lg font-semibold">Subscription Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-muted-foreground">Subscription Tier</Label>
                            <p className="text-sm font-medium">{patientInfo.subscriptionTier}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Subscription Active</Label>
                            <p className="text-sm font-medium">
                              {patientInfo.isSubscriptionActive ? "Yes" : "No"}
                            </p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Max Face Scans</Label>
                            <p className="text-sm font-medium">{patientInfo.maxFaceScans || "Unlimited"}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Current Face Scans</Label>
                            <p className="text-sm font-medium">{patientInfo.currentFaceScans || 0}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setViewDetailsDialogOpen(false)
                setSelectedPatient(null)
                setFullPatientDetails(null)
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Patient Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        setIsEditDialogOpen(open)
        if (!open) {
          setEditingPatient(null)
          setEditFirstName("")
          setEditMiddleName("")
          setEditLastName("")
          setEditGender("")
          setEditDateOfBirth("")
          setEditContactNumber("")
          setEditAddress("")
          setEditWeight("")
          setEditHeight("")
          setEditBloodType("")
          setEditMedicalHistory("")
          setEditAllergies("")
          setEditMedications("")
          setEditPhilHealthId("")
          setEditPhilHealthStatus("")
          setEditPhilHealthCategory("")
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Edit Patient Information</DialogTitle>
            <DialogDescription>
              Update the patient&apos;s information. Changes will be saved to the database.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Personal Information</h3>
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
                  <Label htmlFor="edit-gender">Gender</Label>
                  <Select value={editGender} onValueChange={(value) => setEditGender(value || "")}>
                    <SelectTrigger id="edit-gender">
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
                  <Label htmlFor="edit-dob">Date of Birth</Label>
                  <Input
                    id="edit-dob"
                    type="date"
                    value={editDateOfBirth}
                    onChange={(e) => setEditDateOfBirth(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-contact">Contact Number</Label>
                  <Input
                    id="edit-contact"
                    value={editContactNumber}
                    onChange={(e) => setEditContactNumber(e.target.value)}
                    placeholder="Contact Number"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Textarea
                    id="edit-address"
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    placeholder="Address"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Health Information */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">Health Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-weight">Weight (kg)</Label>
                  <Input
                    id="edit-weight"
                    type="number"
                    step="0.1"
                    value={editWeight}
                    onChange={(e) => setEditWeight(e.target.value)}
                    placeholder="Weight in kg"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-height">Height (cm)</Label>
                  <Input
                    id="edit-height"
                    type="number"
                    step="0.1"
                    value={editHeight}
                    onChange={(e) => setEditHeight(e.target.value)}
                    placeholder="Height in cm"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-bloodtype">Blood Type</Label>
                  <Input
                    id="edit-bloodtype"
                    value={editBloodType}
                    onChange={(e) => setEditBloodType(e.target.value)}
                    placeholder="Blood Type"
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-medical-history">Medical History</Label>
                  <Textarea
                    id="edit-medical-history"
                    value={editMedicalHistory}
                    onChange={(e) => setEditMedicalHistory(e.target.value)}
                    placeholder="Medical History"
                    rows={3}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-allergies">Allergies</Label>
                  <Textarea
                    id="edit-allergies"
                    value={editAllergies}
                    onChange={(e) => setEditAllergies(e.target.value)}
                    placeholder="Allergies"
                    rows={2}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="edit-medications">Medications</Label>
                  <Textarea
                    id="edit-medications"
                    value={editMedications}
                    onChange={(e) => setEditMedications(e.target.value)}
                    placeholder="Current Medications"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* PhilHealth Information */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="text-lg font-semibold">PhilHealth Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-philhealth">PhilHealth ID</Label>
                  <Input
                    id="edit-philhealth"
                    value={editPhilHealthId}
                    onChange={(e) => setEditPhilHealthId(e.target.value)}
                    placeholder="PhilHealth ID"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-philhealth-status">PhilHealth Status</Label>
                  <Input
                    id="edit-philhealth-status"
                    value={editPhilHealthStatus}
                    onChange={(e) => setEditPhilHealthStatus(e.target.value)}
                    placeholder="PhilHealth Status"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-philhealth-category">PhilHealth Category</Label>
                  <Input
                    id="edit-philhealth-category"
                    value={editPhilHealthCategory}
                    onChange={(e) => setEditPhilHealthCategory(e.target.value)}
                    placeholder="PhilHealth Category"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setEditingPatient(null)
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Patient</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this patient? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedPatient?.patientInfo && (
            <div className="mt-2 mb-4">
              <p className="font-medium">
                {selectedPatient.patientInfo.firstName} {selectedPatient.patientInfo.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{selectedPatient.email}</p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeletingId(null)
                setSelectedPatient(null)
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
              {processing ? 'Deleting...' : 'Delete Patient'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Document Dialog */}
      <Dialog open={viewDocumentDialogOpen} onOpenChange={setViewDocumentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>PhilHealth ID Document</DialogTitle>
            <DialogDescription>
              {documentPatientName && (
                <span>Document for {documentPatientName}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 flex justify-center items-center bg-muted/50 rounded-lg min-h-[400px]">
            {documentImage ? (
              <img
                src={documentImage}
                alt="PhilHealth ID Document"
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
                setDocumentPatientName("")
              }}
            >
              Close
            </Button>
            {documentImage && (
              <Button
                variant="outline"
                onClick={() => {
                  if (documentImage) {
                    const link = document.createElement('a')
                    link.href = documentImage
                    link.download = `philhealth-id-${documentPatientName.replace(/\s+/g, '-')}.png`
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
    </SidebarProvider>
  )
}
