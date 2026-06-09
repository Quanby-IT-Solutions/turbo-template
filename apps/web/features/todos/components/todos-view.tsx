"use client"

import { useState } from "react"
import { Task01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { PageHeader } from "@/core/components/page-header"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/core/components/ui/card"
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/core/components/ui/empty"
import { Input } from "@/core/components/ui/input"
import { Skeleton } from "@/core/components/ui/skeleton"
import { canAccess, type AccessProfile } from "@/features/dashboard/lib/access"
import { useCreateTodoMutation, useTodosQuery } from "@/features/todos/api/todos.hooks"
import { TodoItem } from "@/features/todos/components/todo-item"

interface TodosViewProps {
	access: AccessProfile
}

export function TodosView({ access }: TodosViewProps) {
	const canCreate = canAccess(access, { requiredPermission: "posts:create" })
	const canEdit = canAccess(access, { requiredPermission: "posts:edit" })
	const canDelete = canAccess(access, { requiredPermission: "posts:delete" })

	const { data: todos, isLoading, isError, error } = useTodosQuery()
	const createTodo = useCreateTodoMutation()
	const [title, setTitle] = useState("")

	function handleCreate(event: React.FormEvent) {
		event.preventDefault()
		const trimmed = title.trim()
		if (!trimmed) return
		createTodo.mutate({ title: trimmed, completed: false }, { onSuccess: () => setTitle("") })
	}

	return (
		<section className="flex w-full max-w-2xl flex-col gap-6">
			<PageHeader
				icon={Task01Icon}
				title="Todos / Posts"
				description="CRUD wired to the protected NestJS endpoints. Buttons reflect your permissions."
			/>

			<Card>
				<CardHeader className="gap-2">
					<CardTitle className="text-base">Your access</CardTitle>
					<CardDescription>Effective permissions on the posts resource</CardDescription>
					<div className="flex flex-wrap gap-1 pt-1">
						<PermBadge label="create" granted={canCreate} />
						<PermBadge label="edit" granted={canEdit} />
						<PermBadge label="delete" granted={canDelete} />
					</div>
				</CardHeader>
				<CardContent>
					<form className="flex gap-2" onSubmit={handleCreate}>
						<Input
							value={title}
							onChange={e => setTitle(e.target.value)}
							placeholder={canCreate ? "New todo title" : "You lack posts:create"}
							disabled={!canCreate || createTodo.isPending}
						/>
						<Button type="submit" disabled={!canCreate || createTodo.isPending}>
							{createTodo.isPending ? "Adding..." : "Add"}
						</Button>
					</form>
					{createTodo.isError ? (
						<p className="text-destructive pt-2 text-xs">
							{createTodo.error instanceof Error ? createTodo.error.message : "Create failed"}
						</p>
					) : null}
				</CardContent>
			</Card>

			<div className="flex flex-col gap-2">
				{isLoading ? (
					<>
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
						<Skeleton className="h-12 w-full" />
					</>
				) : null}
				{isError ? (
					<p className="text-destructive text-sm">
						{error instanceof Error ? error.message : "Failed to load todos"}
					</p>
				) : null}
				{todos && todos.length === 0 ? (
					<Empty className="border">
						<EmptyHeader>
							<EmptyMedia variant="icon">
								<HugeiconsIcon icon={Task01Icon} strokeWidth={2} />
							</EmptyMedia>
							<EmptyTitle>No todos yet</EmptyTitle>
							<EmptyDescription>
								{canCreate ? "Add your first todo above." : "Items will appear here once created."}
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : null}
				{todos?.map(todo => (
					<TodoItem key={todo.id} todo={todo} canEdit={canEdit} canDelete={canDelete} />
				))}
			</div>
		</section>
	)
}

function PermBadge({ label, granted }: { label: string; granted: boolean }) {
	return (
		<Badge variant={granted ? "default" : "outline"}>
			posts:{label} {granted ? "✓" : "✗"}
		</Badge>
	)
}
