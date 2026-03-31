import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

import { PasswordInput } from "./password-input"

describe("PasswordInput", () => {
	it("renders an input of type password by default", () => {
		render(<PasswordInput />)
		const input = document.querySelector("input")
		expect(input).not.toBeNull()
		expect(input?.type).toBe("password")
	})

	it("renders a show-password toggle button with an accessible label", () => {
		render(<PasswordInput />)
		expect(screen.getByRole("button", { name: /show password/i })).toBeInTheDocument()
	})

	it("reveals the password when the toggle button is clicked", async () => {
		const user = userEvent.setup()
		render(<PasswordInput />)

		await user.click(screen.getByRole("button", { name: /show password/i }))

		const input = document.querySelector("input")
		expect(input?.type).toBe("text")
	})

	it("updates the button label to hide-password after reveal", async () => {
		const user = userEvent.setup()
		render(<PasswordInput />)

		await user.click(screen.getByRole("button", { name: /show password/i }))

		expect(screen.getByRole("button", { name: /hide password/i })).toBeInTheDocument()
	})

	it("conceals the password again on a second toggle click", async () => {
		const user = userEvent.setup()
		render(<PasswordInput />)

		await user.click(screen.getByRole("button", { name: /show password/i }))
		await user.click(screen.getByRole("button", { name: /hide password/i }))

		const input = document.querySelector("input")
		expect(input?.type).toBe("password")
	})

	it("forwards a placeholder prop to the underlying input", () => {
		render(<PasswordInput placeholder="Enter your password" />)
		expect(screen.getByPlaceholderText("Enter your password")).toBeInTheDocument()
	})
})
