import { Controller, Get, Param, Query, UseGuards, Post, Body } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { DiagnosisListResponseDto, DiagnosisQueryDto, DiagnosisResponseDto } from "@repo/contracts"

import { Roles } from "@/shared/decorators/roles.decorator"
import { User } from "@/shared/decorators/user.decorator"
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

	@Post("create")
	@ZodSerializerDto(DiagnosisResponseDto)
	@Roles("DOCTOR", "ADMIN", "SUPER_ADMIN")
	async create(@Body() data: any, @User() user: any) {
		const doctorId = user?.userId || user?.id
		if (!doctorId) {
			throw new Error("Doctor ID not found")
		}
		const diagnosis = await this.diagnosesService.create({
			...data,
			doctorId,
		})
		return { success: true, data: diagnosis }
	}

	@Get("doctor")
	@ZodSerializerDto(DiagnosisListResponseDto)
	@Roles("DOCTOR", "ADMIN", "SUPER_ADMIN")
	async getDoctorDiagnoses(@User() user: any) {
		const doctorId = user?.userId || user?.id
		if (!doctorId) {
			throw new Error("Doctor ID not found")
		}
		const diagnoses = await this.diagnosesService.getDoctorDiagnoses(doctorId)
		return { success: true, data: diagnoses }
	}

	@Get("doctor/:doctorId")
	@ZodSerializerDto(DiagnosisListResponseDto)
	@Roles("DOCTOR", "ADMIN", "SUPER_ADMIN")
	async getDoctorDiagnosesById(@Param("doctorId") doctorId: string) {
		const diagnoses = await this.diagnosesService.getDoctorDiagnoses(doctorId)
		return { success: true, data: diagnoses }
	}

	@Get("patient/:patientId")
	@ZodSerializerDto(DiagnosisListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async getPatientDiagnoses(@Param("patientId") patientId: string) {
		const diagnoses = await this.diagnosesService.getPatientDiagnoses(patientId)
		return { success: true, data: diagnoses }
	}

	@Get("room/:roomId")
	@ZodSerializerDto(DiagnosisListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async getRoomDiagnoses(@Param("roomId") roomId: string) {
		const diagnoses = await this.diagnosesService.getRoomDiagnoses(roomId)
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
