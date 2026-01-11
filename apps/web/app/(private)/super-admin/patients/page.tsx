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
import { superAdminApi, type PatientListItem } from "@/features/super-admin/api/super-admin-api"
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
                        <SelectValue placeholder="Filter by status" />
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
                                  <div className="flex items-center justify-end gap-2">
                                    {hasDocument && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8"
                                        onClick={() => {
                                          if (patient.patientInfo?.philHealthIdImage) {
                                            setDocumentImage(patient.patientInfo.philHealthIdImage)
                                            setDocumentPatientName(name)
                                            setViewDocumentDialogOpen(true)
                                          }
                                        }}
                                      >
                                        <IconEye className="h-4 w-4" />
                                      </Button>
                                    )}
                                    {status === 'PENDING' && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-green-600 hover:text-green-700"
                                          onClick={() => {
                                            setSelectedPatient(patient)
                                            setVerifyDialogOpen(true)
                                          }}
                                        >
                                          <IconCheck className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-red-600 hover:text-red-700"
                                          onClick={() => {
                                            setSelectedPatient(patient)
                                            setRejectDialogOpen(true)
                                          }}
                                        >
                                          <IconX className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                    {status === 'REJECTED' && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-green-600 hover:text-green-700"
                                        onClick={() => {
                                          setSelectedPatient(patient)
                                          setVerifyDialogOpen(true)
                                        }}
                                      >
                                        <IconCheck className="h-4 w-4" />
                                      </Button>
                                    )}
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
