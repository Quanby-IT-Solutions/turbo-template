import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { TodosView } from "./todos-view"

vi.mock("@/features/todos/api/todos.hooks", () => ({
	useTodosQuery: () => ({
		data: [],
		isError: false,
		error: null,
		fetchStatus: "idle",
		status: "success",
	}),
	useCreateTodoMutation: () => ({
		mutate: vi.fn(),
		isPending: false,
		isPaused: false,
		isError: false,
		error: null,
	}),
	useTodoReplayErrors: () => ({ hasErrors: false, message: "" }),
}))

vi.mock("@/services/tanstack-query/use-query-loading", () => ({
	useIsQueryLoading: () => () => false,
}))

vi.mock("@/core/hooks/use-rate-limit-toast", () => ({
	useRateLimitToast: () => ({ isActive: false, secondsLeft: 0 }),
}))

describe("TodosView permission states", () => {
	it("shows that permissions could not be loaded when the access read failed", () => {
		render(<TodosView access={{ roles: [], permissions: [], status: "error" }} />)

		expect(screen.getAllByText("Permissions could not be loaded").length).toBeGreaterThan(0)
		expect(screen.queryByPlaceholderText("You lack posts:create")).not.toBeInTheDocument()
		expect(screen.queryByText(/posts:create/)).not.toBeInTheDocument()
		expect(screen.queryByText(/posts:edit/)).not.toBeInTheDocument()
		expect(screen.queryByText(/posts:delete/)).not.toBeInTheDocument()
	})

	it("shows the missing permission when the profile loaded without posts:create", () => {
		render(<TodosView access={{ roles: [], permissions: [], status: "loaded" }} />)

		expect(screen.getByPlaceholderText("You lack posts:create")).toBeInTheDocument()
		expect(screen.getByText(/posts:create/)).toBeInTheDocument()
		expect(screen.queryByText("Permissions could not be loaded")).not.toBeInTheDocument()
	})
})
