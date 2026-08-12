import { type INestApplication } from "@nestjs/common"
import request from "supertest"
import { type App } from "supertest/types"

import { createApplication } from "../src/bootstrap"
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"

/**
 * AC-3 / F-56 + F-58 + F-59 — the session cookie's attributes, as actually sent.
 *
 * The ticket pins `expiresIn`, rotation, SameSite, Secure, HttpOnly and path in
 * `packages/auth/src/config.ts`, and its technical note is explicit that config
 * alone is not proof: F-58/F-59 were held at Low confidence precisely because
 * the library internals were unreadable, so what Better Auth *does* with those
 * options had never been observed. Asserting the config object would restate
 * the source file, not test it.
 *
 * This boots the real application — the same auth middleware, the same mounted
 * Better Auth handler — and reads the `Set-Cookie` header off a genuine
 * sign-in.
 */
describe("session cookie attributes (AC-3)", () => {
	let app: INestApplication<App>
	let setCookie: string | undefined

	beforeAll(async () => {
		app = (await createApplication()) as INestApplication<App>
		await app.init()

		// The seeded admin, matching app.e2e-spec.ts. A verified account is the
		// one identity that can sign in regardless of whether the environment
		// requires email verification, so the cookie is always issued.
		const signIn = await request(app.getHttpServer())
			.post("/api/v1/auth/sign-in/email")
			.send({
				email: process.env.E2E_ADMIN_EMAIL ?? "admin@turbo-template.local",
				password: process.env.E2E_ADMIN_PASSWORD ?? "Password123",
			})

		expect(signIn.status).toBe(200)

		const cookies = (signIn.headers["set-cookie"] ?? []) as string[]
		setCookie = cookies.find(value => value.startsWith("better-auth.session_token="))
	})

	afterAll(async () => {
		await app?.close()
	})

	it("issues a session cookie at all", () => {
		// Guards every assertion below against passing vacuously on `undefined`.
		expect(setCookie).toBeDefined()
	})

	it("is HttpOnly, so script on the page cannot read the session", () => {
		expect(setCookie).toMatch(/;\s*HttpOnly/i)
	})

	it("is SameSite=Lax, the posture ED-1's frame-ancestors is paired with", () => {
		expect(setCookie).toMatch(/;\s*SameSite=Lax/i)
	})

	it("is scoped to path /", () => {
		expect(setCookie).toMatch(/;\s*Path=\//i)
	})

	it("expires in 7 days, matching the pinned expiresIn", () => {
		const maxAge = /;\s*Max-Age=(\d+)/i.exec(setCookie ?? "")
		expect(maxAge).not.toBeNull()
		expect(Number(maxAge?.[1])).toBe(60 * 60 * 24 * 7)
	})

	it("carries no Domain attribute, so the cookie stays host-only", () => {
		// F-33: BETTER_AUTH_COOKIE_DOMAIN is unset by default and any value used
		// to widen the cookie across subdomains silently. Unset must mean
		// host-only, which is the absence of Domain — not a Domain of the host.
		expect(process.env.BETTER_AUTH_COOKIE_DOMAIN ?? "").toBe("")
		expect(setCookie).not.toMatch(/;\s*Domain=/i)
	})

	it("marks the cookie Secure exactly when the environment is production", () => {
		// Asserted as a biconditional rather than hardcoding one branch: the
		// suite runs in development locally and could run against a production
		// -shaped environment in CI, and both answers are correct for their env.
		const isProduction = process.env.NODE_ENV === "production"
		expect(/;\s*Secure/i.test(setCookie ?? "")).toBe(isProduction)
	})
})
