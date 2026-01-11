import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { ConsultationListResponseDto, ConsultationQueryDto, ConsultationResponseDto } from "@repo/contracts"

import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { ConsultationsService } from "./consultations.service"

@Controller({ path: "consultations", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class ConsultationsController {
	constructor(private readonly consultationsService: ConsultationsService) {}

	@Get()
	@ZodSerializerDto(ConsultationListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findAll(@Query() query: ConsultationQueryDto) {
		const consultations = await this.consultationsService.findAll(query)
		return { success: true, data: consultations }
	}

	@Get(":id")
	@ZodSerializerDto(ConsultationResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findOne(@Param("id") id: string) {
		const consultation = await this.consultationsService.findOne(id)
		return { success: true, data: consultation }
	}
}
