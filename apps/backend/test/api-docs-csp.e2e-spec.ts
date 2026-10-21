import { type INestApplication } from "@nestjs/common"
import { afterAll, beforeAll, describe, expect, it, jest } from "@jest/globals"
import express from "express"
import helmet from "helmet"
import request from "supertest"
import { type App } from "supertest/types"

import { SCALAR_BUNDLE } from "@/config/scalar-bundle"
import { buildHelmetOptions } from "@/config/security-headers.config"

import { createApplication } from "../src/bootstrap"

jest.setTimeout(120_000)

const API_CSP = "default-src 'none';frame-ancestors 'none';base-uri 'none';form-action 'none'"

const HELMET_HEADERS = [
	"content-security-policy",
	"x-frame-options",
	"x-content-type-options",
	"referrer-policy",
] as const

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

function scriptTags(html: string): string[] {
	return html.match(/<script\b[^>]*>[\s\S]*?<\/script>/gi) ?? []
}

function assertNoUnversionedScalar(value: string): void {
	const marker = "https://cdn.jsdelivr.net/npm/@scalar/api-reference"
	let from = 0
	while (from < value.length) {
		const at = value.indexOf(marker, from)
		if (at < 0) {
			return
		}
		expect(value.charAt(at + marker.length)).toBe("@")
		from = at + marker.length
	}
}

async function referenceHeaders(): Promise<Record<string, string | undefined>> {
	const app = express()
	app.use(helmet(buildHelmetOptions()))
	app.get("/json", (_req, res) => {
		res.json({ ok: true })
	})
	const response = await request(app).get("/json")
	return response.headers
}

function expectApiHeaders(
	actual: Record<string, string | undefined>,
	reference: Record<string, string | undefined>
): void {
	for (const name of HELMET_HEADERS) {
		expect(actual[name]).toBe(reference[name])
	}
	expect(cspOf(actual)).toBe(API_CSP)
	expect(cspOf(actual)).not.toContain("'unsafe-inline'")
	expect(actual["strict-transport-security"]).toBeUndefined()
	expect(actual["x-powered-by"]).toBeUndefined()
}

function nonceFrom(csp: string): string {
	const sources = directiveSources(csp, "script-src")
	expect(sources).toHaveLength(2)
	expect(sources[0]).toMatch(/^'nonce-[A-Za-z0-9+/]+=*'$/)
	expect(sources[1]).toBe(SCALAR_BUNDLE.url)
	expect(sources.join(" ")).not.toContain("'self'")
	expect(sources.join(" ")).not.toContain("'unsafe-inline'")
	expect(sources.join(" ")).not.toContain("'unsafe-eval'")
	return sources[0]?.slice("'nonce-".length, -1) ?? ""
}

describe("API docs CSP (enabled)", () => {
	let app: INestApplication<App>
	let reference: Record<string, string | undefined>

	beforeAll(async () => {
		reference = await referenceHeaders()
		app = (await createApplication({ apiDocsEnabled: true })) as INestApplication<App>
		await app.init()
	})

	afterAll(async () => {
		await app.close()
	})

	it("returns docs HTML with a per-request nonce and the pinned bundle", async () => {
		const server = app.getHttpServer()
		const first = await request(server).get("/api/v1/docs")
		const second = await request(server).get("/api/v1/docs")

		expect(first.status).toBe(200)
		expect(first.headers["content-type"]).toContain("text/html")

		const csp = cspOf(first.headers)
		expect(csp).toContain("default-src 'none'")
		const nonce = nonceFrom(csp)
		expect(Buffer.from(nonce, "base64")).toHaveLength(16)
		expect(directiveSources(csp, "connect-src")).toEqual(["'self'"])
		expect(directiveSources(csp, "frame-ancestors")).toEqual(["'none'"])
		expect(directiveSources(csp, "base-uri")).toEqual(["'none'"])
		expect(directiveSources(csp, "form-action")).toEqual(["'none'"])
		expect(directiveSources(csp, "style-src")).toEqual(["'unsafe-inline'"])

		const tags = scriptTags(first.text)
		expect(tags).toHaveLength(2)
		expect(tags[0]).toContain(`src="${SCALAR_BUNDLE.url}"`)
		expect(tags[0]).toContain(`integrity="${SCALAR_BUNDLE.integrity}"`)
		expect(tags[0]).toContain('crossorigin="anonymous"')
		expect(tags[1]).toContain(`nonce="${nonce}"`)
		assertNoUnversionedScalar(first.text)
		assertNoUnversionedScalar(csp)

		const secondNonce = nonceFrom(cspOf(second.headers))
		expect(secondNonce).not.toBe(nonce)
		expect(second.text).toContain(`nonce="${secondNonce}"`)
	})

	it("applies the same docs policy to the trailing-slash URL", async () => {
		const response = await request(app.getHttpServer()).get("/api/v1/docs/")
		expect(response.status).toBe(200)
		const nonce = nonceFrom(cspOf(response.headers))
		expect(response.text).toContain(`nonce="${nonce}"`)
	})

	it.each([
		["/api/v1/spec.json", 200],
		["/api/v1/example/todos", 200],
		["/api/v1/health", 200],
		["/api/v1/auth/get-session", 200],
		["/api/v1/me/permissions", 401],
		["/api/v1/does-not-exist", 404],
	] as const)("keeps the API policy on %s", async (path, status) => {
		const response = await request(app.getHttpServer()).get(path)
		expect(response.status).toBe(status)
		expectApiHeaders(response.headers, reference)
	})

	it("leaves the auth reference on the API policy", async () => {
		const response = await request(app.getHttpServer()).get("/api/v1/auth/reference")
		expect(cspOf(response.headers)).toBe(API_CSP)
		expect(response.text).not.toContain(SCALAR_BUNDLE.url)
	})
})

describe("API docs CSP (disabled)", () => {
	let app: INestApplication<App>
	let reference: Record<string, string | undefined>

	beforeAll(async () => {
		reference = await referenceHeaders()
		app = (await createApplication()) as INestApplication<App>
		await app.init()
	})

	afterAll(async () => {
		await app.close()
	})

	it("does not serve the docs page", async () => {
		const response = await request(app.getHttpServer()).get("/api/v1/docs")
		expect(response.status).toBe(404)
		expectApiHeaders(response.headers, reference)
	})

	it.each([
		"/api/v1/spec.json",
		"/api/v1/example/todos",
		"/api/v1/health",
		"/api/v1/auth/get-session",
		"/api/v1/me/permissions",
		"/api/v1/does-not-exist",
	])("matches the pre-existing helmet header set on %s", async path => {
		const response = await request(app.getHttpServer()).get(path)
		expectApiHeaders(response.headers, reference)
	})
})
