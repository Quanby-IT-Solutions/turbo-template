import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import SiteSessionError from "./error"

const refresh = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh }),
}))

describe("protected session error", () => {
	it("renders the unavailable message and retries the route without a login redirect", async () => {
		const reset = vi.fn()
		const order: string[] = []
		refresh.mockImplementation(() => {
			order.push("refresh")
		})
		reset.mockImplementation(() => {
			order.push("reset")
		})
		render(<SiteSessionError error={new Error("session read failed")} reset={reset} />)

		const alert = screen.getByTestId("session-unavailable")
		expect(alert).toHaveTextContent("We couldn't check your session. Try again.")
		expect(screen.queryByRole("link", { name: /^login$/i })).not.toBeInTheDocument()

		await userEvent.click(screen.getByRole("button", { name: "Try again" }))
		expect(refresh).toHaveBeenCalledOnce()
		expect(reset).toHaveBeenCalledOnce()
		expect(order).toEqual(["refresh", "reset"])
	})
})
