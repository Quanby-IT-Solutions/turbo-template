import { expect, test } from "@playwright/test"

test.describe("home page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/")
	})

	test("displays the main heading", async ({ page }) => {
		await expect(page.getByRole("heading", { level: 1 })).toContainText(/turbo template/i)
	})

	test("shows welcome message for unauthenticated users", async ({ page }) => {
		await expect(page.getByText(/welcome/i)).toBeVisible()
		await expect(page.getByText(/everyone/i)).toBeVisible()
	})

	test("shows the product description", async ({ page }) => {
		await expect(page.getByText(/full-stack monorepo template/i)).toBeVisible()
	})

	test("shows a Login CTA button linking to /login when logged out", async ({ page }) => {
		const cta = page.getByRole("link", { name: /login/i })
		await expect(cta).toBeVisible()
		await expect(cta).toHaveAttribute("href", "/login")
	})
})
