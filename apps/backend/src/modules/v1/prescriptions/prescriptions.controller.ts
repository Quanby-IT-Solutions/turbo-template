import { Controller, Get, Param, Query, UseGuards, Post, Body, Req } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { PrescriptionListResponseDto, PrescriptionQueryDto, PrescriptionResponseDto } from "@repo/contracts"

import { Roles } from "@/shared/decorators/roles.decorator"
import { User } from "@/shared/decorators/user.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"
import type { Request } from "express"

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

	@Post("create")
	@ZodSerializerDto(PrescriptionResponseDto)
	@Roles("DOCTOR", "ADMIN", "SUPER_ADMIN")
	async create(@Body() data: any, @User() user: any, @Req() req: Request) {
		const doctorId = user?.userId || user?.id
		if (!doctorId) {
			throw new Error("Doctor ID not found")
		}
		const prescription = await this.prescriptionsService.create({
			...data,
			doctorId,
		})
		return { success: true, data: prescription }
	}

	@Get("doctor/:doctorId")
	@ZodSerializerDto(PrescriptionListResponseDto)
	@Roles("DOCTOR", "ADMIN", "SUPER_ADMIN")
	async getDoctorPrescriptions(@Param("doctorId") doctorId: string) {
		const prescriptions = await this.prescriptionsService.getDoctorPrescriptions(doctorId)
		return { success: true, data: prescriptions }
	}

	@Get("patient/:patientId")
	@ZodSerializerDto(PrescriptionListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async getPatientPrescriptions(@Param("patientId") patientId: string) {
		const prescriptions = await this.prescriptionsService.getPatientPrescriptions(patientId)
		return { success: true, data: prescriptions }
	}

	@Get("room/:roomId")
	@ZodSerializerDto(PrescriptionListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async getRoomPrescriptions(@Param("roomId") roomId: string) {
		const prescriptions = await this.prescriptionsService.getRoomPrescriptions(roomId)
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
