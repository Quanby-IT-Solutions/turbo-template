import { ValidationPipe, VersioningType, type INestApplication } from "@nestjs/common"
import { Test, type TestingModule } from "@nestjs/testing"
import request from "supertest"
import { type App } from "supertest/types"

import { AppModule } from "@/app.module"
import { db } from "@/common/database/database.client"
import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals"

const API_PREFIX = "api"
const API_VERSION = "1"
const HEALTH_ENDPOINT = `/api/v1/health`

describe("Health (e2e)", () => {
	let app: INestApplication<App>

	const createTestApp = async (): Promise<INestApplication<App>> => {
		const moduleFixture: TestingModule = await Test.createTestingModule({
			imports: [AppModule],
		})
			.overrideProvider(db)
			.useValue({
				execute: jest.fn(async () => [] as any[]),
			})
			.compile()

		const nestApp = moduleFixture.createNestApplication()
		nestApp.setGlobalPrefix(API_PREFIX)
		nestApp.enableVersioning({ type: VersioningType.URI })
		nestApp.useGlobalPipes(
			new ValidationPipe({
				whitelist: true,
				forbidNonWhitelisted: true,
				transform: true,
			})
		)
		await nestApp.init()
		return nestApp
	}

	const getHealth = () => request(app.getHttpServer()).get(HEALTH_ENDPOINT)

	beforeEach(async () => {
		app = await createTestApp()
	})

	afterEach(async () => {
		await app.close()
	})

	it("returns health status with all checks", async () => {
		const response = await getHealth().expect(200)

		expect(response.body).toMatchObject({
			status: "ok",
			checks: { database: { status: "up" } },
		})
		expect(response.body.timestamp).toBeDefined()
	})

	it("leaks no build or runtime metadata to an anonymous prober", async () => {
		// LG-2 / F-36 deliberately removed uptime, version and environment: they
		// tell an unauthenticated caller when the app last deployed and which
		// published vulnerabilities apply to this build. This asserts their
		// ABSENCE, so re-adding them fails the suite rather than passing quietly.
		const response = await getHealth().expect(200)

		expect(response.body.uptime).toBeUndefined()
		expect(response.body.version).toBeUndefined()
		expect(response.body.environment).toBeUndefined()
	})

	it("database check is up", async () => {
		const response = await getHealth().expect(200)
		expect(response.body.checks.database.status).toBe("up")
	})

	it("reports only the checks the contract declares", async () => {
		// There is no cache check; the suite used to assert one, which is part of
		// why it had drifted so far from the app it was meant to guard.
		const response = await getHealth().expect(200)
		expect(Object.keys(response.body.checks)).toEqual(["database"])
	})
})
