import assert from "node:assert/strict"
import { describe, it } from "node:test"

import { pageShowsFailedSessionRead } from "./session-read-recovery.ts"

describe("pageShowsFailedSessionRead", () => {
	it("repeats when the unavailable screen is showing after a protected navigation", () => {
		assert.equal(
			pageShowsFailedSessionRead({
				requestedPath: "/dashboard",
				landedPath: "/dashboard",
				signal: "limited",
			}),
			true
		)
	})

	it("still repeats when a protected navigation lands on /login", () => {
		assert.equal(
			pageShowsFailedSessionRead({
				requestedPath: "/submit-ticket",
				landedPath: "/login",
				signal: "unknown",
			}),
			true
		)
	})

	it("does not repeat a navigation that asked for /login", () => {
		assert.equal(
			pageShowsFailedSessionRead({
				requestedPath: "/login",
				landedPath: "/login",
				signal: "limited",
			}),
			false
		)
	})

	it("does not repeat when the page is signed in", () => {
		assert.equal(
			pageShowsFailedSessionRead({
				requestedPath: "/todos",
				landedPath: "/todos",
				signal: "in",
			}),
			false
		)
	})
})
