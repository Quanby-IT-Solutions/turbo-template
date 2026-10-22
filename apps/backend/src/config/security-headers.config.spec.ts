import express, { type Express, type NextFunction, type Request, type Response } from "express"
import helmet from "helmet"
import request from "supertest"

import { SCALAR_BUNDLE } from "@/config/scalar-bundle"
import {
	buildHelmetOptions,
	createDocsSecurityHeadersMiddleware,
	isApiDocsPageRequest,
	readCspNonce,
} from "@/config/security-headers.config"

/**
 * Browser defences on API responses.
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
		// A reset link must not leak its token
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

	it("keeps the API policy to the four deny directives", async () => {
		const response = await request(appWithHeaders()).get("/json")

		expect(response.headers["content-security-policy"]).toBe(
			"default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none'"
		)
	})

	describe("HSTS is gated on TLS actually being live", () => {
		const original = process.env.ENABLE_HSTS

		afterEach(() => {
			process.env.ENABLE_HSTS = original
			jest.resetModules()
		})

		it("is absent by default", async () => {
			const response = await request(appWithHeaders()).get("/json")

			// Sending it before TLS termination is in place pins clients to a scheme the
			// deployment cannot serve, and max-age cannot be withdrawn quickly.
			expect(response.headers["strict-transport-security"]).toBeUndefined()
		})
	})
})

const API_CSP = "default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none'"

function cspOf(headers: Record<string, string | string[] | undefined>): string {
	const value = headers["content-security-policy"]
	if (typeof value !== "string") {
		throw new Error("expected a single content-security-policy header")
	}
	return value
}

function directiveSources(csp: string, name: string): string[] {
	const part = csp
		.split(";")
		.map(entry => entry.trim())
		.find(entry => entry === name || entry.startsWith(`${name} `))
	expect(part).toBeDefined()
	return (part ?? "")
		.slice(name.length)
		.trim()
		.split(/\s+/)
		.filter(source => source.length > 0)
}

function docsAwareApp(): Express {
	const app = express()
	app.use(createDocsSecurityHeadersMiddleware())
	app.use("/api/v1/docs", (req: Request, res: Response, next: NextFunction) => {
		if (!isApiDocsPageRequest(req)) {
			next()
			return
		}
		res.type("html").send(readCspNonce(res) ?? "")
	})
	app.get("/api/v1/spec.json", (_req, res) => res.json({ ok: true }))
	app.get("/api/v1/health", (_req, res) => res.json({ ok: true }))
	app.get("/api/v1/example/todos", (_req, res) => res.json([]))
	app.get("/api/v1/auth/get-session", (_req, res) => res.json(null))
	app.get("/boom", () => {
		throw new Error("handler failure")
	})
	return app
}

describe("docs route CSP", () => {
	it.each(["/api/v1/docs", "/api/v1/docs/", "/api/v1/docs?spec=1", "/api/v2/docs/"])(
		"treats %s as the docs page",
		path => {
			expect(isApiDocsPageRequest({ method: "GET", path, originalUrl: path })).toBe(true)
		}
	)

	it.each([
		{ method: "POST", path: "/api/v1/docs" },
		{ method: "GET", path: "/api/v1/docs/extra" },
		{ method: "GET", path: "/api/v1/spec.json" },
		{ method: "GET", path: "/api/v1/docs.json" },
		{ method: "GET", path: "/api/docs" },
	])("leaves $method $path on the API policy", ({ method, path }) => {
		expect(isApiDocsPageRequest({ method, path, originalUrl: path })).toBe(false)
	})

	it("allows the nonce and the pinned file, and nothing else, on script-src", async () => {
		const first = await request(docsAwareApp()).get("/api/v1/docs")
		const second = await request(docsAwareApp()).get("/api/v1/docs")
		const csp = cspOf(first.headers)
		const sources = directiveSources(csp, "script-src")

		expect(first.status).toBe(200)
		expect(sources).toHaveLength(2)
		expect(sources[0]).toMatch(/^'nonce-[A-Za-z0-9+/]+=*'$/)
		expect(sources[1]).toBe(SCALAR_BUNDLE.url)
		expect(sources.join(" ")).not.toContain("'self'")
		expect(sources.join(" ")).not.toContain("'unsafe-inline'")
		expect(sources.join(" ")).not.toContain("'unsafe-eval'")
		expect(directiveSources(csp, "default-src")).toEqual(["'none'"])
		expect(directiveSources(csp, "connect-src")).toEqual(["'self'"])
		expect(directiveSources(csp, "frame-ancestors")).toEqual(["'none'"])
		expect(directiveSources(csp, "base-uri")).toEqual(["'none'"])
		expect(directiveSources(csp, "form-action")).toEqual(["'none'"])
		expect(directiveSources(csp, "img-src")).toEqual(["'self'", "data:"])
		expect(directiveSources(csp, "font-src")).toEqual(["'self'", "data:"])

		const nonce = sources[0]?.slice("'nonce-".length, -1) ?? ""
		expect(Buffer.from(nonce, "base64")).toHaveLength(16)
		expect(first.text).toBe(nonce)
		expect(directiveSources(csp, "style-src")).toEqual(["'unsafe-inline'"])
		expect(cspOf(second.headers)).not.toBe(csp)
	})

	it("keeps the other helmet headers on the docs response", async () => {
		const app = docsAwareApp()
		const docs = await request(app).get("/api/v1/docs")
		const api = await request(app).get("/api/v1/health")

		for (const name of ["x-frame-options", "x-content-type-options", "referrer-policy"]) {
			expect(docs.headers[name]).toBe(api.headers[name])
		}
		expect(docs.headers["x-frame-options"]).toBe("DENY")
		expect(docs.headers["strict-transport-security"]).toBeUndefined()
		expect(cspOf(docs.headers)).not.toBe(cspOf(api.headers))
	})

	it.each([
		"/api/v1/spec.json",
		"/api/v1/health",
		"/api/v1/example/todos",
		"/api/v1/auth/get-session",
	])("keeps the API policy on %s while docs are enabled", async path => {
		const response = await request(docsAwareApp()).get(path)
		expect(cspOf(response.headers)).toBe(API_CSP)
		expect(cspOf(response.headers)).not.toContain("'unsafe-inline'")
	})

	it("serves the trailing-slash docs path through the mounted handler", async () => {
		const response = await request(docsAwareApp()).get("/api/v1/docs/")
		const sources = directiveSources(cspOf(response.headers), "script-src")
		const nonce = sources[0]?.slice("'nonce-".length, -1)

		expect(response.status).toBe(200)
		expect(response.text).toBe(nonce)
		expect(sources[1]).toBe(SCALAR_BUNDLE.url)
	})
})
