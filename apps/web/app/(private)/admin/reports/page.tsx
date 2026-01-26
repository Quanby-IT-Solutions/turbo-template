"use client"

import { useState } from "react"
import { SidebarWrapper } from "@/core/components/sidebar-wrapper"
import { RoleHeader } from "@/core/components/role-header"
import { ReportsCharts } from "@/core/components/reports-charts"
import {
  SidebarInset,
  SidebarProvider,
} from "@/core/components/ui/sidebar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/core/components/ui/card"
import { Button } from "@/core/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/core/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/core/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/core/components/ui/table"
import { Badge } from "@/core/components/ui/badge"
import { Input } from "@/core/components/ui/input"
import { Label } from "@/core/components/ui/label"
import { Textarea } from "@/core/components/ui/textarea"
import {
  FileText,
  Plus,
  Download,
  RefreshCw,
  TrendingUp,
  Users,
  Activity,
  Calendar,
  BarChart3,
  PieChart,
  Shield,
  Database,
  Trash2,
  Eye,
} from "lucide-react"
import {
  useReports,
  useCreateReport,
  useGenerateReport,
  useDeleteReport,
  useReportTemplates
} from "@/services/query/use-reports"
import type { CreateReportRequest, TimePeriod, ReportType } from "@/services/api/reports"
import { format } from "date-fns"

export default function ReportsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("last-month")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("ORGANIZATIONAL_OVERVIEW")
  
  // Fetch data
  const { data: reports = [], isLoading: isLoadingReports, refetch: refetchReports } = useReports()
  const { data: templates = [], isLoading: isLoadingTemplates } = useReportTemplates()
  
  // Mutations
  const createReportMutation = useCreateReport()
  const generateReportMutation = useGenerateReport()
  const deleteReportMutation = useDeleteReport()

  // Form state
  const [reportName, setReportName] = useState("")
  const [reportDescription, setReportDescription] = useState("")

  const handleCreateReport = async () => {
    if (!reportName) return

    const reportData: CreateReportRequest = {
      name: reportName,
      description: reportDescription,
      reportType: selectedReportType,
      configuration: {
        timePeriod,
        includeCharts: true,
        includeMetrics: true,
      },
    }

    await createReportMutation.mutateAsync(reportData)
    setIsCreateDialogOpen(false)
    setReportName("")
    setReportDescription("")
    refetchReports()
  }

  const handleGenerateReport = async (reportId: string) => {
    await generateReportMutation.mutateAsync({ reportId })
    refetchReports()
  }

  const handleDeleteReport = async (reportId: string) => {
    if (confirm("Are you sure you want to delete this report?")) {
      await deleteReportMutation.mutateAsync(reportId)
      refetchReports()
    }
  }

  const handleViewReport = (report: any) => {
    // For now, just scroll to the charts section to show the latest report data
    // In the future, this could open a modal or navigate to a detailed report page
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PENDING: "outline",
      PROCESSING: "secondary",
      COMPLETED: "default",
      FAILED: "destructive",
    }
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>
  }

  const getReportTypeIcon = (type: string) => {
    switch (type) {
      case "APPOINTMENTS_SUMMARY":
        return <Calendar className="h-4 w-4" />
      case "USER_ACTIVITY":
        return <Users className="h-4 w-4" />
      case "CONSULTATION_METRICS":
        return <Activity className="h-4 w-4" />
      case "ORGANIZATIONAL_OVERVIEW":
        return <TrendingUp className="h-4 w-4" />
      default:
        return <FileText className="h-4 w-4" />
    }
  }

  // Calculate summary statistics from completed reports
  const completedReports = reports.filter(r => r.status === "COMPLETED")
  const latestReport = completedReports[0]
  const reportData = latestReport?.reportData as any

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <SidebarWrapper role="admin" variant="inset" />
      <SidebarInset>
        <RoleHeader 
          title="System Reports" 
          description="View and configure organizational reports (excluding PHI details)"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                
                {/* Header Actions */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-week">Last Week</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="last-quarter">Last Quarter</SelectItem>
                        <SelectItem value="last-year">Last Year</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Shield className="h-4 w-4 text-green-600" />
                      <span>PHI Protected</span>
                      <Database className="h-4 w-4 text-blue-600 ml-2" />
                      <span>Aggregated Data Only</span>
                    </div>
                  </div>
                  
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger>
                      <Button className="bg-sky-600 hover:bg-sky-700">
                        <Plus className="mr-2 h-4 w-4" />
                        Create Report
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">\n                      <DialogHeader className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="p-2 bg-sky-100 rounded-lg">
                            <FileText className="h-5 w-5 text-sky-600" />
                          </div>
                          <div>
                            <DialogTitle className="text-xl font-semibold text-slate-800">
                              Create New Report
                            </DialogTitle>
                            <DialogDescription className="text-slate-600">
                              Configure and create a new system report with aggregated data
                            </DialogDescription>
                          </div>
                        </div>
                      </DialogHeader>
                      <div className="space-y-6 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-medium text-slate-700">
                            Report Name *
                          </Label>
                          <Input
                            id="name"
                            value={reportName}
                            onChange={(e) => setReportName(e.target.value)}
                            placeholder="Monthly Overview Report"
                            className="border-slate-300 focus:border-sky-500 focus:ring-sky-500"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="description" className="text-sm font-medium text-slate-700">
                            Description
                          </Label>
                          <Textarea
                            id="description"
                            value={reportDescription}
                            onChange={(e) => setReportDescription(e.target.value)}
                            placeholder="Comprehensive monthly analytics and performance metrics..."
                            className="border-slate-300 focus:border-sky-500 focus:ring-sky-500 min-h-[80px]"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="reportType" className="text-sm font-medium text-slate-700">
                            Report Type
                          </Label>
                          <Select value={selectedReportType} onValueChange={(value) => setSelectedReportType(value as ReportType)}>
                            <SelectTrigger className="border-slate-300 focus:border-sky-500 focus:ring-sky-500">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ORGANIZATIONAL_OVERVIEW">
                                <div className="flex items-center gap-2">
                                  <TrendingUp className="h-4 w-4" />
                                  <span>Organizational Overview</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="APPOINTMENTS_SUMMARY">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  <span>Appointments Summary</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="USER_ACTIVITY">
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4" />
                                  <span>User Activity</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="CONSULTATION_METRICS">
                                <div className="flex items-center gap-2">
                                  <Activity className="h-4 w-4" />
                                  <span>Consultation Metrics</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="SYSTEM_PERFORMANCE">
                                <div className="flex items-center gap-2">
                                  <BarChart3 className="h-4 w-4" />
                                  <span>System Performance</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                          <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                            <Shield className="h-4 w-4 text-green-600" />
                            <span className="font-medium">Privacy Protection</span>
                          </div>
                          <p className="text-xs text-slate-500">
                            This report will contain only aggregated statistics and will exclude all 
                            Protected Health Information (PHI) as required by healthcare regulations.
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-3 pt-4 border-t border-slate-200">
                        <Button 
                          variant="outline" 
                          onClick={() => setIsCreateDialogOpen(false)}
                          className="flex-1 border-slate-300 hover:bg-slate-50"
                        >
                          Cancel
                        </Button>
                        <Button 
                          onClick={handleCreateReport} 
                          className="flex-1 bg-sky-600 hover:bg-sky-700"
                          disabled={!reportName || createReportMutation.isPending}
                        >
                          {createReportMutation.isPending ? (
                            <>
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                              Creating...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Create Report
                            </>
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {/* Summary Cards */}
                {reportData && (
                  <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card className="border-l-4 border-l-sky-500 bg-gradient-to-r from-sky-50 to-white">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700">
                          Total Appointments
                        </CardTitle>
                        <Calendar className="h-5 w-5 text-sky-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-sky-700">
                          {reportData.totalAppointments || 0}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          <span className="text-green-600 font-medium">
                            {reportData.completedAppointments || 0} completed
                          </span>
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-white">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700">
                          Active Users
                        </CardTitle>
                        <Users className="h-5 w-5 text-emerald-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-emerald-700">
                          {reportData.totalUsers || 0}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          <span className="text-blue-600 font-medium">
                            +{reportData.newUsers || 0} new
                          </span> this period
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50 to-white">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700">
                          Consultations
                        </CardTitle>
                        <Activity className="h-5 w-5 text-violet-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-violet-700">
                          {reportData.totalConsultations || 0}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Completed sessions
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card className="border-l-4 border-l-amber-500 bg-gradient-to-r from-amber-50 to-white">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-semibold text-slate-700">
                          Performance
                        </CardTitle>
                        <TrendingUp className="h-5 w-5 text-amber-600" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-amber-700">
                          {reportData.totalAppointments > 0 
                            ? `${((reportData.completedAppointments || 0) / reportData.totalAppointments * 100).toFixed(0)}%`
                            : "0%"
                          }
                        </div>
                        <p className="text-xs text-slate-600 mt-1">
                          Completion rate
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Professional Charts Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="h-5 w-5 text-slate-600" />
                    <h3 className="text-lg font-semibold text-slate-800">Analytics Dashboard</h3>
                    <PieChart className="h-5 w-5 text-slate-600" />
                  </div>
                  <ReportsCharts reportData={reportData} />
                </div>

                {/* Reports Management Table */}
                <Card className="border-slate-200 shadow-sm">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-slate-600" />
                        <div>
                          <CardTitle className="text-lg font-semibold text-slate-800">
                            Report Management
                          </CardTitle>
                          <CardDescription className="text-slate-600">
                            View and manage system reports
                          </CardDescription>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => refetchReports()}
                        disabled={isLoadingReports}
                        className="border-slate-300 hover:bg-slate-50"
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingReports ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {isLoadingReports ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex items-center gap-2 text-slate-600">
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          <span>Loading reports...</span>
                        </div>
                      </div>
                    ) : reports.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <FileText className="h-12 w-12 text-slate-400 mb-4" />
                        <h3 className="text-lg font-medium text-slate-700 mb-2">No reports found</h3>
                        <p className="text-slate-600 mb-4">
                          Create your first report to get started with analytics
                        </p>
                        <Button 
                          onClick={() => setIsCreateDialogOpen(true)}
                          className="bg-sky-600 hover:bg-sky-700"
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Create Report
                        </Button>
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                        <Table>
                          <TableHeader className="bg-slate-50">
                            <TableRow className="border-slate-200">
                              <TableHead className="font-semibold text-slate-700">Report Details</TableHead>
                              <TableHead className="font-semibold text-slate-700">Type</TableHead>
                              <TableHead className="font-semibold text-slate-700">Status</TableHead>
                              <TableHead className="font-semibold text-slate-700">Generated</TableHead>
                              <TableHead className="font-semibold text-slate-700 text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {reports.map((report) => (
                              <TableRow key={report.id} className="border-slate-100 hover:bg-slate-50/30">
                                <TableCell className="font-medium">
                                  <div className="flex items-center gap-3">
                                    {getReportTypeIcon(report.reportType)}
                                    <div>
                                      <div className="font-semibold text-slate-800">{report.name}</div>
                                      {report.description && (
                                        <div className="text-sm text-slate-600 mt-1 max-w-xs truncate">
                                          {report.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100">
                                    {report.reportType.replace(/_/g, " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell>{getStatusBadge(report.status)}</TableCell>
                                <TableCell className="text-slate-600">
                                  {report.generatedAt 
                                    ? format(new Date(report.generatedAt), "MMM dd, yyyy 'at' HH:mm")
                                    : <span className="text-slate-400">Not generated</span>}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex gap-2 justify-end">
                                    {report.status === "PENDING" && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleGenerateReport(report.id)}
                                        disabled={generateReportMutation.isPending}
                                        className="border-sky-300 text-sky-700 hover:bg-sky-50"
                                      >
                                        {generateReportMutation.isPending ? (
                                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                          <RefreshCw className="h-3 w-3 mr-1" />
                                        )}
                                        Generate
                                      </Button>
                                    )}
                                    {report.status === "COMPLETED" && (
                                      <Button 
                                        size="sm" 
                                        variant="outline" 
                                        onClick={() => handleViewReport(report)}
                                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                                      >
                                        <Eye className="h-3 w-3 mr-1" />
                                        View
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleDeleteReport(report.id)}
                                      disabled={deleteReportMutation.isPending}
                                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                                    >
                                      {deleteReportMutation.isPending ? (
                                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3 mr-1" />
                                      )}
                                      Delete
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
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

