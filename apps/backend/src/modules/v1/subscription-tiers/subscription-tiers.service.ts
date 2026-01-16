import { Inject, Injectable } from "@nestjs/common"

import { subscriptionTierSettings } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class SubscriptionTiersService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll() {
		const tiers = await this.db.select().from(subscriptionTierSettings)
		
		// Convert Date objects to ISO strings for serialization
		return tiers.map(tier => ({
			...tier,
			createdAt: tier.createdAt instanceof Date ? tier.createdAt.toISOString() : tier.createdAt,
			updatedAt: tier.updatedAt instanceof Date ? tier.updatedAt.toISOString() : tier.updatedAt,
		}))
	}
}
