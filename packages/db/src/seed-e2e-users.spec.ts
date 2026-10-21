import { describe, expect, it } from "vitest"

import { E2eSeedPasswordError, prepareE2eSeed } from "./seed-e2e-users.js"
import { ALLOW_REMOTE_SEED_ENV, SeedRefusedError } from "./seed-guard.js"

// The seeder calls assertSeedAllowed() and refuses a missing password before
// it opens a connection. These tests exercise that plan. They do not write.

const LOCAL_URL = "postgres://postgres:password@localhost:5432/turbo-template"
const REMOTE_URL = "postgres://app:hunter2@db.prod.example.com:5432/app"

function env(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
	return {
		NODE_ENV: "development",
		DATABASE_URL: LOCAL_URL,
		E2E_TEST_PASSWORD: "user-a-plan-password",
		E2E_TEST_PASSWORD_B: "user-b-plan-password",
		...overrides,
	}
}

describe("prepareE2eSeed", () => {
	it("calls assertSeedAllowed and refuses NODE_ENV=production", () => {
		expect(() => prepareE2eSeed(env({ NODE_ENV: "production" }), [])).toThrow(SeedRefusedError)
		expect(() => prepareE2eSeed(env({ NODE_ENV: "production" }), [])).toThrow(/NODE_ENV=production/)
	})

	it("refuses a non-local DATABASE_URL the same way db:seed does", () => {
		expect(() => prepareE2eSeed(env({ DATABASE_URL: REMOTE_URL }), [])).toThrow(SeedRefusedError)
		expect(() => prepareE2eSeed(env({ DATABASE_URL: REMOTE_URL }), [])).toThrow(
			new RegExp(ALLOW_REMOTE_SEED_ENV)
		)
	})

	it("fails fast when E2E_TEST_PASSWORD is missing and does not require a database write", () => {
		expect(() => prepareE2eSeed(env({ E2E_TEST_PASSWORD: undefined }), [])).toThrow(
			E2eSeedPasswordError
		)
		expect(() => prepareE2eSeed(env({ E2E_TEST_PASSWORD: "   " }), [])).toThrow(/E2E_TEST_PASSWORD/)
		expect(() => prepareE2eSeed(env({ E2E_TEST_PASSWORD: undefined }), [])).not.toThrow(
			SeedRefusedError
		)
	})

	it("fails fast when E2E_TEST_PASSWORD_B is missing", () => {
		expect(() => prepareE2eSeed(env({ E2E_TEST_PASSWORD_B: "" }), [])).toThrow(
			/E2E_TEST_PASSWORD_B/
		)
	})

	it("plans pre-verified ordinary users and preserves passwords unless --force-password is set", () => {
		const plan = prepareE2eSeed(env(), [])

		expect(plan.userA.email).toBe("test@gmail.com")
		expect(plan.userA.name).toBe("E2E Test User")
		expect(plan.userB.email).toBe("e2e-user-b@turbo-template.local")
		expect(plan.userB.name).toBe("E2E User B")
		expect(plan.forcePassword).toBe(false)
		expect(prepareE2eSeed(env(), ["--force-password"]).forcePassword).toBe(true)
	})

	it("refuses to reuse the template's seeded admin, alex, or sam addresses", () => {
		expect(() => prepareE2eSeed(env({ E2E_TEST_EMAIL: "admin@turbo-template.local" }), [])).toThrow(
			/admin@turbo-template.local/
		)
		expect(() => prepareE2eSeed(env({ E2E_TEST_EMAIL_B: "sam@turbo-template.local" }), [])).toThrow(
			/sam@turbo-template.local/
		)
	})
})
