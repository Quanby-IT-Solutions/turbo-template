import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { OrganizationListResponseDto, OrganizationResponseDto } from "@repo/contracts"

import { User } from "@/shared/decorators/user.decorator"
import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { OrganizationsService } from "./organizations.service"

@Controller({ path: "organizations", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class OrganizationsController {
	constructor(private readonly organizationsService: OrganizationsService) {}

	@Get()
	@ZodSerializerDto(OrganizationListResponseDto)
	async findAll() {
		const organizations = await this.organizationsService.findAll()
		return { success: true, data: organizations }
	}

	// This route must come before @Get(':id') to avoid conflicts
	@Get("statistics")
	@Roles("SUPER_ADMIN", "ADMIN")
	async getStatistics() {
		const statistics = await this.organizationsService.getStatistics()
		return { success: true, data: statistics }
	}

	// These routes must come before @Get(':id') to avoid conflicts
	@Post(":id/approve")
	@ZodSerializerDto(OrganizationResponseDto)
	@Roles("SUPER_ADMIN")
	async approve(@Param("id") id: string, @User() user: any) {
		const organization = await this.organizationsService.approve(id, user?.id)
		return { success: true, data: organization }
	}

	@Post(":id/reject")
	@ZodSerializerDto(OrganizationResponseDto)
	@Roles("SUPER_ADMIN")
	async reject(@Param("id") id: string, @Body() body: { reason?: string }, @User() user: any) {
		const organization = await this.organizationsService.reject(id, body.reason, user?.id)
		return { success: true, data: organization }
	}

	@Patch(":id/status")
	@ZodSerializerDto(OrganizationResponseDto)
	@Roles("SUPER_ADMIN")
	async toggleStatus(@Param("id") id: string, @Body() body: { isActive: boolean }) {
		const organization = await this.organizationsService.toggleStatus(id, body.isActive)
		return { success: true, data: organization }
	}

	@Get(":id")
	@ZodSerializerDto(OrganizationResponseDto)
	@Roles("SUPER_ADMIN", "ADMIN", "DOCTOR", "ORGANIZATION")
	async findOne(@Param("id") id: string) {
		const organization = await this.organizationsService.findOne(id)
		return { success: true, data: organization }
	}

	@Post()
	@ZodSerializerDto(OrganizationResponseDto)
	@Roles("SUPER_ADMIN")
	async create(@Body() data: any) {
		const organization = await this.organizationsService.create(data)
		return { success: true, data: organization }
	}

	@Put(":id")
	@ZodSerializerDto(OrganizationResponseDto)
	@Roles("SUPER_ADMIN")
	async update(@Param("id") id: string, @Body() data: any) {
		const organization = await this.organizationsService.update(id, data)
		return { success: true, data: organization }
	}

	@Delete(":id")
	@Roles("SUPER_ADMIN")
	async delete(@Param("id") id: string) {
		await this.organizationsService.delete(id)
		return { success: true, message: "Organization deleted successfully" }
	}
}
