import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { PatientListResponseDto, PatientQueryDto, PatientResponseDto } from "@repo/contracts"

import { Public } from "@/shared/decorators/public.decorator"
import { Roles } from "@/shared/decorators/roles.decorator"
import { RolesGuard } from "@/shared/guards/roles.guard"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import type { Role } from "@repo/db/schema"

import { PatientsService } from "./patients.service"

@Controller({ path: "patients", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class PatientsController {
	constructor(private readonly patientsService: PatientsService) {}

	@Get()
	@ZodSerializerDto(PatientListResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN", "DOCTOR")
	async findAll(@Query() query: PatientQueryDto) {
		const patients = await this.patientsService.findAll(query)
		return {
			success: true,
			data: patients,
		}
	}

	@Get(":id")
	@ZodSerializerDto(PatientResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN", "DOCTOR", "PATIENT")
	async findOne(@Param("id") id: string) {
		const patient = await this.patientsService.findOne(id)
		return {
			success: true,
			data: patient,
		}
	}
}
