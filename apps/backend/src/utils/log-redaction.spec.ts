import { REDACTED_VALUE, sanitizeLogQuery, sanitizeLogUrl } from "@/utils/log-redaction"

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
