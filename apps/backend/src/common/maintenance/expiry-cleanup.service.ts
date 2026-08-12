import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { lt } from "drizzle-orm"

import { idempotencyKeys } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

/**
 * Scheduled removal of rows that have outlived their purpose (AB-3 / F-13).
 *
 * The idempotency table is a replay cache, not a record: without a sweeper it
 * grows by one row per mutating request forever, and every row is a response
 * body held indefinitely.
 *
 * Deliberately generic. HY-2 adds an expired-`verifications` sweep (F-40) and
 * should extend {@link sweep} here rather than standing up a second scheduler —
 * one cron, one place to reason about what the app deletes on a timer.
 */
@Injectable()
export class ExpiryCleanupService {
	private readonly logger = new Logger(ExpiryCleanupService.name)

	/**
	 * Hourly rather than daily: the work is a single indexed delete, and a
	 * shorter interval keeps each run small enough that it never competes with
	 * request traffic.
	 */
	@Cron(CronExpression.EVERY_HOUR, { name: "expiry-cleanup" })
	async sweep(): Promise<void> {
		await this.sweepIdempotencyKeys()
	}

	/**
	 * Delete idempotency rows past their expiry.
	 *
	 * Errors are logged, not thrown: this runs on a timer with no caller to
	 * report to, and an unhandled rejection from a cron callback would take the
	 * process down over a cache that will simply be swept on the next tick.
	 */
	async sweepIdempotencyKeys(): Promise<number> {
		try {
			const removed = await db
				.delete(idempotencyKeys)
				.where(lt(idempotencyKeys.expiresAt, new Date()))
				.returning({ key: idempotencyKeys.key })

			if (removed.length) {
				this.logger.log(`Removed ${removed.length} expired idempotency key(s)`)
			}
			return removed.length
		} catch (error) {
			this.logger.error(
				"Failed to sweep expired idempotency keys",
				error instanceof Error ? error.stack : undefined
			)
			return 0
		}
	}
}
