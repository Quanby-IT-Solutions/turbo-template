import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { useIsMobile } from "./use-mobile"

const MOBILE_BREAKPOINT = 768

function createMatchMediaMock(changeListeners: Array<() => void> = []) {
	return vi.fn().mockImplementation((query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn((event: string, handler: () => void) => {
			if (event === "change") changeListeners.push(handler)
		}),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	}))
}

describe("useIsMobile", () => {
	let originalMatchMedia: typeof window.matchMedia
	let originalInnerWidth: number

	beforeEach(() => {
		originalMatchMedia = window.matchMedia
		originalInnerWidth = window.innerWidth
	})

	afterEach(() => {
		window.matchMedia = originalMatchMedia
		Object.defineProperty(window, "innerWidth", {
			value: originalInnerWidth,
			writable: true,
			configurable: true,
		})
		vi.restoreAllMocks()
	})

	describe("initial value based on viewport width", () => {
		it("returns false when viewport is wider than the mobile breakpoint", () => {
			Object.defineProperty(window, "innerWidth", {
				value: MOBILE_BREAKPOINT,
				writable: true,
				configurable: true,
			})
			window.matchMedia = createMatchMediaMock()

			const { result } = renderHook(() => useIsMobile())

			expect(result.current).toBe(false)
		})

		it("returns true when viewport is narrower than the mobile breakpoint", () => {
			Object.defineProperty(window, "innerWidth", {
				value: MOBILE_BREAKPOINT - 1,
				writable: true,
				configurable: true,
			})
			window.matchMedia = createMatchMediaMock()

			const { result } = renderHook(() => useIsMobile())

			expect(result.current).toBe(true)
		})

		it("returns false on a typical desktop width", () => {
			Object.defineProperty(window, "innerWidth", {
				value: 1440,
				writable: true,
				configurable: true,
			})
			window.matchMedia = createMatchMediaMock()

			const { result } = renderHook(() => useIsMobile())

			expect(result.current).toBe(false)
		})
	})

	describe("resize behaviour", () => {
		it("updates to true when a resize event narrows the viewport below the breakpoint", () => {
			Object.defineProperty(window, "innerWidth", {
				value: 1024,
				writable: true,
				configurable: true,
			})

			const listeners: Array<() => void> = []
			window.matchMedia = createMatchMediaMock(listeners)

			const { result } = renderHook(() => useIsMobile())
			expect(result.current).toBe(false)

			act(() => {
				Object.defineProperty(window, "innerWidth", {
					value: 375,
					writable: true,
					configurable: true,
				})
				listeners.forEach(fn => fn())
			})

			expect(result.current).toBe(true)
		})

		it("updates to false when a resize event widens the viewport above the breakpoint", () => {
			Object.defineProperty(window, "innerWidth", {
				value: 375,
				writable: true,
				configurable: true,
			})

			const listeners: Array<() => void> = []
			window.matchMedia = createMatchMediaMock(listeners)

			const { result } = renderHook(() => useIsMobile())
			expect(result.current).toBe(true)

			act(() => {
				Object.defineProperty(window, "innerWidth", {
					value: 1024,
					writable: true,
					configurable: true,
				})
				listeners.forEach(fn => fn())
			})

			expect(result.current).toBe(false)
		})

		it("removes the event listener on unmount", () => {
			Object.defineProperty(window, "innerWidth", {
				value: 1024,
				writable: true,
				configurable: true,
			})
			const mql = {
				matches: false,
				media: "",
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}
			window.matchMedia = vi.fn().mockReturnValue(mql)

			const { unmount } = renderHook(() => useIsMobile())
			unmount()

			expect(mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function))
		})
	})
})
