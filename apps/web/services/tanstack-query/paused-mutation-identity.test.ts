import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it } from "vitest"

import { writeCacheIdentity } from "./cache-persistence"
import {
	belongsToCurrentIdentity,
	discardForeignPausedMutations,
	IDENTITY_FIELD,
	stampIdentity,
} from "./paused-mutation-identity"

// WC-3 / F-19 (RF1). Offline-queued mutations are persisted and replayed on
// reconnect. Replay used to run under whichever session was active at that
// moment, so a device handover fired user A's queued writes as user B.

beforeEach(() => {
	window.localStorage.clear()
})

/** Register a paused mutation carrying `variables` on a real QueryClient. */
function pausedMutation(client: QueryClient, variables: object) {
	const cache = client.getMutationCache()
	const mutation = cache.build(client, { mutationKey: ["todos", "create"] })
	// Drive the real state machine into the paused shape the persister stores.
	mutation.state = { ...mutation.state, isPaused: true, variables } as typeof mutation.state
	return mutation
}

describe("stampIdentity", () => {
	it("records who queued the mutation", () => {
		writeCacheIdentity("user-a")
		const vars = stampIdentity({ title: "queued offline" })

		expect(vars[IDENTITY_FIELD]).toBeTruthy()
		expect(vars.title).toBe("queued offline")
	})

	it("stamps the hashed identity, never the raw user id", () => {
		// Reuses WC-1's cache identity so there is one notion of "who this
		// client is", and keeps the raw id out of persisted mutation state.
		writeCacheIdentity("seed-user-admin")
		const vars = stampIdentity({ title: "x" })

		expect(vars[IDENTITY_FIELD]).not.toBe("seed-user-admin")
		expect(vars[IDENTITY_FIELD]).not.toContain("seed-user-admin")
	})

	it("gives two users different stamps", () => {
		writeCacheIdentity("user-a")
		const a = stampIdentity({ title: "x" })[IDENTITY_FIELD]
		writeCacheIdentity("user-b")
		const b = stampIdentity({ title: "x" })[IDENTITY_FIELD]

		expect(a).not.toBe(b)
	})
})

describe("belongsToCurrentIdentity", () => {
	it("accepts a mutation queued by the current user", () => {
		writeCacheIdentity("user-a")
		const vars = stampIdentity({ title: "x" })

		expect(belongsToCurrentIdentity(vars)).toBe(true)
	})

	it("rejects a mutation queued by someone else", () => {
		writeCacheIdentity("user-a")
		const vars = stampIdentity({ title: "x" })
		writeCacheIdentity("user-b")

		expect(belongsToCurrentIdentity(vars)).toBe(false)
	})

	it("rejects a signed-in user's mutation once signed out", () => {
		writeCacheIdentity("user-a")
		const vars = stampIdentity({ title: "x" })
		writeCacheIdentity(null)

		expect(belongsToCurrentIdentity(vars)).toBe(false)
	})

	it("accepts unstamped mutations queued before this change shipped", () => {
		// Refusing them would silently discard writes queued legitimately
		// before the upgrade.
		expect(belongsToCurrentIdentity({ title: "legacy" })).toBe(true)
	})
})

describe("discardForeignPausedMutations", () => {
	it("removes another identity's queued writes and reports the count", () => {
		const client = new QueryClient()
		writeCacheIdentity("user-a")
		pausedMutation(client, stampIdentity({ title: "A queued this" }))
		pausedMutation(client, stampIdentity({ title: "A queued this too" }))

		// Device handover: B signs in before connectivity returns.
		writeCacheIdentity("user-b")

		expect(discardForeignPausedMutations(client)).toBe(2)
		expect(client.getMutationCache().getAll()).toHaveLength(0)
	})

	it("keeps the current identity's queued writes", () => {
		const client = new QueryClient()
		writeCacheIdentity("user-a")
		pausedMutation(client, stampIdentity({ title: "A queued this" }))

		expect(discardForeignPausedMutations(client)).toBe(0)
		expect(client.getMutationCache().getAll()).toHaveLength(1)
	})

	it("discards only the foreign ones when both are queued", () => {
		const client = new QueryClient()
		writeCacheIdentity("user-a")
		pausedMutation(client, stampIdentity({ title: "A's" }))
		writeCacheIdentity("user-b")
		pausedMutation(client, stampIdentity({ title: "B's" }))

		// B is signed in: A's goes, B's stays.
		expect(discardForeignPausedMutations(client)).toBe(1)
		const remaining = client.getMutationCache().getAll()
		expect(remaining).toHaveLength(1)
		expect((remaining[0]!.state.variables as { title: string }).title).toBe("B's")
	})

	it("leaves non-paused mutations alone", () => {
		// Only the offline queue is in scope; an in-flight mutation belongs to
		// the session that is running right now.
		const client = new QueryClient()
		writeCacheIdentity("user-a")
		const m = pausedMutation(client, stampIdentity({ title: "in flight" }))
		m.state = { ...m.state, isPaused: false } as typeof m.state
		writeCacheIdentity("user-b")

		expect(discardForeignPausedMutations(client)).toBe(0)
	})
})

describe("sign-out clears the queue with the rest of client state", () => {
	it("queryClient.clear() empties the mutation cache too", () => {
		// WC-1's sign-out purge calls clear(); this asserts the paused queue is
		// covered by it rather than surviving into the next session.
		const client = new QueryClient()
		writeCacheIdentity("user-a")
		pausedMutation(client, stampIdentity({ title: "queued" }))
		expect(client.getMutationCache().getAll()).toHaveLength(1)

		client.clear()

		expect(client.getMutationCache().getAll()).toHaveLength(0)
	})
})
