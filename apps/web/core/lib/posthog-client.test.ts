import { beforeEach, describe, expect, it, vi } from "vitest"

/** Records whether posthog-js was ever imported, and its init calls. */
const sdk = vi.hoisted(() => ({ imported: false, init: vi.fn() }))

vi.mock("posthog-js", () => {
	sdk.imported = true
	return { default: { init: sdk.init } }
})

describe("loadPosthog", () => {
	beforeEach(() => {
		vi.resetModules()
		sdk.imported = false
		sdk.init.mockClear()
	})

	it("never downloads posthog-js when PostHog is off", async () => {
		const { loadPosthog, loadedPosthog } = await import("./posthog-client")

		await expect(loadPosthog(undefined)).resolves.toBeUndefined()
		expect(loadedPosthog()).toBeUndefined()
		expect(sdk.imported).toBe(false)
	})

	it("loads and initialises posthog-js once when on", async () => {
		const { loadPosthog, loadedPosthog } = await import("./posthog-client")

		const [first, second] = await Promise.all([loadPosthog("phc_test"), loadPosthog("phc_test")])

		expect(first).toBeDefined()
		expect(second).toBe(first)
		expect(loadedPosthog()).toBe(first)
		expect(sdk.init).toHaveBeenCalledTimes(1)
		expect(sdk.init).toHaveBeenCalledWith(
			"phc_test",
			expect.objectContaining({ api_host: "/ingest" })
		)
	})

	// The AC2 walk (11/4) measured a 353 KB posthog-js chunk on every page with
	// PostHog off, pulled in by these modules' static imports.
	it("is the only way in: the identity helpers and the flag hook do not import posthog-js", async () => {
		await import("@/services/analytics/posthog-identity")
		await import("@/core/hooks/use-feature-flag")

		expect(sdk.imported).toBe(false)
	})
})
