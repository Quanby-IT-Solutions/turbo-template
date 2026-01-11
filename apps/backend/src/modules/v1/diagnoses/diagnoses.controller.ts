import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { DiagnosisListResponseDto, DiagnosisQueryDto, DiagnosisResponseDto } from "@repo/contracts"

import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { DiagnosesService } from "./diagnoses.service"

@Controller({ path: "diagnoses", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class DiagnosesController {
	constructor(private readonly diagnosesService: DiagnosesService) {}

	@Get()
	@ZodSerializerDto(DiagnosisListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findAll(@Query() query: DiagnosisQueryDto) {
		const diagnoses = await this.diagnosesService.findAll(query)
		return { success: true, data: diagnoses }
	}

	@Get(":id")
	@ZodSerializerDto(DiagnosisResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findOne(@Param("id") id: string) {
		const diagnosis = await this.diagnosesService.findOne(id)
		return { success: true, data: diagnosis }
	}
}
