import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { DoctorListResponseDto, DoctorQueryDto, DoctorResponseDto } from "@repo/contracts"

import { User } from "@/shared/decorators/user.decorator"
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

	@Post()
	@ZodSerializerDto(DoctorResponseDto)
	@Roles("SUPER_ADMIN", "ADMIN")
	async create(@Body() data: any) {
		const doctor = await this.doctorsService.create(data)
		return { success: true, data: doctor }
	}

	// These routes must come before @Get(':id') to avoid conflicts
	@Post(":id/approve")
	@ZodSerializerDto(DoctorResponseDto)
	@Roles("SUPER_ADMIN")
	async approve(@Param("id") id: string, @User() user: any) {
		const doctor = await this.doctorsService.approve(id, user?.id)
		return { success: true, data: doctor }
	}

	@Post(":id/reject")
	@ZodSerializerDto(DoctorResponseDto)
	@Roles("SUPER_ADMIN")
	async reject(@Param("id") id: string, @Body() body: { reason?: string }, @User() user: any) {
		const doctor = await this.doctorsService.reject(id, body.reason, user?.id)
		return { success: true, data: doctor }
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

	@Put(":id")
	@ZodSerializerDto(DoctorResponseDto)
	@Roles("SUPER_ADMIN", "ADMIN")
	async update(@Param("id") id: string, @Body() data: any) {
		const doctor = await this.doctorsService.update(id, data)
		return { success: true, data: doctor }
	}

	@Delete(":id")
	@Roles("SUPER_ADMIN", "ADMIN")
	async delete(@Param("id") id: string) {
		await this.doctorsService.delete(id)
		return { success: true, message: "Doctor deleted successfully" }
	}
}
