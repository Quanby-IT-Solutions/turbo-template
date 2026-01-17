import { Body, Controller, Get, Param, Patch, Query, UseGuards } from "@nestjs/common"
import { AllowAnonymous } from "@thallesp/nestjs-better-auth"

import { Roles } from "@/shared/decorators/roles.decorator"
import { BetterAuthGuard } from "@/shared/guards/better-auth.guard"
import { RolesGuard } from "@/shared/guards/roles.guard"

import { SubscriptionsService } from "./subscriptions.service"

@Controller({ path: "subscriptions", version: "1" })
@AllowAnonymous() // Bypass Better Auth's global guard - we'll use our own BetterAuthGuard
@UseGuards(BetterAuthGuard, RolesGuard)
export class SubscriptionsController {
	constructor(private readonly subscriptionsService: SubscriptionsService) {}

	@Get()
	@Roles("SUPER_ADMIN")
	async getAllSubscriptions(
		@Query("type") type?: string,
		@Query("tier") tier?: string,
		@Query("activeOnly") activeOnly?: string
	) {
		const subscriptions = await this.subscriptionsService.getAllSubscriptions(
			type,
			tier,
			activeOnly === "true"
		)
		return { success: true, data: subscriptions }
	}

	@Patch("organization/:id")
	@Roles("SUPER_ADMIN")
	async updateOrganizationSubscription(
		@Param("id") id: string,
		@Body()
		data: {
			subscriptionTier?: string
			maxDoctors?: number | null
			maxPatientsPerDoctor?: number | null
			maxFaceScansPerDoctor?: number | null
			subscriptionStartDate?: string
			subscriptionEndDate?: string
			isSubscriptionActive?: boolean
		}
	) {
		const subscription = await this.subscriptionsService.updateOrganizationSubscription(id, data)
		return { success: true, data: subscription }
	}

	@Patch("doctor/:id")
	@Roles("SUPER_ADMIN")
	async updateDoctorSubscription(
		@Param("id") id: string,
		@Body()
		data: {
			subscriptionTier?: string
			maxPatients?: number | null
			maxFaceScans?: number | null
			subscriptionStartDate?: string
			subscriptionEndDate?: string
			isSubscriptionActive?: boolean
		}
	) {
		const subscription = await this.subscriptionsService.updateDoctorSubscription(id, data)
		return { success: true, data: subscription }
	}

	@Patch("patient/:id")
	@Roles("SUPER_ADMIN")
	async updatePatientSubscription(
		@Param("id") id: string,
		@Body()
		data: {
			subscriptionTier?: string
			maxFaceScans?: number | null
			subscriptionStartDate?: string
			subscriptionEndDate?: string
			isSubscriptionActive?: boolean
		}
	) {
		const subscription = await this.subscriptionsService.updatePatientSubscription(id, data)
		return { success: true, data: subscription }
	}
}
