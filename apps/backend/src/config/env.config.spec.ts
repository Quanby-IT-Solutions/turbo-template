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
