import { expect, test } from "@playwright/test"

test.describe("protected route guards", () => {
	test("redirects /dashboard to /login when unauthenticated", async ({ page }) => {
		await page.goto("/dashboard")
		await expect(page).toHaveURL(/\/login/)
	})

	test("redirects /examples/todos to /login when unauthenticated", async ({ page }) => {
		await page.goto("/examples/todos")
		await expect(page).toHaveURL(/\/login/)
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
