import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { DoctorListResponseDto } from "@repo/contracts"

import { Public } from "@/shared/decorators/public.decorator"
import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { SuperAdminService } from "./super-admin.service"

@Controller({ path: "super-admin", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class SuperAdminController {
	constructor(private readonly superAdminService: SuperAdminService) {}

	// Test endpoint to verify backend is receiving requests (no auth required for testing)
	@Get("test")
	@Public()
	async test() {
		process.stderr.write(`\n✅ TEST ENDPOINT HIT - Backend is receiving requests!\n`)
		return { success: true, message: "Backend is working" }
	}

	// Test endpoint WITH auth to verify guard is running
	@Get("test-auth")
	@Roles("SUPER_ADMIN")
	async testAuth() {
		process.stderr.write(`\n✅ TEST AUTH ENDPOINT HIT - Guard passed!\n`)
		return { success: true, message: "Guard is working", timestamp: new Date().toISOString() }
	}

	@Get("stats")
	@Roles("SUPER_ADMIN")
	async getStats() {
		const stats = await this.superAdminService.getStats()
		return { success: true, data: stats }
	}

	@Get("patients/pending-verification")
	@Roles("SUPER_ADMIN")
	async getPatientsPendingVerification(
		@Query("page") page?: string,
		@Query("limit") limit?: string,
		@Query("status") status?: string
	) {
		process.stderr.write(`\n✅✅✅ CONTROLLER METHOD CALLED - getPatientsPendingVerification\n`)
		console.error("✅✅✅ CONTROLLER METHOD CALLED - getPatientsPendingVerification")
		
		const patients = await this.superAdminService.getPatientsPendingVerification(
			page ? parseInt(page, 10) : undefined,
			limit ? parseInt(limit, 10) : undefined,
			status
		)
		return { success: true, data: patients }
	}

	@Patch("patients/:patientId/verification-status")
	@Roles("SUPER_ADMIN")
	async updatePatientVerificationStatus(@Param("patientId") patientId: string, @Body() body: any) {
		const result = await this.superAdminService.updatePatientVerificationStatus(patientId, body)
		return { success: true, data: result }
	}

	// This route must come before any parameterized routes
	@Get("doctors")
	@ZodSerializerDto(DoctorListResponseDto)
	@Roles("SUPER_ADMIN")
	async getDoctors(
		@Query("page") page?: string,
		@Query("limit") limit?: string,
		@Query("status") status?: string,
		@Query("organizationId") organizationId?: string
	) {
		const doctors = await this.superAdminService.getDoctors(
			page ? parseInt(page, 10) : undefined,
			limit ? parseInt(limit, 10) : undefined,
			status,
			organizationId
		)
		return { success: true, data: doctors }
	}
}
