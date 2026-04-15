import { expect, test } from "@playwright/test"

test.describe("login page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/login")
	})

	test("displays the login heading", async ({ page }) => {
		await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible()
	})

	test("has an email input", async ({ page }) => {
		await expect(page.getByLabel(/email/i)).toBeVisible()
	})

	test("has a password input", async ({ page }) => {
		await expect(page.getByLabel("Password", { exact: true })).toBeVisible()
	})

	test("has a login submit button", async ({ page }) => {
		await expect(page.getByRole("button", { name: /^login$/i })).toBeVisible()
	})

	test("has a link to the register page", async ({ page }) => {
		const link = page.getByRole("link", { name: /sign up/i })
		await expect(link).toBeVisible()
		await expect(link).toHaveAttribute("href", "/register")
	})

	test("navigates to register when Sign up is clicked", async ({ page }) => {
		await page.getByRole("link", { name: /sign up/i }).click()
		await expect(page).toHaveURL(/\/register/)
	})

	test("shows an error and stays on /login with invalid credentials", async ({ page }) => {
		test.skip(!process.env.E2E_AUTH_API_URL, "Requires backend")

		await page.getByLabel(/email/i).fill("test@gmail.com")
		await page.getByLabel("Password", { exact: true }).fill("WrongPassword123")
		await page.getByRole("button", { name: /^login$/i }).click()

		await expect(page).toHaveURL(/\/login/)
		// Error banner is a red/destructive block; we assert by its message rather than styling.
		await expect(page.getByText(/failed to sign in|invalid|incorrect|unauthorized/i)).toBeVisible()
	})

	test("blocks submit with invalid email / missing password (native validation)", async ({ page }) => {
		const email = page.getByLabel(/email/i)
		const password = page.getByLabel("Password", { exact: true })

		await email.fill("not-an-email")
		await password.fill("")

		await page.getByRole("button", { name: /^login$/i }).click()
		await expect(page).toHaveURL(/\/login/)

		// Login form uses native constraints (type=email + required). Assert validity states.
		await expect(email.evaluate(el => el.validity.typeMismatch)).resolves.toBe(true)
		await expect(password.evaluate(el => el.validity.valueMissing)).resolves.toBe(true)
	})
})

test.describe("register page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/register")
	})

	test("displays the register heading", async ({ page }) => {
		await expect(page.getByRole("heading", { name: /create an account/i })).toBeVisible()
	})

	test("has a name input", async ({ page }) => {
		await expect(page.getByLabel(/name/i)).toBeVisible()
	})

	test("has an email input", async ({ page }) => {
		await expect(page.getByLabel(/email/i)).toBeVisible()
	})

	test("has a password input", async ({ page }) => {
		await expect(page.getByLabel("Password", { exact: true })).toBeVisible()
	})

	test("has a create account submit button", async ({ page }) => {
		await expect(page.getByRole("button", { name: /create account/i })).toBeVisible()
	})

	test("has a link back to the login page", async ({ page }) => {
		const link = page.getByRole("link", { name: /sign in/i })
		await expect(link).toBeVisible()
		await expect(link).toHaveAttribute("href", "/login")
	})

	test("navigates to login when Sign in is clicked", async ({ page }) => {
		await page.getByRole("link", { name: /sign in/i }).click()
		await expect(page).toHaveURL(/\/login/)
	})
})
