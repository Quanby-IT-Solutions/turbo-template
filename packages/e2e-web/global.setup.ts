import { expect, test as setup } from "@playwright/test"

import { ADMIN_AUTH_FILE, AUTH_FILE, USER_B_AUTH_FILE } from "./constants"
import { signInAs, trySignInAs } from "./fixtures"

// A 429 retry waits up to 15s, twice. The default 30s test timeout cannot
// hold that plus the two sign-ins in this file.
setup.setTimeout(90_000)

/**
 * Establishes the shared authenticated session the `chromium-authenticated`
 * project reuses.
 *
 * userA and userB come from `pnpm db:seed:e2e` (pre-verified, no role).
 * Sign-in goes through the shared fixture, which retries a 429 from
 * `x-retry-after` and fails immediately on 401 or 403 EMAIL_NOT_VERIFIED.
 * It does not register an account.
 */
setup("authenticate", async ({ page }) => {
	await signInAs(page, "userA")

	const cookies = await page.context().cookies()
	expect(
		cookies.some(c => c.name === "better-auth.session_token"),
		"sign-in returned no session cookie"
	).toBe(true)

	// Navigate so Next.js validates the session server-side — a cookie the
	// server rejects would otherwise surface as a confusing failure in every
	// authenticated test rather than here.
	await page.goto("/")
	await expect(page.locator("p").filter({ hasText: /^Hello\s/ })).toBeVisible()

	await page.goto("/dashboard")
	await expect(page).toHaveURL(/\/dashboard/)

	// Persist the full browser context (cookies + localStorage) for authenticated tests
	await page.context().storageState({ path: AUTH_FILE })
})

/**
 * The seeded admin's session, for tests whose screen is permission-gated.
 *
 * userA above holds no role, so a create form gated on `posts:create` is
 * correctly hidden from them — tests needing one were waiting on an input RBAC
 * was right to hide. Establishing the admin session once here, rather than
 * signing in inside each such test, keeps the number of auth requests flat:
 * Better Auth rate-limits per path, and a per-test sign-in makes the suite
 * slower and less reliable the more of these tests exist.
 *
 * `trySignInAs`, not `signInAs`: an environment with no seeded admin is a
 * legitimate one to run in. The file is left empty and the specs that need it
 * skip, rather than the whole setup project failing and taking every
 * authenticated test with it.
 */
setup("authenticate as admin", async ({ page }) => {
	const isAdmin = await trySignInAs(page, "admin")

	if (!isAdmin) {
		await page.context().clearCookies()
	}

	await page.context().storageState({ path: ADMIN_AUTH_FILE })
})

/**
 * userB, once. Ownership and sign-out specs need a second ordinary user.
 * Saving the session here keeps those specs off the sign-in endpoint unless
 * they themselves revoke a session.
 */
setup("authenticate as userB", async ({ page }) => {
	await signInAs(page, "userB")
	await page.context().storageState({ path: USER_B_AUTH_FILE })
})
