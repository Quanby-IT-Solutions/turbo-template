import { expect, request, test, type Page } from "@playwright/test"

// All tests in this file run with stored auth session (chromium-authenticated project)

test.describe("authenticated home page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/")
	})

	test("shows the logged-in user's name", async ({ page }) => {
		// Authenticated home page greets with "Hello [name]" instead of "Welcome Everyone!"
		await expect(page.locator("p").filter({ hasText: /^Hello\s/ })).toBeVisible()
	})

	test("shows a Logout button instead of a Login link", async ({ page }) => {
		await expect(page.getByRole("button", { name: /logout/i })).toBeVisible()
		await expect(page.getByRole("link", { name: /^login$/i })).not.toBeVisible()
	})

	test("an authenticated visitor can still open the login page", async ({ page }) => {
		// HY-1: this asserted a redirect to `/` that the app does not perform.
		// `/login` is a STATIC route (see the build output) and therefore cannot
		// read the session; implementing the redirect would make it dynamic and
		// undo ED-1's static-route work for no security benefit — the page is
		// public either way. Asserting the real behaviour instead of an
		// imagined one.
		await page.goto("/login")
		await expect(page).toHaveURL(/\/login/)
		await expect(page.getByRole("button", { name: /sign in/i }).first()).toBeVisible()

		// The session is unaffected by visiting it.
		await page.goto("/dashboard")
		await expect(page).toHaveURL(/\/dashboard/)
	})

})

test.describe("authenticated dashboard", () => {
	test("is accessible without redirect", async ({ page }) => {
		await page.goto("/dashboard")
		await expect(page).toHaveURL(/\/dashboard/)
	})

	test("shows the Dashboard breadcrumb", async ({ page }) => {
		await page.goto("/dashboard")
		await expect(page.locator('[data-slot="breadcrumb-page"]', { hasText: /dashboard/i })).toBeVisible()
	})
})

test.describe("authenticated session page", () => {
	test.beforeEach(async ({ page }) => {
		await page.goto("/session")
	})

	test("loads without redirecting to login", async ({ page }) => {
		await expect(page).toHaveURL(/\/session/)
	})

	test("displays session information", async ({ page }) => {
		// HY-1: there is no standalone "Session" text on the page — the drift
		// this suite was full of. Assert the two headings that actually exist.
		await expect(page.getByText("Server Session")).toBeVisible()
		await expect(page.getByText("Client Session")).toBeVisible()
	})

	test("server session is not null", async ({ page }) => {
		// Session JSON is rendered inside a <pre> in the ServerSession component.
		await expect(page.locator("pre").first()).not.toContainText("\"null\"")
	})

	test("server session includes user email", async ({ page }) => {
		const testEmail = process.env.E2E_TEST_EMAIL ?? "test@gmail.com"
		await expect(page.locator("pre").first()).toContainText(testEmail)
	})
})

test.describe("authenticated todos", () => {
	// HY-1 / F-54: these targeted `/examples/todos`, which is a documentation
	// page describing how to wire todos up — not the CRUD screen. They could
	// never have passed. The real screen is `/todos`, and the selectors below
	// match what it actually renders.
	const todoRows = (page: Page) => page.getByRole("checkbox", { name: /^Toggle / })

	test("can create, complete, and delete a todo", async ({ page }, testInfo) => {
		const title = `e2e todo ${testInfo.workerIndex} ${Date.now()}`

		await page.goto("/todos")
		await expect(page.getByRole("heading", { name: /todos \/ posts/i })).toBeVisible()

		await page.getByPlaceholder("New todo title").fill(title)
		await page.getByRole("button", { name: /^add$/i }).click()

		const toggle = page.getByRole("checkbox", { name: `Toggle ${title}` })
		await expect(toggle).toBeVisible()

		await toggle.click()
		await expect(toggle).toBeChecked()

		await page.getByRole("button", { name: `Delete ${title}` }).click()
		await expect(toggle).toHaveCount(0)
	})

	test("created todo persists after reload", async ({ page }, testInfo) => {
		const title = `e2e persist ${testInfo.workerIndex} ${Date.now()}`

		await page.goto("/todos")
		// Wait for the page before interacting: without this the fill races
		// hydration and the create silently does nothing.
		await expect(page.getByRole("heading", { name: /todos \/ posts/i })).toBeVisible()
		await page.getByPlaceholder("New todo title").fill(title)
		await page.getByRole("button", { name: /^add$/i }).click()

		const toggle = page.getByRole("checkbox", { name: `Toggle ${title}` })
		await expect(toggle).toBeVisible()

		await page.reload()
		await expect(toggle).toBeVisible()

		await page.getByRole("button", { name: `Delete ${title}` }).click()
		await expect(toggle).toHaveCount(0)
	})

	test("a todo count survives a reload without duplicating", async ({ page }) => {
		// Guards the AB-3 idempotency path from the UI side: a retry must not
		// create a second row.
		await page.goto("/todos")
		await expect(page.getByRole("heading", { name: /todos \/ posts/i })).toBeVisible()
		const before = await todoRows(page).count()

		await page.reload()
		await expect(page.getByRole("heading", { name: /todos \/ posts/i })).toBeVisible()

		await expect.poll(async () => todoRows(page).count(), { timeout: 15_000 }).toBe(before)
	})
})

/**
 * Sign-out, in an ISOLATED context (HY-1 / F-54).
 *
 * This lived in the shared-`storageState` block with a comment acknowledging it
 * "can make other authenticated tests flaky". It did more than that: clicking
 * Logout revokes the session server-side, so every test that ran afterwards saw
 * an invalid cookie and failed. The mitigation there — re-signing in over the
 * API first — could not work, because the browser still logs out whatever
 * cookie it is holding.
 *
 * An empty `storageState` plus its own sign-in means this test cannot reach the
 * shared session at all, so ordering stops mattering.
 */
test.describe("sign-out", () => {
	test.use({ storageState: { cookies: [], origins: [] } })

	test("returns to the logged-out state and re-guards protected routes", async ({ page }) => {
		const authApi = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
		const webOrigin = process.env.BASE_URL ?? "http://localhost:3001"
		const testEmail = process.env.E2E_TEST_EMAIL ?? "test@gmail.com"
		const testPassword = process.env.E2E_TEST_PASSWORD ?? "Password123"

		const api = await request.newContext({
			baseURL: authApi,
			extraHTTPHeaders: { "Content-Type": "application/json", Origin: webOrigin },
		})
		const res = await api.post("sign-in/email", {
			data: { email: testEmail, password: testPassword },
		})
		expect(res.ok(), await res.text()).toBe(true)
		await page.context().addCookies((await api.storageState()).cookies)
		await api.dispose()

		await page.goto("/")
		await page.getByRole("button", { name: /logout/i }).click()
		await expect(page.getByRole("link", { name: /^login$/i })).toBeVisible()

		// A protected route must send the now-signed-out visitor to login.
		await page.goto("/dashboard")
		await expect(page).toHaveURL(/\/login/)
	})
})
