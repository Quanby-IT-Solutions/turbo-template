import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { PrescriptionListResponseDto, PrescriptionQueryDto, PrescriptionResponseDto } from "@repo/contracts"

import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { PrescriptionsService } from "./prescriptions.service"

@Controller({ path: "prescriptions", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class PrescriptionsController {
	constructor(private readonly prescriptionsService: PrescriptionsService) {}

	@Get()
	@ZodSerializerDto(PrescriptionListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findAll(@Query() query: PrescriptionQueryDto) {
		const prescriptions = await this.prescriptionsService.findAll(query)
		return { success: true, data: prescriptions }
	}

	@Get(":id")
	@ZodSerializerDto(PrescriptionResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findOne(@Param("id") id: string) {
		const prescription = await this.prescriptionsService.findOne(id)
		return { success: true, data: prescription }
	}
}
