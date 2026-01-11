import { Inject, Injectable } from "@nestjs/common"
import { eq } from "drizzle-orm"

import { prescriptions } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class PrescriptionsService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll(query: any) {
		return this.db.select().from(prescriptions).limit(query.limit || 10).offset(query.offset || 0)
	}

	async findOne(id: string) {
		const [result] = await this.db
			.select()
			.from(prescriptions)
			.where(eq(prescriptions.id, id))
			.limit(1)
		return result
	}
}
