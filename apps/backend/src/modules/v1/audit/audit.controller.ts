import { Controller, Get, Query, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { AuditLogListResponseDto } from "@repo/contracts"

import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { AuditService } from "./audit.service"

@Controller({ path: "audit", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class AuditController {
	constructor(private readonly auditService: AuditService) {}

	@Get("logs")
	@ZodSerializerDto(AuditLogListResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async getAuditLogs(@Query("userId") userId?: string, @Query("limit") limit?: number) {
		const logs = await this.auditService.getAuditLogs(userId, limit)
		return { success: true, data: logs }
	}

	@Get("security-events")
	@Roles("ADMIN", "SUPER_ADMIN")
	async getSecurityEvents(@Query("limit") limit?: number) {
		const events = await this.auditService.getSecurityEvents(limit)
		return { success: true, data: events }
	}
}
