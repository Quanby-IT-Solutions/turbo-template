import {
	ConflictException,
	Injectable,
	type CallHandler,
	type ExecutionContext,
	type NestInterceptor,
} from "@nestjs/common"
import { eq, sql } from "drizzle-orm"
import { firstValueFrom, from, type Observable } from "rxjs"

import { idempotencyKeys } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

/**
 * Idempotency interceptor for write endpoints.
 *
 * Runs AFTER guards (NestJS executes guards before interceptors), so an
 * authenticated session/user is already attached to the request by the time
 * this runs — see RbacGuard for the same resolution shape.
 *
 * Behaviour:
 *   - No `Idempotency-Key` header  → bypass, handle normally.
 *   - No resolvable author id      → bypass (auth guard already rejected, or
 *                                     route is anonymous).
 *   - Stored (key, authorId) row   → return the stored response, skip handler.
 *   - Otherwise                    → run the handler, persist its successful
 *                                     response.
 *
 * Race safety:
 *   Concurrent duplicate requests are serialized with a transaction-scoped
 *   Postgres advisory lock keyed on the idempotency key. The first request to
 *   acquire the lock re-checks for a stored row, runs the handler, persists the
 *   response, and commits — releasing the lock. Any concurrent duplicate blocks
 *   on the lock, then observes the now-stored row and returns it WITHOUT running
 *   the handler a second time. This prevents the pre-idempotency race where two
 *   requests both saw "no row" and both executed the underlying write.
 *
 *   Persistence failures are NOT swallowed: if the idempotency row cannot be
 *   stored, the transaction rolls back and the error propagates, rather than
 *   returning a success response with no replay record (which would let a later
 *   retry duplicate the write).
 *
 * The stored `response` is typed as `unknown`; it is trusted as the original
 * handler output and returned verbatim.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
	async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
		const request = context.switchToHttp().getRequest<{
			headers: Record<string, string | string[] | undefined>
			session?: { user?: { id?: string } }
			user?: { id?: string }
		}>()

		const rawKey = request.headers["idempotency-key"]
		const key = Array.isArray(rawKey) ? rawKey[0] : rawKey

		// No idempotency key → normal handling.
		if (!key) {
			return next.handle()
		}

		// Mirror RbacGuard's resolution: session first, direct user reference as fallback.
		const authorId = request.session?.user?.id ?? request.user?.id

		// No authenticated user → bypass; the auth guard handles rejection.
		if (!authorId) {
			return next.handle()
		}

		return from(
			db.transaction(async tx => {
				// Serialize concurrent duplicates on this key. The lock is held until
				// the transaction commits/rolls back, so a racing duplicate blocks here
				// until the first request has persisted (or failed to persist) its row.
				await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${key}))`)

				// Re-check under the lock: a concurrent duplicate that ran first will
				// have stored its response by now.
				const existing = await tx.select().from(idempotencyKeys).where(eq(idempotencyKeys.key, key))

				if (existing[0]) {
					// Same author → replay the stored response.
					if (existing[0].authorId === authorId) {
						return existing[0].response
					}

					// Different author reusing a globally-unique key → reject before the
					// handler runs. The transaction rolls back cleanly with no side effects.
					throw new ConflictException("Idempotency key already used")
				}

				// First request for this key: run the handler exactly once, then persist
				// its response inside the same transaction. A handler error rejects here
				// and rolls back — nothing is stored, and the client sees the failure.
				const response = await firstValueFrom(next.handle())

				// Insert without conflict handling: under the advisory lock we already
				// confirmed no row exists, so a unique-key conflict here means a durable
				// row we did not validate slipped in concurrently. Let it throw to roll
				// back rather than returning a fresh response with no verified replay row.
				await tx.insert(idempotencyKeys).values({ key, authorId, response: response as unknown })

				return response
			})
		)
	}
}
