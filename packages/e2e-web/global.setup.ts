import { expect, test as setup } from "@playwright/test"

import { ADMIN_AUTH_FILE, AUTH_FILE } from "./constants"
import { signInAs, trySignInAs } from "./fixtures"

/**
 * Establishes the shared authenticated session the `chromium-authenticated`
 * project reuses.
 *
 * HY-1: sign-in goes through the shared fixture, which registers the account
 * when it does not exist and retries Better Auth's per-path 429. Doing it
 * inline here used to fail the whole authenticated project whenever a serial
 * run made enough sign-ins to trip that limit — one rate-limited request and
 * every authenticated test was reported as broken.
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
