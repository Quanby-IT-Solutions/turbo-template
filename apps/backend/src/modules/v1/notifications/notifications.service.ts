import { Inject, Injectable } from "@nestjs/common"
import { eq } from "drizzle-orm"

import { notifications } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class NotificationsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll(userId: string) {
		return this.db.select().from(notifications).where(eq(notifications.userId, userId))
	}

	async findOne(id: string) {
		const [result] = await this.db
			.select()
			.from(notifications)
			.where(eq(notifications.id, id))
			.limit(1)
		return result
	}
}
