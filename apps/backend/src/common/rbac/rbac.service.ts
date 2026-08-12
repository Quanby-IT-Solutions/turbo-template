import { Injectable, NotFoundException } from "@nestjs/common"
import { and, eq } from "drizzle-orm"

import { ADMIN_ROLE, PERMISSION_NAMES, type MePermissions } from "@repo/contracts"
import { permissions, rolePermissions, roles, userRoles, users } from "@repo/db/schema"

import { AUDIT_DOMAIN_RBAC, AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"

import { RbacCacheService, type ResolvedPermissionSet } from "./rbac-cache.service"

@Injectable()
export class RbacService {
	constructor(
		private readonly cacheService: RbacCacheService,
		private readonly auditService: AuditService
	) {}

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

	/**
	 * Grant a role.
	 *
	 * AZ-4 / RF5: the membership row and its audit entry are written in one
	 * transaction, so a privileged grant can never commit unrecorded — if the
	 * audit insert fails, the grant rolls back with it. The cache is
	 * invalidated only after the commit, because invalidating earlier would let
	 * a concurrent request repopulate it from a state that then rolled back.
	 */
	async assignRole(userId: string, roleName: string, actorId: string | null): Promise<void> {
		await db.transaction(async tx => {
			const [user] = await tx.select().from(users).where(eq(users.id, userId))
			if (!user) throw new NotFoundException(`User with ID ${userId} not found`)

			const [role] = await tx.select().from(roles).where(eq(roles.name, roleName))
			if (!role) throw new NotFoundException(`Role "${roleName}" not found`)

			const [existing] = await tx
				.select()
				.from(userRoles)
				.where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))

			await tx.insert(userRoles).values({ userId, roleId: role.id }).onConflictDoNothing()

			// A re-grant of a role the user already holds changes nothing, so it
			// is recorded as a no-op rather than as a state transition. Silence
			// would be worse: the attempt still happened.
			await this.auditService.record(
				{
					domain: AUDIT_DOMAIN_RBAC,
					action: "role.assign",
					actorId,
					targetType: "user",
					targetId: userId,
					oldValue: { roleHeld: Boolean(existing) },
					newValue: { roleHeld: true, roleName },
					reason: existing ? "already held; no change" : null,
				},
				tx
			)
		})

		this.cacheService.invalidate(userId)
	}

	/**
	 * Revoke a role. Same in-transaction audit guarantee as {@link assignRole}.
	 */
	async removeRole(userId: string, roleName: string, actorId: string | null): Promise<void> {
		await db.transaction(async tx => {
			const [user] = await tx.select().from(users).where(eq(users.id, userId))
			if (!user) throw new NotFoundException(`User with ID ${userId} not found`)

			const [role] = await tx.select().from(roles).where(eq(roles.name, roleName))
			if (!role) throw new NotFoundException(`Role "${roleName}" not found`)

			const removed = await tx
				.delete(userRoles)
				.where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))
				.returning()

			await this.auditService.record(
				{
					domain: AUDIT_DOMAIN_RBAC,
					action: "role.remove",
					actorId,
					targetType: "user",
					targetId: userId,
					oldValue: { roleHeld: removed.length > 0, roleName },
					newValue: { roleHeld: false },
					reason: removed.length ? null : "not held; no change",
				},
				tx
			)
		})

		this.cacheService.invalidate(userId)
	}
}
