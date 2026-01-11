"use client"

import * as React from "react"
import {
  IconFlask,
  IconPlus,
  IconCalendar,
  IconX,
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
import { Label } from "@/core/components/ui/label"
import { Badge } from "@/core/components/ui/badge"
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
import { labRequestsApi } from "@/features/lab-requests/api/lab-requests-api"
import { getUser } from "@/services/api/client"
import { CreateLabRequestModal } from "./create-lab-request-modal"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export default function LabRequestsPage() {
  const router = useRouter()
  const [statusFilter, setStatusFilter] = React.useState("all")
  const [fromDate, setFromDate] = React.useState("")
  const [toDate, setToDate] = React.useState("")
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [labRequests, setLabRequests] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const user = getUser()

  const fetchLabRequests = React.useCallback(async (showError = true) => {
    if (!user?.id) {
      console.warn("User ID not available for fetching lab requests")
      setIsLoading(false)
      return
    }
    
    setIsLoading(true)
    try {
      const response = await labRequestsApi.getDoctorLabRequests(user.id)
      
      if (response.success && response.data) {
        // Ensure data is an array
        setLabRequests(Array.isArray(response.data) ? response.data : [])
      } else {
        const errorMessage = response.message || response.error || "Failed to fetch lab requests"
        if (showError) {
          toast.error(errorMessage)
        }
        setLabRequests([])
      }
    } catch (error) {
      console.error("Error fetching lab requests:", error)
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred while fetching lab requests"
      if (showError) {
        toast.error(errorMessage)
      }
      setLabRequests([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  React.useEffect(() => {
    fetchLabRequests()
  }, [fetchLabRequests])

  const handleClearFilters = () => {
    setStatusFilter("all")
    setFromDate("")
    setToDate("")
  }

  // Filter lab requests based on current filters
  const filteredRequests = React.useMemo(() => {
    let filtered = [...labRequests]

    // Status filter
    if (statusFilter !== "all") {
      const statusMap: Record<string, string> = {
        "pending": "PENDING",
        "in-progress": "IN_PROGRESS",
        "completed": "COMPLETED",
        "cancelled": "CANCELLED",
        "rejected": "REJECTED",
        "on-hold": "ON_HOLD",
      }
      const statusValue = statusMap[statusFilter] || statusFilter.toUpperCase().replace("-", "_")
      filtered = filtered.filter((req) => req.status === statusValue)
    }

    // Date filters
    if (fromDate) {
      const from = new Date(fromDate)
      filtered = filtered.filter((req) => {
        const reqDate = new Date(req.createdAt)
        return reqDate >= from
      })
    }

    if (toDate) {
      const to = new Date(toDate)
      to.setHours(23, 59, 59, 999) // Include the entire day
      filtered = filtered.filter((req) => {
        const reqDate = new Date(req.createdAt)
        return reqDate <= to
      })
    }

    return filtered
  }, [labRequests, statusFilter, fromDate, toDate])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">Completed</Badge>
      case "PENDING":
        return <Badge variant="secondary" className="bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-50">Pending</Badge>
      case "IN_PROGRESS":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50">In Progress</Badge>
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>
      case "REJECTED":
        return <Badge variant="destructive">Rejected</Badge>
      case "ON_HOLD":
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-50">On Hold</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
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
      <SidebarWrapper role="doctor" variant="inset" />
      <SidebarInset>
        <RoleHeader 
          title="Lab Request Management" 
          description="Manage laboratory test requests and results"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                {/* Header with New Lab Request button */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconFlask className="h-5 w-5 text-primary" />
                    <div>
                      <h1 className="text-2xl font-bold">Lab Request Management</h1>
                      <p className="text-sm text-muted-foreground">
                        Manage laboratory test requests and results
                      </p>
                    </div>
                  </div>
                  <Button onClick={() => setIsModalOpen(true)}>
                    <IconPlus className="h-4 w-4 mr-2" />
                    New Lab Request
                  </Button>
                </div>

                {/* Filters Section */}
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Filters</CardTitle>
                      <Button variant="outline" onClick={handleClearFilters}>
                        <IconX className="h-4 w-4 mr-2" />
                        Clear Filters
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <Label htmlFor="status" className="mb-2 block text-sm font-medium">
                          Status
                        </Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger id="status">
                            <SelectValue placeholder="All Statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in-progress">In Progress</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="cancelled">Cancelled</SelectItem>
                            <SelectItem value="rejected">Rejected</SelectItem>
                            <SelectItem value="on-hold">On Hold</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="from-date" className="mb-2 block text-sm font-medium">
                          From Date
                        </Label>
                        <div className="relative">
                          <Input
                            id="from-date"
                            type="date"
                            placeholder="dd/mm/yyyy"
                            value={fromDate}
                            onChange={(e) => setFromDate(e.target.value)}
                            className="pr-10"
                          />
                          <IconCalendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="to-date" className="mb-2 block text-sm font-medium">
                          To Date
                        </Label>
                        <div className="relative">
                          <Input
                            id="to-date"
                            type="date"
                            placeholder="dd/mm/yyyy"
                            value={toDate}
                            onChange={(e) => setToDate(e.target.value)}
                            className="pr-10"
                          />
                          <IconCalendar className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Lab Requests Table */}
                <Card>
                  <CardHeader>
                    <CardTitle>Lab Requests ({filteredRequests.length} total)</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                          <IconFlask className="h-8 w-8 text-muted-foreground animate-pulse" />
                        </div>
                        <p className="text-sm text-muted-foreground">Loading lab requests...</p>
                      </div>
                    ) : filteredRequests.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16">
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                          <IconFlask className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="mb-2 text-lg font-bold">No Lab Requests Found</h3>
                        <p className="mb-4 text-sm text-muted-foreground text-center">
                          {labRequests.length === 0 
                            ? "You haven't created any lab requests yet. Click the button above to create your first request."
                            : "No lab requests match your current filters."}
                        </p>
                        {labRequests.length > 0 && (
                        <Button variant="outline" onClick={handleClearFilters}>
                          Clear Filters
                        </Button>
                        )}
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>PATIENT</TableHead>
                            <TableHead>ORGANIZATION</TableHead>
                            <TableHead>STATUS</TableHead>
                            <TableHead>REQUESTED DATE</TableHead>
                            <TableHead className="text-right">ACTIONS</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredRequests.map((request) => (
                            <TableRow key={request.id}>
                              <TableCell className="font-medium">
                                {request.patientName || "Unknown Patient"}
                              </TableCell>
                              <TableCell>
                                {request.organizationName || "Unknown Organization"}
                              </TableCell>
                              <TableCell>
                                {getStatusBadge(request.status)}
                              </TableCell>
                              <TableCell>
                                {formatDate(request.createdAt)}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => router.push(`/doctor/lab-requests/${request.id}`)}
                                >
                                  View
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
      
      <CreateLabRequestModal 
        open={isModalOpen} 
        onOpenChange={setIsModalOpen} 
        onSuccess={(newRequest?: any) => {
          // If we have the new request data, add it optimistically
          if (newRequest) {
            setLabRequests(prev => [newRequest, ...prev])
          }
          // Refresh the list silently (without showing errors) after a short delay
          setTimeout(() => {
            fetchLabRequests(false) // Don't show errors on refresh after creation
          }, 1000)
        }}
      />
    </SidebarProvider>
  )
}
