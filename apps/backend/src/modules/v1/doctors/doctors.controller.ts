import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { DoctorListResponseDto, DoctorQueryDto, DoctorResponseDto } from "@repo/contracts"

import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { DoctorsService } from "./doctors.service"

@Controller({ path: "doctors", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class DoctorsController {
	constructor(private readonly doctorsService: DoctorsService) {}

	@Get()
	@ZodSerializerDto(DoctorListResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN", "DOCTOR", "PATIENT")
	async findAll(@Query() query: DoctorQueryDto) {
		const doctors = await this.doctorsService.findAll(query)
		return {
			success: true,
			data: doctors,
		}
	}

	@Get(":id")
	@ZodSerializerDto(DoctorResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN", "DOCTOR", "PATIENT")
	async findOne(@Param("id") id: string) {
		const doctor = await this.doctorsService.findOne(id)
		return {
			success: true,
			data: doctor,
		}
	}
}
