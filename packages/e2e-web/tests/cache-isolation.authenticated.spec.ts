import { expect, request, test, type Page } from "@playwright/test"

/**
 * WC-1 / F-04 — cache isolation on a shared browser profile.
 *
 * This automates the audit's own verification script: sign in as admin, open
 * `/user-management`, sign out, then inspect IndexedDB. Before the fix the
 * persisted TanStack cache held the session identity and the full
 * `["rbac","users"]` email directory under one shared, user-agnostic key for
 * 24h — restorable by whoever used the browser next, and readable from
 * DevTools without authenticating at all.
 *
 * These tests drive their own sign-in rather than inheriting the shared
 * `storageState`, because signing out invalidates that session for every other
 * test in the authenticated project.
 */

const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB_ORIGIN = process.env.BASE_URL ?? "http://localhost:3001"

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "test@gmail.com"
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "Password123"

// The seeded Admin holds `users:read`, so `/user-management` returns the real
// email directory — the exact PII the audit found sitting on disk.
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@turbo-template.local"
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Password123"

// Start each test from a clean, signed-out profile.
test.use({ storageState: { cookies: [], origins: [] } })

/**
 * Sign in through the auth API and move the cookies into the browser context.
 *
 * Better Auth applies its own per-path rate limit to `sign-in/email`, so a
 * suite that authenticates several times can trip a 429 that has nothing to do
 * with what is under test. Retry on 429 only — any other failure is real and
 * is reported verbatim.
 */
async function signIn(
	page: Page,
	email: string,
	password: string
): Promise<{ ok: boolean; detail: string }> {
	let detail = ""

	for (let attempt = 1; attempt <= 3; attempt++) {
		const api = await request.newContext({
			baseURL: AUTH_API,
			extraHTTPHeaders: { "Content-Type": "application/json", "Origin": WEB_ORIGIN },
		})

		const res = await api.post("sign-in/email", { data: { email, password } })

		if (res.ok()) {
			const { cookies } = await api.storageState()
			await page.context().addCookies(cookies)
			await api.dispose()
			return { ok: true, detail: "" }
		}

		const status = res.status()
		detail = `${status} ${await res.text()}`
		await api.dispose()

		if (status !== 429) break
		await page.waitForTimeout(11_000)
	}

	return { ok: false, detail }
}

/** Sign in and fail the test with the server's reason if it doesn't work. */
async function signInOrFail(page: Page, email: string, password: string) {
	const { ok, detail } = await signIn(page, email, password)
	expect(ok, `sign-in for ${email} failed: ${detail}`).toBe(true)
}

/**
 * Dump every value held in every IndexedDB database for this origin.
 *
 * Deliberately reads *all* databases rather than the one key we expect: the
 * claim under test is that nothing sensitive is anywhere on disk, not that one
 * known key happens to be clean.
 */
async function dumpIndexedDb(page: Page): Promise<{ keys: string[]; contents: string }> {
	return page.evaluate(async () => {
		const databases = (await indexedDB.databases?.()) ?? []
		const allKeys: string[] = []
		const chunks: string[] = []

		for (const info of databases) {
			if (!info.name) continue

			const db = await new Promise<IDBDatabase>((resolve, reject) => {
				const openRequest = indexedDB.open(info.name as string)
				openRequest.onsuccess = () => resolve(openRequest.result)
				openRequest.onerror = () => reject(openRequest.error)
			})

			for (const storeName of Array.from(db.objectStoreNames)) {
				const store = db.transaction(storeName, "readonly").objectStore(storeName)

				const storeKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
					const keyRequest = store.getAllKeys()
					keyRequest.onsuccess = () => resolve(keyRequest.result)
					keyRequest.onerror = () => reject(keyRequest.error)
				})

				const values = await new Promise<unknown[]>((resolve, reject) => {
					const valueRequest = store.getAll()
					valueRequest.onsuccess = () => resolve(valueRequest.result)
					valueRequest.onerror = () => reject(valueRequest.error)
				})

				allKeys.push(...storeKeys.filter((key): key is string => typeof key === "string"))
				// The persister stores its snapshot as a JSON *string*. Concatenate
				// the raw values instead of re-stringifying them, or every quote gets
				// escaped and substring assertions silently stop matching anything.
				chunks.push(
					values
						.map(value => (typeof value === "string" ? value : JSON.stringify(value)))
						.join("\n")
				)
			}

			db.close()
		}

		return { keys: allKeys, contents: chunks.join("\n") }
	})
}

const cacheKeys = (keys: string[]) =>
	keys.filter(key => key.startsWith("turbo-template-query-cache"))

/** Wait for the persister to have written at least one snapshot. */
async function waitForPersistedSnapshot(page: Page): Promise<string[]> {
	await expect
		.poll(async () => cacheKeys((await dumpIndexedDb(page)).keys).length, { timeout: 20_000 })
		.toBeGreaterThan(0)

	return cacheKeys((await dumpIndexedDb(page)).keys)
}

/** Load the pages that populate the sensitive query roots and an allowed one. */
async function visitCachePopulatingPages(page: Page, isAdmin: boolean) {
	await page.goto("/dashboard")
	await expect(page).toHaveURL(/\/dashboard/)

	if (isAdmin) {
		await page.goto("/user-management")
		// The directory must actually be on screen — otherwise this test could
		// pass simply because the data never loaded.
		await expect(page.getByText(ADMIN_EMAIL, { exact: false }).first()).toBeVisible()
	}

	await page.goto("/todos")
	await expect(page.getByRole("heading", { name: /todos \/ posts/i })).toBeVisible()
}

test.describe("persisted cache isolation", () => {
	test("never writes the session identity or the email directory to IndexedDB", async ({
		page,
	}) => {
		const { ok: isAdmin, detail } = await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)
		if (!isAdmin) {
			// Fall back to the standard test account: the session-exclusion half of
			// the fix is still provable without the directory.
			// eslint-disable-next-line no-console
			console.warn(`[wc-1] admin sign-in unavailable (${detail}); directory check skipped`)
			await signInOrFail(page, TEST_EMAIL, TEST_PASSWORD)
		}

		const email = isAdmin ? ADMIN_EMAIL : TEST_EMAIL

		await visitCachePopulatingPages(page, isAdmin)
		await waitForPersistedSnapshot(page)

		const { contents } = await dumpIndexedDb(page)

		// The signed-in user's own email must never reach disk...
		expect(contents).not.toContain(email)
		// ...nor any other seeded directory address...
		expect(contents).not.toContain("@turbo-template.local")
		// ...nor the excluded query roots themselves.
		expect(contents).not.toContain('"rbac"')
		expect(contents).not.toContain('"session"')

		// ...while the offline-first roots the PWA depends on are still written.
		// Without this, a fix that simply persisted nothing would pass every
		// assertion above and silently kill offline reads.
		expect(contents).toContain('"todos"')
		// And the snapshot carries the buster + timestamp that bound its lifetime.
		expect(contents).toContain('"buster"')
		expect(contents).toContain('"timestamp"')
	})

	test("writes to an identity-scoped key, never the shared default", async ({ page }) => {
		await signInOrFail(page, TEST_EMAIL, TEST_PASSWORD)
		await visitCachePopulatingPages(page, false)

		const keys = await waitForPersistedSnapshot(page)

		// The pre-fix persister wrote every user's snapshot to this one key.
		expect(keys).not.toContain("REACT_QUERY_OFFLINE_CACHE")
		for (const key of keys) {
			expect(key).toMatch(/^turbo-template-query-cache:.+/)
		}
	})

	test("gives a second user a different cache bucket than the first", async ({ page }) => {
		await signInOrFail(page, TEST_EMAIL, TEST_PASSWORD)
		await visitCachePopulatingPages(page, false)
		const firstUserKeys = await waitForPersistedSnapshot(page)

		// Sign out so the first user's bucket is purged, then hand the browser to
		// the next person — the scenario the audit describes.
		await page.goto("/")
		await page.getByRole("button", { name: /logout/i }).click()
		await expect(page.getByRole("link", { name: /^login$/i })).toBeVisible()

		const { ok: isAdmin } = await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)
		test.skip(!isAdmin, "second account unavailable in this environment")

		await visitCachePopulatingPages(page, true)
		const secondUserKeys = await waitForPersistedSnapshot(page)

		expect(secondUserKeys).not.toEqual([])
		for (const key of secondUserKeys) {
			expect(firstUserKeys).not.toContain(key)
		}
	})

	test("still restores allowed keys from disk when the API is unreachable", async ({ page }) => {
		// The exclusion list must not cost the PWA its offline reads: a fix that
		// simply persisted nothing would satisfy every leak assertion above and
		// quietly break the feature the persister exists for.
		//
		// Only the *API* is cut, not the whole network. Serving the document
		// offline is the service worker's job (WC-2/WC-4) and it is not
		// registered against the dev server, so killing every request would test
		// the SW rather than the persisted cache this ticket owns.
		//
		// The Admin account, because listing todos needs `posts:read`; the plain
		// test account holds no role and would render an empty list either way,
		// which would prove nothing about restore.
		const { ok: isAdmin } = await signIn(page, ADMIN_EMAIL, ADMIN_PASSWORD)
		test.skip(!isAdmin, "admin account unavailable in this environment")

		await visitCachePopulatingPages(page, true)
		await waitForPersistedSnapshot(page)

		const todoRows = page.getByRole("checkbox", { name: /^Toggle / })
		await expect.poll(async () => todoRows.count(), { timeout: 20_000 }).toBeGreaterThan(0)
		const onlineCount = await todoRows.count()

		await page.route("**/example/todos**", route => route.abort("internetdisconnected"))

		try {
			await page.reload()
			await expect(page.getByRole("heading", { name: /todos \/ posts/i })).toBeVisible()

			// These rows cannot have come from the network — the only other source
			// is the IndexedDB snapshot, which is exactly the capability under test.
			await expect
				.poll(async () => todoRows.count(), { timeout: 20_000 })
				.toBeGreaterThanOrEqual(onlineCount)
		} finally {
			await page.unroute("**/example/todos**")
		}
	})

	test("sign-out purges every persisted cache entry from IndexedDB", async ({ page }) => {
		await signInOrFail(page, TEST_EMAIL, TEST_PASSWORD)
		await visitCachePopulatingPages(page, false)
		const signedInKeys = await waitForPersistedSnapshot(page)

		await page.goto("/")
		await page.getByRole("button", { name: /logout/i }).click()
		await expect(page.getByRole("link", { name: /^login$/i })).toBeVisible()

		// The signed-in user's bucket must be gone. Browsing on as an anonymous
		// visitor legitimately creates a fresh anonymous bucket, so assert on the
		// keys that existed while signed in — and on the data, which must be empty.
		await expect
			.poll(
				async () => {
					const keys = cacheKeys((await dumpIndexedDb(page)).keys)
					return signedInKeys.filter(key => keys.includes(key))
				},
				{ timeout: 20_000 }
			)
			.toEqual([])

		const { contents } = await dumpIndexedDb(page)
		expect(contents).not.toContain(TEST_EMAIL)
		expect(contents).not.toContain('"todos"')
	})
})
