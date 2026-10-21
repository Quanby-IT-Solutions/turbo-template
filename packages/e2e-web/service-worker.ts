import type { Page } from "@playwright/test"

/**
 * Production registers `/serwist/sw.js` during the first client render.
 * `skipWaiting` is false, but nothing is active yet, so the browser activates
 * that first worker anyway. `clientsClaim` then fires `controllerchange`, and
 * the app reloads so the open tab runs the new worker.
 *
 * That reload drops a throttled persist that has not flushed, and it destroys
 * an IndexedDB read that is in progress. A page that already has a controller
 * does not reload. Dev never serves the worker script, and
 * `navigator.serviceWorker.ready` would wait forever there, so a missing
 * script means there is nothing to settle.
 *
 * `window.serwist` is assigned in that same client render, which is also when
 * click handlers are attached. Waiting for it is the hydration barrier: a
 * click on the server-rendered Logout button before then is dropped.
 */
const WORKER_SCRIPT = "/serwist/sw.js"

async function productionWorkerServed(page: Page): Promise<boolean> {
	const response = await page.request.get(WORKER_SCRIPT, { failOnStatusCode: false })
	return response.ok()
}

export async function settleServiceWorker(page: Page): Promise<void> {
	if (!(await productionWorkerServed(page))) return

	const deadline = Date.now() + 10_000

	while (Date.now() < deadline) {
		const marker = Math.random().toString(36).slice(2)
		let navigated = false
		const onNavigated = () => {
			navigated = true
		}
		page.on("framenavigated", onNavigated)

		let ready = false
		try {
			ready = await page.evaluate(async token => {
				document.documentElement.dataset.e2eSw = token
				if (!("serviceWorker" in navigator)) return true

				if (!navigator.serviceWorker.controller) {
					const registrations = await navigator.serviceWorker.getRegistrations()
					if (registrations.length === 0) return false

					await new Promise<void>(resolve => {
						const timer = window.setTimeout(resolve, 200)
						const finish = () => {
							window.clearTimeout(timer)
							resolve()
						}
						navigator.serviceWorker.addEventListener("controllerchange", finish, {
							once: true,
						})
						void navigator.serviceWorker.ready.then(() => {
							if (navigator.serviceWorker.controller) finish()
						})
					})
				}

				if (!navigator.serviceWorker.controller) return false

				// Let a controllerchange listener call `location.reload()` before
				// this document is treated as stable. The reload aborts the evaluate.
				await new Promise(resolve => window.setTimeout(resolve, 0))

				const client = window as Window & { serwist?: unknown }
				return client.serwist != null && document.documentElement.dataset.e2eSw === token
			}, marker)
		} catch (error) {
			page.off("framenavigated", onNavigated)
			if (!isNavigationError(error)) throw error
			await page.waitForLoadState("load")
			continue
		}

		page.off("framenavigated", onNavigated)

		if (navigated) {
			await page.waitForLoadState("load")
			continue
		}

		if (ready) return
	}

	throw new Error(
		"service worker did not take control of the page; the claim reload never finished"
	)
}

/** Open a route, then wait out the worker's one-time claim reload. */
export async function gotoAndSettle(page: Page, path: string): Promise<void> {
	try {
		await page.goto(path)
	} catch (error) {
		if (!isNavigationError(error)) throw error
	}
	await settleServiceWorker(page)
}

function isNavigationError(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error)
	return /context was destroyed|interrupted by another navigation|net::ERR_ABORTED|frame was detached|Target page, context or browser has been closed/i.test(
		message
	)
}
