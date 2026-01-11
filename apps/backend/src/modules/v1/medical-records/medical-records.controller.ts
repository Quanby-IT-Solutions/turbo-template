import { Controller, Get, Param, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { MedicalRecordListResponseDto, MedicalRecordResponseDto } from "@repo/contracts"

import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { MedicalRecordsService } from "./medical-records.service"

@Controller({ path: "medical-records", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class MedicalRecordsController {
	constructor(private readonly medicalRecordsService: MedicalRecordsService) {}

	@Get()
	@ZodSerializerDto(MedicalRecordListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findAll() {
		const records = await this.medicalRecordsService.findAll()
		return { success: true, data: records }
	}

	@Get(":id")
	@ZodSerializerDto(MedicalRecordResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findOne(@Param("id") id: string) {
		const record = await this.medicalRecordsService.findOne(id)
		return { success: true, data: record }
	}
}
