"use client"

import { useMemo } from "react"
import { Cancel01Icon, UserGroupIcon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import { Badge } from "@/core/components/ui/badge"
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/core/components/ui/empty"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/core/components/ui/select"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import {
	useAssignRoleMutation,
	useRemoveRoleMutation,
	useRolesQuery,
	useUsersQuery,
} from "@/features/user-management/api/rbac.hooks"

export function UsersPanel() {
	const { data: users, isLoading, isError, error } = useUsersQuery()
	const { data: roles } = useRolesQuery()
	const assignRole = useAssignRoleMutation()
	const removeRole = useRemoveRoleMutation()

	const allRoleNames = useMemo(() => (roles ?? []).map(role => role.name), [roles])

	return (
		<div className="flex flex-col gap-4">
			<div>
				<h2 className="text-lg font-semibold">Users</h2>
				<p className="text-muted-foreground text-sm">Assign and remove roles for each user.</p>
			</div>

			{isLoading ? (
				<div className="flex flex-col gap-2">
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
					<Skeleton className="h-10 w-full" />
				</div>
			) : null}

			{isError ? (
				<p className="text-destructive text-sm">
					{error instanceof Error ? error.message : "Failed to load users"}
				</p>
			) : null}

			{users && users.length > 0 ? (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>User</TableHead>
								<TableHead>Roles</TableHead>
								<TableHead className="w-48">Assign role</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{users.map(user => {
								const assigned = new Set(user.roles)
								const available = allRoleNames.filter(name => !assigned.has(name))
								return (
									<TableRow key={user.id}>
										<TableCell className="align-top">
											<div className="font-medium">{user.name ?? "—"}</div>
											<div className="text-muted-foreground text-xs">{user.email}</div>
										</TableCell>
										<TableCell className="align-top">
											{user.roles.length ? (
												<div className="flex flex-wrap gap-1">
													{user.roles.map(roleName => (
														<Badge key={roleName} variant="outline" className="gap-1 pr-1">
															{roleName}
															<button
																type="button"
																onClick={() => removeRole.mutate({ userId: user.id, roleName })}
																disabled={removeRole.isPending}
																className="hover:text-destructive inline-flex items-center"
																aria-label={`Remove ${roleName} from ${user.email}`}
															>
																<HugeiconsIcon
																	icon={Cancel01Icon}
																	strokeWidth={2}
																	className="size-3"
																/>
															</button>
														</Badge>
													))}
												</div>
											) : (
												<span className="text-muted-foreground text-xs">No roles</span>
											)}
										</TableCell>
										<TableCell className="align-top">
											<Select
												value={null}
												onValueChange={value => {
													if (typeof value === "string") {
														assignRole.mutate({ userId: user.id, roleName: value })
													}
												}}
												disabled={available.length === 0 || assignRole.isPending}
											>
												<SelectTrigger size="sm" className="w-full">
													<SelectValue>Add role</SelectValue>
												</SelectTrigger>
												<SelectContent>
													{available.map(name => (
														<SelectItem key={name} value={name}>
															{name}
														</SelectItem>
													))}
												</SelectContent>
											</Select>
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
				</div>
			) : null}

			{users && users.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<HugeiconsIcon icon={UserGroupIcon} strokeWidth={2} />
						</EmptyMedia>
						<EmptyTitle>No users found</EmptyTitle>
						<EmptyDescription>Users will appear here once they sign up.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}
		</div>
	)
}
