import { describe, expect, it } from "vitest"

import manifest from "./redaction-manifest.json"
import {
	PINO_REDACT_PATHS,
	REDACTED_FIELD_NAMES,
	REDACTED_VALUE,
	sanitizeLogQuery,
	sanitizeLogUrl,
} from "./redaction.js"

// LG-1 / F-05: verification and password-reset links are `?token=…` URLs, and
// every request log line carries `req.url`. Pino's `redact` cannot reach the
// query string, so the value has to be stripped before it is ever emitted.

describe("sanitizeLogUrl", () => {
	it("strips the token from a verification link", () => {
		expect(sanitizeLogUrl("/api/v1/auth/verify-email?token=abc123secret")).toBe(
			`/api/v1/auth/verify-email?token=${REDACTED_VALUE}`
		)
	})

	it("strips the token from a password-reset link", () => {
		expect(sanitizeLogUrl("/reset-password?token=live-reset-token")).toBe(
			`/reset-password?token=${REDACTED_VALUE}`
		)
	})

	it.each([
		["code", "/cb?code=oauth-code"],
		["secret", "/x?secret=shh"],
		["password", "/x?password=hunter2"],
		["access_token", "/x?access_token=at"],
		["refresh_token", "/x?refresh_token=rt"],
		["id_token", "/x?id_token=it"],
		["state", "/cb?state=csrf-state"],
	])("strips %s", (name, url) => {
		const sanitized = sanitizeLogUrl(url)
		expect(sanitized).toContain(`${name}=${REDACTED_VALUE}`)
		expect(sanitized).not.toMatch(/=(oauth-code|shh|hunter2|at|rt|it|csrf-state)/)
	})

	it("matches parameter names case-insensitively", () => {
		expect(sanitizeLogUrl("/x?TOKEN=abc")).toBe(`/x?TOKEN=${REDACTED_VALUE}`)
	})

	it("keeps every non-sensitive parameter byte-for-byte", () => {
		// Re-encoding would make logged URLs stop matching what the client sent,
		// which is why the query is hand-parsed rather than run through
		// URLSearchParams.
		expect(sanitizeLogUrl("/search?q=a%20b&page=2&sort=-created%2Bid")).toBe(
			"/search?q=a%20b&page=2&sort=-created%2Bid"
		)
	})

	it("strips only the sensitive parameter in a mixed query", () => {
		expect(sanitizeLogUrl("/verify?redirect=/dashboard&token=abc&lang=en")).toBe(
			`/verify?redirect=/dashboard&token=${REDACTED_VALUE}&lang=en`
		)
	})

	it("redacts a repeated sensitive parameter every time", () => {
		expect(sanitizeLogUrl("/x?token=a&token=b")).toBe(
			`/x?token=${REDACTED_VALUE}&token=${REDACTED_VALUE}`
		)
	})

	it("redacts a valueless sensitive parameter rather than passing it through", () => {
		expect(sanitizeLogUrl("/x?token")).toBe(`/x?token=${REDACTED_VALUE}`)
	})

	it("handles a percent-encoded parameter name", () => {
		expect(sanitizeLogUrl("/x?%74oken=abc")).toBe(`/x?%74oken=${REDACTED_VALUE}`)
	})

	it("does not choke on a malformed escape sequence", () => {
		expect(() => sanitizeLogUrl("/x?%E0%A4%A=1&token=abc")).not.toThrow()
		expect(sanitizeLogUrl("/x?%E0%A4%A=1&token=abc")).toContain(`token=${REDACTED_VALUE}`)
	})

	it("leaves a URL without a query string untouched", () => {
		expect(sanitizeLogUrl("/api/v1/health")).toBe("/api/v1/health")
	})

	it("passes undefined through", () => {
		expect(sanitizeLogUrl(undefined)).toBeUndefined()
	})

	it("works on an absolute URL", () => {
		expect(sanitizeLogUrl("https://app.example.com/verify?token=abc")).toBe(
			`https://app.example.com/verify?token=${REDACTED_VALUE}`
		)
	})

	it("does not redact a parameter that merely contains a sensitive name", () => {
		// `tokenCount` is not a credential; over-redacting would hide useful
		// diagnostics for no security gain.
		expect(sanitizeLogUrl("/x?tokenCount=3")).toBe("/x?tokenCount=3")
	})

	it("keeps callbackURL readable", () => {
		// A redirect path, not a credential — worth keeping for tracing.
		expect(sanitizeLogUrl("/verify?callbackURL=/dashboard")).toBe("/verify?callbackURL=/dashboard")
	})
})

describe("sanitizeLogQuery", () => {
	// pino-http serializes `req.query` as its own field, so a URL-only fix
	// leaves the token parsed into a tidy object right beside the stripped URL.
	it("redacts a token in the parsed query object", () => {
		expect(sanitizeLogQuery({ token: "abc123" })).toEqual({ token: REDACTED_VALUE })
	})

	it("leaves non-sensitive parameters untouched", () => {
		expect(sanitizeLogQuery({ page: "2", callbackURL: "/dashboard" })).toEqual({
			page: "2",
			callbackURL: "/dashboard",
		})
	})

	it("redacts only the sensitive key in a mixed query", () => {
		expect(sanitizeLogQuery({ token: "abc", lang: "en" })).toEqual({
			token: REDACTED_VALUE,
			lang: "en",
		})
	})

	it("matches keys case-insensitively", () => {
		expect(sanitizeLogQuery({ Token: "abc" })).toEqual({ Token: REDACTED_VALUE })
	})

	it("redacts a repeated parameter parsed as an array", () => {
		expect(sanitizeLogQuery({ token: ["a", "b"] })).toEqual({ token: REDACTED_VALUE })
	})

	it.each([[{}], [undefined], [null]])("passes %p through unchanged", value => {
		expect(sanitizeLogQuery(value)).toEqual(value)
	})
})

describe("REDACTED_FIELD_NAMES", () => {
	// The manifest is what non-TypeScript clients read. A TS-side edit that does
	// not land in the JSON leaves those clients logging a credential, so the two
	// are pinned to each other here rather than by convention.
	it("matches the committed JSON manifest exactly, in order", () => {
		expect([...REDACTED_FIELD_NAMES]).toEqual(manifest.fieldNames)
	})
})

describe("PINO_REDACT_PATHS", () => {
	// The backend logger and the client-side scrubbers must never cover different
	// field sets: one of them silently keeping a credential is the whole failure
	// this package exists to prevent. The paths are derived from the same
	// canonical deny-list as `REDACTED_FIELD_NAMES`, and this suite pins the
	// expansion so a wrong placement fails here instead of leaking.
	it("expands the deny-list into exactly the paths pino must scrub", () => {
		expect([...PINO_REDACT_PATHS]).toEqual([
			"req.headers.authorization",
			"req.headers.cookie",
			"res.headers['set-cookie']",
			"req.body.password",
			"req.body.*.password",
			"req.body.token",
			"req.body.*.token",
			"req.body.newPassword",
			"req.body.*.newPassword",
			"req.body.currentPassword",
			"req.body.*.currentPassword",
			"req.body.email",
			"req.body.*.email",
		])
	})

	it("covers every semantic name on the deny-list", () => {
		for (const name of REDACTED_FIELD_NAMES) {
			const covered = PINO_REDACT_PATHS.some(
				path => path.endsWith(`.${name}`) || path.endsWith(`['${name}']`)
			)
			expect(covered, `${name} has no pino path`).toBe(true)
		}
	})

	it("scrubs no name that is absent from the deny-list", () => {
		const names = new Set<string>(REDACTED_FIELD_NAMES)
		for (const path of PINO_REDACT_PATHS) {
			const leaf = path.replace(/^.*[.[]'?/, "").replace(/'?\]$/, "")
			expect(names.has(leaf), `${path} scrubs a name outside the deny-list`).toBe(true)
		}
	})

	it("scrubs every body field at the top level and one level of nesting", () => {
		const bodyPaths = PINO_REDACT_PATHS.filter(path => path.startsWith("req.body."))
		for (const path of bodyPaths) {
			if (path.startsWith("req.body.*.")) continue
			expect(PINO_REDACT_PATHS).toContain(path.replace("req.body.", "req.body.*."))
		}
	})

	it("bracket-quotes a name a dotted path cannot express", () => {
		// `res.headers.set-cookie` is not a path pino can parse.
		expect(PINO_REDACT_PATHS).toContain("res.headers['set-cookie']")
		expect(PINO_REDACT_PATHS).not.toContain("res.headers.set-cookie")
	})
})
