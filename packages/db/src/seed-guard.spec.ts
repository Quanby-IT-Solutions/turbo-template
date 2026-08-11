import { describe, expect, it } from "vitest"

import {
	ALLOW_REMOTE_SEED_ENV,
	assertSeedAllowed,
	FORCE_PASSWORD_FLAG,
	hasForcePasswordFlag,
	isLocalDatabaseUrl,
	resolveSeedPassword,
	SeedRefusedError,
	shouldWritePassword,
} from "./seed-guard.js"

// AC-2 / F-06: the seeder provisions a pre-verified Admin. It must refuse
// production before any write, never use a fixed password, and never rotate an
// existing password without an explicit opt-in.

const LOCAL_URL = "postgres://postgres:password@localhost:5432/turbo-template"
const REMOTE_URL = "postgres://app:hunter2@db.prod.example.com:5432/app"

describe("assertSeedAllowed", () => {
	it("refuses when NODE_ENV is production, even against a local database", () => {
		expect(() => assertSeedAllowed({ nodeEnv: "production", databaseUrl: LOCAL_URL })).toThrow(
			SeedRefusedError
		)
		expect(() => assertSeedAllowed({ nodeEnv: "production", databaseUrl: LOCAL_URL })).toThrow(
			/NODE_ENV=production/
		)
	})

	it("refuses a production-shaped DATABASE_URL even when NODE_ENV is development", () => {
		expect(() => assertSeedAllowed({ nodeEnv: "development", databaseUrl: REMOTE_URL })).toThrow(
			SeedRefusedError
		)
		expect(() => assertSeedAllowed({ nodeEnv: "development", databaseUrl: REMOTE_URL })).toThrow(
			new RegExp(ALLOW_REMOTE_SEED_ENV)
		)
	})

	it("still refuses a remote database in production even with the remote opt-in", () => {
		expect(() =>
			assertSeedAllowed({ nodeEnv: "production", databaseUrl: REMOTE_URL, allowRemote: true })
		).toThrow(SeedRefusedError)
	})

	it("allows a remote non-production database only with the explicit opt-in", () => {
		expect(() =>
			assertSeedAllowed({ nodeEnv: "development", databaseUrl: REMOTE_URL, allowRemote: true })
		).not.toThrow()
	})

	it("allows local development and test runs", () => {
		expect(() =>
			assertSeedAllowed({ nodeEnv: "development", databaseUrl: LOCAL_URL })
		).not.toThrow()
		expect(() => assertSeedAllowed({ nodeEnv: "test", databaseUrl: LOCAL_URL })).not.toThrow()
		expect(() => assertSeedAllowed({ nodeEnv: undefined, databaseUrl: LOCAL_URL })).not.toThrow()
	})
})

describe("isLocalDatabaseUrl", () => {
	it.each([
		"postgres://u:p@localhost:5432/db",
		"postgres://u:p@127.0.0.1:5432/db",
		"postgres://u:p@host.docker.internal:5432/db",
		"postgres://u:p@postgres:5432/db",
		"postgresql://u:p@DB:5432/db",
	])("treats %s as local", url => {
		expect(isLocalDatabaseUrl(url)).toBe(true)
	})

	it.each([
		"postgres://u:p@db.prod.example.com:5432/db",
		"postgres://u:p@10.0.4.19:5432/db",
		"postgres://u:p@rds.amazonaws.com:5432/db",
	])("treats %s as non-local", url => {
		expect(isLocalDatabaseUrl(url)).toBe(false)
	})

	it("fails closed on an unparseable connection string", () => {
		expect(isLocalDatabaseUrl("not a url")).toBe(false)
		expect(isLocalDatabaseUrl("")).toBe(false)
	})
})

describe("resolveSeedPassword", () => {
	it("uses SEED_ADMIN_PASSWORD when supplied and flags it as not generated", () => {
		expect(resolveSeedPassword("operator-chosen-password")).toEqual({
			password: "operator-chosen-password",
			generated: false,
		})
	})

	it("ignores a blank SEED_ADMIN_PASSWORD and generates instead", () => {
		const result = resolveSeedPassword("   ")

		expect(result.generated).toBe(true)
		expect(result.password.length).toBeGreaterThanOrEqual(32)
	})

	it("generates a distinct random password when none is supplied", () => {
		const first = resolveSeedPassword(undefined)
		const second = resolveSeedPassword(undefined)

		expect(first.generated).toBe(true)
		expect(first.password).not.toBe(second.password)
		// The old fixed credential must be gone for good.
		expect(first.password).not.toBe("password123")
	})
})

describe("hasForcePasswordFlag", () => {
	it("detects the flag and defaults to not forcing", () => {
		expect(hasForcePasswordFlag([FORCE_PASSWORD_FLAG])).toBe(true)
		expect(hasForcePasswordFlag(["--other", FORCE_PASSWORD_FLAG])).toBe(true)
		expect(hasForcePasswordFlag([])).toBe(false)
		expect(hasForcePasswordFlag(["--force"])).toBe(false)
	})
})

describe("shouldWritePassword", () => {
	it("writes a password for an account that does not exist yet", () => {
		expect(shouldWritePassword({ accountExists: false, forcePassword: false })).toBe(true)
	})

	it("preserves an existing password on a plain re-run", () => {
		expect(shouldWritePassword({ accountExists: true, forcePassword: false })).toBe(false)
	})

	it("rotates an existing password only with the explicit flag", () => {
		expect(shouldWritePassword({ accountExists: true, forcePassword: true })).toBe(true)
	})
})
