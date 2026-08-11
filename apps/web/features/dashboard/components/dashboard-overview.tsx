"use client"

import Link from "next/link"
import {
	ArrowRight01Icon,
	CheckmarkBadge01Icon,
	SecurityCheckIcon,
	Task01Icon,
	UserGroupIcon,
	UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react"

import { Badge } from "@/core/components/ui/badge"
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
import { Skeleton } from "@/core/components/ui/skeleton"
import { cn } from "@/core/lib/utils"
import { useIsQueryLoading } from "@/services/tanstack-query/use-query-loading"
import { canAccess, type AccessProfile } from "@/features/dashboard/lib/access"
import { getAccessibleNavItems } from "@/features/dashboard/lib/nav-items"
import { useTodosQuery } from "@/features/todos/api/todos.hooks"
import { useRolesQuery, useUsersQuery } from "@/features/user-management/api/rbac.hooks"

interface DashboardOverviewProps {
	user: {
		name: string | null
		email: string
	}
	access: AccessProfile
}

export function DashboardOverview({ user, access }: DashboardOverviewProps) {
	const canReadPosts = canAccess(access, { requiredPermission: "posts:read" })
	const canReadUsers = canAccess(access, {
		requiredPermission: ["users:read", "users:manage"],
	})

	const todos = useTodosQuery()
	const users = useUsersQuery()
	const roles = useRolesQuery()

	// WC-1: the persisted-cache restore pins `fetchStatus` to `idle`, so raw
	// `isLoading` disagrees with the server render. See `useIsQueryLoading`.
	const isQueryLoading = useIsQueryLoading()

	const firstName = user.name?.trim().split(/\s+/)[0] || "there"
	const completedTodos = todos.data?.filter(todo => todo.completed).length ?? 0
	const quickActions = getAccessibleNavItems(access).filter(item => item.href !== "/dashboard")

	return (
		<div className="flex w-full flex-col gap-8">
			<header className="flex flex-wrap items-end justify-between gap-4">
				<div className="min-w-0">
					<h1 className="text-2xl font-bold tracking-tight">Welcome back, {firstName}</h1>
					<p className="text-muted-foreground text-sm">Here is an overview of your workspace.</p>
				</div>
				{access.roles.length ? (
					<div className="flex flex-wrap gap-1">
						{access.roles.map(role => (
							<Badge key={role} variant="secondary">
								{role}
							</Badge>
						))}
					</div>
				) : null}
			</header>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					icon={SecurityCheckIcon}
					label="Your permissions"
					value={access.permissions.length}
					hint="Granted on your account"
				/>
				{canReadPosts ? (
					<StatCard
						icon={Task01Icon}
						label="Total todos"
						value={todos.data?.length}
						hint={`${completedTodos} completed`}
						isLoading={isQueryLoading(todos)}
						isError={todos.isError}
					/>
				) : null}
				{canReadUsers ? (
					<StatCard
						icon={UserGroupIcon}
						label="Users"
						value={users.data?.length}
						hint="Across all roles"
						isLoading={isQueryLoading(users)}
						isError={users.isError}
					/>
				) : null}
				{canReadUsers ? (
					<StatCard
						icon={UserMultipleIcon}
						label="Roles"
						value={roles.data?.length}
						hint="Defined in the workspace"
						isLoading={isQueryLoading(roles)}
						isError={roles.isError}
					/>
				) : null}
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Quick actions</CardTitle>
						<CardDescription>Jump to a workspace destination you can access.</CardDescription>
					</CardHeader>
					<CardContent>
						{quickActions.length ? (
							<div className="grid gap-3 sm:grid-cols-2">
								{quickActions.map(item => (
									<Link
										key={item.href}
										href={item.href}
										className="group/action border-border hover:bg-muted/60 hover:border-ring/40 focus-visible:border-ring focus-visible:ring-ring/50 flex items-center gap-3 rounded-lg border p-3 transition-colors outline-none focus-visible:ring-[3px]"
									>
										<div className="bg-muted text-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
											<HugeiconsIcon icon={item.icon} strokeWidth={2} className="size-5" />
										</div>
										<span className="min-w-0 flex-1 truncate text-sm font-medium">
											{item.label}
										</span>
										<HugeiconsIcon
											icon={ArrowRight01Icon}
											strokeWidth={2}
											className="text-muted-foreground size-4 transition-transform group-hover/action:translate-x-0.5"
										/>
									</Link>
								))}
							</div>
						) : (
							<p className="text-muted-foreground text-sm">No destinations available.</p>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Recent todos</CardTitle>
						<CardDescription>Your latest items.</CardDescription>
					</CardHeader>
					<CardContent>
						<RecentTodos
							enabled={canReadPosts}
							isLoading={isQueryLoading(todos)}
							isError={todos.isError}
							todos={todos.data}
						/>
					</CardContent>
				</Card>
			</div>
		</div>
	)
}

interface StatCardProps {
	icon: IconSvgElement
	label: string
	value: number | undefined
	hint: string
	isLoading?: boolean
	isError?: boolean
}

function StatCard({ icon, label, value, hint, isLoading, isError }: StatCardProps) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<CardDescription>{label}</CardDescription>
					<div className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-md">
						<HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
					</div>
				</div>
				{isLoading ? (
					<Skeleton className="mt-1 h-8 w-16" />
				) : isError ? (
					<p className="text-destructive text-2xl font-bold tabular-nums">—</p>
				) : (
					<p className="text-2xl font-bold tabular-nums">{value ?? 0}</p>
				)}
			</CardHeader>
			<CardContent>
				<p className="text-muted-foreground text-xs">{isError ? "Failed to load" : hint}</p>
			</CardContent>
		</Card>
	)
}

interface RecentTodosProps {
	enabled: boolean
	isLoading: boolean
	isError: boolean
	todos:
		| {
				id: number | string
				title: string
				completed: boolean
		  }[]
		| undefined
}

function RecentTodos({ enabled, isLoading, isError, todos }: RecentTodosProps) {
	if (!enabled) {
		return <p className="text-muted-foreground text-sm">You do not have access to posts.</p>
	}

	if (isLoading) {
		return (
			<div className="flex flex-col gap-2">
				<Skeleton className="h-5 w-full" />
				<Skeleton className="h-5 w-4/5" />
				<Skeleton className="h-5 w-3/5" />
			</div>
		)
	}

	if (isError) {
		return <p className="text-destructive text-sm">Failed to load todos.</p>
	}

	if (!todos || todos.length === 0) {
		return (
			<Empty className="border-0 p-0 text-left">
				<EmptyHeader className="items-start">
					<EmptyMedia variant="icon">
						<HugeiconsIcon icon={CheckmarkBadge01Icon} strokeWidth={2} />
					</EmptyMedia>
					<EmptyTitle>No todos yet</EmptyTitle>
					<EmptyDescription>Create one from the Todos page.</EmptyDescription>
				</EmptyHeader>
			</Empty>
		)
	}

	return (
		<ul className="flex flex-col gap-2">
			{todos.slice(0, 5).map(todo => (
				<li key={todo.id} className="flex items-center gap-2 text-sm">
					<span
						className={cn(
							"size-2 shrink-0 rounded-full",
							todo.completed ? "bg-emerald-500" : "bg-muted-foreground/40"
						)}
					/>
					<span className={cn("truncate", todo.completed && "text-muted-foreground line-through")}>
						{todo.title}
					</span>
				</li>
			))}
		</ul>
	)
}
