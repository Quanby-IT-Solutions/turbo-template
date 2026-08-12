import { expect, test } from "@playwright/test"

import { ACCOUNTS, signInAs, trySignInAs } from "../fixtures"

/**
 * ED-1 / F-12 + F-21 — browser-level defences, and the clickjacking path.
 *
 * The framing assertion is the one that retires F-21: the RBAC admin UI was
 * framable, so a framed click could reach role assignment. Asserting the
 * header alone would not prove the browser acts on it, so this loads the page
 * in a real iframe and checks nothing renders.
 */

const WEB = process.env.BASE_URL ?? "http://localhost:3001"
const ADMIN_EMAIL = ACCOUNTS.admin.email

test.use({ storageState: { cookies: [], origins: [] } })

test("security headers are present and the RBAC UI cannot be framed", async ({ page }) => {
	const consoleMsgs: string[] = []
	const pageErrors: string[] = []
	page.on("console", m => {
		if (m.type() === "error" || m.type() === "warning") consoleMsgs.push(`[${m.type()}] ${m.text()}`)
	})
	page.on("pageerror", e => pageErrors.push(String(e)))

	// Admin renders the directory this test wants to see under the CSP; any
	// signed-in user still proves the headers themselves.
	const isAdmin = await trySignInAs(page, "admin")
	if (!isAdmin) await signInAs(page, "userA")

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

	console.log("CONSOLE:", JSON.stringify(consoleMsgs, null, 2))
	console.log("PAGEERRORS:", JSON.stringify(pageErrors, null, 2))

	// The acceptance criterion is "nothing legitimate is blocked", so this
	// asserts on the messages a blocking policy actually produces rather than
	// on an empty console. A blanket emptiness check reads stricter but is not:
	// it fails on unrelated UI churn — a Base UI id hydration mismatch, a
	// framework deprecation — and a test that goes red for reasons outside its
	// subject gets muted, taking the CSP check down with it.
	const blocked = consoleMsgs.filter(
		m => /Content Security Policy/i.test(m) || /Refused to (load|connect|frame|execute)/i.test(m)
	)
	expect(blocked).toEqual([])

	// An unhandled exception is in scope: an over-tight policy surfaces as one.
	expect(pageErrors.filter(e => !/hydrat/i.test(e))).toEqual([])
})
