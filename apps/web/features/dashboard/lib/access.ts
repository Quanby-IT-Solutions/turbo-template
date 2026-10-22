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

export type PermissionAvailability = "allowed" | "denied" | "unavailable"

/**
 * A failed permission lookup is not the same as a loaded profile that lacks
 * the permission. Callers use `unavailable` to say the check did not finish.
 */
export function permissionAvailability(
	access: AccessProfile & { status?: "loaded" | "error" },
	item: AccessRequirement
): PermissionAvailability {
	if (access.status === "error") {
		return "unavailable"
	}
	return canAccess(access, item) ? "allowed" : "denied"
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
