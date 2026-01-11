import { Inject, Injectable } from "@nestjs/common"
import { eq } from "drizzle-orm"

import { auditLogs, securityEvents } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"

@Injectable()
export class AuditService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async getAuditLogs(userId?: string, limit = 100) {
		if (userId) {
			return this.db.select().from(auditLogs).where(eq(auditLogs.userId, userId)).limit(limit)
		}
		return this.db.select().from(auditLogs).limit(limit)
	}

	async getSecurityEvents(limit = 100) {
		return this.db.select().from(securityEvents).limit(limit)
	}
}
