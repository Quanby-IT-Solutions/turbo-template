import { expect, test } from "@playwright/test"

import { signInRetryDelayMs } from "../fixtures"

/**
 * Deliberate `sign-in/email` call. It lives in the `chromium-auth-negative`
 * project, which depends on `setup`, so it does not run in the same wave as
 * global setup's sign-ins. A 429 is waited out from `x-retry-after` and
 * retried at most twice. The test ends on 401.
 */
test("shows an error and stays on /login with invalid credentials", async ({ page }) => {
	test.skip(!process.env.E2E_AUTH_API_URL, "Requires backend")
	test.setTimeout(90_000)

	const pageErrors: Error[] = []
	const unhandledConsole: string[] = []
	const failedRequests: string[] = []
	const signInStatuses: number[] = []
	page.on("pageerror", error => {
		pageErrors.push(error)
	})
	page.on("response", response => {
		if (response.url().includes("sign-in/email") && response.request().method() === "POST") {
			signInStatuses.push(response.status())
		}
	})
	page.on("console", message => {
		if (message.type() === "error" && /unhandled|uncaught/i.test(message.text())) {
			unhandledConsole.push(message.text())
		}
	})
	page.on("requestfailed", request => {
		failedRequests.push(
			`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ""}`
		)
	})

	await page.goto("/login")

	const submitLogin = async () => {
		const responsePromise = page.waitForResponse(
			response => response.url().includes("sign-in/email") && response.request().method() === "POST"
		)
		await page.getByLabel(/email/i).fill("test@gmail.com")
		await page.getByLabel("Password", { exact: true }).fill("WrongPassword123")
		await page.getByRole("button", { name: /^login$/i }).click()
		return responsePromise
	}

	let response = await submitLogin()
	for (let retry = 1; retry <= 2 && response.status() === 429; retry++) {
		const retryAfter = response.headers()["x-retry-after"]
		const waitMs = signInRetryDelayMs(retryAfter)
		console.log(
			`[e2e] sign-in/email 429; waiting ${waitMs}ms (x-retry-after=${retryAfter ?? "absent"}) before retry ${retry}`
		)
		await page.waitForTimeout(waitMs)
		response = await submitLogin()
	}

	expect(response.status(), "invalid credentials must end on 401").toBe(401)
	expect(signInStatuses.at(-1)).toBe(401)
	expect(signInStatuses.filter(status => status === 429).length).toBeLessThanOrEqual(2)
	expect(signInStatuses.some(status => status >= 500)).toBe(false)

	await expect(page).toHaveURL(/\/login/)
	const banner = page.getByTestId("login-error")
	await expect(banner).toBeVisible()
	await expect(banner).toHaveAttribute("role", "alert")
	await expect(banner).toHaveText(/invalid|incorrect|failed to sign in/i)
	await expect(page.getByText("Unhandled Runtime Error")).toHaveCount(0)
	expect(pageErrors).toEqual([])
	expect(unhandledConsole).toEqual([])
	expect(failedRequests.filter(entry => entry.includes("sign-in"))).toEqual([])
})
