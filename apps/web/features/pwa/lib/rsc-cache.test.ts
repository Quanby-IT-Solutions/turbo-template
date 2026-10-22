import { describe, expect, it, vi } from "vitest"

import {
	isFlightErrorPayload,
	isRscPrefetchRequest,
	isRscRequest,
	RSC_EXPIRATION,
	RSC_RUNTIME_CACHE,
	rscCacheWillUpdate,
} from "./rsc-cache"

const PAGE_FLIGHT = '1:"$Sreact.fragment"\n0:{"children":"Welcome Everyone"}'
const LEADING_ERROR = 'E{"digest":"1"}'
const ROW_ERROR = '1:"$Sreact.fragment"\nc:E{"digest":"331484958"}\n11:E{"digest":"331484958"}\n'
const TEXT_MENTIONING_MARKER = '0:{"children":"see E{\\"digest\\":\\"1\\"} in the copy"}'

function request(url: string, headers: Record<string, string>, sameOrigin = true) {
	return {
		request: new Request(url, { headers }),
		url: new URL(url),
		sameOrigin,
	}
}

describe("isFlightErrorPayload", () => {
	it("accepts a page flight", () => {
		expect(isFlightErrorPayload(PAGE_FLIGHT)).toBe(false)
	})

	it("detects an error row at the start of the body", () => {
		expect(isFlightErrorPayload(LEADING_ERROR)).toBe(true)
	})

	it("detects an error row with a hex id", () => {
		expect(isFlightErrorPayload(ROW_ERROR)).toBe(true)
	})

	it("ignores the marker when it is page text", () => {
		expect(isFlightErrorPayload(TEXT_MENTIONING_MARKER)).toBe(false)
	})
})

describe("rscCacheWillUpdate", () => {
	it("caches a 200 page flight and leaves that body readable", async () => {
		const response = new Response(PAGE_FLIGHT, { status: 200 })

		await expect(rscCacheWillUpdate({ response })).resolves.toBe(response)
		await expect(response.text()).resolves.toBe(PAGE_FLIGHT)
	})

	it("caches a 200 whose text merely contains the marker", async () => {
		const response = new Response(TEXT_MENTIONING_MARKER, { status: 200 })

		await expect(rscCacheWillUpdate({ response })).resolves.toBe(response)
	})

	it.each([
		["leading error row", LEADING_ERROR],
		["hex id error row", ROW_ERROR],
	])("does not cache a 200 %s", async (_label, body) => {
		const response = new Response(body, { status: 200 })

		await expect(rscCacheWillUpdate({ response })).resolves.toBeNull()
		await expect(response.text()).resolves.toBe(body)
	})

	it.each([404, 500])("does not cache a %s", async status => {
		const response = new Response("no", { status })
		const clone = vi.spyOn(response, "clone")

		await expect(rscCacheWillUpdate({ response })).resolves.toBeNull()
		expect(clone).not.toHaveBeenCalled()
	})

	it("does not cache when the body cannot be read", async () => {
		const response = new Response(PAGE_FLIGHT, { status: 200 })
		vi.spyOn(response, "clone").mockImplementation(
			() =>
				({
					text: () => Promise.reject(new Error("unreadable")),
				}) as Response
		)

		await expect(rscCacheWillUpdate({ response })).resolves.toBeNull()
	})
})

describe("RSC request matchers", () => {
	it("matches a same-origin RSC request and not a prefetch", () => {
		const match = request("https://app.example.com/dashboard", { RSC: "1" })

		expect(isRscRequest(match)).toBe(true)
		expect(isRscPrefetchRequest(match)).toBe(false)
	})

	it("matches a prefetch", () => {
		const match = request("https://app.example.com/dashboard", {
			"RSC": "1",
			"Next-Router-Prefetch": "1",
		})

		expect(isRscPrefetchRequest(match)).toBe(true)
		expect(isRscRequest(match)).toBe(true)
	})

	it("does not match an /api RSC request", () => {
		const match = request("https://app.example.com/api/v1/auth/get-session", { RSC: "1" })

		expect(isRscRequest(match)).toBe(false)
		expect(isRscPrefetchRequest(match)).toBe(false)
	})

	it("does not match a cross-origin request", () => {
		const match = request("https://api.example.com/dashboard", { RSC: "1" }, false)

		expect(isRscRequest(match)).toBe(false)
		expect(isRscPrefetchRequest(match)).toBe(false)
	})
})

describe("RSC cache settings", () => {
	it("uses the page-data cache names and the 32-entry, 24-hour limit", () => {
		expect(RSC_RUNTIME_CACHE).toEqual({
			prefetch: "pages-rsc-prefetch",
			page: "pages-rsc",
		})
		expect(RSC_EXPIRATION).toEqual({
			maxEntries: 32,
			maxAgeSeconds: 86_400,
		})
	})
})
