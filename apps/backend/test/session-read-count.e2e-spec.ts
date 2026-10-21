import { type INestApplication } from "@nestjs/common"
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import { type App } from "supertest/types"

import { getAuth } from "@repo/auth"

import { createApplication } from "../src/bootstrap"
import { resolveE2eAdminPassword } from "./e2e-admin-password"

const ADMIN_EMAIL = "admin@turbo-template.local"
const USER_EMAIL = "alex@turbo-template.local"
const FORGED_COOKIE = "better-auth.session_token=forged"

describe("session reads per request (e2e)", () => {
	let app: INestApplication<App>
	let calls = 0
	let resolved = 0
	let restore: (() => void) | undefined
	let adminCookie = ""
	let userCookie = ""

	beforeAll(async () => {
		app = (await createApplication()) as INestApplication<App>
		await app.init()

		const auth = getAuth()
		const original = auth.api.getSession.bind(auth.api)
		auth.api.getSession = (async (...args: Parameters<typeof original>) => {
			calls += 1
			const session = await original(...args)
			if (session) resolved += 1
			return session
		}) as typeof original
		restore = () => {
			auth.api.getSession = original
		}

		adminCookie = await signIn(ADMIN_EMAIL)
		userCookie = await signIn(USER_EMAIL)
	})

	afterAll(async () => {
		restore?.()
		await app?.close()
	})

	const server = () => app.getHttpServer()

	const signIn = async (email: string): Promise<string> => {
		const response = await request(server()).post("/api/v1/auth/sign-in/email").send({
			email,
			password: resolveE2eAdminPassword(),
		})
		expect(response.status).toBe(200)
		return ((response.headers["set-cookie"] ?? []) as string[]).join("; ")
	}

	const hit = async (path: string, cookie?: string) => {
		calls = 0
		resolved = 0
		const pending = request(server()).get(path)
		if (cookie) pending.set("Cookie", cookie)
		return pending
	}

	it("reads the session at most once for a signed-in permissions request", async () => {
		const response = await hit("/api/v1/me/permissions", adminCookie)

		expect(response.status).toBe(200)
		expect(response.body).toEqual(
			expect.objectContaining({
				roles: expect.any(Array),
				permissions: expect.any(Array),
			})
		)
		expect(calls).toBe(1)
		expect(resolved).toBe(1)
	})

	it("reads the session at most once for an admin directory request", async () => {
		const response = await hit("/api/v1/rbac/users", adminCookie)

		expect(response.status).toBe(200)
		expect(calls).toBe(1)
		expect(resolved).toBe(1)
	})

	it("resolves no session and returns 401 for an anonymous protected route", async () => {
		const response = await hit("/api/v1/me/permissions")

		expect(response.status).toBe(401)
		expect(response.body.error.message).toBe("Unauthorized")
		expect(response.body.error.details).toEqual({ code: "UNAUTHORIZED" })
		expect(calls).toBe(1)
		expect(resolved).toBe(0)
	})

	it("resolves no session and returns 401 for a forged cookie", async () => {
		const response = await hit("/api/v1/me/permissions", FORGED_COOKIE)

		expect(response.status).toBe(401)
		expect(response.body.error.message).toBe("Unauthorized")
		expect(calls).toBe(1)
		expect(resolved).toBe(0)
	})

	it("returns 401 for a forged cookie on a permission-protected route", async () => {
		const response = await hit("/api/v1/rbac/users", FORGED_COOKIE)

		expect(response.status).toBe(401)
		expect(response.body.error.message).toBe("Authentication required")
		expect(calls).toBe(1)
		expect(resolved).toBe(0)
	})

	it("returns 401 from the permission guard when a directory request has no session", async () => {
		const response = await hit("/api/v1/rbac/users")

		expect(response.status).toBe(401)
		expect(response.body.error.message).toBe("Authentication required")
		expect(resolved).toBe(0)
		expect(calls).toBe(1)
	})

	it("returns 403 when the signed-in user lacks permission", async () => {
		const response = await hit("/api/v1/rbac/users", userCookie)

		expect(response.status).toBe(403)
		expect(response.body.error.message).toBe("Forbidden")
		expect(calls).toBe(1)
		expect(resolved).toBe(1)
	})

	it("returns 200 for an admin who has permission", async () => {
		const response = await hit("/api/v1/rbac/users", adminCookie)

		expect(response.status).toBe(200)
		expect(calls).toBe(1)
		expect(resolved).toBe(1)
	})

	it("keeps an AllowAnonymous route reachable without a session", async () => {
		const response = await hit("/api/v1/health")

		expect(response.status).toBe(200)
		expect(calls).toBe(1)
		expect(resolved).toBe(0)
	})

	it("keeps the public todo list reachable without a session", async () => {
		const response = await hit("/api/v1/example/todos")

		expect(response.status).toBe(200)
		expect(Array.isArray(response.body)).toBe(true)
		expect(calls).toBe(1)
		expect(resolved).toBe(0)
	})
})
