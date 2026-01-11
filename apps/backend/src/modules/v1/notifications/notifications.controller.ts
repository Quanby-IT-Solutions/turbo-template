import { Controller, Get, Param, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { NotificationListResponseDto, NotificationResponseDto } from "@repo/contracts"

import { User } from "@/shared/decorators/user.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"

import { NotificationsService } from "./notifications.service"

@Controller({ path: "notifications", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard)
export class NotificationsController {
	constructor(private readonly notificationsService: NotificationsService) {}

	@Get()
	@ZodSerializerDto(NotificationListResponseDto)
	async findAll(@User() user: any) {
		const notifications = await this.notificationsService.findAll(user.userId || user.id)
		return { success: true, data: notifications }
	}

	@Get(":id")
	@ZodSerializerDto(NotificationResponseDto)
	async findOne(@Param("id") id: string) {
		const notification = await this.notificationsService.findOne(id)
		return { success: true, data: notification }
	}
}
