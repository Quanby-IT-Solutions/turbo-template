import { Inject, Injectable } from "@nestjs/common"
import { eq } from "drizzle-orm"

import { faceScanResults } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class FaceScanService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async findAll() {
		return this.db.select().from(faceScanResults)
	}

	async findOne(id: string) {
		const [result] = await this.db
			.select()
			.from(faceScanResults)
			.where(eq(faceScanResults.id, id))
			.limit(1)
		return result
	}
}
