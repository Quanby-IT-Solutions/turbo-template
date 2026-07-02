"use client"

import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import { useRateLimitToast } from "@/core/hooks/use-rate-limit-toast"
import { cn } from "@/core/lib/utils"
import {
	useDeleteTodoMutation,
	useToggleTodoMutation,
	type TodoUi,
} from "@/features/todos/api/todos.hooks"

interface TodoItemProps {
	todo: TodoUi
	canEdit: boolean
	canDelete: boolean
}

export function TodoItem({ todo, canEdit, canDelete }: TodoItemProps) {
	const toggle = useToggleTodoMutation()
	const remove = useDeleteTodoMutation()

	// Per-action 429 countdown. Each toast is keyed by todo+action so only the
	// checkbox/delete button that hit the limit stays disabled for its window.
	const toggleRateLimit = useRateLimitToast(toggle.error, { toastId: `todo-toggle-${todo.id}` })
	const removeRateLimit = useRateLimitToast(remove.error, { toastId: `todo-delete-${todo.id}` })

	const error = toggle.error ?? remove.error
	// Optimistic rows carry a string id and cannot be acted on until the server
	// assigns a real numeric id.
	const isOptimistic = typeof todo.id !== "number"
	const isBusy = toggle.isPending || remove.isPending

	return (
		<div className="flex flex-col gap-1 rounded-lg border p-3">
			<div className="flex items-center gap-3">
				<Checkbox
					checked={todo.completed}
					disabled={!canEdit || isBusy || isOptimistic || toggleRateLimit.isActive}
					onCheckedChange={checked =>
						toggle.mutate({ id: todo.id, title: todo.title, completed: checked === true })
					}
					aria-label={`Toggle ${todo.title}`}
				/>
				<span
					className={cn("flex-1 text-sm", todo.completed && "text-muted-foreground line-through")}
				>
					{todo.title}
				</span>
				{isOptimistic ? <span className="text-muted-foreground text-xs">(queued)</span> : null}
				{canDelete ? (
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => remove.mutate(todo.id)}
						disabled={isBusy || isOptimistic || removeRateLimit.isActive}
						aria-label={`Delete ${todo.title}`}
					>
						<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
					</Button>
				) : null}
			</div>
			{error ? (
				<p className="text-destructive pl-7 text-xs">
					{error instanceof Error ? error.message : "Action failed"}
				</p>
			) : null}
		</div>
	)
}
