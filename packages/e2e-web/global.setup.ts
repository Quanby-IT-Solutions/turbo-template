import { expect, test as setup } from "@playwright/test"

import { AUTH_FILE } from "./constants"
import { signInAs } from "./fixtures"

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
