/**
 * Reports API service
 */

import type { ApiResponse } from "./types"
import { apiRequest } from "./client"

/**
 * Report Types
 */
export type ReportType =
	| "APPOINTMENTS_SUMMARY"
	| "USER_ACTIVITY"
	| "SYSTEM_PERFORMANCE"
	| "CONSULTATION_METRICS"
	| "ORGANIZATIONAL_OVERVIEW"
	| "DEPARTMENT_STATISTICS"
	// New healthcare-focused report types
	| "PATIENT_REGISTRATIONS"
	| "APPOINTMENTS_VISITS"
	| "DIAGNOSES_TREATMENTS"
	| "LAB_TEST_UTILIZATION"
	| "PRESCRIPTION_PHARMACY"
	| "LONGEVITY_PROGRAM"

export type ReportStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"

export type ReportCategory = "ANALYTICS" | "OPERATIONS" | "COMPLIANCE" | "PERFORMANCE"

export type TimePeriod = "last-week" | "last-month" | "last-quarter" | "last-year" | "custom"

/**
 * Report Interfaces
 */
export interface ReportConfiguration {
	timePeriod: TimePeriod
	startDate?: string
	endDate?: string
	includeCharts?: boolean
	includeMetrics?: boolean
	filters?: Record<string, any>
}

export interface ReportTemplate {
	id: string
	name: string
	description: string | null
	reportType: ReportType
	category: ReportCategory
	defaultConfiguration: Record<string, any>
	isSystemTemplate: string
	isActive: string
	createdAt: string
	updatedAt: string
}

export interface SystemReport {
	id: string
	name: string
	description?: string | null
	reportType: ReportType
	organizationId: string
	createdBy: string
	configuration: Record<string, any>
	reportData?: HealthcareAnalytics | Record<string, any> | null
	status: ReportStatus
	generatedAt?: string | null
	scheduledFor?: string | null
	createdAt: string
	updatedAt: string
}

/**
 * Healthcare Analytics Data Interfaces (Non-PHI)
 */
export interface PatientRegistrationsData {
	totalPatients: number
	newPatients: number
	verifiedPatients: number
	pendingVerification: number
	bySubscriptionTier: Record<string, number>
	registrationTrend: Array<{ date: string; count: number }>
}

export interface AppointmentsVisitsData {
	totalAppointments: number
	completedVisits: number
	cancelledAppointments: number
	pendingAppointments: number
	confirmedAppointments: number
	rescheduledAppointments: number
	byStatus: Record<string, number>
	appointmentTrend: Array<{ date: string; scheduled: number; completed: number }>
}

export interface DiagnosesTreatmentsData {
	totalDiagnoses: number
	activeDiagnoses: number
	resolvedDiagnoses: number
	bySeverity: Record<string, number>
	topDiagnoses: Array<{ name: string; count: number }>
	diagnosisTrend: Array<{ date: string; count: number }>
}

export interface LabTestUtilizationData {
	totalLabRequests: number
	completedTests: number
	pendingTests: number
	byPriority: Record<string, number>
	byStatus: Record<string, number>
	labRequestTrend: Array<{ date: string; count: number }>
}

export interface PrescriptionPharmacyData {
	totalPrescriptions: number
	activePrescriptions: number
	expiredPrescriptions: number
	totalRefills: number
	topMedications: Array<{ name: string; count: number }>
	prescriptionTrend: Array<{ date: string; count: number }>
}

export interface LongevityProgramData {
	totalHealthScans: number
	averageWellnessScore: number
	averageStressLevel: number
	averageHeartRate: number
	riskDistribution: {
		low: number
		moderate: number
		high: number
	}
	healthMetricsTrend: Array<{ date: string; wellnessScore: number; stressLevel: number }>
}

export interface HealthcareAnalytics {
	patientRegistrations: PatientRegistrationsData
	appointmentsVisits: AppointmentsVisitsData
	diagnosesTreatments: DiagnosesTreatmentsData
	labTestUtilization: LabTestUtilizationData
	prescriptionPharmacy: PrescriptionPharmacyData
	longevityProgram: LongevityProgramData
	period: {
		startDate: string
		endDate: string
	}
}

export interface CreateReportRequest {
	name: string
	description?: string
	reportType: ReportType
	configuration: ReportConfiguration
	scheduledFor?: string
}

export interface UpdateReportRequest {
	name?: string
	description?: string
	configuration?: ReportConfiguration
	status?: ReportStatus
}

export interface ReportQueryParams {
	reportType?: ReportType
	status?: ReportStatus
	createdBy?: string
	startDate?: string
	endDate?: string
	page?: number
	limit?: number
}

export interface GenerateReportRequest {
	reportId: string
}

/**
 * Get all report templates
 */
export async function getReportTemplates(): Promise<ApiResponse<ReportTemplate[]>> {
	return apiRequest<ReportTemplate[]>("/v1/reports/templates", {
		method: "GET",
	})
}

/**
 * Get a single report template
 */
export async function getReportTemplateById(id: string): Promise<ApiResponse<ReportTemplate>> {
	return apiRequest<ReportTemplate>(`/v1/reports/templates/${id}`, {
		method: "GET",
	})
}

/**
 * Get all reports with filters
 */
export async function getReports(params?: ReportQueryParams): Promise<ApiResponse<SystemReport[]>> {
	const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : ""
	return apiRequest<SystemReport[]>(`/v1/reports${queryString}`, {
		method: "GET",
	})
}

/**
 * Get a single report by ID
 */
export async function getReportById(id: string): Promise<ApiResponse<SystemReport>> {
	return apiRequest<SystemReport>(`/v1/reports/${id}`, {
		method: "GET",
	})
}

/**
 * Create a new report
 */
export async function createReport(data: CreateReportRequest): Promise<ApiResponse<SystemReport>> {
	return apiRequest<SystemReport>("/v1/reports", {
		method: "POST",
		body: JSON.stringify(data),
	})
}

/**
 * Update a report
 */
export async function updateReport(
	id: string,
	data: UpdateReportRequest,
): Promise<ApiResponse<SystemReport>> {
	return apiRequest<SystemReport>(`/v1/reports/${id}`, {
		method: "PATCH",
		body: JSON.stringify(data),
	})
}

/**
 * Delete a report
 */
export async function deleteReport(id: string): Promise<ApiResponse<SystemReport>> {
	return apiRequest<SystemReport>(`/v1/reports/${id}`, {
		method: "DELETE",
	})
}

/**
 * Generate report data
 */
export async function generateReport(data: GenerateReportRequest): Promise<ApiResponse<SystemReport>> {
	return apiRequest<SystemReport>("/v1/reports/generate", {
		method: "POST",
		body: JSON.stringify(data),
	})
}
