import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { LoginForm } from "./login-form"

const signInEmail = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}))

vi.mock("next/image", () => ({
	default: ({ alt }: { alt?: string }) => <span role="img" aria-label={alt ?? ""} />,
}))

vi.mock("@/services/better-auth/auth-client", () => ({
	authClient: {
		signIn: {
			email: signInEmail,
			social: vi.fn(),
		},
	},
}))

function renderForm() {
	const queryClient = new QueryClient({
		defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
	})
	return render(
		<QueryClientProvider client={queryClient}>
			<LoginForm />
		</QueryClientProvider>
	)
}

async function submitCredentials() {
	const user = userEvent.setup()
	await user.type(screen.getByLabelText(/^email$/i), "ada@example.com")
	await user.type(screen.getByLabelText(/^password$/i), "wrong-password")
	await user.click(screen.getByRole("button", { name: /^login$/i }))
}

beforeEach(() => {
	signInEmail.mockReset()
})

describe("LoginForm sign-in errors", () => {
	it("renders login-error and does not throw when sign-in is rejected", async () => {
		signInEmail.mockResolvedValue({
			error: { message: "Invalid email or password", status: 401 },
		})
		// jsdom does not dispatch PromiseRejectionEvent on window. Node emits
		// process "unhandledRejection" for the same failure, which is what a
		// missing try/catch in onSubmit actually produces.
		const rejections: unknown[] = []
		const onRejection = (reason: unknown) => {
			rejections.push(reason)
		}
		process.on("unhandledRejection", onRejection)

		try {
			renderForm()
			await submitCredentials()

			const banner = await screen.findByTestId("login-error")
			expect(banner).toHaveAttribute("role", "alert")
			expect(banner).toHaveTextContent("Invalid email or password")
			await new Promise(resolve => setTimeout(resolve, 0))
			expect(rejections).toEqual([])
		} finally {
			process.off("unhandledRejection", onRejection)
		}
	})

	it("shows the unverified banner with resend, not the generic error", async () => {
		signInEmail.mockResolvedValue({
			error: { message: "Email not verified", code: "EMAIL_NOT_VERIFIED", status: 403 },
		})

		renderForm()
		await submitCredentials()

		const banner = await screen.findByTestId("login-unverified-error")
		expect(banner).toHaveAttribute("role", "alert")
		expect(banner).toHaveTextContent("Please verify your email before signing in.")
		expect(screen.getByRole("button", { name: /resend verification email/i })).toBeInTheDocument()
		expect(screen.queryByTestId("login-error")).not.toBeInTheDocument()
	})

	it("shows the rate-limit countdown and not the generic error", async () => {
		signInEmail.mockResolvedValue({
			error: {
				status: 429,
				message: "Too many requests",
				headers: {
					get: (name: string) => (name.toLowerCase() === "retry-after" ? "12" : null),
				},
			},
		})

		renderForm()
		await submitCredentials()

		expect(await screen.findByText(/try again in 12 seconds/i)).toBeInTheDocument()
		expect(screen.getByRole("button", { name: /try again in 12s/i })).toBeDisabled()
		expect(screen.queryByTestId("login-error")).not.toBeInTheDocument()
		expect(screen.queryByTestId("login-unverified-error")).not.toBeInTheDocument()
	})
})
