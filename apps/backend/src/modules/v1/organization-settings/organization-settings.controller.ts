import { Body, Controller, Delete, Get, Param, Put, UseGuards } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"

import { User } from "@/shared/decorators/user.decorator"
import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { OrganizationSettingsService } from "./organization-settings.service"

@ApiTags("Organization Settings")
@Controller({ path: "organization-settings", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class OrganizationSettingsController {
	constructor(private readonly organizationSettingsService: OrganizationSettingsService) {}

	@Get(":organizationId")
	@ApiOperation({ summary: "Get organization settings by organization ID" })
	@ApiResponse({ status: 200, description: "Settings retrieved successfully" })
	@ApiResponse({ status: 404, description: "Settings not found" })
	@Roles("ADMIN", "SUPER_ADMIN", "ORGANIZATION")
	async getSettings(@Param("organizationId") organizationId: string, @User() user: any) {
		const settings = await this.organizationSettingsService.getByOrganizationId(organizationId)
		return { success: true, data: settings }
	}

	@Put(":organizationId")
	@ApiOperation({ summary: "Create or update organization settings" })
	@ApiResponse({ status: 200, description: "Settings updated successfully" })
	@ApiResponse({ status: 400, description: "Invalid input" })
	@Roles("ADMIN", "SUPER_ADMIN", "ORGANIZATION")
	async upsertSettings(
		@Param("organizationId") organizationId: string,
		@Body() body: any,
		@User() user: any
	) {
		const settings = await this.organizationSettingsService.upsertSettings(organizationId, body)
		return { success: true, data: settings }
	}

	@Delete(":organizationId")
	@ApiOperation({ summary: "Delete organization settings" })
	@ApiResponse({ status: 200, description: "Settings deleted successfully" })
	@ApiResponse({ status: 404, description: "Settings not found" })
	@Roles("ADMIN", "SUPER_ADMIN")
	async deleteSettings(@Param("organizationId") organizationId: string, @User() user: any) {
		return this.organizationSettingsService.deleteSettings(organizationId)
	}
}
