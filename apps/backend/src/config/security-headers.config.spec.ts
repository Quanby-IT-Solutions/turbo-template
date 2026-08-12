import express from "express"
import helmet from "helmet"
import request from "supertest"

import { buildHelmetOptions } from "@/config/security-headers.config"

/**
 * ED-1 / F-12 + F-21 — browser defences on API responses.
 *
 * Exercises the real helmet middleware with the shipped options rather than
 * inspecting the options object: a header only protects anything if it is
 * actually emitted.
 */

function appWithHeaders() {
	const app = express()
	app.use(helmet(buildHelmetOptions()))
	app.get("/json", (_req, res) => res.json({ ok: true }))
	app.get("/boom", (_req, _res) => {
		throw new Error("handler failure")
	})
	return app
}

describe("API security headers", () => {
	it("denies framing two ways", async () => {
		const response = await request(appWithHeaders()).get("/json")

		// frame-ancestors for modern browsers, X-Frame-Options for old ones.
		expect(response.headers["content-security-policy"]).toContain("frame-ancestors 'none'")
		expect(response.headers["x-frame-options"]).toBe("DENY")
	})

	it("forbids everything by default in the API policy", async () => {
		const response = await request(appWithHeaders()).get("/json")

		// A JSON API should never load a script, style or frame.
		expect(response.headers["content-security-policy"]).toContain("default-src 'none'")
	})

	it("stops JSON being sniffed into something executable", async () => {
		const response = await request(appWithHeaders()).get("/json")

		expect(response.headers["x-content-type-options"]).toBe("nosniff")
	})

	it("trims the referrer on cross-origin navigations", async () => {
		// Closes the referrer half of F-20: a reset link must not leak its token
		// through the Referer header.
		const response = await request(appWithHeaders()).get("/json")

		expect(response.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
	})

	it("does not advertise the framework", async () => {
		const response = await request(appWithHeaders()).get("/json")

		expect(response.headers["x-powered-by"]).toBeUndefined()
	})

	it("still sets the headers on an error response", async () => {
		// Error paths are exactly where a missing header goes unnoticed.
		const response = await request(appWithHeaders()).get("/boom")

		expect(response.status).toBeGreaterThanOrEqual(500)
		expect(response.headers["x-content-type-options"]).toBe("nosniff")
		expect(response.headers["x-frame-options"]).toBe("DENY")
	})

	describe("HSTS is gated on TLS actually being live", () => {
		const original = process.env.ENABLE_HSTS

		afterEach(() => {
			process.env.ENABLE_HSTS = original
			jest.resetModules()
		})

		it("is absent by default", async () => {
			const response = await request(appWithHeaders()).get("/json")

			// Sending it before ED-2 terminates TLS pins clients to a scheme the
			// deployment cannot serve, and max-age cannot be withdrawn quickly.
			expect(response.headers["strict-transport-security"]).toBeUndefined()
		})
	})
})
