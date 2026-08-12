import { Injectable } from "@nestjs/common"
import { desc, eq, lt } from "drizzle-orm"

import type { AuditLogEntry, AuditOutcome, ListAuditLogRequest } from "@repo/contracts"
import { auditLog, users } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

/**
 * A database handle that may be either the pool or an open transaction.
 *
 * Callers pass their transaction so the audit row commits or rolls back with
 * the mutation it describes. Typed structurally rather than as Drizzle's
 * `PgTransaction` because the pool and a transaction share the query surface
 * used here but not their full types.
 */
export type AuditDb = Pick<typeof db, "insert">

/** Domain tag for RBAC events. Kept here so callers cannot drift on spelling. */
export const AUDIT_DOMAIN_RBAC = "rbac"

/**
 * One privileged event to record.
 *
 * The shape is deliberately generic (domain, action, target, old→new) so auth
 * and other domains can adopt this trail later without a schema change — see
 * the cross-epic ownership rule in DOMAIN-MODEL.md.
 */
export interface AuditEvent {
	/** Broad area, e.g. "rbac". */
	domain: string
	/** What happened, e.g. "role.assign". */
	action: string
	/** Defaults to "success"; pass "denied" to record a refused attempt. */
	outcome?: AuditOutcome
	/** Who acted. Null only for system-initiated events. */
	actorId: string | null
	targetType?: string | null
	targetId?: string | null
	oldValue?: unknown
	newValue?: unknown
	/** Why it was refused, for denials. */
	reason?: string | null
}

/**
 * Append-only audit trail for privileged mutations (AZ-4 / F-17).
 *
 * The `authz` epic owns both the `audit_log` schema and this service. Other
 * domains record events by calling {@link record}; nothing else inserts into
 * the table directly, so the append-only guarantee has a single enforcement
 * point. There is no update or delete method here, and none may be added — a
 * log the application can rewrite is not evidence.
 */
@Injectable()
export class AuditService {
	/**
	 * Append one entry.
	 *
	 * Pass the caller's transaction as `tx` whenever the event describes a
	 * mutation. Writing inside that transaction is what makes the trail
	 * trustworthy: if the audit insert fails the mutation rolls back with it,
	 * so a privileged change can never commit unrecorded. Omitting `tx` is
	 * correct only for events with nothing to roll back, such as a denial that
	 * rejected before any write.
	 */
	async record(event: AuditEvent, tx: AuditDb = db): Promise<void> {
		await tx.insert(auditLog).values({
			domain: event.domain,
			action: event.action,
			outcome: event.outcome ?? "success",
			actorId: event.actorId,
			targetType: event.targetType ?? null,
			targetId: event.targetId ?? null,
			oldValue: event.oldValue ?? null,
			newValue: event.newValue ?? null,
			reason: event.reason ?? null,
		})
	}

	/**
	 * Read entries newest-first.
	 *
	 * Cursor paging on the monotonic id rather than OFFSET: entries are
	 * appended constantly, and OFFSET would silently skip or repeat rows as the
	 * table grows underneath a reader paging through it.
	 */
	async list(query: ListAuditLogRequest): Promise<{
		entries: AuditLogEntry[]
		nextCursor: number | null
	}> {
		const limit = query.limit

		const rows = await db
			.select({
				id: auditLog.id,
				domain: auditLog.domain,
				action: auditLog.action,
				outcome: auditLog.outcome,
				actorId: auditLog.actorId,
				actorEmail: users.email,
				targetType: auditLog.targetType,
				targetId: auditLog.targetId,
				oldValue: auditLog.oldValue,
				newValue: auditLog.newValue,
				reason: auditLog.reason,
				createdAt: auditLog.createdAt,
			})
			.from(auditLog)
			// Left join: an entry outlives the account that produced it, by design.
			.leftJoin(users, eq(auditLog.actorId, users.id))
			.where(query.before ? lt(auditLog.id, query.before) : undefined)
			// Ordered by id, not createdAt: two rows written in the same
			// transaction share a timestamp, and only the id totally orders them.
			.orderBy(desc(auditLog.id))
			// One extra row tells us whether another page exists without a count.
			.limit(limit + 1)

		const page = rows.slice(0, limit)
		const hasMore = rows.length > limit

		return {
			entries: page.map(row => ({
				...row,
				outcome: row.outcome as AuditOutcome,
				actorEmail: row.actorEmail ?? null,
			})),
			nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
		}
	}
}
