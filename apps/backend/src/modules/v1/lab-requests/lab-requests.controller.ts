import { Controller, Get, Param, UseGuards, Post, Body } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { CreateLabRequestDto, LabRequestListResponseDto, LabRequestQueryDto, LabRequestResponseDto } from "@repo/contracts"

import { Roles } from "@/shared/decorators/roles.decorator"
import { User } from "@/shared/decorators/user.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { LabRequestsService } from "./lab-requests.service"

@Controller({ path: "lab-requests", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class LabRequestsController {
	constructor(private readonly labRequestsService: LabRequestsService) {}

	@Get()
	@ZodSerializerDto(LabRequestListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findAll() {
		const labRequests = await this.labRequestsService.findAll()
		return { success: true, data: labRequests }
	}

	@Post()
	@ZodSerializerDto(LabRequestResponseDto)
	@Roles("DOCTOR", "ADMIN", "SUPER_ADMIN")
	async create(@Body() data: any, @User() user: any) {
		const doctorId = user?.userId || user?.id
		if (!doctorId) {
			throw new Error("Doctor ID not found")
		}
		const labRequest = await this.labRequestsService.create({
			...data,
			doctorId,
			createdBy: doctorId,
		})
		return { success: true, data: labRequest }
	}

	// These routes must come before @Get(':id') to avoid conflicts
	@Get("doctor/:doctorId")
	@ZodSerializerDto(LabRequestListResponseDto)
	@Roles("DOCTOR", "ADMIN", "SUPER_ADMIN")
	async getDoctorLabRequests(@Param("doctorId") doctorId: string) {
		const labRequests = await this.labRequestsService.getDoctorLabRequests(doctorId)
		return { success: true, data: labRequests }
	}

	@Get("patient/:patientId")
	@ZodSerializerDto(LabRequestListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async getPatientLabRequests(@Param("patientId") patientId: string) {
		const labRequests = await this.labRequestsService.getPatientLabRequests(patientId)
		return { success: true, data: labRequests }
	}

	@Get("room/:roomId")
	@ZodSerializerDto(LabRequestListResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async getRoomLabRequests(@Param("roomId") roomId: string) {
		const labRequests = await this.labRequestsService.getRoomLabRequests(roomId)
		return { success: true, data: labRequests }
	}

	@Get(":id")
	@ZodSerializerDto(LabRequestResponseDto)
	@Roles("DOCTOR", "PATIENT", "ADMIN", "SUPER_ADMIN")
	async findOne(@Param("id") id: string) {
		const labRequest = await this.labRequestsService.findOne(id)
		return { success: true, data: labRequest }
	}

  @Put(':id')
  @Roles('DOCTOR', 'ADMIN', 'SUPER_ADMIN')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateDto: Partial<CreateLabRequestDto>,
  ) {
    const labRequest = await this.labRequestsService.update(id, updateDto, req.user);
    return { success: true, data: labRequest };
  }

  @Delete(':id')
  @Roles('ADMIN', 'SUPER_ADMIN')
  async remove(@Request() req: any, @Param('id') id: string) {
    await this.labRequestsService.remove(id);
    return { success: true, message: 'Lab request deleted successfully' };
  }
}
