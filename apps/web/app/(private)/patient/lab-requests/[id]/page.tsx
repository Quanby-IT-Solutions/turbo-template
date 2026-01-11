"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Badge } from "@/core/components/ui/badge"
import { Separator } from "@/core/components/ui/separator"
import { labRequestsApi, type LabRequest } from "@/features/lab-requests/api/lab-requests-api"
import { toast } from "sonner"
import { Skeleton } from "@/core/components/ui/skeleton"
import { 
  ArrowLeft, 
  FileText, 
  Calendar, 
  User, 
  Building2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  XCircle,
  FileCheck,
  Stethoscope,
  ClipboardList
} from "lucide-react"

export default function LabRequestDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const id = params?.id as string
  
  const [labRequest, setLabRequest] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (id) {
      fetchLabRequestDetails()
    }
  }, [id])

  const fetchLabRequestDetails = async () => {
    if (!id) return
    
    setIsLoading(true)
    try {
      const response = await labRequestsApi.getLabRequestById(id)
      
      if (response.success && response.data) {
        setLabRequest(response.data)
      } else {
        const errorMessage = response.message || response.error || "Failed to fetch lab request details"
        toast.error(errorMessage)
        router.push("/patient/lab-requests")
      }
    } catch (error) {
      console.error("Error fetching lab request details:", error)
      toast.error("An unexpected error occurred while fetching lab request details")
      router.push("/patient/lab-requests")
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Completed
          </Badge>
        )
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50">
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            Pending
          </Badge>
        )
      case "IN_PROGRESS":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
            <AlertCircle className="mr-1.5 h-3.5 w-3.5" />
            In Progress
          </Badge>
        )
      case "CANCELLED":
        return (
          <Badge variant="destructive" className="hover:bg-destructive/90">
            <XCircle className="mr-1.5 h-3.5 w-3.5" />
            Cancelled
          </Badge>
        )
      case "ON_HOLD":
        return (
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50">
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            On Hold
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge variant="destructive" className="hover:bg-destructive/90">
            <XCircle className="mr-1.5 h-3.5 w-3.5" />
            Rejected
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return (
          <Badge variant="destructive" className="hover:bg-destructive/90">
            Urgent
          </Badge>
        )
      case "HIGH":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-50">
            High
          </Badge>
        )
      case "NORMAL":
        return (
          <Badge variant="secondary" className="bg-gray-50 text-gray-700 border-gray-200">
            Normal
          </Badge>
        )
      case "LOW":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-50">
            Low
          </Badge>
        )
      default:
        return <Badge variant="outline">{priority}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (isLoading) {
    return (
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <SidebarWrapper role="patient" variant="inset" />
        <SidebarInset>
          <RoleHeader 
            title="Lab Request Details" 
            description="View complete details of your laboratory test request"
          />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="px-4 lg:px-6">
                  <Skeleton className="h-10 w-40 mb-6" />
                  <Card>
                    <CardHeader className="pb-4">
                      <div className="flex items-start gap-4">
                        <Skeleton className="h-12 w-12 rounded-lg" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-7 w-64" />
                          <Skeleton className="h-4 w-48" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-0">
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-40" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                          <Skeleton className="h-16 w-full" />
                          <Skeleton className="h-16 w-full" />
                          <Skeleton className="h-16 w-full" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                      </div>
                      <Skeleton className="h-px w-full" />
                      <div className="space-y-4">
                        <Skeleton className="h-6 w-40" />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                          <Skeleton className="h-16 w-full" />
                        </div>
                      </div>
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

  if (!labRequest) {
    return null
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
      <SidebarWrapper role="patient" variant="inset" />
      <SidebarInset>
        <RoleHeader 
          title="Lab Request Details" 
          description="View complete details of your laboratory test request"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {/* Back Button */}
                <Button
                  variant="ghost"
                  onClick={() => router.push("/patient/lab-requests")}
                  className="mb-6"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Lab Requests
                </Button>

                {/* Main Details Card */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FileText className="h-6 w-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-2xl font-bold mb-2">
                          {labRequest.requestedTests || "Lab Request Details"}
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            <span>Requested {formatDate(labRequest.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6 pt-0">
                    {/* Request Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Request Information</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Requested Tests</p>
                          <p className="text-base font-medium leading-relaxed">{labRequest.requestedTests || "Not specified"}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</p>
                          <div>{getPriorityBadge(labRequest.priority)}</div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</p>
                          <div>{getStatusBadge(labRequest.status)}</div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Request Date</p>
                          <p className="text-base font-medium">{formatDate(labRequest.createdAt)}</p>
                        </div>
                        {labRequest.updatedAt && labRequest.createdAt !== labRequest.updatedAt && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Last Updated</p>
                            <p className="text-base font-medium">{formatDate(labRequest.updatedAt)}</p>
                          </div>
                        )}
                        {labRequest.roomId && (
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Room ID</p>
                            <p className="text-base font-medium font-mono text-sm">{labRequest.roomId}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Doctor Information - Only show if doctor exists */}
                    {labRequest.doctorId && labRequest.doctorName && (
                      <>
                        <Separator className="my-6" />
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold">Doctor Information</h3>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                            <div className="space-y-1">
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Doctor Name</p>
                              <p className="text-base font-medium">{labRequest.doctorName}</p>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    <Separator className="my-6" />

                    {/* Organization Information */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h3 className="text-lg font-semibold">Laboratory/Organization</h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Organization Name</p>
                          <p className="text-base font-medium">{labRequest.organizationName || "Not specified"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Instructions */}
                    {labRequest.instructions && (
                      <>
                        <Separator className="my-6" />
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold">Special Instructions</h3>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-4 border border-border/50 pl-7">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{labRequest.instructions}</p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Additional Notes */}
                    {labRequest.note && (
                      <>
                        <Separator className="my-6" />
                        <div className="space-y-4">
                          <div className="flex items-center gap-2">
                            <FileCheck className="h-5 w-5 text-primary" />
                            <h3 className="text-lg font-semibold">Additional Notes</h3>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-4 border border-border/50 pl-7">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">{labRequest.note}</p>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Action Buttons */}
                {labRequest.status === "COMPLETED" && (
                  <div className="mt-6 flex gap-2">
                    <Button size="lg" className="w-full sm:w-auto">
                      <FileCheck className="mr-2 h-4 w-4" />
                      View Results
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

