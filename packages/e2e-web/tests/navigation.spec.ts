import { expect, test } from "@playwright/test"

// A signed-out answer (401 or an empty session) is only available when the API
// is up. With no API, the read fails and protected routes show an error instead
// of the login page. Optional pages stay put.
const sessionService = !!process.env.E2E_AUTH_API_URL

test.describe("protected route guards", () => {
	test("redirects /dashboard to /login when unauthenticated", async ({ page }) => {
		test.skip(!sessionService, "Signed-out redirect needs a session service")
		await page.goto("/dashboard")
		await expect(page).toHaveURL(/\/login/)
	})

	test("shows an error on /dashboard when the session read fails", async ({ page }) => {
		test.skip(sessionService, "Requires the session service to be unreachable")
		await page.goto("/dashboard")
		await expect(page).toHaveURL(/\/dashboard/)
		await expect(page.getByTestId("session-unavailable")).toBeVisible()
	})

	test("redirects /examples/todos to /login when unauthenticated", async ({ page }) => {
		test.skip(!sessionService, "Signed-out redirect needs a session service")
		await page.goto("/examples/todos")
		await expect(page).toHaveURL(/\/login/)
	})

	test("keeps the todos example open when the session read fails", async ({ page }) => {
		test.skip(sessionService, "Requires the session service to be unreachable")
		await page.goto("/examples/todos")
		await expect(page).toHaveURL(/\/examples\/todos/)
		await expect(page.getByText("Todos API Example")).toBeVisible()
	})
})

test.describe("auth page cross-links", () => {
	test("Login CTA on home navigates to /login", async ({ page }) => {
		await page.goto("/")
		await page.getByRole("link", { name: /login/i }).click()
		await expect(page).toHaveURL(/\/login/)
	})

	test("login page Sign up link navigates to /register", async ({ page }) => {
		await page.goto("/login")
		await page.getByRole("link", { name: /sign up/i }).click()
		await expect(page).toHaveURL(/\/register/)
	})

	test("register page Sign in link navigates to /login", async ({ page }) => {
		await page.goto("/register")
		await page.getByRole("link", { name: /sign in/i }).click()
		await expect(page).toHaveURL(/\/login/)
	})
})
