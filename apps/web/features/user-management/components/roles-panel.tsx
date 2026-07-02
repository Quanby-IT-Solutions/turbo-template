"use client"

import { useState } from "react"
import {
	Add01Icon,
	Delete02Icon,
	PencilEdit02Icon,
	UserMultipleIcon,
} from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"

import type { Role } from "@repo/contracts"

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/core/components/ui/alert-dialog"
import { Badge } from "@/core/components/ui/badge"
import { Button } from "@/core/components/ui/button"
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/core/components/ui/empty"
import { Skeleton } from "@/core/components/ui/skeleton"
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/core/components/ui/table"
import { useRateLimitToast } from "@/core/hooks/use-rate-limit-toast"
import { useDeleteRoleMutation, useRolesQuery } from "@/features/user-management/api/rbac.hooks"
import { RoleFormDialog } from "@/features/user-management/components/role-form-dialog"

export function RolesPanel() {
	const { data: roles, isLoading, isError, error } = useRolesQuery()
	const deleteRole = useDeleteRoleMutation()
	const deleteRateLimit = useRateLimitToast(deleteRole.error, { toastId: "rbac-role-delete" })

	const [dialogOpen, setDialogOpen] = useState(false)
	const [editingRole, setEditingRole] = useState<Role | undefined>(undefined)
	const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)

	function openCreate() {
		setEditingRole(undefined)
		setDialogOpen(true)
	}

	function openEdit(role: Role) {
		setEditingRole(role)
		setDialogOpen(true)
	}

	async function confirmDelete() {
		if (!roleToDelete) return
		await deleteRole.mutateAsync(roleToDelete.id)
		setRoleToDelete(null)
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-lg font-semibold">Roles</h2>
					<p className="text-muted-foreground text-sm">
						Create roles and choose which permissions they grant.
					</p>
				</div>
				<Button onClick={openCreate} size="sm">
					<HugeiconsIcon icon={Add01Icon} strokeWidth={2} />
					New role
				</Button>
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
					{error instanceof Error ? error.message : "Failed to load roles"}
				</p>
			) : null}

			{roles && roles.length > 0 ? (
				<div className="rounded-lg border">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Role</TableHead>
								<TableHead>Permissions</TableHead>
								<TableHead className="text-right">Users</TableHead>
								<TableHead className="w-0">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{roles.map(role => {
								const isAdmin = role.name === "Admin"
								return (
									<TableRow key={role.id}>
										<TableCell className="align-top">
											<div className="font-medium">{role.name}</div>
											{role.description ? (
												<div className="text-muted-foreground text-xs">{role.description}</div>
											) : null}
										</TableCell>
										<TableCell className="align-top">
											{isAdmin ? (
												<Badge variant="secondary">All permissions</Badge>
											) : role.permissions.length ? (
												<div className="flex flex-wrap gap-1">
													{role.permissions.map(permission => (
														<Badge key={permission} variant="outline">
															{permission}
														</Badge>
													))}
												</div>
											) : (
												<span className="text-muted-foreground text-xs">None</span>
											)}
										</TableCell>
										<TableCell className="text-right align-top tabular-nums">
											{role.userCount}
										</TableCell>
										<TableCell className="align-top">
											<div className="flex justify-end gap-1">
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => openEdit(role)}
													aria-label={`Edit ${role.name}`}
												>
													<HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} />
												</Button>
												<Button
													variant="ghost"
													size="icon-sm"
													onClick={() => setRoleToDelete(role)}
													disabled={isAdmin}
													aria-label={`Delete ${role.name}`}
												>
													<HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								)
							})}
						</TableBody>
					</Table>
				</div>
			) : null}

			{roles && roles.length === 0 ? (
				<Empty className="border">
					<EmptyHeader>
						<EmptyMedia variant="icon">
							<HugeiconsIcon icon={UserMultipleIcon} strokeWidth={2} />
						</EmptyMedia>
						<EmptyTitle>No roles yet</EmptyTitle>
						<EmptyDescription>Create your first role to start granting access.</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : null}

			<RoleFormDialog open={dialogOpen} onOpenChange={setDialogOpen} role={editingRole} />

			<AlertDialog
				open={Boolean(roleToDelete)}
				onOpenChange={open => !open && setRoleToDelete(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete role</AlertDialogTitle>
						<AlertDialogDescription>
							{roleToDelete
								? `Delete "${roleToDelete.name}"? This removes it from all assigned users.`
								: ""}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={confirmDelete}
							disabled={deleteRole.isPending || deleteRateLimit.isActive}
						>
							{deleteRateLimit.isActive
								? `Try again in ${deleteRateLimit.secondsLeft}s`
								: deleteRole.isPending
									? "Deleting..."
									: "Delete"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}
