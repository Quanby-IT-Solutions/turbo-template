import { Inject, Injectable } from "@nestjs/common"

import { auditLogs, securityEvents } from "@repo/db/schema"
import type { AuditCategory, AuditLevel } from "@repo/db/schema"

import { DB, type DBType } from "@/common/database/database-providers"
import { eq } from "drizzle-orm"

@Injectable()
export class AuditService {
	constructor(@Inject(DB) private readonly db: DBType) {}

	async logAuthEvent(
		action: string,
		userId: string | null,
		email: string | null,
		ipAddress: string,
		userAgent: string,
		details?: Record<string, any>
	) {
		return this.logDataAccess(
			action,
			userId || "anonymous",
			"AUTHENTICATION",
			"auth",
			ipAddress,
			userAgent,
			{
				email,
				...details,
			}
		)
	}

	async logDataAccess(
		action: string,
		userId: string | "anonymous",
		category: AuditCategory,
		resourceType: string,
		ipAddress: string,
		userAgent: string,
		details?: Record<string, any>
	) {
		const level = this.determineAuditLevel(action)

		return this.db.insert(auditLogs).values({
			userId: userId === "anonymous" ? null : userId,
			action,
			category,
			level,
			description: `${action} on ${resourceType}`,
			ipAddress,
			userAgent,
			resourceType,
			details: details ? (details as any) : null,
			severity: level.toLowerCase(),
		})
	}

	async logSecurityEvent(
		eventType: string,
		severity: AuditLevel,
		description: string,
		userId: string | null,
		ipAddress: string,
		userAgent: string,
		details?: Record<string, any>
	) {
		return this.db.insert(securityEvents).values({
			eventType,
			severity,
			description,
			userId: userId || null,
			ipAddress,
			userAgent,
			details: details ? (details as any) : null,
			resolved: false,
		})
	}

	private determineAuditLevel(action: string): AuditLevel {
		const upperAction = action.toUpperCase()

		if (upperAction.includes("FAILED") || upperAction.includes("ERROR")) {
			return "ERROR"
		}
		if (upperAction.includes("WARNING") || upperAction.includes("SUSPECT")) {
			return "WARNING"
		}
		if (upperAction.includes("CRITICAL") || upperAction.includes("BREACH")) {
			return "CRITICAL"
		}

		return "INFO"
	}

	async getAuditLogs(userId?: string, limit = 100) {
		const query = this.db.select().from(auditLogs)

		if (userId) {
			return query.where(eq(auditLogs.userId, userId)).limit(limit)
		}

		return query.limit(limit)
	}
}
