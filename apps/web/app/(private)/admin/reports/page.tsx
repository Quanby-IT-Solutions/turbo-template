"use client"

import { useState } from "react"
import { cn } from "@/core/lib/utils"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/core/components/ui/alert-dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/core/components/ui/tabs"
import {
  FileText,
  Plus,
  RefreshCw,
  Users,
  Calendar,
  Stethoscope,
  FlaskConical,
  Pill,
  HeartPulse,
  Shield,
  Database,
  Trash2,
  Eye,
  BarChart3,
  TrendingUp,
  Activity,
} from "lucide-react"
import {
  useReports,
  useCreateReport,
  useGenerateReport,
  useDeleteReport,
  useReportTemplates
} from "@/services/query/use-reports"
import type { CreateReportRequest, TimePeriod, ReportType, HealthcareAnalytics } from "@/services/api/reports"
import { format } from "date-fns"

// Report type configuration with icons and colors
const REPORT_TYPE_CONFIG: Record<string, { 
  icon: React.ReactNode
  label: string
  description: string
  color: string
  bg: string
  border: string
}> = {
  PATIENT_REGISTRATIONS: {
    icon: <Users className="h-4 w-4" />,
    label: "Patient Registrations",
    description: "Track patient registration trends and verification status",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
  },
  APPOINTMENTS_VISITS: {
    icon: <Calendar className="h-4 w-4" />,
    label: "Appointments & Visits",
    description: "Monitor appointment scheduling and visit completion rates",
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
  },
  DIAGNOSES_TREATMENTS: {
    icon: <Stethoscope className="h-4 w-4" />,
    label: "Diagnoses & Treatments",
    description: "Analyze diagnosis patterns and treatment outcomes",
    color: "text-violet-700",
    bg: "bg-violet-50",
    border: "border-violet-200",
  },
  LAB_TEST_UTILIZATION: {
    icon: <FlaskConical className="h-4 w-4" />,
    label: "Lab Test Utilization",
    description: "Track laboratory test requests and completion rates",
    color: "text-cyan-700",
    bg: "bg-cyan-50",
    border: "border-cyan-200",
  },
  PRESCRIPTION_PHARMACY: {
    icon: <Pill className="h-4 w-4" />,
    label: "Prescription & Pharmacy",
    description: "Monitor prescription patterns and medication trends",
    color: "text-pink-700",
    bg: "bg-pink-50",
    border: "border-pink-200",
  },
  LONGEVITY_PROGRAM: {
    icon: <HeartPulse className="h-4 w-4" />,
    label: "Longevity Program",
    description: "Track health scan results and wellness metrics",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
  },
  // Legacy types for backward compatibility
  ORGANIZATIONAL_OVERVIEW: {
    icon: <TrendingUp className="h-4 w-4" />,
    label: "Organizational Overview",
    description: "Comprehensive organization-wide metrics",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
  APPOINTMENTS_SUMMARY: {
    icon: <Calendar className="h-4 w-4" />,
    label: "Appointments Summary",
    description: "Summary of appointment statistics",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
  },
  USER_ACTIVITY: {
    icon: <Users className="h-4 w-4" />,
    label: "User Activity",
    description: "User activity and engagement metrics",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  CONSULTATION_METRICS: {
    icon: <Activity className="h-4 w-4" />,
    label: "Consultation Metrics",
    description: "Consultation statistics and trends",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
  },
}

// New healthcare-focused report types
const HEALTHCARE_REPORT_TYPES: ReportType[] = [
  "PATIENT_REGISTRATIONS",
  "APPOINTMENTS_VISITS",
  "DIAGNOSES_TREATMENTS",
  "LAB_TEST_UTILIZATION",
  "PRESCRIPTION_PHARMACY",
  "LONGEVITY_PROGRAM",
]

export default function ReportsPage() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("last-month")
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("PATIENT_REGISTRATIONS")
  const [activeTab, setActiveTab] = useState("dashboard")
  
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
    await deleteReportMutation.mutateAsync(reportId)
    refetchReports()
  }

  const handleViewReport = (report: any) => {
    setActiveTab("dashboard")
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

  const getReportTypeConfig = (type: string): NonNullable<typeof REPORT_TYPE_CONFIG[string]> => {
    return REPORT_TYPE_CONFIG[type] ?? REPORT_TYPE_CONFIG.ORGANIZATIONAL_OVERVIEW!
  }

  const getReportTypeBadge = (type: string) => {
    const config = getReportTypeConfig(type)
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "font-semibold shadow-sm px-2.5 py-0.5 whitespace-nowrap flex items-center gap-1.5", 
          config.bg, 
          config.color, 
          config.border
        )}
      >
        {config.icon}
        {config.label}
      </Badge>
    )
  }

  // Get the latest completed report for the dashboard
  const completedReports = reports.filter(r => r.status === "COMPLETED")
  const latestReport = completedReports[0]
  const reportData = latestReport?.reportData as HealthcareAnalytics | undefined

  // Calculate quick stats from any available report data
  const quickStats = {
    totalPatients: reportData?.patientRegistrations?.totalPatients || 0,
    newPatients: reportData?.patientRegistrations?.newPatients || 0,
    totalAppointments: reportData?.appointmentsVisits?.totalAppointments || 0,
    completedVisits: reportData?.appointmentsVisits?.completedVisits || 0,
    totalDiagnoses: reportData?.diagnosesTreatments?.totalDiagnoses || 0,
    totalLabTests: reportData?.labTestUtilization?.totalLabRequests || 0,
    totalPrescriptions: reportData?.prescriptionPharmacy?.totalPrescriptions || 0,
    totalHealthScans: reportData?.longevityProgram?.totalHealthScans || 0,
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
      <SidebarWrapper role="admin" variant="inset" />
      <SidebarInset>
        <RoleHeader 
          title="Healthcare Analytics" 
          description="Comprehensive reports and analytics for your organization (PHI-protected)"
        />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                
                {/* Header Actions */}
                <div className="mb-6 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Shield className="h-4 w-4 text-green-600" />
                    <span>PHI Protected</span>
                    <Database className="h-4 w-4 text-blue-600 ml-2" />
                    <span>Aggregated Data Only</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Select value={timePeriod} onValueChange={(value) => setTimePeriod(value as TimePeriod)}>
                      <SelectTrigger className="w-48 border-slate-300">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="last-week">Last Week</SelectItem>
                        <SelectItem value="last-month">Last Month</SelectItem>
                        <SelectItem value="last-quarter">Last Quarter</SelectItem>
                        <SelectItem value="last-year">Last Year</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                      <DialogTrigger>
                        <Button className="bg-sky-600 hover:bg-sky-700">
                          <Plus className="mr-2 h-4 w-4" />
                          Create Report
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px]">
                        <DialogHeader className="space-y-3">
                          <div className="flex items-center gap-2">
                            <div className="p-2 bg-sky-100 rounded-lg">
                              <BarChart3 className="h-5 w-5 text-sky-600" />
                            </div>
                            <div>
                              <DialogTitle className="text-xl font-semibold text-slate-800">
                                Create Healthcare Report
                              </DialogTitle>
                              <DialogDescription className="text-slate-600">
                                Generate comprehensive analytics with aggregated, non-PHI data
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
                              placeholder="January 2026 Healthcare Analytics"
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
                              placeholder="Monthly healthcare analytics covering all key metrics..."
                              className="border-slate-300 focus:border-sky-500 focus:ring-sky-500 min-h-[80px]"
                            />
                          </div>
                          
                          <div className="space-y-3">
                            <Label className="text-sm font-medium text-slate-700">
                              Report Type
                            </Label>
                            <div className="grid grid-cols-2 gap-3">
                              {HEALTHCARE_REPORT_TYPES.map((type) => {
                                const config = getReportTypeConfig(type)
                                return (
                                  <button
                                    key={type}
                                    type="button"
                                    onClick={() => setSelectedReportType(type)}
                                    className={cn(
                                      "flex items-start gap-3 p-3 rounded-lg border-2 transition-all text-left",
                                      selectedReportType === type
                                        ? `${config.border} ${config.bg} ring-2 ring-offset-1 ring-sky-500`
                                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                    )}
                                  >
                                    <div className={cn("p-2 rounded-md", config.bg)}>
                                      <span className={config.color}>{config.icon}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className={cn("font-medium text-sm", selectedReportType === type ? config.color : "text-slate-700")}>
                                        {config.label}
                                      </div>
                                      <div className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                                        {config.description}
                                      </div>
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
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
                </div>

                {/* Quick Stats Cards */}
                <div className="mb-6 grid gap-4 md:grid-cols-4 lg:grid-cols-4">
                  <Card className="border-l-4 border-l-emerald-500 bg-gradient-to-r from-emerald-50 to-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-semibold text-slate-700">
                        Patient Registrations
                      </CardTitle>
                      <Users className="h-5 w-5 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-emerald-700">
                        {quickStats.totalPatients}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        <span className="text-emerald-600 font-medium">
                          +{quickStats.newPatients} new
                        </span> this period
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-sky-500 bg-gradient-to-r from-sky-50 to-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-semibold text-slate-700">
                        Appointments
                      </CardTitle>
                      <Calendar className="h-5 w-5 text-sky-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-sky-700">
                        {quickStats.totalAppointments}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        <span className="text-green-600 font-medium">
                          {quickStats.completedVisits} completed
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-violet-500 bg-gradient-to-r from-violet-50 to-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-semibold text-slate-700">
                        Diagnoses
                      </CardTitle>
                      <Stethoscope className="h-5 w-5 text-violet-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-violet-700">
                        {quickStats.totalDiagnoses}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Total recorded
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-50 to-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-semibold text-slate-700">
                        Health Scans
                      </CardTitle>
                      <HeartPulse className="h-5 w-5 text-rose-600" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-rose-700">
                        {quickStats.totalHealthScans}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Longevity program
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabs for Dashboard and Report Management */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                  <TabsList className="grid w-full max-w-md grid-cols-2">
                    <TabsTrigger value="dashboard" className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Analytics Dashboard
                    </TabsTrigger>
                    <TabsTrigger value="reports" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Report Management
                    </TabsTrigger>
                  </TabsList>

                  {/* Analytics Dashboard Tab */}
                  <TabsContent value="dashboard" className="space-y-6">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-5 w-5 text-slate-600" />
                      <h3 className="text-lg font-semibold text-slate-800">Healthcare Analytics Dashboard</h3>
                    </div>
                    <ReportsCharts reportData={reportData} />
                  </TabsContent>

                  {/* Report Management Tab */}
                  <TabsContent value="reports">
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
                                Create, generate, and manage healthcare reports
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
                              Create your first healthcare report to get started with analytics
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
                                {reports.map((report) => {
                                  const typeConfig = getReportTypeConfig(report.reportType)
                                  return (
                                    <TableRow key={report.id} className="border-slate-100 hover:bg-slate-50/30">
                                      <TableCell className="font-medium">
                                        <div className="flex items-center gap-3">
                                          <div className={cn("p-2 rounded-md", typeConfig.bg)}>
                                            <span className={typeConfig.color}>{typeConfig.icon}</span>
                                          </div>
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
                                        {getReportTypeBadge(report.reportType)}
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
                                          <AlertDialog>
                                            <AlertDialogTrigger>
                                              <Button
                                                size="sm"
                                                variant="ghost"
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
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                              <AlertDialogHeader>
                                                <AlertDialogTitle>Delete Report</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                  Are you sure you want to delete the report <span className="font-bold text-slate-900">&quot;{report.name}&quot;</span>?
                                                  
                                                  <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                                                    <div className="flex items-center gap-2">
                                                      <span className={typeConfig.color}>{typeConfig.icon}</span>
                                                      <span className="font-bold text-amber-900">{typeConfig.label}</span>
                                                    </div>
                                                  </div>

                                                  <p className="mt-4">
                                                    This action cannot be undone and will permanently remove the report from the system.
                                                  </p>
                                                </AlertDialogDescription>
                                              </AlertDialogHeader>
                                              <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                  onClick={() => handleDeleteReport(report.id)}
                                                  className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
                                                >
                                                  Delete
                                                </AlertDialogAction>
                                              </AlertDialogFooter>
                                            </AlertDialogContent>
                                          </AlertDialog>
                                        </div>
                                      </TableCell>
                                    </TableRow>
                                  )
                                })}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
