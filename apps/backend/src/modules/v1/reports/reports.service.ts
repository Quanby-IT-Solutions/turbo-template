import { Inject, Injectable } from "@nestjs/common"
import { and, desc, eq, gte, lte, sql } from "drizzle-orm"

import {
	appointmentRequests,
	consultations,
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
}
