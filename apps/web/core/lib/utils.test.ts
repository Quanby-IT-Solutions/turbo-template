import { describe, expect, it } from "vitest"

import { getApiUrl, getAppUrl, getInitials } from "./utils"

describe("getAppUrl", () => {
	it("returns the app URL from env", () => {
		expect(getAppUrl()).toBe("http://localhost:3001")
	})
})

describe("getApiUrl", () => {
	it("returns the versioned API URL from env", () => {
		expect(getApiUrl()).toBe("http://localhost:3000/v1")
	})
})

describe("getInitials", () => {
	it("returns empty string for empty input", () => {
		expect(getInitials("")).toBe("")
	})

	it("returns empty string for whitespace-only input", () => {
		expect(getInitials("   ")).toBe("")
	})

	it("returns first 2 chars uppercased for a single word", () => {
		expect(getInitials("Alice")).toBe("AL")
	})

	it("returns both chars uppercased for a single 2-char word", () => {
		expect(getInitials("Al")).toBe("AL")
	})

	it("returns the single char uppercased for a one-char word", () => {
		expect(getInitials("A")).toBe("A")
	})

	it("returns first and last initials for two words", () => {
		expect(getInitials("John Doe")).toBe("JD")
	})

	it("returns first and last initials for more than two words", () => {
		expect(getInitials("Mary Jane Watson")).toBe("MW")
	})

	it("handles extra whitespace between words", () => {
		expect(getInitials("John   Doe")).toBe("JD")
	})

	it("uppercases lowercase initials", () => {
		expect(getInitials("john doe")).toBe("JD")
	})
})
