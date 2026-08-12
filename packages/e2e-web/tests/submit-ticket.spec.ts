import { expect, request, test } from "@playwright/test"

/**
 * HY-2 / F-62 — the submit form calls the real endpoint.
 *
 * Self-authenticating rather than using the shared `authenticated` project:
 * the page sits inside the `(site)` shell, which requires a session, and this
 * keeps the check independent of the global auth fixture.
 *
 * The endpoint accepts anonymous submissions too (verified directly against
 * the API); this covers the UI path, which also exercises AZ-3 attribution.
 */
const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"

// One account for the whole file, created lazily. A sign-up per test trips
// Better Auth's rate limit once the file grows, which surfaces as an
// unrelated-looking redirect to /login.
let sessionCookies: Awaited<ReturnType<typeof loadCookies>> | undefined

async function loadCookies() {
	const api = await request.newContext()
	const email = `hy2-e2e-${Date.now()}@test.local`
	const response = await api.post(`${AUTH_API}sign-up/email`, {
		data: { email, password: "Password123", name: "HY2 E2E" },
	})
	if (!response.ok()) {
		throw new Error(`[hy2] sign-up failed: ${response.status()} ${await response.text()}`)
	}
	const { cookies } = await api.storageState()
	await api.dispose()
	return cookies
}

test.beforeEach(async ({ page }) => {
	sessionCookies ??= await loadCookies()
	await page.context().addCookies(sessionCookies)

	// Fail loudly here rather than as "element not found" further down.
	await page.goto("/submit-ticket")
	await expect(page).toHaveURL(/\/submit-ticket/)
})

test("submit-ticket form persists a real ticket", async ({ page }) => {
	const consoleErrors: string[] = []
	const failedRequests: string[] = []
	page.on("console", m => {
		if (m.type() === "error" || m.type() === "warning") consoleErrors.push(m.text())
	})
	page.on("requestfailed", r => {
		// WC-4's connectivity probe polls on a timer; whichever poll is in flight
		// when the page navigates or the test tears down is cancelled, and an
		// abort is not a failed request. Anything else is.
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

	expect(consoleErrors, `console: ${consoleErrors.join(" | ")}`).toEqual([])
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
