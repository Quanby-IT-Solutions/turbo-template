import {
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Patch,
	Post,
	Query,
	UseGuards,
} from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import {
	CreateReportDto,
	GenerateReportDto,
	ReportQueryDto,
	ReportTemplateListResponseDto,
	SystemReportListResponseDto,
	SystemReportResponseDto,
	UpdateReportDto,
} from "@repo/contracts"

import { User } from "@/shared/decorators/user.decorator"
import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { ReportsService } from "./reports.service"

interface AuthUser {
	id: string
	email: string
	role: string
	organizationId: string
}

@Controller({ path: "reports", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class ReportsController {
	constructor(private readonly reportsService: ReportsService) {}

	/**
	 * Get all report templates
	 */
	@Get("templates")
	@ZodSerializerDto(ReportTemplateListResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async getReportTemplates() {
		const templates = await this.reportsService.getReportTemplates()
		return { success: true, data: templates }
	}

	/**
	 * Get a single report template
	 */
	@Get("templates/:id")
	@Roles("ADMIN", "SUPER_ADMIN")
	async getReportTemplateById(@Param("id") id: string) {
		const template = await this.reportsService.getReportTemplateById(id)
		return { success: true, data: template }
	}

	/**
	 * Get all reports with filters
	 */
	@Get()
	@ZodSerializerDto(SystemReportListResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async getReports(@User() user: AuthUser, @Query() query: ReportQueryDto) {
		const reports = await this.reportsService.getReports(
			user.id,
			user.organizationId,
			query,
		)
		return { success: true, data: reports }
	}

	/**
	 * Get a single report by ID
	 */
	@Get(":id")
	@ZodSerializerDto(SystemReportResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async getReportById(@User() user: AuthUser, @Param("id") id: string) {
		const report = await this.reportsService.getReportById(id, user.organizationId)
		return { success: true, data: report }
	}

	/**
	 * Create a new report
	 */
	@Post()
	@ZodSerializerDto(SystemReportResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async createReport(@User() user: AuthUser, @Body() dto: CreateReportDto) {
		const report = await this.reportsService.createReport(
			user.id,
			user.organizationId,
			dto,
		)
		return { success: true, data: report }
	}

	/**
	 * Update a report
	 */
	@Patch(":id")
	@ZodSerializerDto(SystemReportResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async updateReport(
		@User() user: AuthUser,
		@Param("id") id: string,
		@Body() dto: UpdateReportDto,
	) {
		const report = await this.reportsService.updateReport(
			id,
			user.organizationId,
			dto,
		)
		return { success: true, data: report }
	}

	/**
	 * Delete a report
	 */
	@Delete(":id")
	@Roles("ADMIN", "SUPER_ADMIN")
	async deleteReport(@User() user: AuthUser, @Param("id") id: string) {
		const report = await this.reportsService.deleteReport(id, user.organizationId)
		return { success: true, data: report }
	}

	/**
	 * Generate report data
	 */
	@Post("generate")
	@ZodSerializerDto(SystemReportResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async generateReport(@User() user: AuthUser, @Body() dto: GenerateReportDto) {
		const report = await this.reportsService.generateReportData(
			dto.reportId,
			user.organizationId,
		)
		return { success: true, data: report }
	}
}
