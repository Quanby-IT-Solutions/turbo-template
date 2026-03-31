import { describe, expect, it } from "vitest"

import {
	transformDateFields,
	transformDateFieldsArray,
	transformToDateFields,
	transformToDateFieldsArray,
} from "./date-transform"

describe("transformDateFields", () => {
	it("converts string date fields to Date objects", () => {
		const input = { id: 1, name: "item", createdAt: "2024-01-15T10:00:00.000Z" }
		const result = transformDateFields(input, ["createdAt"])
		expect(result.createdAt).toBeInstanceOf(Date)
		expect((result.createdAt as Date).toISOString()).toBe("2024-01-15T10:00:00.000Z")
	})

	it("leaves already-Date fields unchanged", () => {
		const date = new Date("2024-01-15T00:00:00.000Z")
		const input = { id: 1, createdAt: date as unknown as string }
		const result = transformDateFields(input, ["createdAt"])
		expect(result.createdAt).toBe(date)
	})

	it("handles multiple date fields in a single call", () => {
		const input = {
			createdAt: "2024-01-15T00:00:00.000Z",
			updatedAt: "2024-02-20T00:00:00.000Z",
		}
		const result = transformDateFields(input, ["createdAt", "updatedAt"])
		expect(result.createdAt).toBeInstanceOf(Date)
		expect(result.updatedAt).toBeInstanceOf(Date)
	})

	it("does not mutate the original object", () => {
		const input = { createdAt: "2024-01-15T00:00:00.000Z" }
		transformDateFields(input, ["createdAt"])
		expect(typeof input.createdAt).toBe("string")
	})

	it("leaves fields not in the list unchanged", () => {
		const input = { createdAt: "2024-01-15T00:00:00.000Z", title: "hello" }
		const result = transformDateFields(input, ["createdAt"])
		expect(result.title).toBe("hello")
	})
})

describe("transformDateFieldsArray", () => {
	it("transforms date fields on every item in the array", () => {
		const items = [
			{ id: 1, createdAt: "2024-01-15T00:00:00.000Z" },
			{ id: 2, createdAt: "2024-02-20T00:00:00.000Z" },
		]
		const result = transformDateFieldsArray(items, ["createdAt"])
		expect(result[0]?.createdAt).toBeInstanceOf(Date)
		expect(result[1]?.createdAt).toBeInstanceOf(Date)
	})

	it("returns an empty array when given an empty array", () => {
		expect(transformDateFieldsArray([], ["createdAt"])).toEqual([])
	})
})

describe("transformToDateFields", () => {
	it("converts string date fields using the type-safe overload", () => {
		interface Input {
			id: number
			createdAt: string
		}
		interface Output {
			id: number
			createdAt: Date
		}
		const input: Input = { id: 1, createdAt: "2024-03-01T00:00:00.000Z" }
		const result = transformToDateFields<Input, Output>(input, ["createdAt"])
		expect((result as Output).createdAt).toBeInstanceOf(Date)
	})

	it("leaves non-string fields untouched", () => {
		const input = { id: 1, name: "test", createdAt: "2024-03-01T00:00:00.000Z" }
		const result = transformToDateFields(input, ["createdAt"])
		expect(result.id).toBe(1)
		expect(result.name).toBe("test")
	})

	it("leaves an already-Date field unchanged", () => {
		const date = new Date("2024-03-01T00:00:00.000Z")
		const input = { createdAt: date as unknown as string }
		const result = transformToDateFields(input, ["createdAt"])
		expect(result.createdAt).toBe(date)
	})
})

describe("transformToDateFieldsArray", () => {
	it("applies transformation to each item in the array", () => {
		const items = [
			{ id: 1, createdAt: "2024-01-01T00:00:00.000Z" },
			{ id: 2, createdAt: "2024-06-01T00:00:00.000Z" },
		]
		const result = transformToDateFieldsArray(items, ["createdAt"])
		result.forEach(item => {
			expect((item as typeof items[0] & { createdAt: Date }).createdAt).toBeInstanceOf(Date)
		})
	})

	it("returns an empty array when given an empty array", () => {
		expect(transformToDateFieldsArray([], ["createdAt"])).toEqual([])
	})
})
