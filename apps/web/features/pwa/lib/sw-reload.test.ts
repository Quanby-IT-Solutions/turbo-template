import { afterEach, describe, expect, it, vi } from "vitest"

import { createControllerChangeHandler, RELOAD_FLUSH_CAP_MS } from "./sw-reload"

afterEach(() => {
	vi.useRealTimers()
})

describe("createControllerChangeHandler", () => {
	it("does not flush or reload when the tab is uncontrolled", async () => {
		const beforeReload = vi.fn()
		const reload = vi.fn()
		const handler = createControllerChangeHandler({
			initiallyControlled: false,
			beforeReload,
			reload,
		})

		handler.onControllerChange()
		await Promise.resolve()

		expect(beforeReload).not.toHaveBeenCalled()
		expect(reload).not.toHaveBeenCalled()
	})

	it("after the first claim, a later controllerchange flushes and then reloads once", async () => {
		const order: string[] = []
		let release: () => void = () => {}
		const gate = new Promise<void>(resolve => {
			release = resolve
		})
		const handler = createControllerChangeHandler({
			initiallyControlled: false,
			beforeReload: () => {
				order.push("before")
				return gate
			},
			reload: () => {
				order.push("reload")
			},
		})

		handler.onControllerChange()
		handler.onControllerChange()

		await vi.waitFor(() => {
			expect(order).toEqual(["before"])
		})

		release()
		await gate
		await vi.waitFor(() => {
			expect(order).toEqual(["before", "reload"])
		})
	})

	it("reloads a tab that was already controlled at mount", async () => {
		const beforeReload = vi.fn().mockResolvedValue(undefined)
		const reload = vi.fn()
		const handler = createControllerChangeHandler({
			initiallyControlled: true,
			beforeReload,
			reload,
		})

		handler.onControllerChange()

		await vi.waitFor(() => {
			expect(reload).toHaveBeenCalledOnce()
		})
		expect(beforeReload).toHaveBeenCalledOnce()
	})

	it("reloads an uncontrolled tab once the user has accepted the update", async () => {
		const beforeReload = vi.fn().mockResolvedValue(undefined)
		const reload = vi.fn()
		const handler = createControllerChangeHandler({
			initiallyControlled: false,
			beforeReload,
			reload,
		})

		handler.markAccepted()
		handler.onControllerChange()

		await vi.waitFor(() => {
			expect(reload).toHaveBeenCalledOnce()
		})
		expect(beforeReload).toHaveBeenCalledOnce()
	})

	it("still reloads within the cap when the flush rejects", async () => {
		vi.useFakeTimers()
		const reload = vi.fn()
		const handler = createControllerChangeHandler({
			initiallyControlled: true,
			beforeReload: () => Promise.reject(new Error("disk full")),
			reload,
		})

		handler.onControllerChange()
		await vi.advanceTimersByTimeAsync(0)

		expect(reload).toHaveBeenCalledOnce()

		await vi.advanceTimersByTimeAsync(RELOAD_FLUSH_CAP_MS)
		expect(reload).toHaveBeenCalledOnce()
	})

	it("still reloads within the cap when the flush never settles", async () => {
		vi.useFakeTimers()
		const reload = vi.fn()
		const handler = createControllerChangeHandler({
			initiallyControlled: true,
			beforeReload: () => new Promise(() => {}),
			reload,
		})

		handler.onControllerChange()
		await vi.advanceTimersByTimeAsync(RELOAD_FLUSH_CAP_MS - 1)

		expect(reload).not.toHaveBeenCalled()

		await vi.advanceTimersByTimeAsync(1)
		expect(reload).toHaveBeenCalledOnce()
	})

	it("reloads once when controllerchange fires again during the flush", async () => {
		const reload = vi.fn()
		let release: () => void = () => {}
		const gate = new Promise<void>(resolve => {
			release = resolve
		})
		let flushes = 0
		const handler = createControllerChangeHandler({
			initiallyControlled: true,
			beforeReload: () => {
				flushes += 1
				return gate
			},
			reload,
		})

		handler.onControllerChange()
		handler.onControllerChange()
		handler.onControllerChange()
		await Promise.resolve()

		expect(flushes).toBe(1)
		expect(reload).not.toHaveBeenCalled()

		release()
		await vi.waitFor(() => {
			expect(reload).toHaveBeenCalledOnce()
		})

		handler.onControllerChange()
		await Promise.resolve()
		expect(reload).toHaveBeenCalledOnce()
		expect(flushes).toBe(1)
	})
})
