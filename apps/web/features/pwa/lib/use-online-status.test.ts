import { afterEach, describe, expect, it, vi } from "vitest"

import { env } from "@/env"

import { subscribeOnlineStatus } from "./use-online-status"

const unsubscribers: Array<() => void> = []

afterEach(() => {
	for (const unsubscribe of unsubscribers.splice(0)) unsubscribe()
	vi.unstubAllEnvs()
	vi.unstubAllGlobals()
	vi.restoreAllMocks()
	vi.useRealTimers()
})

function subscribe(callback: (online: boolean) => void = () => {}) {
	const unsubscribe = subscribeOnlineStatus(callback)
	unsubscribers.push(unsubscribe)
	return unsubscribe
}

function setOnLine(value: boolean) {
	vi.spyOn(window.navigator, "onLine", "get").mockReturnValue(value)
}

describe("subscribeOnlineStatus without an API origin", () => {
	it.each([
		["unset", undefined],
		["empty", ""],
		["whitespace", "   "],
	] as const)("does not fetch when NEXT_PUBLIC_API_BASE_URL is %s", async (_label, value) => {
		// `env.NEXT_PUBLIC_API_BASE_URL` stays the value captured at import, which
		// is exactly the zod-default trap: a localhost base with no raw variable.
		vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", value)
		const fetchMock = vi.fn()
		vi.stubGlobal("fetch", fetchMock)
		vi.useFakeTimers()
		setOnLine(true)

		subscribe()
		await vi.advanceTimersByTimeAsync(20_000)

		expect(fetchMock).not.toHaveBeenCalled()
		expect(env.NEXT_PUBLIC_API_BASE_URL).toBeTruthy()
	})

	it("follows navigator.onLine and still does not fetch", () => {
		vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", undefined)
		const fetchMock = vi.fn()
		vi.stubGlobal("fetch", fetchMock)
		setOnLine(true)

		const states: boolean[] = []
		subscribe(online => {
			states.push(online)
		})
		expect(states.at(-1)).toBe(true)

		setOnLine(false)
		window.dispatchEvent(new Event("offline"))
		expect(states.at(-1)).toBe(false)

		setOnLine(true)
		window.dispatchEvent(new Event("online"))
		expect(states.at(-1)).toBe(true)
		expect(fetchMock).not.toHaveBeenCalled()
	})
})

describe("subscribeOnlineStatus with an API origin", () => {
	it("probes the configured health endpoint", () => {
		// The raw variable, not the localhost value vitest.setup.ts injects when it is missing.
		vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/api")
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
		vi.stubGlobal("fetch", fetchMock)
		setOnLine(true)

		subscribe()

		expect(fetchMock).toHaveBeenCalledTimes(1)
		const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
		expect(String(url).replace(/\?t=\d+$/, "")).toBe(
			`${env.NEXT_PUBLIC_API_BASE_URL}/${env.NEXT_PUBLIC_API_VERSION}/health`
		)
		expect(init).toMatchObject({
			method: "GET",
			mode: "no-cors",
			cache: "no-store",
		})
	})

	it("shares one probe across subscribers", () => {
		vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/api")
		const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
		vi.stubGlobal("fetch", fetchMock)
		setOnLine(true)

		subscribe()
		subscribe()

		expect(fetchMock).toHaveBeenCalledTimes(1)
	})

	it("does not fetch when the browser is offline", () => {
		vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://api.example.test/api")
		const fetchMock = vi.fn()
		vi.stubGlobal("fetch", fetchMock)
		setOnLine(false)

		const states: boolean[] = []
		subscribe(online => {
			states.push(online)
		})

		expect(states.at(-1)).toBe(false)
		expect(fetchMock).not.toHaveBeenCalled()
	})
})
