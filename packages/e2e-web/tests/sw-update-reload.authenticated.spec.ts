import { expect, test, type Page } from "@playwright/test"

import { ADMIN_AUTH_FILE } from "../constants"
import { installSessionReadRecovery } from "../fixtures"

test.beforeEach(async ({ page }) => {
	installSessionReadRecovery(page)
})

/**
 * A first visit must not reload when the worker claims.
 *
 * Fresh context per test, so no worker is installed yet. Admin storage is the
 * setup project's session; this test does not sign in again. The accepted
 * update reload is covered by the sw-reload unit tests: Chromium does not
 * expose the service-worker script fetch to Playwright routing.
 */

const mainFrameNavigations = (page: Page) => {
	const urls: string[] = []
	page.on("framenavigated", frame => {
		if (frame === page.mainFrame()) urls.push(frame.url())
	})
	return urls
}

async function indexedDbContains(page: Page, title: string): Promise<boolean> {
	return page.evaluate(async persistedTitle => {
		const databases = await indexedDB.databases()
		for (const { name } of databases) {
			if (!name) continue
			const dump = await new Promise<string>(resolve => {
				const open = indexedDB.open(name)
				open.onerror = () => resolve("")
				open.onsuccess = () => {
					const db = open.result
					const finish = (value: string) => {
						db.close()
						resolve(value)
					}
					const stores = Array.from(db.objectStoreNames)
					if (!stores.length) return finish("")
					const tx = db.transaction(stores, "readonly")
					const all = stores.map(
						store =>
							new Promise<string>(done => {
								const req = tx.objectStore(store).getAll()
								req.onerror = () => done("")
								req.onsuccess = () => done(JSON.stringify(req.result))
							})
					)
					void Promise.all(all).then(parts => finish(parts.join("")))
				}
			})
			if (dump.includes(persistedTitle)) return true
		}
		return false
	}, title)
}

test.describe("service worker first claim", () => {
	test.use({ storageState: ADMIN_AUTH_FILE })

	test("first visit keeps a todo created as soon as the field is usable", async ({ page }) => {
		const loads: string[] = []
		page.on("load", () => {
			loads.push(page.url())
		})
		const navigations = mainFrameNavigations(page)

		await page.goto("/todos")
		const navigationsAfterGoto = navigations.length
		const loadsAfterGoto = loads.length
		const todosUrl = page.url()
		// Stamp the document goto created. A claim reload would replace it and
		// fire another load. A same-document history update can still emit
		// framenavigated for this same URL without doing either.
		await page.evaluate(() => {
			document.documentElement.dataset.e2eDoc = "original"
		})

		await expect(page.getByPlaceholder("New todo title")).toBeVisible({ timeout: 15_000 })

		const title = `first-claim ${Date.now()}`
		await page.getByPlaceholder("New todo title").fill(title)
		await page.getByRole("button", { name: /^add$/i }).click()
		await expect(page.getByRole("checkbox", { name: `Toggle ${title}` })).toBeVisible()

		await expect
			.poll(async () => page.evaluate(() => navigator.serviceWorker?.controller != null), {
				timeout: 10_000,
			})
			.toBe(true)

		const afterGoto = navigations.slice(navigationsAfterGoto)
		expect(afterGoto).toEqual(afterGoto.map(() => todosUrl))
		expect(loads.slice(loadsAfterGoto)).toEqual([])
		expect(await page.evaluate(() => document.documentElement.dataset.e2eDoc)).toBe("original")
		expect(
			await page.evaluate(() => performance.getEntriesByType("navigation")[0]?.type ?? "none")
		).toBe("navigate")
		await expect(page.getByRole("checkbox", { name: `Toggle ${title}` })).toBeVisible()

		await expect.poll(async () => indexedDbContains(page, title), { timeout: 5_000 }).toBe(true)

		await page.reload()
		await expect(page.getByRole("checkbox", { name: `Toggle ${title}` })).toBeVisible()
	})
})
