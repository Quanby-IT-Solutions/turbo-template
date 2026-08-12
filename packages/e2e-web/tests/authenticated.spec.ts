import { expect, test, type Page } from "@playwright/test"

import { ADMIN_AUTH_FILE } from "../constants"
import { signInAs } from "../fixtures"

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
		// The submit button reads "Login" (and "Signing in..." while pending) —
		// `/sign in/i` matched neither, so this never passed. auth.spec.ts already
		// targets the real control; same selector here.
		await expect(page.getByRole("button", { name: /^login$/i })).toBeVisible()

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
		await expect(
			page.locator('[data-slot="breadcrumb-page"]', { hasText: /dashboard/i })
		).toBeVisible()
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
		await expect(page.locator("pre").first()).not.toContainText('"null"')
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

	// The project-wide session belongs to userA, who holds no role, and the create
	// form is permission-gated: todos-view renders the "New todo title"
	// placeholder only when the viewer holds `posts:create`, and "You lack
	// posts:create" otherwise. These tests were waiting 30s for an input RBAC was
	// correctly hiding — the gate working, not a bug in the page.
	//
	// The admin session comes from the setup project, so this costs no extra
	// sign-in per test. Better Auth rate-limits per path, and re-authenticating
	// in each test made consecutive todo tests fail once that budget ran out.
	test.use({ storageState: ADMIN_AUTH_FILE })

	/**
	 * Open /todos and confirm this identity may create, skipping where no admin
	 * is seeded to hold the permission.
	 *
	 * Leaves the page on /todos deliberately: navigating here and again in the
	 * test raced the first render, and the second `goto` could cut it off before
	 * the heading appeared. One navigation per test, and the heading assertion
	 * below is the hydration barrier.
	 */
	const openTodosWithCreatePermission = async (page: Page) => {
		await page.goto("/todos")
		await expect(page.getByRole("heading", { name: /todos \/ posts/i })).toBeVisible()

		const canCreate = await page
			.getByPlaceholder("New todo title")
			.isVisible()
			.catch(() => false)
		test.skip(!canCreate, "creating todos needs posts:create; no admin in this environment")
	}

	test("can create, complete, and delete a todo", async ({ page }, testInfo) => {
		await openTodosWithCreatePermission(page)

		const title = `e2e todo ${testInfo.workerIndex} ${Date.now()}`

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
		// Also the hydration barrier: without waiting for the page the fill races
		// hydration and the create silently does nothing.
		await openTodosWithCreatePermission(page)

		const title = `e2e persist ${testInfo.workerIndex} ${Date.now()}`

		await page.getByPlaceholder("New todo title").fill(title)
		await page.getByRole("button", { name: /^add$/i }).click()

		const toggle = page.getByRole("checkbox", { name: `Toggle ${title}` })
		await expect(toggle).toBeVisible()

		// Reloading the instant the row appears raced WC-1's persister. It writes
		// on a throttle, so the snapshot on disk could still predate this todo;
		// after the reload TanStack hydrates that older list and, being inside its
		// 30s staleTime, does not refetch — so the row was legitimately absent and
		// the assertion below failed on a cache that was merely behind.
		//
		// Waiting for the snapshot to actually contain the title states the real
		// precondition ("it was persisted") instead of guessing at a delay, and
		// keeps the assertion about what the test is named for: that a reload
		// brings it back.
		await expect
			.poll(
				async () =>
					page.evaluate(async persistedTitle => {
						const databases = await indexedDB.databases()
						for (const { name } of databases) {
							if (!name) continue
							const dump = await new Promise<string>(resolve => {
								const open = indexedDB.open(name)
								open.onerror = () => resolve("")
								open.onsuccess = () => {
									const db = open.result
									const stores = Array.from(db.objectStoreNames)
									if (!stores.length) return resolve("")
									const tx = db.transaction(stores, "readonly")
									const all = stores.map(
										store =>
											new Promise<string>(done => {
												const req = tx.objectStore(store).getAll()
												req.onerror = () => done("")
												req.onsuccess = () => done(JSON.stringify(req.result))
											})
									)
									void Promise.all(all).then(parts => resolve(parts.join("")))
								}
							})
							if (dump.includes(persistedTitle)) return true
						}
						return false
					}, title),
				{ timeout: 15_000 }
			)
			.toBe(true)

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
		// HY-1: the shared fixture, so this sign-in gets the same 429 retry as
		// every other. Better Auth rate-limits `sign-in/email` per path, and a
		// full serial run makes enough sign-ins to trip it — which used to fail
		// this test for a reason unrelated to sign-out.
		await signInAs(page, "userB")

		await page.goto("/")
		await page.getByRole("button", { name: /logout/i }).click()
		await expect(page.getByRole("link", { name: /^login$/i })).toBeVisible()

		// A protected route must send the now-signed-out visitor to login.
		await page.goto("/dashboard")
		await expect(page).toHaveURL(/\/login/)
	})
})
