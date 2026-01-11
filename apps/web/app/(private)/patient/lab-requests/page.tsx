"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import { Input } from "@/core/components/ui/input"
import { Badge } from "@/core/components/ui/badge"
import { labRequestsApi, type LabRequest } from "@/features/lab-requests/api/lab-requests-api"
import { getUser } from "@/services/api/client"
import { RequestLabTestModal } from "./request-lab-test-modal"
import { toast } from "sonner"
import { Skeleton } from "@/core/components/ui/skeleton"
import { Search, FileText, Calendar, User, Building2, AlertCircle, CheckCircle2, Clock, XCircle, ArrowRight } from "lucide-react"
import { Separator } from "@/core/components/ui/separator"

export default function LabRequestsPage() {
  const router = useRouter()
  const [labRequests, setLabRequests] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  
  const user = getUser()

  const fetchLabRequests = async (showError = true) => {
    if (!user?.id) {
      console.warn("User ID not available for fetching lab requests")
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    try {
      const response = await labRequestsApi.getPatientLabRequests(user.id)
      
      if (response.success && response.data) {
        // Ensure data is an array
        setLabRequests(Array.isArray(response.data) ? response.data : [])
      } else {
        // Handle error response
        const errorMessage = response.message || response.error || "Failed to fetch lab requests"
        if (showError) {
          toast.error(errorMessage)
        }
        // Only log if there's an actual error message
        if (errorMessage !== "Failed to fetch lab requests") {
          console.error("Failed to fetch lab requests:", errorMessage)
        }
        // Set empty array on error to prevent showing stale data
        setLabRequests([])
      }
    } catch (error) {
      console.error("Error fetching lab requests:", error)
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while fetching lab requests"
      if (showError) {
        toast.error(errorMessage)
      }
      // Set empty array on error
      setLabRequests([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLabRequests()
  }, [user?.id])

  const filteredRequests = labRequests.filter(request => 
    request.requestedTests?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.doctorName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.organizationName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
            <CheckCircle2 className="mr-1.5 h-3 w-3" />
            Completed
          </Badge>
        )
      case "PENDING":
        return (
          <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50">
            <Clock className="mr-1.5 h-3 w-3" />
            Pending
          </Badge>
        )
      case "IN_PROGRESS":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">
            <AlertCircle className="mr-1.5 h-3 w-3" />
            In Progress
          </Badge>
        )
      case "CANCELLED":
        return (
          <Badge variant="destructive" className="hover:bg-destructive/90">
            <XCircle className="mr-1.5 h-3 w-3" />
            Cancelled
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive" className="text-xs">URGENT</Badge>
      case "HIGH":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs">HIGH</Badge>
      case "NORMAL":
        return null
      case "LOW":
        return <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 text-xs">LOW</Badge>
      default:
        return null
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
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
          title="Lab Request Management" 
          description="View and manage your laboratory test requests and results"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {/* Header Section */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input 
                      placeholder="Search lab requests..." 
                      className="w-full pl-9" 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button onClick={() => setIsModalOpen(true)} className="w-full sm:w-auto">
                    <FileText className="mr-2 h-4 w-4" />
                    Request Lab Test
                  </Button>
                </div>

                {/* Stats Summary */}
                {!isLoading && filteredRequests.length > 0 && (
                  <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Total Requests</p>
                            <p className="text-2xl font-bold">{filteredRequests.length}</p>
                          </div>
                          <div className="rounded-full bg-primary/10 p-3">
                            <FileText className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Pending</p>
                            <p className="text-2xl font-bold text-yellow-600">
                              {filteredRequests.filter(r => r.status === "PENDING").length}
                            </p>
                          </div>
                          <div className="rounded-full bg-yellow-100 p-3">
                            <Clock className="h-5 w-5 text-yellow-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">Completed</p>
                            <p className="text-2xl font-bold text-green-600">
                              {filteredRequests.filter(r => r.status === "COMPLETED").length}
                            </p>
                          </div>
                          <div className="rounded-full bg-green-100 p-3">
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
                
                {/* Lab Requests List */}
                <div className="space-y-3">
                  {isLoading ? (
                    Array(3).fill(0).map((_, i) => (
                      <Card key={i} className="transition-shadow hover:shadow-md">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-3">
                              <div className="flex items-start gap-4">
                                <Skeleton className="h-12 w-12 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                  <Skeleton className="h-5 w-64" />
                                  <Skeleton className="h-4 w-48" />
                                </div>
                              </div>
                              <Skeleton className="h-4 w-full" />
                            </div>
                            <Skeleton className="h-9 w-24" />
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : filteredRequests.length > 0 ? (
                    filteredRequests.map((request) => (
                      <Card 
                        key={request.id} 
                        className="group transition-all hover:shadow-md hover:border-primary/20 cursor-pointer"
                        onClick={() => router.push(`/patient/lab-requests/${request.id}`)}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            {/* Icon */}
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                              <FileText className="h-6 w-6" />
                            </div>

                            {/* Main Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-4 mb-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="text-lg font-semibold truncate">
                                      {request.requestedTests || "Untitled Lab Test"}
                                    </h3>
                                    {getPriorityBadge(request.priority)}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="h-3.5 w-3.5" />
                                      <span>{formatDate(request.createdAt)}</span>
                                    </div>
                                    {request.doctorId && request.doctorName && (
                                      <>
                                        <span>•</span>
                                        <div className="flex items-center gap-1.5">
                                          <User className="h-3.5 w-3.5" />
                                          <span>{request.doctorName}</span>
                                        </div>
                                      </>
                                    )}
                                    {request.organizationName && (
                                      <>
                                        <span>•</span>
                                        <div className="flex items-center gap-1.5">
                                          <Building2 className="h-3.5 w-3.5" />
                                          <span className="truncate">{request.organizationName}</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  {getStatusBadge(request.status)}
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      router.push(`/patient/lab-requests/${request.id}`)
                                    }}
                                  >
                                    {request.status === "COMPLETED" ? "View Results" : "View Details"}
                                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              <Separator className="my-3" />

                              {/* Additional Info */}
                              <div className="flex flex-wrap items-center gap-4 text-sm">
                                {request.status === "COMPLETED" ? (
                                  <div className="flex items-center gap-2 text-green-600">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>Results available • Completed {formatDate(request.updatedAt)}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <span>{request.note || "Awaiting processing"}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="rounded-full bg-muted p-4 mb-4">
                          <FileText className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No lab requests found</h3>
                        <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                          {searchQuery 
                            ? "Try adjusting your search query to find what you're looking for." 
                            : "You haven't requested any lab tests yet. Click the button above to create your first request."}
                        </p>
                        {!searchQuery && (
                          <Button onClick={() => setIsModalOpen(true)}>
                            <FileText className="mr-2 h-4 w-4" />
                            Request Lab Test
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
      
      <RequestLabTestModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        onSuccess={(newRequest?: any) => {
          // If we have the new request data, add it optimistically
          if (newRequest) {
            // Add to the beginning of the list
            setLabRequests(prev => [newRequest, ...prev])
          }
          // Refresh the list silently (without showing errors) after a short delay
          // This allows the backend to process and get full data with names
          setTimeout(() => {
            fetchLabRequests(false) // Don't show errors on refresh after creation
          }, 1000)
        }}
      />
    </SidebarProvider>
  )
}
