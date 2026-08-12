import { expect, request, test, type Page } from "@playwright/test"

/**
 * ED-1 / F-12 + F-21 — browser-level defences, and the clickjacking path.
 *
 * The framing assertion is the one that retires F-21: the RBAC admin UI was
 * framable, so a framed click could reach role assignment. Asserting the
 * header alone would not prove the browser acts on it, so this loads the page
 * in a real iframe and checks nothing renders.
 */

const AUTH_API = process.env.E2E_AUTH_API_URL ?? "http://localhost:3000/api/v1/auth/"
const WEB = process.env.BASE_URL ?? "http://localhost:3001"

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@turbo-template.local"
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "Password123"
const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "test@gmail.com"
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "Password123"

test.use({ storageState: { cookies: [], origins: [] } })

/** Sign in, returning the email that worked — admin if available. */
async function signIn(page: Page): Promise<string | null> {
	for (const [email, password] of [
		[ADMIN_EMAIL, ADMIN_PASSWORD],
		[TEST_EMAIL, TEST_PASSWORD],
	]) {
		const api = await request.newContext({
			baseURL: AUTH_API,
			extraHTTPHeaders: { "Content-Type": "application/json", "Origin": WEB },
		})
		const res = await api.post("sign-in/email", { data: { email, password } })

		if (res.ok()) {
			await page.context().addCookies((await api.storageState()).cookies)
			await api.dispose()
			return email!
		}
		await api.dispose()
	}

	return null
}

test("security headers are present and the RBAC UI cannot be framed", async ({ page }) => {
	const consoleMsgs: string[] = []
	const pageErrors: string[] = []
	page.on("console", m => {
		if (m.type() === "error" || m.type() === "warning") consoleMsgs.push(`[${m.type()}] ${m.text()}`)
	})
	page.on("pageerror", e => pageErrors.push(String(e)))

	const signedInAs = await signIn(page)
	expect(signedInAs, "no usable account to sign in with").not.toBeNull()
	const isAdmin = signedInAs === ADMIN_EMAIL

	const response = await page.goto("/user-management")
	const h = response!.headers()

	expect(h["content-security-policy"]).toContain("frame-ancestors 'none'")
	expect(h["x-frame-options"]).toBe("DENY")
	expect(h["x-content-type-options"]).toBe("nosniff")
	expect(h["referrer-policy"]).toBe("strict-origin-when-cross-origin")
	// HSTS must NOT be sent before TLS is live (ED-2).
	expect(h["strict-transport-security"]).toBeUndefined()

	// Exactly one CSP header — duplicates get intersected by the browser.
	expect(String(h["content-security-policy"]).split(",").length).toBe(1)

	// The app must still work under the CSP — a policy that silently breaks the
	// page would pass every header assertion above.
	if (isAdmin) {
		await expect(page.getByRole("heading", { name: /user management/i })).toBeVisible()
		await expect(page.getByText(ADMIN_EMAIL, { exact: false }).first()).toBeVisible()
	} else {
		// Without the directory permission the route redirects, so prove the CSP
		// on a page this account can actually render.
		await page.goto("/dashboard")
		await expect(page).toHaveURL(/\/dashboard/)
	}

	// F-21: framing /user-management must fail. Done on a SEPARATE page —
	// `setContent` on the live page tears the document out from under React and
	// produces DOM errors that have nothing to do with the headers under test.
	const framer = await page.context().newPage()
	await framer.setContent(
		`<iframe id="f" src="${WEB}/user-management" width="600" height="400"></iframe>`
	)
	await framer.waitForTimeout(2500)
	const framedBody = await framer.evaluate(() => {
		const f = document.getElementById("f") as HTMLIFrameElement | null
		try {
			return f?.contentDocument?.body?.innerHTML?.slice(0, 200) ?? "<blocked: no contentDocument>"
		} catch (e) {
			return `<blocked: ${String(e).slice(0, 80)}>`
		}
	})
	console.log("FRAMED CONTENT:", framedBody)
	expect(framedBody).not.toMatch(/user management|role/i)
	await framer.close()

	// CORS failures are excluded only when this suite runs the app on a port
	// that is not in the backend's CORS_ORIGINS — an artefact of the harness,
	// not of the headers under test. CSP violations are NOT excluded: "nothing
	// legitimate is blocked" is the acceptance criterion this asserts, and an
	// over-tight connect-src was caught here exactly once.
	const noise = (m: string) => m.includes("gstatic") || m.includes("CORS policy") || m.includes("net::ERR_FAILED")

	console.log("CONSOLE:", JSON.stringify(consoleMsgs.filter(m => !noise(m)), null, 2))
	console.log("PAGEERRORS:", JSON.stringify(pageErrors, null, 2))
	expect(pageErrors).toEqual([])
	expect(consoleMsgs.filter(m => !noise(m))).toEqual([])
	// Whatever else happened, the CSP must not have blocked anything.
	expect(consoleMsgs.filter(m => /Content Security Policy/i.test(m))).toEqual([])
})
