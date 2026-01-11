import { Controller, Get, Param, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { LabRequestListResponseDto, LabRequestResponseDto } from "@repo/contracts"

import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { LabRequestsService } from "./lab-requests.service"

@Controller({ path: "lab-requests", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class LabRequestsController {
	constructor(private readonly labRequestsService: LabRequestsService) {}

	@Get()
	@ZodSerializerDto(LabRequestListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findAll() {
		const labRequests = await this.labRequestsService.findAll()
		return { success: true, data: labRequests }
	}

	// These routes must come before @Get(':id') to avoid conflicts
	@Get("doctor/:doctorId")
	@ZodSerializerDto(LabRequestListResponseDto)
	@Roles("DOCTOR", "ADMIN", "SUPER_ADMIN")
	async getDoctorLabRequests(@Param("doctorId") doctorId: string) {
		const labRequests = await this.labRequestsService.getDoctorLabRequests(doctorId)
		return { success: true, data: labRequests }
	}

	@Get("patient/:patientId")
	@ZodSerializerDto(LabRequestListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async getPatientLabRequests(@Param("patientId") patientId: string) {
		const labRequests = await this.labRequestsService.getPatientLabRequests(patientId)
		return { success: true, data: labRequests }
	}

	@Get(":id")
	@ZodSerializerDto(LabRequestResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findOne(@Param("id") id: string) {
		const labRequest = await this.labRequestsService.findOne(id)
		return { success: true, data: labRequest }
	}
}
