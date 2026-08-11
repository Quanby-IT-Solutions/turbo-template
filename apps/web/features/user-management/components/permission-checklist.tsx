"use client"

import { useMemo } from "react"

import type { PermissionName } from "@repo/contracts"

import { Checkbox } from "@/core/components/ui/checkbox"
import { Field, FieldLabel } from "@/core/components/ui/field"
import { useIsQueryLoading } from "@/services/tanstack-query/use-query-loading"
import { usePermissionsQuery } from "@/features/user-management/api/rbac.hooks"

interface PermissionChecklistProps {
	value: PermissionName[]
	onChange: (next: PermissionName[]) => void
	disabled?: boolean
}

export function PermissionChecklist({ value, onChange, disabled }: PermissionChecklistProps) {
	const permissionsQuery = usePermissionsQuery()
	const { data: permissions, isError, error } = permissionsQuery

	// WC-1: during the persisted-cache restore a pending query reports
	// `isLoading === false`; without this the checklist flashes "no permissions"
	// before the snapshot lands. See `useIsQueryLoading`.
	const isQueryLoading = useIsQueryLoading()

	const grouped = useMemo(() => {
		const groups = new Map<string, PermissionName[]>()
		for (const permission of permissions ?? []) {
			const resource = permission.name.split(":")[0] ?? "other"
			const list = groups.get(resource) ?? []
			list.push(permission.name)
			groups.set(resource, list)
		}
		return Array.from(groups.entries())
	}, [permissions])

	const selected = useMemo(() => new Set(value), [value])

	function toggle(permission: PermissionName, checked: boolean) {
		if (checked) {
			onChange([...value, permission])
		} else {
			onChange(value.filter(p => p !== permission))
		}
	}

	if (isQueryLoading(permissionsQuery)) {
		return <p className="text-muted-foreground text-sm">Loading permissions...</p>
	}

	if (isError) {
		return (
			<p className="text-destructive text-sm">
				{error instanceof Error ? error.message : "Failed to load permissions"}
			</p>
		)
	}

	return (
		<div className="flex flex-col gap-4">
			{grouped.map(([resource, names]) => (
				<div key={resource} className="flex flex-col gap-2">
					<p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
						{resource}
					</p>
					<div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
						{names.map(name => (
							<Field key={name} orientation="horizontal">
								<Checkbox
									id={`perm-${name}`}
									checked={selected.has(name)}
									onCheckedChange={checked => toggle(name, checked === true)}
									disabled={disabled}
								/>
								<FieldLabel htmlFor={`perm-${name}`} className="font-normal">
									{name}
								</FieldLabel>
							</Field>
						))}
					</div>
				</div>
			))}
		</div>
	)
}
