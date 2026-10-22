import { expect, test } from "@playwright/test"

import { settleServiceWorker } from "../service-worker"

/**
 * A server error on a protected navigation must still reach the page while
 * the service worker is in control. The document stays on that route, the
 * error screen is shown, and the failing response is not stored.
 *
 * Runs only when the session service is unreachable. The placeholder cookie
 * is the session cookie this origin reads (`better-auth.session_token` on
 * http; the `__Secure-` prefix is for https).
 */

const SESSION_COOKIE = "better-auth.session_token"

test("a server error on a protected page reaches the page under the service worker", async ({
	page,
}) => {
	test.skip(!!process.env.E2E_AUTH_API_URL, "Requires the session service to be unreachable")

	const logs: string[] = []
	page.on("console", message => {
		logs.push(message.text())
	})
	page.on("pageerror", error => {
		logs.push(error instanceof Error ? error.message : String(error))
	})
	page.context().on("serviceworker", worker => {
		worker.on("console", message => {
			logs.push(message.text())
		})
	})

	await page.goto("/")
	await settleServiceWorker(page)
	await expect
		.poll(() => page.evaluate(() => navigator.serviceWorker.controller != null))
		.toBe(true)

	const origin = new URL(page.url()).origin
	await page.context().addCookies([
		{
			name: SESSION_COOKIE,
			value: "placeholder-session",
			url: origin,
		},
	])

	const response = await page.goto("/dashboard")

	await expect(page).toHaveURL(/\/dashboard$/)
	await expect(page).not.toHaveURL(/\/~offline/)

	const alert = page.getByTestId("session-unavailable")
	await expect(alert).toBeVisible()
	await expect(alert).toHaveAttribute("role", "alert")
	await expect(alert.getByRole("button", { name: "Try again" })).toBeVisible()

	expect(response, "document response").not.toBeNull()
	expect(response?.status()).toBe(500)
	expect(logs.join("\n")).not.toContain("no-response")

	const cachedServerErrors = await page.evaluate(async () => {
		if (!("caches" in self)) return []
		const hits: { url: string; status: number }[] = []
		for (const name of await caches.keys()) {
			const cache = await caches.open(name)
			for (const request of await cache.keys()) {
				const path = new URL(request.url).pathname
				if (path !== "/dashboard") continue
				const stored = await cache.match(request)
				if (stored && stored.status >= 500) {
					hits.push({ url: request.url, status: stored.status })
				}
			}
		}
		return hits
	})
	expect(cachedServerErrors).toEqual([])
})
