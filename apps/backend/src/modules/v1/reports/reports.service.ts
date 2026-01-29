import { Inject, Injectable } from "@nestjs/common"
import { and, desc, eq, gte, lte, sql, count, avg, isNotNull } from "drizzle-orm"

import {
	appointmentRequests,
	consultations,
	diagnoses,
	healthScans,
	labRequests,
	patientInfos,
	prescriptions,
	reportTemplates,
	systemReports,
	users,
} from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

import type {
	CreateReportDto,
	ReportQueryDto,
	UpdateReportDto,
} from "@repo/contracts"

@Injectable()
export class ReportsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	/**
	 * Get all report templates
	 */
	async getReportTemplates() {
		return this.db
			.select()
			.from(reportTemplates)
			.where(eq(reportTemplates.isActive, "true"))
			.orderBy(desc(reportTemplates.createdAt))
	}

	/**
	 * Get a single report template by ID
	 */
	async getReportTemplateById(id: string) {
		const [template] = await this.db
			.select()
			.from(reportTemplates)
			.where(eq(reportTemplates.id, id))
			.limit(1)

		return template
	}

	/**
	 * Get all system reports with filters
	 */
	async getReports(userId: string, organizationId: string, query: ReportQueryDto) {
		const conditions = [eq(systemReports.organizationId, organizationId)]

		if (query.reportType) {
			conditions.push(eq(systemReports.reportType, query.reportType))
		}

		if (query.status) {
			conditions.push(eq(systemReports.status, query.status))
		}

		if (query.createdBy) {
			conditions.push(eq(systemReports.createdBy, query.createdBy))
		}

		if (query.startDate) {
			conditions.push(gte(systemReports.createdAt, new Date(query.startDate)))
		}

		if (query.endDate) {
			conditions.push(lte(systemReports.createdAt, new Date(query.endDate)))
		}

		const limit = query.limit || 20
		const page = query.page || 1
		const offset = (page - 1) * limit

		const reports = await this.db
			.select()
			.from(systemReports)
			.where(and(...conditions))
			.orderBy(desc(systemReports.createdAt))
			.limit(limit)
			.offset(offset)

		return reports.map(report => this.formatReportDates(report))
	}

	/**
	 * Get a single report by ID
	 */
	async getReportById(id: string, organizationId: string) {
		const [report] = await this.db
			.select()
			.from(systemReports)
			.where(
				and(eq(systemReports.id, id), eq(systemReports.organizationId, organizationId)),
			)
			.limit(1)

		return report ? this.formatReportDates(report) : null
	}

	/**
	 * Create a new report
	 */
	async createReport(userId: string, organizationId: string, dto: CreateReportDto) {
		const [report] = await this.db
			.insert(systemReports)
			.values({
				name: dto.name,
				description: dto.description || null,
				reportType: dto.reportType,
				organizationId,
				createdBy: userId,
				configuration: dto.configuration as any,
				scheduledFor: dto.scheduledFor ? new Date(dto.scheduledFor) : null,
				status: "PENDING",
			})
			.returning()

		return this.formatReportDates(report)
	}

	/**
	 * Format report dates to ISO strings for API response
	 */
	private formatReportDates(report: any) {
		return {
			...report,
			createdAt: report.createdAt?.toISOString() || report.createdAt,
			updatedAt: report.updatedAt?.toISOString() || report.updatedAt,
			generatedAt: report.generatedAt?.toISOString() || null,
			scheduledFor: report.scheduledFor?.toISOString() || null,
		}
	}

	/**
	 * Update a report
	 */
	async updateReport(
		id: string,
		organizationId: string,
		dto: UpdateReportDto,
	) {
		const updateData: any = {
			updatedAt: new Date(),
		}

		if (dto.name) updateData.name = dto.name
		if (dto.description !== undefined) updateData.description = dto.description
		if (dto.configuration) updateData.configuration = dto.configuration
		if (dto.status) updateData.status = dto.status

		const [updated] = await this.db
			.update(systemReports)
			.set(updateData)
			.where(
				and(eq(systemReports.id, id), eq(systemReports.organizationId, organizationId)),
			)
			.returning()

		return updated ? this.formatReportDates(updated) : null
	}

	/**
	 * Delete a report
	 */
	async deleteReport(id: string, organizationId: string) {
		const [deleted] = await this.db
			.delete(systemReports)
			.where(
				and(eq(systemReports.id, id), eq(systemReports.organizationId, organizationId)),
			)
			.returning()

		return deleted ? this.formatReportDates(deleted) : null
	}

	/**
	 * Generate report data (excluding PHI)
	 * This aggregates statistics without exposing patient details
	 */
	async generateReportData(reportId: string, organizationId: string) {
		// Get the report configuration
		const report = await this.getReportById(reportId, organizationId)

		if (!report) {
			throw new Error("Report not found")
		}

		// Update status to processing
		await this.updateReport(reportId, organizationId, { status: "PROCESSING" })

		try {
			const config = report.configuration as any
			const startDate = config.startDate ? new Date(config.startDate) : this.getStartDate(config.timePeriod)
			const endDate = config.endDate ? new Date(config.endDate) : new Date()

			let reportData: any = {}

			// Generate data based on report type
			switch (report.reportType) {
				case "APPOINTMENTS_SUMMARY":
					reportData = await this.generateAppointmentsSummary(organizationId, startDate, endDate)
					break
				case "USER_ACTIVITY":
					reportData = await this.generateUserActivity(organizationId, startDate, endDate)
					break
				case "CONSULTATION_METRICS":
					reportData = await this.generateConsultationMetrics(organizationId, startDate, endDate)
					break
				case "ORGANIZATIONAL_OVERVIEW":
					reportData = await this.generateOrganizationalOverview(organizationId, startDate, endDate)
					break
				// New healthcare-focused report types
				case "PATIENT_REGISTRATIONS":
					reportData = await this.generatePatientRegistrations(organizationId, startDate, endDate)
					break
				case "APPOINTMENTS_VISITS":
					reportData = await this.generateAppointmentsVisits(organizationId, startDate, endDate)
					break
				case "DIAGNOSES_TREATMENTS":
					reportData = await this.generateDiagnosesTreatments(organizationId, startDate, endDate)
					break
				case "LAB_TEST_UTILIZATION":
					reportData = await this.generateLabTestUtilization(organizationId, startDate, endDate)
					break
				case "PRESCRIPTION_PHARMACY":
					reportData = await this.generatePrescriptionPharmacy(organizationId, startDate, endDate)
					break
				case "LONGEVITY_PROGRAM":
					reportData = await this.generateLongevityProgram(organizationId, startDate, endDate)
					break
				default:
					reportData = { message: "Report type not implemented" }
			}

			// Update report with generated data
			const [updated] = await this.db
				.update(systemReports)
				.set({
					reportData: reportData as any,
					status: "COMPLETED",
					generatedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(systemReports.id, reportId))
				.returning()

			return updated ? this.formatReportDates(updated) : null
		} catch (error) {
			// Update status to failed
			await this.updateReport(reportId, organizationId, { status: "FAILED" })
			throw error
		}
	}

	/**
	 * Generate appointments summary (non-PHI)
	 */
	private async generateAppointmentsSummary(organizationId: string, startDate: Date, endDate: Date) {
		// Get total appointments count
		const [totalResult] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(appointmentRequests)
			.innerJoin(users, eq(appointmentRequests.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(appointmentRequests.createdAt, startDate),
					lte(appointmentRequests.createdAt, endDate),
				),
			)

		// Get completed appointments
		const [completedResult] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(appointmentRequests)
			.innerJoin(users, eq(appointmentRequests.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					eq(appointmentRequests.status, "COMPLETED"),
					gte(appointmentRequests.createdAt, startDate),
					lte(appointmentRequests.createdAt, endDate),
				),
			)

		// Get cancelled appointments
		const [cancelledResult] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(appointmentRequests)
			.innerJoin(users, eq(appointmentRequests.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					eq(appointmentRequests.status, "CANCELLED"),
					gte(appointmentRequests.createdAt, startDate),
					lte(appointmentRequests.createdAt, endDate),
				),
			)

		return {
			totalAppointments: totalResult?.count || 0,
			completedAppointments: completedResult?.count || 0,
			cancelledAppointments: cancelledResult?.count || 0,
			pendingAppointments:
				(totalResult?.count || 0) -
				(completedResult?.count || 0) -
				(cancelledResult?.count || 0),
			period: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		}
	}

	/**
	 * Generate user activity statistics (non-PHI)
	 */
	private async generateUserActivity(organizationId: string, startDate: Date, endDate: Date) {
		// Get total users
		const [totalUsers] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(users)
			.where(eq(users.organizationId, organizationId))

		// Get users created in period
		const [newUsers] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(users)
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(users.createdAt, startDate),
					lte(users.createdAt, endDate),
				),
			)

		return {
			totalUsers: totalUsers?.count || 0,
			newUsers: newUsers?.count || 0,
			period: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		}
	}

	/**
	 * Generate consultation metrics (non-PHI)
	 */
	private async generateConsultationMetrics(organizationId: string, startDate: Date, endDate: Date) {
		// Get total consultations
		const [totalResult] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(consultations)
			.innerJoin(users, eq(consultations.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(consultations.createdAt, startDate),
					lte(consultations.createdAt, endDate),
				),
			)

		return {
			totalConsultations: totalResult?.count || 0,
			period: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		}
	}

	/**
	 * Generate organizational overview (non-PHI)
	 */
	private async generateOrganizationalOverview(organizationId: string, startDate: Date, endDate: Date) {
		const appointmentsSummary = await this.generateAppointmentsSummary(organizationId, startDate, endDate)
		const userActivity = await this.generateUserActivity(organizationId, startDate, endDate)
		const consultationMetrics = await this.generateConsultationMetrics(organizationId, startDate, endDate)

		return {
			...appointmentsSummary,
			...userActivity,
			...consultationMetrics,
			period: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		}
	}

	/**
	 * Helper to calculate start date based on time period
	 */
	private getStartDate(timePeriod: string): Date {
		const now = new Date()
		switch (timePeriod) {
			case "last-week":
				return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
			case "last-month":
				return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
			case "last-quarter":
				return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
			case "last-year":
				return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
			default:
				return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
		}
	}

	/**
	 * Helper to generate trend data for a period
	 */
	private generateTrendDates(startDate: Date, endDate: Date): string[] {
		const dates: string[] = []
		const diffDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
		
		// Group by week if more than 30 days, otherwise by day
		const interval = diffDays > 30 ? 7 : 1
		const current = new Date(startDate)
		
		while (current <= endDate) {
			dates.push(current.toISOString().split('T')[0] as string)
			current.setDate(current.getDate() + interval)
		}
		
		return dates
	}

	// ============================================================================
	// NEW HEALTHCARE-FOCUSED REPORT GENERATORS
	// ============================================================================

	/**
	 * Generate Patient Registrations Report (non-PHI)
	 */
	private async generatePatientRegistrations(organizationId: string, startDate: Date, endDate: Date) {
		// Total patients in organization
		const [totalPatients] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(users)
			.where(
				and(
					eq(users.organizationId, organizationId),
					eq(users.role, "PATIENT"),
				),
			)

		// New patients in period
		const [newPatients] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(users)
			.where(
				and(
					eq(users.organizationId, organizationId),
					eq(users.role, "PATIENT"),
					gte(users.createdAt, startDate),
					lte(users.createdAt, endDate),
				),
			)

		// Verified patients
		const [verifiedPatients] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(patientInfos)
			.innerJoin(users, eq(patientInfos.userId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					eq(patientInfos.verificationStatus, "VERIFIED"),
				),
			)

		// Pending verification
		const [pendingVerification] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(patientInfos)
			.innerJoin(users, eq(patientInfos.userId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					eq(patientInfos.verificationStatus, "PENDING"),
				),
			)

		// By subscription tier
		const subscriptionTiers = await this.db
			.select({
				tier: patientInfos.subscriptionTier,
				count: sql<number>`count(*)::int`,
			})
			.from(patientInfos)
			.innerJoin(users, eq(patientInfos.userId, users.id))
			.where(eq(users.organizationId, organizationId))
			.groupBy(patientInfos.subscriptionTier)

		const bySubscriptionTier: Record<string, number> = {}
		subscriptionTiers.forEach((t) => {
			bySubscriptionTier[t.tier] = t.count
		})

		// Registration trend
		const trendDates = this.generateTrendDates(startDate, endDate)
		const registrationTrend = await Promise.all(
			trendDates.map(async (date) => {
				const dayStart = new Date(date)
				const dayEnd = new Date(date)
				dayEnd.setDate(dayEnd.getDate() + 1)
				
				const [result] = await this.db
					.select({ count: sql<number>`count(*)::int` })
					.from(users)
					.where(
						and(
							eq(users.organizationId, organizationId),
							eq(users.role, "PATIENT"),
							gte(users.createdAt, dayStart),
							lte(users.createdAt, dayEnd),
						),
					)
				
				return { date, count: result?.count || 0 }
			})
		)

		return {
			patientRegistrations: {
				totalPatients: totalPatients?.count || 0,
				newPatients: newPatients?.count || 0,
				verifiedPatients: verifiedPatients?.count || 0,
				pendingVerification: pendingVerification?.count || 0,
				bySubscriptionTier,
				registrationTrend,
			},
			period: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		}
	}

	/**
	 * Generate Appointments & Visits Report (non-PHI)
	 */
	private async generateAppointmentsVisits(organizationId: string, startDate: Date, endDate: Date) {
		// Total appointments
		const [totalResult] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(appointmentRequests)
			.innerJoin(users, eq(appointmentRequests.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(appointmentRequests.createdAt, startDate),
					lte(appointmentRequests.createdAt, endDate),
				),
			)

		// Get counts by status
		const statusCounts = await this.db
			.select({
				status: appointmentRequests.status,
				count: sql<number>`count(*)::int`,
			})
			.from(appointmentRequests)
			.innerJoin(users, eq(appointmentRequests.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(appointmentRequests.createdAt, startDate),
					lte(appointmentRequests.createdAt, endDate),
				),
			)
			.groupBy(appointmentRequests.status)

		const byStatus: Record<string, number> = {}
		let completedVisits = 0
		let cancelledAppointments = 0
		let pendingAppointments = 0
		let confirmedAppointments = 0
		let rescheduledAppointments = 0

		statusCounts.forEach((s) => {
			byStatus[s.status] = s.count
			switch (s.status) {
				case "COMPLETED":
					completedVisits = s.count
					break
				case "CANCELLED":
					cancelledAppointments = s.count
					break
				case "PENDING":
					pendingAppointments = s.count
					break
				case "CONFIRMED":
					confirmedAppointments = s.count
					break
				case "RESCHEDULED":
					rescheduledAppointments = s.count
					break
			}
		})

		// Appointment trend
		const trendDates = this.generateTrendDates(startDate, endDate)
		const appointmentTrend = await Promise.all(
			trendDates.map(async (date) => {
				const dayStart = new Date(date)
				const dayEnd = new Date(date)
				dayEnd.setDate(dayEnd.getDate() + 1)
				
				const [scheduled] = await this.db
					.select({ count: sql<number>`count(*)::int` })
					.from(appointmentRequests)
					.innerJoin(users, eq(appointmentRequests.patientId, users.id))
					.where(
						and(
							eq(users.organizationId, organizationId),
							gte(appointmentRequests.createdAt, dayStart),
							lte(appointmentRequests.createdAt, dayEnd),
						),
					)

				const [completed] = await this.db
					.select({ count: sql<number>`count(*)::int` })
					.from(appointmentRequests)
					.innerJoin(users, eq(appointmentRequests.patientId, users.id))
					.where(
						and(
							eq(users.organizationId, organizationId),
							eq(appointmentRequests.status, "COMPLETED"),
							gte(appointmentRequests.createdAt, dayStart),
							lte(appointmentRequests.createdAt, dayEnd),
						),
					)
				
				return {
					date,
					scheduled: scheduled?.count || 0,
					completed: completed?.count || 0,
				}
			})
		)

		return {
			appointmentsVisits: {
				totalAppointments: totalResult?.count || 0,
				completedVisits,
				cancelledAppointments,
				pendingAppointments,
				confirmedAppointments,
				rescheduledAppointments,
				byStatus,
				appointmentTrend,
			},
			period: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		}
	}

	/**
	 * Generate Diagnoses & Treatments Report (non-PHI)
	 */
	private async generateDiagnosesTreatments(organizationId: string, startDate: Date, endDate: Date) {
		// Total diagnoses
		const [totalDiagnoses] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(diagnoses)
			.innerJoin(users, eq(diagnoses.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(diagnoses.diagnosedAt, startDate),
					lte(diagnoses.diagnosedAt, endDate),
				),
			)

		// Active diagnoses
		const [activeDiagnoses] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(diagnoses)
			.innerJoin(users, eq(diagnoses.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					eq(diagnoses.status, "ACTIVE"),
					gte(diagnoses.diagnosedAt, startDate),
					lte(diagnoses.diagnosedAt, endDate),
				),
			)

		// Resolved diagnoses
		const [resolvedDiagnoses] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(diagnoses)
			.innerJoin(users, eq(diagnoses.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					eq(diagnoses.status, "RESOLVED"),
					gte(diagnoses.diagnosedAt, startDate),
					lte(diagnoses.diagnosedAt, endDate),
				),
			)

		// By severity
		const severityCounts = await this.db
			.select({
				severity: diagnoses.severity,
				count: sql<number>`count(*)::int`,
			})
			.from(diagnoses)
			.innerJoin(users, eq(diagnoses.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(diagnoses.diagnosedAt, startDate),
					lte(diagnoses.diagnosedAt, endDate),
				),
			)
			.groupBy(diagnoses.severity)

		const bySeverity: Record<string, number> = {}
		severityCounts.forEach((s) => {
			bySeverity[s.severity] = s.count
		})

		// Top diagnoses (by name, aggregated - no PHI)
		const topDiagnosesResult = await this.db
			.select({
				name: diagnoses.diagnosisName,
				count: sql<number>`count(*)::int`,
			})
			.from(diagnoses)
			.innerJoin(users, eq(diagnoses.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(diagnoses.diagnosedAt, startDate),
					lte(diagnoses.diagnosedAt, endDate),
				),
			)
			.groupBy(diagnoses.diagnosisName)
			.orderBy(sql`count(*) desc`)
			.limit(10)

		const topDiagnoses = topDiagnosesResult.map((d) => ({
			name: d.name,
			count: d.count,
		}))

		// Diagnosis trend
		const trendDates = this.generateTrendDates(startDate, endDate)
		const diagnosisTrend = await Promise.all(
			trendDates.map(async (date) => {
				const dayStart = new Date(date)
				const dayEnd = new Date(date)
				dayEnd.setDate(dayEnd.getDate() + 1)
				
				const [result] = await this.db
					.select({ count: sql<number>`count(*)::int` })
					.from(diagnoses)
					.innerJoin(users, eq(diagnoses.patientId, users.id))
					.where(
						and(
							eq(users.organizationId, organizationId),
							gte(diagnoses.diagnosedAt, dayStart),
							lte(diagnoses.diagnosedAt, dayEnd),
						),
					)
				
				return { date, count: result?.count || 0 }
			})
		)

		return {
			diagnosesTreatments: {
				totalDiagnoses: totalDiagnoses?.count || 0,
				activeDiagnoses: activeDiagnoses?.count || 0,
				resolvedDiagnoses: resolvedDiagnoses?.count || 0,
				bySeverity,
				topDiagnoses,
				diagnosisTrend,
			},
			period: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		}
	}

	/**
	 * Generate Lab Test Utilization Report (non-PHI)
	 */
	private async generateLabTestUtilization(organizationId: string, startDate: Date, endDate: Date) {
		// Total lab requests
		const [totalLabRequests] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(labRequests)
			.where(
				and(
					eq(labRequests.organizationId, organizationId),
					gte(labRequests.createdAt, startDate),
					lte(labRequests.createdAt, endDate),
				),
			)

		// By status
		const statusCounts = await this.db
			.select({
				status: labRequests.status,
				count: sql<number>`count(*)::int`,
			})
			.from(labRequests)
			.where(
				and(
					eq(labRequests.organizationId, organizationId),
					gte(labRequests.createdAt, startDate),
					lte(labRequests.createdAt, endDate),
				),
			)
			.groupBy(labRequests.status)

		const byStatus: Record<string, number> = {}
		let completedTests = 0
		let pendingTests = 0

		statusCounts.forEach((s) => {
			byStatus[s.status] = s.count
			if (s.status === "COMPLETED") completedTests = s.count
			if (s.status === "PENDING") pendingTests = s.count
		})

		// By priority
		const priorityCounts = await this.db
			.select({
				priority: labRequests.priority,
				count: sql<number>`count(*)::int`,
			})
			.from(labRequests)
			.where(
				and(
					eq(labRequests.organizationId, organizationId),
					gte(labRequests.createdAt, startDate),
					lte(labRequests.createdAt, endDate),
				),
			)
			.groupBy(labRequests.priority)

		const byPriority: Record<string, number> = {}
		priorityCounts.forEach((p) => {
			byPriority[p.priority] = p.count
		})

		// Lab request trend
		const trendDates = this.generateTrendDates(startDate, endDate)
		const labRequestTrend = await Promise.all(
			trendDates.map(async (date) => {
				const dayStart = new Date(date)
				const dayEnd = new Date(date)
				dayEnd.setDate(dayEnd.getDate() + 1)
				
				const [result] = await this.db
					.select({ count: sql<number>`count(*)::int` })
					.from(labRequests)
					.where(
						and(
							eq(labRequests.organizationId, organizationId),
							gte(labRequests.createdAt, dayStart),
							lte(labRequests.createdAt, dayEnd),
						),
					)
				
				return { date, count: result?.count || 0 }
			})
		)

		return {
			labTestUtilization: {
				totalLabRequests: totalLabRequests?.count || 0,
				completedTests,
				pendingTests,
				byPriority,
				byStatus,
				labRequestTrend,
			},
			period: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		}
	}

	/**
	 * Generate Prescription & Pharmacy Report (non-PHI)
	 */
	private async generatePrescriptionPharmacy(organizationId: string, startDate: Date, endDate: Date) {
		// Total prescriptions
		const [totalPrescriptions] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(prescriptions)
			.innerJoin(users, eq(prescriptions.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(prescriptions.prescribedAt, startDate),
					lte(prescriptions.prescribedAt, endDate),
				),
			)

		// Active prescriptions
		const [activePrescriptions] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(prescriptions)
			.innerJoin(users, eq(prescriptions.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					eq(prescriptions.isActive, true),
					gte(prescriptions.prescribedAt, startDate),
					lte(prescriptions.prescribedAt, endDate),
				),
			)

		// Expired prescriptions (where expiresAt is in the past)
		const [expiredPrescriptions] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(prescriptions)
			.innerJoin(users, eq(prescriptions.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					isNotNull(prescriptions.expiresAt),
					lte(prescriptions.expiresAt, new Date()),
					gte(prescriptions.prescribedAt, startDate),
					lte(prescriptions.prescribedAt, endDate),
				),
			)

		// Total refills
		const [totalRefills] = await this.db
			.select({ sum: sql<number>`COALESCE(sum(${prescriptions.refills}), 0)::int` })
			.from(prescriptions)
			.innerJoin(users, eq(prescriptions.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(prescriptions.prescribedAt, startDate),
					lte(prescriptions.prescribedAt, endDate),
				),
			)

		// Top medications (aggregated - no PHI)
		const topMedicationsResult = await this.db
			.select({
				name: prescriptions.medicationName,
				count: sql<number>`count(*)::int`,
			})
			.from(prescriptions)
			.innerJoin(users, eq(prescriptions.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(prescriptions.prescribedAt, startDate),
					lte(prescriptions.prescribedAt, endDate),
				),
			)
			.groupBy(prescriptions.medicationName)
			.orderBy(sql`count(*) desc`)
			.limit(10)

		const topMedications = topMedicationsResult.map((m) => ({
			name: m.name,
			count: m.count,
		}))

		// Prescription trend
		const trendDates = this.generateTrendDates(startDate, endDate)
		const prescriptionTrend = await Promise.all(
			trendDates.map(async (date) => {
				const dayStart = new Date(date)
				const dayEnd = new Date(date)
				dayEnd.setDate(dayEnd.getDate() + 1)
				
				const [result] = await this.db
					.select({ count: sql<number>`count(*)::int` })
					.from(prescriptions)
					.innerJoin(users, eq(prescriptions.patientId, users.id))
					.where(
						and(
							eq(users.organizationId, organizationId),
							gte(prescriptions.prescribedAt, dayStart),
							lte(prescriptions.prescribedAt, dayEnd),
						),
					)
				
				return { date, count: result?.count || 0 }
			})
		)

		return {
			prescriptionPharmacy: {
				totalPrescriptions: totalPrescriptions?.count || 0,
				activePrescriptions: activePrescriptions?.count || 0,
				expiredPrescriptions: expiredPrescriptions?.count || 0,
				totalRefills: totalRefills?.sum || 0,
				topMedications,
				prescriptionTrend,
			},
			period: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		}
	}

	/**
	 * Generate Longevity Program Report (Health Scans - non-PHI)
	 */
	private async generateLongevityProgram(organizationId: string, startDate: Date, endDate: Date) {
		// Total health scans via consultations
		const [totalHealthScans] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(healthScans)
			.innerJoin(consultations, eq(healthScans.consultationId, consultations.id))
			.innerJoin(users, eq(consultations.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(consultations.createdAt, startDate),
					lte(consultations.createdAt, endDate),
				),
			)

		// Average wellness score
		const [avgWellness] = await this.db
			.select({ avg: sql<number>`COALESCE(avg(${healthScans.generalWellness}), 0)::float` })
			.from(healthScans)
			.innerJoin(consultations, eq(healthScans.consultationId, consultations.id))
			.innerJoin(users, eq(consultations.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(consultations.createdAt, startDate),
					lte(consultations.createdAt, endDate),
					isNotNull(healthScans.generalWellness),
				),
			)

		// Average stress level
		const [avgStress] = await this.db
			.select({ avg: sql<number>`COALESCE(avg(${healthScans.stressLevel}), 0)::float` })
			.from(healthScans)
			.innerJoin(consultations, eq(healthScans.consultationId, consultations.id))
			.innerJoin(users, eq(consultations.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(consultations.createdAt, startDate),
					lte(consultations.createdAt, endDate),
					isNotNull(healthScans.stressLevel),
				),
			)

		// Average heart rate
		const [avgHeartRate] = await this.db
			.select({ avg: sql<number>`COALESCE(avg(${healthScans.heartRate}), 0)::float` })
			.from(healthScans)
			.innerJoin(consultations, eq(healthScans.consultationId, consultations.id))
			.innerJoin(users, eq(consultations.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(consultations.createdAt, startDate),
					lte(consultations.createdAt, endDate),
					isNotNull(healthScans.heartRate),
				),
			)

		// Risk distribution based on generalRisk score
		const [lowRisk] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(healthScans)
			.innerJoin(consultations, eq(healthScans.consultationId, consultations.id))
			.innerJoin(users, eq(consultations.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(consultations.createdAt, startDate),
					lte(consultations.createdAt, endDate),
					isNotNull(healthScans.generalRisk),
					lte(healthScans.generalRisk, 30),
				),
			)

		const [moderateRisk] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(healthScans)
			.innerJoin(consultations, eq(healthScans.consultationId, consultations.id))
			.innerJoin(users, eq(consultations.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(consultations.createdAt, startDate),
					lte(consultations.createdAt, endDate),
					isNotNull(healthScans.generalRisk),
					gte(healthScans.generalRisk, 31),
					lte(healthScans.generalRisk, 60),
				),
			)

		const [highRisk] = await this.db
			.select({ count: sql<number>`count(*)::int` })
			.from(healthScans)
			.innerJoin(consultations, eq(healthScans.consultationId, consultations.id))
			.innerJoin(users, eq(consultations.patientId, users.id))
			.where(
				and(
					eq(users.organizationId, organizationId),
					gte(consultations.createdAt, startDate),
					lte(consultations.createdAt, endDate),
					isNotNull(healthScans.generalRisk),
					gte(healthScans.generalRisk, 61),
				),
			)

		// Health metrics trend
		const trendDates = this.generateTrendDates(startDate, endDate)
		const healthMetricsTrend = await Promise.all(
			trendDates.map(async (date) => {
				const dayStart = new Date(date)
				const dayEnd = new Date(date)
				dayEnd.setDate(dayEnd.getDate() + 1)
				
				const [result] = await this.db
					.select({
						avgWellness: sql<number>`COALESCE(avg(${healthScans.generalWellness}), 0)::float`,
						avgStress: sql<number>`COALESCE(avg(${healthScans.stressLevel}), 0)::float`,
					})
					.from(healthScans)
					.innerJoin(consultations, eq(healthScans.consultationId, consultations.id))
					.innerJoin(users, eq(consultations.patientId, users.id))
					.where(
						and(
							eq(users.organizationId, organizationId),
							gte(consultations.createdAt, dayStart),
							lte(consultations.createdAt, dayEnd),
						),
					)
				
				return {
					date,
					wellnessScore: Math.round(result?.avgWellness || 0),
					stressLevel: Math.round(result?.avgStress || 0),
				}
			})
		)

		return {
			longevityProgram: {
				totalHealthScans: totalHealthScans?.count || 0,
				averageWellnessScore: Math.round(avgWellness?.avg || 0),
				averageStressLevel: Math.round(avgStress?.avg || 0),
				averageHeartRate: Math.round(avgHeartRate?.avg || 0),
				riskDistribution: {
					low: lowRisk?.count || 0,
					moderate: moderateRisk?.count || 0,
					high: highRisk?.count || 0,
				},
				healthMetricsTrend,
			},
			period: {
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
		}
	}
}
