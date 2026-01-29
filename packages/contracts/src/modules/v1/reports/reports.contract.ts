import { createZodDto } from "nestjs-zod"
import { z } from "zod"

import { ApiSuccessResponseSchema, PaginationSchema } from "../../../common/common.contract.js"

// ============================================================================
// SCHEMAS
// ============================================================================

/**
 * Report Types - Different categories of system reports
 */
export const ReportTypeEnum = z.enum([
	"APPOINTMENTS_SUMMARY",
	"USER_ACTIVITY",
	"SYSTEM_PERFORMANCE",
	"CONSULTATION_METRICS",
	"ORGANIZATIONAL_OVERVIEW",
	"DEPARTMENT_STATISTICS",
	// New healthcare-focused report types
	"PATIENT_REGISTRATIONS",
	"APPOINTMENTS_VISITS",
	"DIAGNOSES_TREATMENTS",
	"LAB_TEST_UTILIZATION",
	"PRESCRIPTION_PHARMACY",
	"LONGEVITY_PROGRAM",
])

/**
 * Report Status
 */
export const ReportStatusEnum = z.enum([
	"PENDING",
	"PROCESSING",
	"COMPLETED",
	"FAILED",
])

/**
 * Report Category
 */
export const ReportCategoryEnum = z.enum([
	"ANALYTICS",
	"OPERATIONS",
	"COMPLIANCE",
	"PERFORMANCE",
])

/**
 * Time Period for Reports
 */
export const TimePeriodEnum = z.enum([
	"last-week",
	"last-month",
	"last-quarter",
	"last-year",
	"custom",
])

/**
 * Report Configuration Schema
 */
export const ReportConfigurationSchema = z.object({
	timePeriod: TimePeriodEnum,
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
	includeCharts: z.boolean().default(true),
	includeMetrics: z.boolean().default(true),
	filters: z.record(z.string(), z.any()).optional(),
})

/**
 * Report Template Schema
 */
export const ReportTemplateSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string().nullable(),
	reportType: ReportTypeEnum,
	category: ReportCategoryEnum,
	defaultConfiguration: z.record(z.string(), z.any()),
	isSystemTemplate: z.string(),
	isActive: z.string(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

/**
 * System Report Schema (excluding PHI)
 */
export const SystemReportSchema = z.object({
	id: z.string().uuid(),
	name: z.string(),
	description: z.string().nullable().optional(),
	reportType: ReportTypeEnum,
	organizationId: z.string().uuid(),
	createdBy: z.string().uuid(),
	configuration: z.record(z.string(), z.any()),
	reportData: z.record(z.string(), z.any()).nullable().optional(),
	status: ReportStatusEnum,
	generatedAt: z.string().datetime().nullable().optional(),
	scheduledFor: z.string().datetime().nullable().optional(),
	createdAt: z.string().datetime(),
	updatedAt: z.string().datetime(),
})

/**
 * Create Report Request Schema
 */
export const CreateReportSchema = z.object({
	name: z.string().min(1, "Report name is required"),
	description: z.string().optional(),
	reportType: ReportTypeEnum,
	configuration: ReportConfigurationSchema,
	scheduledFor: z.string().datetime().optional(),
})

/**
 * Update Report Schema
 */
export const UpdateReportSchema = z.object({
	name: z.string().min(1).optional(),
	description: z.string().optional(),
	configuration: ReportConfigurationSchema.optional(),
	status: ReportStatusEnum.optional(),
})

/**
 * Report Query Parameters
 */
export const ReportQuerySchema = PaginationSchema.extend({
	reportType: ReportTypeEnum.optional(),
	status: ReportStatusEnum.optional(),
	createdBy: z.string().uuid().optional(),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
})

/**
 * Report Statistics (Aggregated, Non-PHI)
 */
export const ReportStatisticsSchema = z.object({
	totalAppointments: z.number(),
	completedAppointments: z.number(),
	cancelledAppointments: z.number(),
	totalUsers: z.number(),
	activeUsers: z.number(),
	totalConsultations: z.number(),
	averageConsultationDuration: z.number(),
	systemUptime: z.number(),
	responseTime: z.number(),
	period: z.object({
		startDate: z.string().datetime(),
		endDate: z.string().datetime(),
	}),
})

/**
 * Healthcare Analytics Statistics Schema (Aggregated, Non-PHI)
 */
export const HealthcareAnalyticsSchema = z.object({
	// Patient Registrations
	patientRegistrations: z.object({
		totalPatients: z.number(),
		newPatients: z.number(),
		verifiedPatients: z.number(),
		pendingVerification: z.number(),
		bySubscriptionTier: z.record(z.string(), z.number()),
		registrationTrend: z.array(z.object({
			date: z.string(),
			count: z.number(),
		})),
	}),
	// Appointments and Visits
	appointmentsVisits: z.object({
		totalAppointments: z.number(),
		completedVisits: z.number(),
		cancelledAppointments: z.number(),
		pendingAppointments: z.number(),
		confirmedAppointments: z.number(),
		rescheduledAppointments: z.number(),
		byStatus: z.record(z.string(), z.number()),
		appointmentTrend: z.array(z.object({
			date: z.string(),
			scheduled: z.number(),
			completed: z.number(),
		})),
	}),
	// Diagnoses and Treatments
	diagnosesTreatments: z.object({
		totalDiagnoses: z.number(),
		activeDiagnoses: z.number(),
		resolvedDiagnoses: z.number(),
		bySeverity: z.record(z.string(), z.number()),
		topDiagnoses: z.array(z.object({
			name: z.string(),
			count: z.number(),
		})),
		diagnosisTrend: z.array(z.object({
			date: z.string(),
			count: z.number(),
		})),
	}),
	// Laboratory Test Utilization
	labTestUtilization: z.object({
		totalLabRequests: z.number(),
		completedTests: z.number(),
		pendingTests: z.number(),
		byPriority: z.record(z.string(), z.number()),
		byStatus: z.record(z.string(), z.number()),
		labRequestTrend: z.array(z.object({
			date: z.string(),
			count: z.number(),
		})),
	}),
	// Prescription and Pharmacy
	prescriptionPharmacy: z.object({
		totalPrescriptions: z.number(),
		activePrescriptions: z.number(),
		expiredPrescriptions: z.number(),
		totalRefills: z.number(),
		topMedications: z.array(z.object({
			name: z.string(),
			count: z.number(),
		})),
		prescriptionTrend: z.array(z.object({
			date: z.string(),
			count: z.number(),
		})),
	}),
	// Longevity Program (Health Scans)
	longevityProgram: z.object({
		totalHealthScans: z.number(),
		averageWellnessScore: z.number(),
		averageStressLevel: z.number(),
		averageHeartRate: z.number(),
		riskDistribution: z.object({
			low: z.number(),
			moderate: z.number(),
			high: z.number(),
		}),
		healthMetricsTrend: z.array(z.object({
			date: z.string(),
			wellnessScore: z.number(),
			stressLevel: z.number(),
		})),
	}),
	// Period
	period: z.object({
		startDate: z.string().datetime(),
		endDate: z.string().datetime(),
	}),
})

/**
 * Generate Report Request
 */
export const GenerateReportSchema = z.object({
	reportId: z.string().uuid(),
})

// ============================================================================
// DTOs
// ============================================================================

export class CreateReportDto extends createZodDto(CreateReportSchema) {}
export class UpdateReportDto extends createZodDto(UpdateReportSchema) {}
export class ReportQueryDto extends createZodDto(ReportQuerySchema) {}
export class GenerateReportDto extends createZodDto(GenerateReportSchema) {}

export class SystemReportResponseDto extends createZodDto(
	ApiSuccessResponseSchema(SystemReportSchema),
) {}

export class SystemReportListResponseDto extends createZodDto(
	ApiSuccessResponseSchema(SystemReportSchema.array()),
) {}

export class ReportTemplateResponseDto extends createZodDto(
	ApiSuccessResponseSchema(ReportTemplateSchema),
) {}

export class ReportTemplateListResponseDto extends createZodDto(
	ApiSuccessResponseSchema(ReportTemplateSchema.array()),
) {}

export class ReportStatisticsResponseDto extends createZodDto(
	ApiSuccessResponseSchema(ReportStatisticsSchema),
) {}
