import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

/**
 * WC-4 / F-49 + F-50 — update flow and probe hygiene.
 *
 * Source-level assertions: what these protect (a worker declining to take over
 * mid-session, a recovery path that runs in production) only manifests in a
 * real browser with a registered worker, which vitest does not provide. The
 * behavioural half is exercised by the Playwright SW suite.
 */

const read = (p: string) => readFileSync(p, "utf8")

describe("service-worker update flow (F-49)", () => {
	const sw = read("app/sw.ts")
	const provider = read("features/pwa/components/serwist-provider.tsx")

	it("does not take over mid-session", () => {
		// `skipWaiting: true` swapped the code under an open tab, which can leave
		// a half-loaded page mixing old and new chunks.
		expect(sw).toContain("skipWaiting: false")
	})

	it("still claims existing tabs once a worker activates", () => {
		expect(sw).toContain("clientsClaim: true")
	})

	it("activates only on an explicit message from the page", () => {
		expect(sw).toContain("SKIP_WAITING")
		expect(sw).toContain("self.skipWaiting()")
	})

	it("prompts the user rather than reloading unasked", () => {
		expect(provider).toContain("A new version is available")
		expect(provider).toContain("SKIP_WAITING")
	})

	it("reloads once the new worker takes control, so tabs agree", () => {
		expect(provider).toContain("controllerchange")
	})
})

describe("production recovery path (F-49)", () => {
	const provider = read("features/pwa/components/serwist-provider.tsx")

	it("exposes a reset that is not gated on the environment", () => {
		// The existing self-heal returns early in production, so a bad worker
		// shipped there could not be recovered from in the browser at all.
		expect(provider).toContain("export async function resetServiceWorker")

		const fn = provider.slice(provider.indexOf("export async function resetServiceWorker"))
		expect(fn).not.toContain('env.NODE_ENV === "production"')
		expect(fn).toContain("unregister()")
		expect(fn).toContain("caches.delete")
	})
})

describe("connectivity probe (F-50)", () => {
	const hook = read("features/pwa/lib/use-online-status.ts")

	it("targets the first-party health endpoint", () => {
		expect(hook).toContain("/health")
		expect(hook).toContain("NEXT_PUBLIC_API_BASE_URL")
	})

	it("makes no third-party request", () => {
		// The old probe hit gstatic every 15s, leaking IP and session duration —
		// and after ED-1's CSP it threw, pausing every mutation indefinitely.
		// Comments recording that history do not count; only executable code.
		const code = hook
			.split(String.fromCharCode(10))
			.filter(line => {
				const t = line.trimStart()
				return !t.startsWith("//") && !t.startsWith("*") && !t.startsWith("/*")
			})
			.join(String.fromCharCode(10))

		expect(code).not.toContain("gstatic")
		expect(code).not.toContain("generate_204")
	})
})
