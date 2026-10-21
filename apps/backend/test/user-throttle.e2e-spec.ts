import { type INestApplication } from "@nestjs/common"
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import { type App } from "supertest/types"

import { createApplication } from "../src/bootstrap"
import { env } from "../src/config/env.config"
import { resolveE2eAdminPassword } from "./e2e-admin-password"

/**
 * Test-only window. Production `THROTTLE_LIMIT` stays at its configured value;
 * this file lowers the shared env object for the app it boots, then puts it back.
 */
const TEST_LIMIT = 3

const ADMIN_EMAIL = "admin@turbo-template.local"
const OTHER_EMAIL = "alex@turbo-template.local"

describe("per-user request limiter (e2e)", () => {
	let app: INestApplication<App>
	let originalLimit: number

	beforeAll(async () => {
		originalLimit = env.THROTTLE_LIMIT
		Reflect.set(env, "THROTTLE_LIMIT", TEST_LIMIT)
		app = (await createApplication()) as INestApplication<App>
		await app.init()
	})

	afterAll(async () => {
		Reflect.set(env, "THROTTLE_LIMIT", originalLimit)
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

	it("keeps a second user under the limit after the first user from the same address exhausts it", async () => {
		const adminCookie = await signIn(ADMIN_EMAIL)
		const otherCookie = await signIn(OTHER_EMAIL)

		for (let i = 0; i < TEST_LIMIT; i++) {
			const ok = await request(server()).get("/api/v1/me/permissions").set("Cookie", adminCookie)
			expect(ok.status).toBe(200)
			expect(ok.headers["x-ratelimit-limit"]).toBe(String(TEST_LIMIT))
		}

		const blocked = await request(server()).get("/api/v1/me/permissions").set("Cookie", adminCookie)
		expect(blocked.status).toBe(429)

		const other = await request(server()).get("/api/v1/me/permissions").set("Cookie", otherCookie)
		expect(other.status).toBe(200)
		expect(other.body).toEqual(
			expect.objectContaining({
				roles: expect.any(Array),
				permissions: expect.any(Array),
			})
		)
	})

	it("still returns 429 when an anonymous client passes the limit", async () => {
		for (let i = 0; i < TEST_LIMIT; i++) {
			const ok = await request(server()).get("/api/v1/example/todos")
			expect(ok.status).toBe(200)
			expect(ok.headers["x-ratelimit-limit"]).toBe(String(TEST_LIMIT))
		}

		const blocked = await request(server()).get("/api/v1/example/todos")
		expect(blocked.status).toBe(429)
	})
})
