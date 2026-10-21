import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "@playwright/test"

function readScalarBundle(): { url: string; integrity: string } {
	const candidates = [
		join(process.cwd(), "apps/backend/src/config/scalar-bundle.ts"),
		join(process.cwd(), "../../apps/backend/src/config/scalar-bundle.ts"),
	]
	const path = candidates.find(candidate => existsSync(candidate))
	if (!path) {
		throw new Error("Could not find apps/backend/src/config/scalar-bundle.ts")
	}
	const source = readFileSync(path, "utf8")
	const url = /url:\s*"(https:[^"]+)"/.exec(source)?.[1]
	const integrity = /integrity:\s*"(sha384-[^"]+)"/.exec(source)?.[1]
	if (!url || !integrity) {
		throw new Error("SCALAR_BUNDLE url or integrity is missing")
	}
	return { url, integrity }
}

/**
 * Browser check for the API docs page.
 *
 * Skipped unless E2E_API_DOCS_URL is set (for example
 * http://127.0.0.1:3000/api/v1/docs). Point it at a backend started with docs
 * enabled. Set E2E_NO_WEBSERVER=1 when the Next.js app is not part of this run.
 */
test("docs page renders the pinned reference", async ({ page }) => {
	test.skip(!process.env.E2E_API_DOCS_URL, "Set E2E_API_DOCS_URL to run the docs browser check")

	const docsUrl = process.env.E2E_API_DOCS_URL ?? ""
	const docsOrigin = new URL(docsUrl).origin
	const SCALAR_BUNDLE = readScalarBundle()

	const consoleProblems: string[] = []
	const failed: string[] = []
	const requests: string[] = []
	const bundleStatuses: number[] = []

	page.on("console", message => {
		if (message.type() === "error" || message.type() === "warning") {
			consoleProblems.push(`[${message.type()}] ${message.text()}`)
		}
	})
	page.on("pageerror", error => {
		consoleProblems.push(`[pageerror] ${error.message}`)
	})
	page.on("request", request => {
		requests.push(request.url())
	})
	page.on("requestfailed", request => {
		failed.push(`${request.url()} ${request.failure()?.errorText ?? ""}`)
	})
	page.on("response", response => {
		if (response.url() === SCALAR_BUNDLE.url) {
			bundleStatuses.push(response.status())
		}
		if (response.status() >= 400) {
			failed.push(`${response.status()} ${response.url()}`)
		}
	})

	await page.addInitScript(() => {
		const target = window as Window & {
			__cspViolations?: Array<{
				violatedDirective: string
				effectiveDirective: string
				blockedURI: string
				sourceFile: string
			}>
		}
		target.__cspViolations = []
		document.addEventListener("securitypolicyviolation", event => {
			target.__cspViolations?.push({
				violatedDirective: event.violatedDirective,
				effectiveDirective: event.effectiveDirective,
				blockedURI: event.blockedURI,
				sourceFile: event.sourceFile,
			})
		})
	})

	const response = await page.goto(docsUrl, { waitUntil: "domcontentloaded" })
	expect(response?.status()).toBe(200)
	const csp = response?.headers()["content-security-policy"] ?? ""
	console.log(`DOCS_CSP ${csp}`)

	await expect(page.locator("#app")).toContainText("API Documentation v1", { timeout: 30_000 })
	await expect(page.locator("#app")).toContainText(/health check/i)
	await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => undefined)

	const html = (await response?.text()) ?? ""
	const tags = html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? []
	expect(tags).toHaveLength(2)
	expect(tags[0]).toContain(`src="${SCALAR_BUNDLE.url}"`)
	expect(tags[0]).toContain(`integrity="${SCALAR_BUNDLE.integrity}"`)
	expect(tags[0]).toContain('crossorigin="anonymous"')

	expect(bundleStatuses).toContain(200)
	expect(csp).toContain("default-src 'none'")
	expect(csp).toContain(SCALAR_BUNDLE.url)
	expect(csp).toContain("style-src 'unsafe-inline'")
	expect(csp).not.toMatch(/script-src[^;]*'unsafe-inline'/)
	expect(csp).not.toMatch(/script-src[^;]*'unsafe-eval'/)

	for (const url of requests) {
		if (url.startsWith("data:") || url.startsWith("blob:")) {
			continue
		}
		const allowed = new URL(url).origin === docsOrigin || url === SCALAR_BUNDLE.url
		expect(allowed, url).toBe(true)
	}

	const violations = await page.evaluate(() => {
		return (
			(
				window as Window & {
					__cspViolations?: Array<{
						violatedDirective: string
						effectiveDirective: string
						blockedURI: string
						sourceFile: string
					}>
				}
			).__cspViolations ?? []
		)
	})

	console.log(`CSP_VIOLATION ${JSON.stringify(violations)}`)
	expect(violations).toEqual([
		{
			violatedDirective: "script-src",
			effectiveDirective: "script-src",
			blockedURI: "eval",
			sourceFile: SCALAR_BUNDLE.url,
		},
	])
	expect(consoleProblems, consoleProblems.join("\n")).toEqual([])
	expect(failed, failed.join("\n")).toEqual([])
})
