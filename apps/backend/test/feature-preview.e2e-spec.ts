import { type INestApplication } from "@nestjs/common"
import { afterAll, afterEach, beforeAll, describe, expect, it, jest } from "@jest/globals"
import request from "supertest"
import { type App } from "supertest/types"

import { createApplication } from "../src/bootstrap"
import { FeatureFlagsService } from "../src/common/analytics/feature-flags.service"
import { resolveE2eAdminEmail, resolveE2eAdminPassword } from "./e2e-admin-password"

/**
 * The `@FeatureFlag()` example route, through the real app: global guards,
 * the real session, the real FeatureFlagsService. Analytics is off in this
 * run (no PostHog env), so the flag reads off unless a test turns it on.
 */
describe("GET /api/v1/example/feature-preview", () => {
	const path = "/api/v1/example/feature-preview"
	let app: INestApplication<App>
	let cookie: string

	beforeAll(async () => {
		app = (await createApplication()) as INestApplication<App>
		await app.init()

		const signIn = await request(app.getHttpServer()).post("/api/v1/auth/sign-in/email").send({
			email: resolveE2eAdminEmail(),
			password: resolveE2eAdminPassword(),
		})
		expect(signIn.status).toBe(200)
		const cookies = (signIn.headers["set-cookie"] ?? []) as string[]
		cookie = cookies.map(value => value.split(";")[0]).join("; ")
	})

	afterEach(() => {
		jest.restoreAllMocks()
	})

	afterAll(async () => {
		await app?.close()
	})

	it("answers 404 while the flag is off, which is the default with no PostHog", async () => {
		const response = await request(app.getHttpServer()).get(path).set("Cookie", cookie)

		expect(response.status).toBe(404)
	})

	it("answers 200 once the flag is on for the signed-in user", async () => {
		jest.spyOn(app.get(FeatureFlagsService), "isEnabled").mockResolvedValue(true)

		const response = await request(app.getHttpServer()).get(path).set("Cookie", cookie)

		expect(response.status).toBe(200)
		expect(response.body).toEqual({ enabled: true, flag: "template-preview" })
	})

	it("answers 401 when signed out, before any flag is read", async () => {
		const isEnabled = jest.spyOn(app.get(FeatureFlagsService), "isEnabled")

		const response = await request(app.getHttpServer()).get(path)

		expect(response.status).toBe(401)
		expect(isEnabled).not.toHaveBeenCalled()
	})

	it("leaves the anonymous todos example untouched", async () => {
		const response = await request(app.getHttpServer()).get("/api/v1/example/todos")

		expect(response.status).toBe(200)
	})
})
