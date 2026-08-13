import { describe, expect, it } from "vitest"

import { REDACTED_VALUE } from "@repo/observability"

import { scrubSentryBreadcrumb } from "./sentry-config"

// AB-1 / F-05: the OAuth callback breadcrumb records the query the SDK already
// parsed off the URL. `state` and `code` are credentials *as query parameters*,
// so the structured field deny-list never sees them — only the query-parameter
// list does.

describe("scrubSentryBreadcrumb", () => {
	it("redacts credential query parameters in a parsed `query` object", () => {
		const scrubbed = scrubSentryBreadcrumb({
			category: "navigation",
			data: { query: { state: "csrf-state", code: "oauth-code", foo: "bar" } },
		})

		expect(scrubbed.data?.query).toEqual({
			state: REDACTED_VALUE,
			code: REDACTED_VALUE,
			foo: "bar",
		})
	})

	it("redacts credential query parameters in a `query_string` string", () => {
		const scrubbed = scrubSentryBreadcrumb({
			category: "fetch",
			data: { query_string: "state=csrf-state&foo=bar" },
		})

		expect(scrubbed.data?.query_string).toBe(`state=${REDACTED_VALUE}&foo=bar`)
	})

	it("redacts credential query parameters in a `params` pair array", () => {
		const scrubbed = scrubSentryBreadcrumb({
			category: "fetch",
			data: {
				params: [
					["state", "csrf-state"],
					["foo", "bar"],
				],
			},
		})

		expect(scrubbed.data?.params).toEqual([
			["state", REDACTED_VALUE],
			["foo", "bar"],
		])
	})

	it("redacts credential query parameters under the dotted `http.query` key", () => {
		const scrubbed = scrubSentryBreadcrumb({
			category: "http",
			data: { "http.query": { access_token: "at", page: "2" } },
		})

		expect(scrubbed.data?.["http.query"]).toEqual({ access_token: REDACTED_VALUE, page: "2" })
	})

	it("leaves a breadcrumb whose data carries no query untouched", () => {
		const scrubbed = scrubSentryBreadcrumb({
			category: "ui.click",
			data: { target: "button#submit" },
		})

		expect(scrubbed.data).toEqual({ target: "button#submit" })
	})

	// Regressions guards for the two paths that already worked before the
	// query-key pass was added.
	it("still redacts deny-listed structured fields", () => {
		const scrubbed = scrubSentryBreadcrumb({
			category: "console",
			data: { password: "hunter2", email: "a@b.test", keep: "visible" },
		})

		expect(scrubbed.data).toEqual({
			password: REDACTED_VALUE,
			email: REDACTED_VALUE,
			keep: "visible",
		})
	})

	it("still sanitizes a URL string field", () => {
		const scrubbed = scrubSentryBreadcrumb({
			category: "navigation",
			data: { url: "/api/v1/auth/verify-email?token=abc123&next=/dashboard" },
		})

		expect(scrubbed.data?.url).toBe(
			`/api/v1/auth/verify-email?token=${REDACTED_VALUE}&next=/dashboard`
		)
	})

	it("returns a breadcrumb with no data unchanged", () => {
		const breadcrumb = { category: "navigation", message: "route change" }

		expect(scrubSentryBreadcrumb(breadcrumb)).toBe(breadcrumb)
	})
})
