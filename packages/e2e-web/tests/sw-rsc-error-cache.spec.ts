import { expect, test, type Page } from "@playwright/test"

import { settleServiceWorker } from "../service-worker"

/**
 * An RSC flight that carries an error row must not be written to the page
 * data caches, and a later offline visit must not render that error screen
 * from the cache. A successful flight is still stored.
 *
 * Runs only when the session service is unreachable. The placeholder cookie
 * is the session cookie this origin reads (`better-auth.session_token` on
 * http; the `__Secure-` prefix is for https).
 */

const SESSION_COOKIE = "better-auth.session_token"

/** Same structural rule as `isFlightErrorPayload`. */
const FLIGHT_ERROR_ROW = /(?:^E\{|(?:^|\n)[0-9a-fA-F]+:E\{)/

/**
 * Console lines this page already emits.
 *
 * The document failure is a 500 and React's minified #441. The connectivity
 * probe does not run when `NEXT_PUBLIC_API_BASE_URL` is unset, which is how
 * this unauthenticated production build is configured, so a `connect-src`
 * block for the health URL is not an expected line.
 */
const KNOWN_PAGE_CONSOLE = /500 \(Internal Server Error\)|Minified React error #441/

function trackWorkerErrors(page: Page): string[] {
	const errors: string[] = []
	page.context().on("serviceworker", worker => {
		worker.on("console", message => {
			if (message.type() === "error") errors.push(message.text())
		})
	})
	return errors
}

async function cachedFlights(page: Page, pathname: string) {
	const worker = page.context().serviceWorkers()[0]
	const target = worker ?? page
	return target.evaluate(
		async ({ pathname: path, source }) => {
			if (!("caches" in self)) return []
			const row = new RegExp(source)
			const hits: { cache: string; url: string; status: number; error: boolean; length: number }[] =
				[]
			for (const name of await caches.keys()) {
				const cache = await caches.open(name)
				for (const request of await cache.keys()) {
					if (new URL(request.url).pathname !== path) continue
					const stored = await cache.match(request)
					if (!stored) continue
					const text = await stored.text()
					hits.push({
						cache: name,
						url: request.url,
						status: stored.status,
						error: row.test(text),
						length: text.length,
					})
				}
			}
			return hits
		},
		{ pathname, source: FLIGHT_ERROR_ROW.source }
	)
}

test.describe("page data cache", () => {
	test("does not store an error flight for a protected page", async ({ page }) => {
		test.skip(!!process.env.E2E_AUTH_API_URL, "Requires the session service to be unreachable")

		const workerErrors = trackWorkerErrors(page)
		const pageErrors: string[] = []
		page.on("console", message => {
			if (message.type() === "error") pageErrors.push(message.text())
		})
		page.on("pageerror", error => {
			pageErrors.push(error instanceof Error ? error.message : String(error))
		})

		await page.goto("/")
		await settleServiceWorker(page)
		await expect
			.poll(() => page.evaluate(() => navigator.serviceWorker.controller != null))
			.toBe(true)

		const origin = new URL(page.url()).origin
		await page
			.context()
			.addCookies([{ name: SESSION_COOKIE, value: "placeholder-session", url: origin }])

		const document = await page.goto("/dashboard")
		await expect(page.getByTestId("session-unavailable")).toBeVisible()
		expect(document?.status()).toBe(500)

		const started = Date.now()
		const refresh = page.waitForResponse(
			response =>
				new URL(response.url()).pathname === "/dashboard" &&
				response.url().includes("_rsc") &&
				response.request().headers()["rsc"] === "1" &&
				response.request().headers()["next-router-prefetch"] !== "1"
		)
		await page.getByRole("button", { name: "Try again" }).click()
		const response = await refresh
		await expect(page.getByTestId("session-unavailable")).toBeVisible()
		expect(Date.now() - started).toBeLessThan(5_000)
		expect(response.status()).toBe(200)

		// The cache write is scheduled after the response. Give it time to land
		// so an error row cannot hide behind a race.
		await page.waitForTimeout(1_500)
		const stored = await cachedFlights(page, "/dashboard")
		expect(stored.filter(entry => entry.error)).toEqual([])
		expect(workerErrors).toEqual([])
		for (const line of pageErrors) {
			expect(line).toMatch(KNOWN_PAGE_CONSOLE)
		}
	})

	test("does not serve a stored error screen on an offline return", async ({ page }) => {
		test.skip(!!process.env.E2E_AUTH_API_URL, "Requires the session service to be unreachable")

		const workerErrors = trackWorkerErrors(page)

		await page.goto("/")
		await settleServiceWorker(page)
		const origin = new URL(page.url()).origin
		await page
			.context()
			.addCookies([{ name: SESSION_COOKIE, value: "placeholder-session", url: origin }])

		await page.getByRole("link", { name: "Dashboard" }).click()
		await expect(page.getByTestId("session-unavailable")).toBeVisible()
		// The cache write is scheduled after the response. Wait before leaving
		// so a stored error row cannot be missed.
		await page.waitForTimeout(1_500)
		await page.goto("/")
		await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible()

		await page.context().setOffline(true)
		await page.getByRole("link", { name: "Dashboard" }).click()
		// A matching cached flight paints the error screen after the click.
		// Wait for that paint before asserting it did not happen. The home
		// document must still be the one on screen: a failed full navigation
		// would leave it blank, and that is not this result.
		await page.waitForTimeout(2_000)
		await expect(page.getByTestId("session-unavailable")).toHaveCount(0)
		await expect(page.getByRole("heading", { name: "TURBO TEMPLATE." })).toBeVisible()
		await expect(page).toHaveURL(/\/$/)

		const stored = await cachedFlights(page, "/dashboard")
		expect(stored.filter(entry => entry.error)).toEqual([])
		expect(workerErrors).toEqual([])
	})

	test("still stores a successful page flight", async ({ page }) => {
		test.skip(!!process.env.E2E_AUTH_API_URL, "Requires the session service to be unreachable")

		const workerErrors = trackWorkerErrors(page)

		await page.goto("/")
		await settleServiceWorker(page)
		await page.getByRole("link", { name: "Session" }).click()
		await expect(page.getByText("Server Session")).toBeVisible()

		await expect
			.poll(async () => {
				const stored = await cachedFlights(page, "/session")
				return stored.some(
					entry =>
						entry.cache === "pages-rsc" && entry.status === 200 && !entry.error && entry.length > 0
				)
			})
			.toBe(true)

		expect(workerErrors).toEqual([])
	})
})
