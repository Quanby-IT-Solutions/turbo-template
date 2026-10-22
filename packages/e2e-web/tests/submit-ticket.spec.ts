import { expect, test, type BrowserContext } from "@playwright/test"

import { installSessionReadRecovery, signInAs } from "../fixtures"

/**
 * The submit form calls the real endpoint.
 *
 * The page sits inside the `(site)` shell, which requires a session. userA is
 * the pre-verified ordinary user from `pnpm db:seed:e2e`. One sign-in for the
 * file, then the same cookies on the later tests. Self-registration cannot
 * produce a session while email verification is required.
 *
 * Every test here needs a live API. `E2E_AUTH_API_URL` is the suite's signal
 * for "a backend is reachable". Without it these tests skip instead of
 * failing with ECONNREFUSED against the :3000 default.
 */

// Serial so the shared cookies are created once. Parallel workers would each
// sign in and spend the sign-in budget.
test.describe.configure({ mode: "serial" })

let storedCookies: Awaited<ReturnType<BrowserContext["cookies"]>> | undefined

test.beforeEach(async ({ page }) => {
	installSessionReadRecovery(page)
	test.skip(!process.env.E2E_AUTH_API_URL, "Requires backend")

	if (!storedCookies) {
		await signInAs(page, "userA")
		storedCookies = await page.context().cookies()
	} else {
		await page.context().addCookies(storedCookies)
	}

	// Fail loudly here rather than as "element not found" further down.
	await page.goto("/submit-ticket")
	await expect(page).toHaveURL(/\/submit-ticket/)
})

test("submit-ticket form persists a real ticket", async ({ page }) => {
	const consoleErrors: string[] = []
	const failedRequests: string[] = []
	// The online-status hook polls GET /health with `mode: "no-cors"`. A 429 is an opaque
	// response (the app stays online) but Chrome still logs it. Parallel
	// pages share the API's default per-IP throttle, so the probe can 429
	// while POST /tickets is accepted. Count those probes and ignore only
	// that many console lines.
	let healthProbe429s = 0
	page.on("console", m => {
		if (m.type() === "error" || m.type() === "warning") consoleErrors.push(m.text())
	})
	page.on("response", response => {
		if (response.status() !== 429) return
		if (response.url().includes("/health")) {
			healthProbe429s += 1
			return
		}
		consoleErrors.push(`429 ${response.request().method()} ${response.url()}`)
	})
	page.on("requestfailed", r => {
		// Whichever probe is in flight when the page navigates or the test
		// tears down is cancelled, and an abort is not a failed request.
		if (r.failure()?.errorText === "net::ERR_ABORTED") return
		failedRequests.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText}`)
	})

	await page.getByLabel("Name").fill("Playwright Reporter")
	await page.getByLabel("Email").fill("pw@test.local")
	await page.getByLabel("Subject").fill("Browser smoke test")
	await page.getByLabel("Concern").fill("Submitted from the wired form.")

	const [response] = await Promise.all([
		page.waitForResponse(r => r.url().includes("/tickets") && r.request().method() === "POST"),
		page.getByRole("button", { name: "Submit Ticket" }).click(),
	])

	// The mock reported success without issuing a request at all; this asserts a
	// real one reached the backend and was accepted.
	expect(response.status()).toBe(200)
	await expect(page.getByRole("status")).toContainText("submitted")

	// Form clears, so a second ticket is not an accidental duplicate.
	await expect(page.getByLabel("Subject")).toHaveValue("")

	const probeNoise = /^Failed to load resource: the server responded with a status of 429/
	const unexpected = consoleErrors.filter(message => {
		if (!probeNoise.test(message)) return true
		if (healthProbe429s <= 0) return true
		healthProbe429s -= 1
		return false
	})
	expect(unexpected, `console: ${unexpected.join(" | ")}`).toEqual([])
	expect(failedRequests, `failed: ${failedRequests.join(" | ")}`).toEqual([])
})

test("form is keyboard reachable and labelled", async ({ page }) => {
	for (const label of ["Name", "Email", "Subject", "Concern"]) {
		await expect(page.getByLabel(label)).toBeVisible()
	}
	await page.getByLabel("Name").focus()
	await expect(page.getByLabel("Name")).toBeFocused()
})

test("no horizontal overflow on mobile", async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 812 })
	await page.reload()
	const overflow = await page.evaluate(
		() => document.documentElement.scrollWidth > document.documentElement.clientWidth
	)
	expect(overflow).toBe(false)
})
