import { Controller, Get, Post, Body, Param, Query, Request, UseGuards, ForbiddenException, Patch, BadRequestException } from "@nestjs/common"
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
	
	@Post("request")
    @Roles("PATIENT", "ADMIN", "SUPER_ADMIN")
    async create(@Request() req: any, @Body() createDto: any) {
        try {
            const appointment = await this.appointmentsService.create(createDto, req.user);
            return { success: true, data: appointment };
        } catch (error) {
            // Re-throw validation errors with proper status codes
            if (error instanceof BadRequestException || 
                error instanceof ForbiddenException) {
                throw error;
            }
            // Handle unexpected errors
            throw new BadRequestException(
				(error instanceof Error ? error.message : "Failed to create appointment request")
            );
        }
    }

	
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

	// ADD THIS - Get available doctors for booking
	@Get("doctors")
	@Roles("PATIENT", "ADMIN", "SUPER_ADMIN")
	async getAvailableDoctors() {
		const doctors = await this.appointmentsService.getAvailableDoctors()
		return { success: true, data: doctors }
	}

	  @Get("doctor/:doctorId/availability")
  async getDoctorAvailability(@Param("doctorId") doctorId: string) {
    return this.appointmentsService.getDoctorAvailability(doctorId)
  }

	@Get("doctor/:doctorId/available-slots")
  async getDoctorAvailableTimeSlots(
    @Param("doctorId") doctorId: string,
    @Query("date") date: string
  ) {
    if (!date) {
      throw new ForbiddenException("Date parameter is required")
    }
    return this.appointmentsService.getDoctorAvailableTimeSlots(doctorId, date)
  }

	// This route must come before @Get(':id') to avoid conflicts
	@Get("my-appointments")
@Roles("DOCTOR", "PATIENT")
async getMyAppointments(@Request() req: any, @Query() query: any) {
  const appointments = await this.appointmentsService.getMyAppointments(req.user, query)
  
  const response = { success: true, data: appointments }
  
  console.log('🎯 Controller about to return:', JSON.stringify(response, null, 2))
  console.log('🎯 Items count:', response.data.items.length)
  
  return response
}

	@Get(":id")
	@ZodSerializerDto(AppointmentResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findOne(@Param("id") id: string) {
		const appointment = await this.appointmentsService.findOne(id)
		return { success: true, data: appointment }
	}

	@Patch(':id/cancel')
@Roles('PATIENT', 'ADMIN', 'SUPER_ADMIN')
async cancelAppointment(
  @Request() req: any,
  @Param('id') id: string,
  @Body() body: { reason?: string }
) {
  const appointment = await this.appointmentsService.cancelAppointment(
    id,
    body.reason,
    req.user
  );
  return { success: true, data: appointment };
}

	@Post(":id/reschedule")
	@Roles("PATIENT", "ADMIN", "SUPER_ADMIN")
	async requestReschedule(
		@Request() req: any,
		@Param("id") id: string,
		@Body() body: { newDate: string; newTime: string; reason?: string; notes?: string }
	) {
		const appointment = await this.appointmentsService.rescheduleAppointment(id, body, req.user)
		return { success: true, data: appointment }
	}

}