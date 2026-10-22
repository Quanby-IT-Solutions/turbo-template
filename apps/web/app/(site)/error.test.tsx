import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

import SiteError from "./error"

const refresh = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
	useRouter: () => ({ refresh }),
}))

const NEUTRAL_HEADING = "Something went wrong loading this page. Try again."

function digestOnlyError(): Error & { digest?: string } {
	const error = new Error() as Error & { digest?: string }
	error.message = ""
	error.digest = "digest-only"
	return error
}

describe("site error", () => {
	it.each([
		["plain error", new Error("session read failed")],
		["digest only", digestOnlyError()],
	])("shows a neutral heading for a %s and retries without a login link", async (_label, error) => {
		const reset = vi.fn()
		const order: string[] = []
		refresh.mockReset()
		refresh.mockImplementation(() => {
			order.push("refresh")
		})
		reset.mockImplementation(() => {
			order.push("reset")
		})
		render(<SiteError error={error} reset={reset} />)

		const alert = screen.getByTestId("session-unavailable")
		expect(alert).toHaveAttribute("role", "alert")
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(NEUTRAL_HEADING)
		expect(alert).toHaveTextContent(NEUTRAL_HEADING)
		expect(alert).not.toHaveTextContent(/session/i)
		expect(screen.queryByRole("link", { name: /^login$/i })).not.toBeInTheDocument()

		await userEvent.click(screen.getByRole("button", { name: "Try again" }))
		expect(refresh).toHaveBeenCalledOnce()
		expect(reset).toHaveBeenCalledOnce()
		expect(order).toEqual(["refresh", "reset"])
	})
})
