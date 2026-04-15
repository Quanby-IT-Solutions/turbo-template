import { expect, request, test as setup } from "@playwright/test"

import { AUTH_FILE } from "./constants"

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "test@gmail.com"
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "Password123"
const TEST_NAME = process.env.E2E_TEST_NAME ?? "E2E Test User"

// Backend auth API — trailing slash is required for correct URL resolution with relative paths
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"

// Web app origin — must be in BETTER_AUTH_TRUSTED_ORIGINS
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"

setup("authenticate", async ({ page }) => {
	// ── Call the backend auth API directly — more reliable than form interaction ──
	const api = await request.newContext({
		baseURL: AUTH_API,
		extraHTTPHeaders: {
			"Content-Type": "application/json",
			// Better Auth checks Origin against trustedOrigins for CSRF protection
			"Origin": WEB_ORIGIN,
		},
	})

	// 1. Try sign-in with the test credentials
	let authRes = await api.post("sign-in/email", {
		data: { email: TEST_EMAIL, password: TEST_PASSWORD },
	})

	// 2. If sign-in failed (user doesn't exist yet), register the account first
	if (!authRes.ok()) {
		const signUpRes = await api.post("sign-up/email", {
			data: { email: TEST_EMAIL, password: TEST_PASSWORD, name: TEST_NAME },
		})

		if (!signUpRes.ok()) {
			const body = await signUpRes.text()
			throw new Error(`[e2e setup] Failed to create test account: ${signUpRes.status()} – ${body}`)
		}

		// Sign in after successful registration
		authRes = await api.post("sign-in/email", {
			data: { email: TEST_EMAIL, password: TEST_PASSWORD },
		})

		if (!authRes.ok()) {
			const body = await authRes.text()
			throw new Error(`[e2e setup] Failed to sign in after registration: ${authRes.status()} – ${body}`)
		}
	}

	// ── Transfer auth cookies from API context → browser context ───────────────
	const { cookies } = await api.storageState()

	if (cookies.length === 0) {
		throw new Error("[e2e setup] Sign-in succeeded but no session cookies were returned")
	}

	const hasSessionCookie = cookies.some(c => c.name === "better-auth.session_token")
	expect(hasSessionCookie).toBe(true)

	await page.context().addCookies(cookies)

	// Navigate to the home page so Next.js validates the session server-side
	await page.goto("/")

	await expect(page.locator("p").filter({ hasText: /^Hello\s/ })).toBeVisible()

	await page.goto("/dashboard")
	await expect(page).toHaveURL(/\/dashboard/)

	// Persist the full browser context (cookies + localStorage) for authenticated tests
	await page.context().storageState({ path: AUTH_FILE })
	await api.dispose()
})
