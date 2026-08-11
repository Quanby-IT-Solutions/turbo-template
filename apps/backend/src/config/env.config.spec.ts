import { booleanFromEnv, isApiDocsEnabled } from "@/config/api-docs.config"

describe("isApiDocsEnabled", () => {
	it("defaults to false in production when no flag is set", () => {
		expect(isApiDocsEnabled("production", undefined)).toBe(false)
	})

	it("defaults to true in development when no flag is set", () => {
		expect(isApiDocsEnabled("development", undefined)).toBe(true)
	})

	it("honors an explicit true in production", () => {
		expect(isApiDocsEnabled("production", true)).toBe(true)
	})

	it("honors an explicit false in development", () => {
		expect(isApiDocsEnabled("development", false)).toBe(false)
	})

	it("defaults to false in the test environment when no flag is set", () => {
		expect(isApiDocsEnabled("test", undefined)).toBe(false)
	})
})

describe("booleanFromEnv", () => {
	it('parses the string "true" to true', () => {
		expect(booleanFromEnv.parse("true")).toBe(true)
	})

	it('parses the string "false" to false', () => {
		expect(booleanFromEnv.parse("false")).toBe(false)
	})

	it('parses the string "1" to true and "0" to false', () => {
		expect(booleanFromEnv.parse("1")).toBe(true)
		expect(booleanFromEnv.parse("0")).toBe(false)
	})

	it("passes through actual booleans", () => {
		expect(booleanFromEnv.parse(true)).toBe(true)
		expect(booleanFromEnv.parse(false)).toBe(false)
	})

	it("rejects arbitrary strings", () => {
		expect(() => booleanFromEnv.parse("yes")).toThrow()
	})
})

// ---------------------------------------------------------------------------
// AC-1 / F-03 — BETTER_AUTH_SECRET must fail the boot, not warn.
//
// env.config validates at module load, so each case re-requires the module with
// a fresh process.env. `@repo/auth/secret-schema` is the SAME schema object the
// @repo/auth package validates with, so proving it here proves both processes.
// ---------------------------------------------------------------------------

describe("BETTER_AUTH_SECRET boot validation", () => {
	const ORIGINAL_ENV = process.env
	let consoleError: jest.SpyInstance

	const BASE_ENV: NodeJS.ProcessEnv = {
		NODE_ENV: "test",
		CORS_ORIGINS: "http://localhost",
		DATABASE_URL: "postgres://user:pass@localhost:5432/turbo-template",
		BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost",
	}

	const loadEnvConfig = (secret: string) => {
		jest.resetModules()
		process.env = { ...BASE_ENV, BETTER_AUTH_SECRET: secret }
		// t3-env prints the invalid-variable report before throwing.
		return require("@/config/env.config") as typeof import("@/config/env.config")
	}

	beforeEach(() => {
		consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)
	})

	afterEach(() => {
		consoleError.mockRestore()
		process.env = ORIGINAL_ENV
		jest.resetModules()
	})

	it("refuses to boot with the .env.example placeholder", () => {
		expect(() => loadEnvConfig("<replace-me-run-openssl-rand-base64-32>")).toThrow()
	})

	it("refuses to boot with the previously shipped working default", () => {
		expect(() => loadEnvConfig("default-secret-for-testing-change-in-production")).toThrow()
	})

	it("refuses to boot with a secret shorter than 32 characters", () => {
		expect(() => loadEnvConfig("a".repeat(31))).toThrow()
	})

	it("refuses to boot with no secret at all", () => {
		expect(() => {
			jest.resetModules()
			process.env = { ...BASE_ENV }
			require("@/config/env.config")
		}).toThrow()
	})

	it("boots with a 32+ character random secret", () => {
		const secret = "Zq3n1r5pQ8vT2wY6bK9cA4dF7gH0jL2m"
		const { env } = loadEnvConfig(secret)

		expect(env.BETTER_AUTH_SECRET).toBe(secret)
	})
})
