import { expect, test, type Page } from "@playwright/test"

/**
 * WC-2 / F-20 + F-48 — the service worker must not cache token URLs, and must
 * not fake authenticated pages offline.
 *
 * Runs unauthenticated on purpose: the reset and verification links are hit by
 * someone who is signed OUT, which is exactly the flow that leaked. Requires a
 * production build, since Serwist only registers the SW there.
 */

const RESET_TOKEN = "wc2-reset-token-abc123"
const VERIFY_TOKEN = "wc2-verify-token-def456"

/** Wait for the service worker to control the page, or report that it never did. */
async function serviceWorkerReady(page: Page): Promise<boolean> {
	// `serviceWorker.ready` never rejects — it simply never settles when no
	// worker takes control, which hangs the whole test instead of reporting a
	// skip. Race it against a deadline so the answer is always "yes" or "no".
	//
	// `ready` alone is NOT enough. It resolves once a worker is *activated*,
	// which on a first visit happens before `clientsClaim` has actually claimed
	// this page: `navigator.serviceWorker.controller` is still null. Navigating
	// in that window races the claim, and Chrome aborts the in-flight navigation
	// (`net::ERR_ABORTED`) when the worker takes over mid-request. CI hits this
	// every run, since each run installs the worker for the first time.
	//
	// Waiting for `controller` is also what makes the assertions mean anything:
	// an uncontrolled page never reaches the service worker, so its caches would
	// be empty for reasons that have nothing to do with WC-2.
	return page.evaluate(async () => {
		if (!("serviceWorker" in navigator)) return false

		const controlled = navigator.serviceWorker.ready.then(async () => {
			if (navigator.serviceWorker.controller) return true
			await new Promise<void>(resolve =>
				navigator.serviceWorker.addEventListener("controllerchange", () => resolve(), {
					once: true,
				})
			)
			return true
		})
		const timeout = new Promise<boolean>(resolve => setTimeout(() => resolve(false), 10_000))
		return Promise.race([controlled, timeout])
	})
}

/** Every URL held in every Cache Storage bucket for this origin. */
async function cachedUrls(page: Page): Promise<string[]> {
	return page.evaluate(async () => {
		if (!("caches" in self)) return []
		const names = await caches.keys()
		const urls: string[] = []
		for (const name of names) {
			const cache = await caches.open(name)
			for (const request of await cache.keys()) urls.push(request.url)
		}
		return urls
	})
}

test("no token-bearing URL is ever written to a cache", async ({ page }) => {
	await page.goto("/")
	const swActive = await serviceWorkerReady(page)
	test.skip(!swActive, "service worker not registered (needs a production build)")

	// Walk the two token flows the app actually mints.
	await page.goto(`/reset-password?token=${RESET_TOKEN}`)
	await page.waitForLoadState("networkidle")
	await page.goto(`/verify-email?token=${VERIFY_TOKEN}&callbackURL=/dashboard`)
	await page.waitForLoadState("networkidle")

	// Back to a normal page so the SW has had every chance to persist.
	await page.goto("/")
	await page.waitForTimeout(1500)

	const urls = await cachedUrls(page)
	// eslint-disable-next-line no-console
	console.log("CACHED URLS:", JSON.stringify(urls, null, 2))

	// Guard against a vacuous pass: the SW must be caching *something*.
	expect(urls.length).toBeGreaterThan(0)

	for (const url of urls) {
		expect(url).not.toContain(RESET_TOKEN)
		expect(url).not.toContain(VERIFY_TOKEN)
		expect(url).not.toMatch(/[?&](token|code|otp|secret)=/)
	}
})

test("the offline fallback does not impersonate an authenticated page", async ({ page }) => {
	await page.goto("/")
	const swActive = await serviceWorkerReady(page)
	test.skip(!swActive, "service worker not registered (needs a production build)")

	// Warm the fallback so it is genuinely available to be served.
	await page.goto("/~offline")
	await page.waitForLoadState("networkidle")

	await page.context().setOffline(true)
	try {
		const response = await page.goto("/dashboard").catch(() => null)
		const body = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "")
		// eslint-disable-next-line no-console
		console.log("OFFLINE /dashboard status:", response?.status() ?? "navigation failed")
		// eslint-disable-next-line no-console
		console.log("OFFLINE /dashboard body:", body.slice(0, 120))

		// F-48: the request must fail honestly rather than render the generic
		// offline shell as though it were the dashboard.
		const servedFallback = /offline/i.test(body) && response?.ok() === true
		expect(servedFallback).toBe(false)
	} finally {
		await page.context().setOffline(false)
	}
})
