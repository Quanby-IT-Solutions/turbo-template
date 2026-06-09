"use client"

import { useState } from "react"

import type { PermissionName, Role } from "@repo/contracts"

import { Button } from "@/core/components/ui/button"
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/core/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/core/components/ui/field"
import { Input } from "@/core/components/ui/input"
import { Textarea } from "@/core/components/ui/textarea"
import {
	useCreateRoleMutation,
	useSetRolePermissionsMutation,
	useUpdateRoleMutation,
} from "@/features/user-management/api/rbac.hooks"
import { PermissionChecklist } from "@/features/user-management/components/permission-checklist"

interface RoleFormDialogProps {
	open: boolean
	onOpenChange: (open: boolean) => void
	role?: Role
}

export function RoleFormDialog({ open, onOpenChange, role }: RoleFormDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-lg">
				{open ? (
					<RoleForm key={role?.id ?? "new"} role={role} onClose={() => onOpenChange(false)} />
				) : null}
			</DialogContent>
		</Dialog>
	)
}

function RoleForm({ role, onClose }: { role?: Role; onClose: () => void }) {
	const isEdit = Boolean(role)
	const isAdminRole = role?.name === "Admin"

	const [name, setName] = useState(role?.name ?? "")
	const [description, setDescription] = useState(role?.description ?? "")
	const [permissions, setPermissions] = useState<PermissionName[]>(role?.permissions ?? [])
	const [formError, setFormError] = useState<string | null>(null)

	const createRole = useCreateRoleMutation()
	const updateRole = useUpdateRoleMutation()
	const setRolePermissions = useSetRolePermissionsMutation()

	const isPending = createRole.isPending || updateRole.isPending || setRolePermissions.isPending

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault()
		setFormError(null)

		const trimmed = name.trim()
		if (!trimmed) {
			setFormError("Name is required")
			return
		}

		try {
			if (isEdit && role) {
				await updateRole.mutateAsync({
					id: role.id,
					name: trimmed,
					description: description.trim() || null,
				})
				await setRolePermissions.mutateAsync({ id: role.id, permissions })
			} else {
				const created = await createRole.mutateAsync({
					name: trimmed,
					description: description.trim() || undefined,
				})
				if (permissions.length) {
					await setRolePermissions.mutateAsync({ id: created.id, permissions })
				}
			}
			onClose()
		} catch (err) {
			setFormError(err instanceof Error ? err.message : "Something went wrong")
		}
	}

	return (
		<>
			<DialogHeader>
				<DialogTitle>{isEdit ? "Edit role" : "New role"}</DialogTitle>
				<DialogDescription>
					{isEdit
						? "Update the role details and the permissions it grants."
						: "Create a role and choose which permissions it grants."}
				</DialogDescription>
			</DialogHeader>

			<form className="flex flex-col gap-4" onSubmit={handleSubmit}>
				<Field data-invalid={Boolean(formError)}>
					<FieldLabel htmlFor="role-name">Name</FieldLabel>
					<Input
						id="role-name"
						value={name}
						onChange={e => setName(e.target.value)}
						placeholder="e.g. Editor"
						disabled={isPending || isAdminRole}
						aria-invalid={Boolean(formError)}
					/>
					{isAdminRole ? (
						<p className="text-muted-foreground text-xs">The Admin role cannot be renamed.</p>
					) : null}
				</Field>

				<Field>
					<FieldLabel htmlFor="role-description">Description</FieldLabel>
					<Textarea
						id="role-description"
						value={description}
						onChange={e => setDescription(e.target.value)}
						placeholder="What is this role for?"
						disabled={isPending}
						rows={2}
					/>
				</Field>

				<Field>
					<FieldLabel>Permissions</FieldLabel>
					<PermissionChecklist value={permissions} onChange={setPermissions} disabled={isPending} />
				</Field>

				{formError ? <FieldError>{formError}</FieldError> : null}

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
						Cancel
					</Button>
					<Button type="submit" disabled={isPending}>
						{isPending ? "Saving..." : isEdit ? "Save changes" : "Create role"}
					</Button>
				</DialogFooter>
			</form>
		</>
	)
}
