import { Module } from "@nestjs/common"

import { SubscriptionTiersController } from "./subscription-tiers.controller"
import { SubscriptionTiersService } from "./subscription-tiers.service"

@Module({
	controllers: [SubscriptionTiersController],
	providers: [SubscriptionTiersService],
	exports: [SubscriptionTiersService],
})
export class SubscriptionTiersModule {}
