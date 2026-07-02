import { describe, expect, it } from "vitest"

import { booleanFromEnv } from "./bool-schema.js"

describe("booleanFromEnv", () => {
	it('parses "false" as false', () => {
		expect(booleanFromEnv.parse("false")).toBe(false)
	})

	it('parses "true" as true', () => {
		expect(booleanFromEnv.parse("true")).toBe(true)
	})

	it('parses "0" as false', () => {
		expect(booleanFromEnv.parse("0")).toBe(false)
	})

	it('parses "1" as true', () => {
		expect(booleanFromEnv.parse("1")).toBe(true)
	})

	it("passes through actual boolean false", () => {
		expect(booleanFromEnv.parse(false)).toBe(false)
	})

	it("passes through actual boolean true", () => {
		expect(booleanFromEnv.parse(true)).toBe(true)
	})

	it.each(["yes", "on", ""])("rejects invalid string %j", value => {
		expect(() => booleanFromEnv.parse(value)).toThrow()
	})
})
