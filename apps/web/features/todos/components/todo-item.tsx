"use client"

import { Delete02Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { Todo } from "@repo/contracts"

import { Button } from "@/core/components/ui/button"
import { Checkbox } from "@/core/components/ui/checkbox"
import { cn } from "@/core/lib/utils"
import { useDeleteTodoMutation, useToggleTodoMutation } from "@/features/todos/api/todos.hooks"

interface TodoItemProps {
	todo: Todo
	canEdit: boolean
	canDelete: boolean
}

export function TodoItem({ todo, canEdit, canDelete }: TodoItemProps) {
	const toggle = useToggleTodoMutation()
	const remove = useDeleteTodoMutation()

	const error = toggle.error ?? remove.error
	const isBusy = toggle.isPending || remove.isPending

	return (
		<div className="flex flex-col gap-1 rounded-lg border p-3">
			<div className="flex items-center gap-3">
				<Checkbox
					checked={todo.completed}
					disabled={!canEdit || isBusy}
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
				{canDelete ? (
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => remove.mutate(todo.id)}
						disabled={isBusy}
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
