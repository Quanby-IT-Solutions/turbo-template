import { Injectable, NotFoundException } from "@nestjs/common"
import { and, eq } from "drizzle-orm"

import { ADMIN_ROLE, PERMISSION_NAMES, type MePermissions } from "@repo/contracts"
import { permissions, rolePermissions, roles, userRoles, users } from "@repo/db/schema"

import { db } from "@/common/database/database.client"

import { RbacCacheService, type ResolvedPermissionSet } from "./rbac-cache.service"

@Injectable()
export class RbacService {
	constructor(private readonly cacheService: RbacCacheService) {}

	private async resolveForUser(userId: string): Promise<ResolvedPermissionSet> {
		const cached = this.cacheService.get(userId)
		if (cached) return cached

		const rows = await db
			.select({
				roleName: roles.name,
				permissionName: permissions.name,
			})
			.from(userRoles)
			.innerJoin(roles, eq(userRoles.roleId, roles.id))
			.leftJoin(rolePermissions, eq(roles.id, rolePermissions.roleId))
			.leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
			.where(eq(userRoles.userId, userId))

		const set: ResolvedPermissionSet = {
			roleNames: new Set<string>(),
			permissionNames: new Set<string>(),
		}

		for (const row of rows) {
			if (row.roleName) set.roleNames.add(row.roleName)
			if (row.permissionName) set.permissionNames.add(row.permissionName)
		}

		this.cacheService.set(userId, set)
		return set
	}

	private static readonly permissionCatalog = new Set<string>(PERMISSION_NAMES)

	private matchPermission(set: ResolvedPermissionSet, permission: string): boolean {
		if (set.roleNames.has(ADMIN_ROLE)) return true

		// Fail-closed: unknown permissions (misspelled or non-catalog) are never granted.
		if (!RbacService.permissionCatalog.has(permission)) return false

		if (set.permissionNames.has(permission)) return true

		const resource = permission.split(":")[0]
		if (resource && set.permissionNames.has(`${resource}:*`)) return true

		return false
	}

	async hasRole(userId: string, role: string): Promise<boolean> {
		const set = await this.resolveForUser(userId)
		return set.roleNames.has(role)
	}

	async hasAnyRole(userId: string, rolesToCheck: string[]): Promise<boolean> {
		const set = await this.resolveForUser(userId)
		return rolesToCheck.some(r => set.roleNames.has(r))
	}

	async hasPermission(userId: string, permission: string): Promise<boolean> {
		const set = await this.resolveForUser(userId)
		return this.matchPermission(set, permission)
	}

	async hasAllPermissions(userId: string, permissionsToCheck: string[]): Promise<boolean> {
		const set = await this.resolveForUser(userId)
		return permissionsToCheck.every(p => this.matchPermission(set, p))
	}

	async getMissingPermissions(userId: string, permissionsToCheck: string[]): Promise<string[]> {
		const set = await this.resolveForUser(userId)
		return permissionsToCheck.filter(p => !this.matchPermission(set, p))
	}

	async getUserAccess(userId: string): Promise<MePermissions> {
		const set = await this.resolveForUser(userId)

		return {
			roles: Array.from(set.roleNames).sort(),
			permissions: PERMISSION_NAMES.filter(permission => set.permissionNames.has(permission)),
		}
	}

	async assignRole(userId: string, roleName: string): Promise<void> {
		const [user] = await db.select().from(users).where(eq(users.id, userId))
		if (!user) throw new NotFoundException(`User with ID ${userId} not found`)

		const [role] = await db.select().from(roles).where(eq(roles.name, roleName))
		if (!role) throw new NotFoundException(`Role "${roleName}" not found`)

		await db.insert(userRoles).values({ userId, roleId: role.id }).onConflictDoNothing()

		this.cacheService.invalidate(userId)
	}

	async removeRole(userId: string, roleName: string): Promise<void> {
		const [user] = await db.select().from(users).where(eq(users.id, userId))
		if (!user) throw new NotFoundException(`User with ID ${userId} not found`)

		const [role] = await db.select().from(roles).where(eq(roles.name, roleName))
		if (!role) throw new NotFoundException(`Role "${roleName}" not found`)

		await db
			.delete(userRoles)
			.where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))

		this.cacheService.invalidate(userId)
	}
}
