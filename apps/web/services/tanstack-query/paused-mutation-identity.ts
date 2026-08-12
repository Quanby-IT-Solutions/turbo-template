import type { QueryClient } from "@tanstack/react-query"

import { readCacheIdentity } from "./cache-persistence"

/**
 * Binds offline-queued mutations to the identity that queued them
 * (WC-3 / F-19, Risky Flow RF1).
 *
 * Paused mutations are persisted and replayed on reconnect. Replay used to run
 * under whichever session happened to be active at that moment, so handing a
 * device over — A queues writes offline, B signs in, connectivity returns —
 * fired A's writes as B. The victim is B, who silently performs actions they
 * never took, and A, whose writes land under someone else's name.
 *
 * The stamp is the *hashed* identity WC-1 already derives for the cache
 * bucket, not the raw user id. Reusing it means there is one notion of "who
 * this client is" rather than two that can disagree, and it keeps the raw id
 * out of persisted mutation state on a shared browser profile.
 */

/** Extra field carried on every rehydratable mutation's variables. */
export const IDENTITY_FIELD = "__identity"

export type IdentityStamped = { [IDENTITY_FIELD]?: string }

/** Stamp the current identity onto mutation variables at enqueue time. */
export function stampIdentity<T extends object>(variables: T): T & IdentityStamped {
	return { ...variables, [IDENTITY_FIELD]: readCacheIdentity() }
}

/**
 * Whether a queued mutation belongs to whoever is signed in now.
 *
 * Unstamped mutations are treated as belonging to the current identity: they
 * predate this change, and refusing to replay them would silently discard
 * writes that were queued legitimately before an upgrade.
 */
export function belongsToCurrentIdentity(variables: unknown): boolean {
	if (!variables || typeof variables !== "object") return true

	const stamped = (variables as IdentityStamped)[IDENTITY_FIELD]
	if (!stamped) return true

	return stamped === readCacheIdentity()
}

/**
 * Drop every paused mutation queued by a different identity, then resume the
 * rest. Returns how many were discarded so the caller can tell the user.
 *
 * Removing them before `resumePausedMutations()` is what makes this safe:
 * once resume starts there is no interception point, and a mutation that has
 * begun replaying has already been sent.
 */
export function discardForeignPausedMutations(queryClient: QueryClient): number {
	const cache = queryClient.getMutationCache()
	const foreign = cache
		.getAll()
		.filter(mutation => mutation.state.isPaused)
		.filter(mutation => !belongsToCurrentIdentity(mutation.state.variables))

	for (const mutation of foreign) {
		cache.remove(mutation)
	}

	return foreign.length
}
