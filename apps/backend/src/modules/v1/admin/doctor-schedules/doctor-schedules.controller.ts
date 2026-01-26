import { Body, Controller, Delete, Get, Param, Post, Put, Query, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"

import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { DoctorSchedulesService } from "./doctor-schedules.service"

@Controller({ path: "admin/doctor-schedules", version: "1" })
@AllowAnonymous()
@UseGuards(BetterAuthGuard, RolesGuard)
export class DoctorSchedulesController {
	constructor(private readonly doctorSchedulesService: DoctorSchedulesService) {}

	@Get()
	@Roles("ADMIN", "SUPER_ADMIN")
	async findAll(@Query("doctorId") doctorId?: string, @Query("dayOfWeek") dayOfWeek?: string) {
		const schedules = await this.doctorSchedulesService.findAll(doctorId, dayOfWeek)
		return { success: true, data: schedules }
	}

	@Get(":id")
	@Roles("ADMIN", "SUPER_ADMIN")
	async findOne(@Param("id") id: string) {
		const schedule = await this.doctorSchedulesService.findOne(id)
		return { success: true, data: schedule }
	}

	@Post()
	@Roles("ADMIN", "SUPER_ADMIN")
	async create(@Body() data: any) {
		const schedule = await this.doctorSchedulesService.create(data)
		return { success: true, data: schedule }
	}

	@Put(":id")
	@Roles("ADMIN", "SUPER_ADMIN")
	async update(@Param("id") id: string, @Body() data: any) {
		const schedule = await this.doctorSchedulesService.update(id, data)
		return { success: true, data: schedule }
	}

	@Delete(":id")
	@Roles("ADMIN", "SUPER_ADMIN")
	async delete(@Param("id") id: string) {
		await this.doctorSchedulesService.delete(id)
		return { success: true, message: "Doctor schedule deleted successfully" }
	}
}
