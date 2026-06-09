import { ADMIN_ROLE, type PermissionName } from "@repo/contracts"

export interface AccessProfile {
	roles: readonly string[]
	permissions: readonly PermissionName[]
}

export type PermissionRequirement = PermissionName | readonly PermissionName[]
export type RoleRequirement = string | readonly string[]

export interface AccessRequirement {
	requiredPermission?: PermissionRequirement
	requiredRole?: RoleRequirement
}

function toArray<T extends string>(value: T | readonly T[] | undefined): readonly T[] {
	if (!value) {
		return []
	}
	return typeof value === "string" ? [value] : value
}

function hasPermission(access: AccessProfile, requiredPermission: PermissionName): boolean {
	if (access.permissions.includes(requiredPermission)) {
		return true
	}

	const [resource] = requiredPermission.split(":")
	return access.permissions.includes(`${resource}:*` as PermissionName)
}

export function canAccess(access: AccessProfile, item: AccessRequirement): boolean {
	const requiredPermissions = toArray(item.requiredPermission)
	const requiredRoles = toArray(item.requiredRole)

	if (requiredPermissions.length === 0 && requiredRoles.length === 0) {
		return true
	}

	if (access.roles.includes(ADMIN_ROLE)) {
		return true
	}

	if (requiredRoles.some(role => access.roles.includes(role))) {
		return true
	}

	return requiredPermissions.some(permission => hasPermission(access, permission))
}
