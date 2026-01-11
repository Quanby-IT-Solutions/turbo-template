import { Controller, Get, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"
import { ZodSerializerDto } from "nestjs-zod"

import { SubscriptionTierSettingListResponseDto } from "@repo/contracts"

import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"

import { SubscriptionTiersService } from "./subscription-tiers.service"

@Controller({ path: "subscription-tiers", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard)
export class SubscriptionTiersController {
	constructor(private readonly subscriptionTiersService: SubscriptionTiersService) {}

	@Get()
	@ZodSerializerDto(SubscriptionTierSettingListResponseDto)
	async findAll() {
		const tiers = await this.subscriptionTiersService.findAll()
		return { success: true, data: tiers }
	}
}
