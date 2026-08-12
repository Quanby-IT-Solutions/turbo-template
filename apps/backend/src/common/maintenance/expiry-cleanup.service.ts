import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import { lt } from "drizzle-orm"

import { idempotencyKeys, verifications } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

/**
 * Scheduled removal of rows that have outlived their purpose (AB-3 / F-13).
 *
 * The idempotency table is a replay cache, not a record: without a sweeper it
 * grows by one row per mutating request forever, and every row is a response
 * body held indefinitely.
 *
 * Deliberately generic. HY-2 added the expired-`verifications` sweep (F-40)
 * here rather than standing up a second scheduler — one cron, one place to
 * reason about what the app deletes on a timer.
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
		// `allSettled`, not sequential awaits: both halves already catch their own
		// errors, but this is a cron callback with no caller to report to, so an
		// unexpected throw from either must not become an unhandled rejection that
		// takes the process down — nor stop the other table from being swept.
		await Promise.allSettled([this.sweepIdempotencyKeys(), this.sweepVerifications()])
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

	/**
	 * Delete verification tokens past their expiry (HY-2 / F-40).
	 *
	 * Better Auth writes a row here for every email verification and password
	 * reset and never removes them, so the table grew without bound — each row an
	 * expired token bound to an email address, retained indefinitely for no
	 * purpose. Deleting them is both a size fix and a data-minimisation one.
	 *
	 * Expired rows only. An unexpired token is still in flight and deleting it
	 * would break a verification link a user is about to click.
	 */
	async sweepVerifications(): Promise<number> {
		try {
			const removed = await db
				.delete(verifications)
				.where(lt(verifications.expiresAt, new Date()))
				.returning({ identifier: verifications.identifier })

			if (removed.length) {
				// The count only. The identifier is the user's email address and the
				// value is a live-until-expiry token; neither belongs in a log line.
				this.logger.log(`Removed ${removed.length} expired verification(s)`)
			}
			return removed.length
		} catch (error) {
			this.logger.error(
				"Failed to sweep expired verifications",
				error instanceof Error ? error.stack : undefined
			)
			return 0
		}
	}
}
