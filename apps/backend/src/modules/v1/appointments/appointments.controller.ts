import { Controller, Get, Param, Query, Request, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { AppointmentListResponseDto, AppointmentQueryDto, AppointmentResponseDto } from "@repo/contracts"

import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { AppointmentsService } from "./appointments.service"

@Controller({ path: "appointments", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class AppointmentsController {
	constructor(private readonly appointmentsService: AppointmentsService) {}

	@Get()
	@ZodSerializerDto(AppointmentListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findAll(@Query() query: AppointmentQueryDto) {
		const appointments = await this.appointmentsService.findAll(query)
		return { success: true, data: appointments }
	}

	// This route must come before @Get(':id') to avoid conflicts
	@Get("organization")
	@ZodSerializerDto(AppointmentListResponseDto)
	@Roles("ORGANIZATION", "ADMIN", "SUPER_ADMIN")
	async getOrganizationAppointments(@Request() req: any) {
		const appointments = await this.appointmentsService.getOrganizationAppointments(req.user)
		return { success: true, data: appointments }
	}

	// This route must come before @Get(':id') to avoid conflicts
	@Get("my-appointments")
	@ZodSerializerDto(AppointmentListResponseDto)
	@Roles("DOCTOR", "PATIENT")
	async getMyAppointments(@Request() req: any, @Query() query: any) {
		const appointments = await this.appointmentsService.getMyAppointments(req.user, query)
		return { success: true, data: appointments }
	}

	@Get(":id")
	@ZodSerializerDto(AppointmentResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findOne(@Param("id") id: string) {
		const appointment = await this.appointmentsService.findOne(id)
		return { success: true, data: appointment }
	}
}
