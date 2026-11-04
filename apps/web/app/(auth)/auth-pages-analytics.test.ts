// @vitest-environment node
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

/**
 * The signed-out auth pages clear a previous user's PostHog identity.
 *
 * They do not mount `CacheIdentity` (a session read would make them dynamic),
 * so without their own stamp an expired session on a shared machine would
 * credit the next person's /login pageview to the previous user. `/session`
 * is excluded: it stamps the real session itself.
 */
const SIGNED_OUT_PAGES = ["login", "register", "forgot-password", "reset-password", "verify-email"]

describe("signed-out auth pages", () => {
	it.each(SIGNED_OUT_PAGES)("/%s mounts the anonymous analytics stamp", page => {
		const source = readFileSync(join(__dirname, page, "page.tsx"), "utf8")

		expect(source).toContain("<AnalyticsIdentityStamp userId={null} />")
	})
})
