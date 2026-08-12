/**
 * AC-5 / F-57 — the auth-path bypass must match on a prefix BOUNDARY.
 *
 * `startsWith("/api/v1/auth")` also matched `/api/v1/authx/...` and
 * `/api/v1/authorize`, so any route whose name merely begins with "auth" was
 * swallowed by the Better Auth handler and never reached Nest.
 */

/** The predicate as implemented in `createAuthMiddleware`. */
function matches(paths: string[], url: string): string | undefined {
	return paths.find(path => {
		if (!url.startsWith(path)) return false
		const next = url.charAt(path.length)
		return next === "" || next === "/" || next === "?"
	})
}

const PATHS = ["/api/v1/auth", "/api/v2/auth"]

describe("auth path bypass", () => {
	it.each([
		"/api/v1/auth",
		"/api/v1/auth/",
		"/api/v1/auth/sign-in/email",
		"/api/v1/auth?foo=bar",
		"/api/v2/auth/get-session",
	])("claims %s", url => {
		expect(matches(PATHS, url)).toBeDefined()
	})

	it.each([
		"/api/v1/authx/steal",
		"/api/v1/authorize",
		"/api/v1/authentication",
		"/api/v1/auth-admin",
		"/api/v1/authz/roles",
	])("does NOT claim %s", url => {
		// These must reach Nest, where their own guards apply. Swallowed by the
		// auth handler, they would answer with whatever Better Auth decides.
		expect(matches(PATHS, url)).toBeUndefined()
	})

	it("leaves unrelated routes alone", () => {
		expect(matches(PATHS, "/api/v1/rbac/users")).toBeUndefined()
		expect(matches(PATHS, "/api/v1/health")).toBeUndefined()
	})
})
