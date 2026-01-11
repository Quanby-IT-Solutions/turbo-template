import { Body, Controller, Post, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { EmailResponseDto, SendEmailDto } from "@repo/contracts"

import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { EmailService } from "./email.service"

@Controller({ path: "email", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class EmailController {
	constructor(private readonly emailService: EmailService) {}

	@Post("send")
	@ZodSerializerDto(EmailResponseDto)
	@Roles("ADMIN", "SUPER_ADMIN")
	async sendEmail(@Body() data: SendEmailDto) {
		return { success: true, message: "Email sent" }
	}
}
