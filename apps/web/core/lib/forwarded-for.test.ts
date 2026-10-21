// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest"

import { getForwardedForHeader } from "@/core/lib/server-utils"
import { getSession } from "@/services/better-auth/auth-server"
import { getAccess } from "@/features/dashboard/server/get-access"

const headerState = vi.hoisted(() => ({
	forwardedFor: null as string | null,
}))

const fetchMock = vi.hoisted(() => vi.fn())

vi.mock("server-only", () => ({}))

vi.mock("react", async () => {
	const actual = await vi.importActual<Record<string, unknown>>("react")
	return {
		...actual,
		cache: (fn: unknown) => fn,
	}
})

vi.mock("next/headers", () => ({
	headers: async () => ({
		get: (name: string) => {
			if (name === "cookie") {
				return "session=abc"
			}
			if (name === "x-forwarded-for") {
				return headerState.forwardedFor
			}
			return null
		},
	}),
}))

function lastCall(): { url: string; headers: Record<string, string>; cache: string } {
	const call = fetchMock.mock.calls.at(-1)
	const init = call?.[1] as { headers: Record<string, string>; cache: string }
	return { url: String(call?.[0]), headers: init.headers, cache: init.cache }
}

beforeEach(() => {
	headerState.forwardedFor = null
	fetchMock.mockReset()
	fetchMock.mockResolvedValue({
		ok: true,
		status: 200,
		json: async () => ({ roles: [], permissions: [] }),
	})
	vi.stubGlobal("fetch", fetchMock)
})

describe("getForwardedForHeader", () => {
	it("returns the inbound forwarded header verbatim", async () => {
		headerState.forwardedFor = " 198.51.100.4, 203.0.113.8 "
		await expect(getForwardedForHeader()).resolves.toBe(" 198.51.100.4, 203.0.113.8 ")
	})

	it("returns nothing when the request has no forwarded header", async () => {
		headerState.forwardedFor = null
		await expect(getForwardedForHeader()).resolves.toBeUndefined()
	})

	it("returns nothing when the forwarded header is empty", async () => {
		headerState.forwardedFor = ""
		await expect(getForwardedForHeader()).resolves.toBeUndefined()
	})
})

describe("server-side session and access reads", () => {
	it("sends the inbound forwarded header verbatim on a session read", async () => {
		headerState.forwardedFor = "198.51.100.4, 203.0.113.8"
		await getSession()

		const { url, headers, cache } = lastCall()
		expect(url).toMatch(/\/auth\/get-session$/)
		expect(cache).toBe("no-store")
		expect(headers).toEqual({
			"Content-Type": "application/json",
			"cookie": "session=abc",
			"x-forwarded-for": "198.51.100.4, 203.0.113.8",
		})
	})

	it("omits the forwarded header on a session read when none arrived", async () => {
		headerState.forwardedFor = null
		await getSession()

		const { headers } = lastCall()
		expect(headers.cookie).toBe("session=abc")
		expect(headers).not.toHaveProperty("x-forwarded-for")
	})

	it("sends the inbound forwarded header verbatim on an access read", async () => {
		headerState.forwardedFor = " 203.0.113.8,203.0.113.9 "
		await getAccess()

		const { url, headers } = lastCall()
		expect(url).toMatch(/\/me\/permissions$/)
		expect(headers["x-forwarded-for"]).toBe(" 203.0.113.8,203.0.113.9 ")
		expect(headers.cookie).toBe("session=abc")
	})

	it("omits the forwarded header on an access read when none arrived", async () => {
		headerState.forwardedFor = ""
		await getAccess()

		const { headers } = lastCall()
		expect(headers.cookie).toBe("session=abc")
		expect(headers).not.toHaveProperty("x-forwarded-for")
	})
})
