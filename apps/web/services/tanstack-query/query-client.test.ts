import { describe, expect, it } from "vitest"

import { NON_PERSISTED_QUERY_ROOTS, shouldDehydrateQuery, shouldPersistQuery } from "./query-client"

// WC-1 / F-04: `session` and `rbac` (the full user directory, emails included)
// must never be written to IndexedDB, while offline-first roots like todos must
// still persist or the PWA loses its offline reads.

interface QueryState {
	status: string
	fetchStatus: string
	data: unknown
}

const success: QueryState = { status: "success", fetchStatus: "idle", data: {} }
const pending: QueryState = { status: "pending", fetchStatus: "fetching", data: undefined }

const query = (queryKey: readonly unknown[], state: QueryState = success) => ({ queryKey, state })

// The shape oRPC's tanstack-query utils produce: a nested path segment first.
const orpcKey = (...path: string[]) => [["orpc", ...path], { type: "query" }]

describe("shouldPersistQuery", () => {
	it.each([
		["the session identity", ["session"]],
		["the rbac user directory", ["rbac", "users"]],
		["rbac roles", ["rbac", "roles"]],
		["rbac permissions", ["rbac", "permissions"]],
	])("never persists %s", (_label, key) => {
		expect(shouldPersistQuery(query(key))).toBe(false)
	})

	it("excludes a sensitive root even when it appears inside an oRPC path segment", () => {
		expect(shouldPersistQuery(query(orpcKey("rbac", "users", "list")))).toBe(false)
	})

	it("excludes sensitive queries in every state, not just settled ones", () => {
		expect(shouldPersistQuery(query(["session"], pending))).toBe(false)
		expect(shouldPersistQuery(query(["rbac", "users"], pending))).toBe(false)
	})

	it("still persists offline-first application data", () => {
		expect(shouldPersistQuery(query(orpcKey("example", "todo", "list")))).toBe(true)
		expect(shouldPersistQuery(query(["todos"]))).toBe(true)
	})

	it("keeps persisting pending queries so offline reads survive a reload", () => {
		expect(shouldPersistQuery(query(orpcKey("example", "todo", "list"), pending))).toBe(true)
	})

	it("tolerates an empty or non-string key without persisting by accident", () => {
		expect(shouldPersistQuery(query([]))).toBe(true)
		expect(shouldPersistQuery(query([{ scope: "session" }]))).toBe(true)
	})

	it("lists both sensitive roots the audit called out", () => {
		expect([...NON_PERSISTED_QUERY_ROOTS]).toEqual(["session", "rbac"])
	})
})

describe("shouldDehydrateQuery", () => {
	// SSR dehydration streams to the same client that made the request, so it
	// keeps its existing behaviour — only the persistence path is restricted.
	it("still dehydrates session data for SSR hydration", () => {
		expect(shouldDehydrateQuery(query(["session"]))).toBe(true)
	})
})
