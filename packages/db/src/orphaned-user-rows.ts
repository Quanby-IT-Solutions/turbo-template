import { eq, type SQL } from "drizzle-orm"
import type { PgTable } from "drizzle-orm/pg-core"

import { idempotencyKeys, verifications } from "./schema.js"

/**
 * Deletes the rows a user delete leaves behind.
 *
 * Most of a user's data goes with them automatically: `sessions`, `accounts`,
 * `todos` and `user_roles` all declare `onDelete: "cascade"`, and `tickets`
 * and `audit_log` declare `set null` because a support thread and a record of
 * what someone did must outlive the account.
 *
 * Two tables are reachable from a user id but carry **no foreign key**, so the
 * cascade never touches them:
 *
 *   - `verifications` — holds `reset-password:<token>` and
 *     `delete-account-<token>` rows, both of which store the user id in
 *     `value`. (Email-verification tokens are signed JWTs and never become
 *     rows, so `value` is the only link that exists.) Its primary key is
 *     `(identifier, value)`, which is why there is nothing for Postgres to
 *     cascade from.
 *   - `idempotency_keys` — `author_id` is a plain text column by design. It is
 *     a replay cache keyed by identity, not a record owned by a user.
 *
 * Both are swept by expiry, so leaving them is a leak rather than a
 * correctness bug — a live password-reset token for an account that no longer
 * exists, and a replay cache entry nobody can ever replay. Deleting them is
 * what makes "delete my account" mean it.
 *
 * Takes the narrowest structural type that does the job rather than the
 * concrete client, so the call can be asserted without a database.
 */
export interface OrphanedRowsDatabase {
	delete: (table: PgTable) => { where: (condition: SQL) => PromiseLike<unknown> }
}

export async function deleteOrphanedUserRows(
	db: OrphanedRowsDatabase,
	userId: string
): Promise<void> {
	// Order is not significant: neither table references the other, and both
	// are independent of the `users` row itself.
	await db.delete(verifications).where(eq(verifications.value, userId))
	await db.delete(idempotencyKeys).where(eq(idempotencyKeys.authorId, userId))
}
