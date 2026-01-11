import { Inject, Injectable } from "@nestjs/common"

import { subscriptionTierSettings } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class SubscriptionTiersService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll() {
		return this.db.select().from(subscriptionTierSettings)
	}
}
