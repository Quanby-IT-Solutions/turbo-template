import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { eq, inArray, sql } from "drizzle-orm"

import {
	ADMIN_ROLE,
	PERMISSION_NAMES,
	type AssignRoleRequest,
	type CreateRoleInput,
	type PermissionCatalogEntry,
	type PermissionName,
	type RemoveRoleRequest,
	type Role,
	type SetRolePermissionsRequest,
	type UpdateRoleRequest,
	type UserWithRoles,
} from "@repo/contracts"
import { permissions, rolePermissions, roles, userRoles, users } from "@repo/db/schema"

import { db } from "@/common/database/database.client"
import { RbacCacheService } from "@/common/rbac/rbac-cache.service"
import { RbacService } from "@/common/rbac/rbac.service"

const PERMISSION_CATALOG = new Set<string>(PERMISSION_NAMES)

@Injectable()
export class RbacAdminService {
	constructor(
		private readonly rbacService: RbacService,
		private readonly cacheService: RbacCacheService
	) {}

	// ---------------------------------------------------------------- roles
	async listRoles(): Promise<Role[]> {
		const roleRows = await db.select().from(roles).orderBy(roles.name)

		const permRows = await db
			.select({ roleId: rolePermissions.roleId, name: permissions.name })
			.from(rolePermissions)
			.innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))

		const countRows = await db
			.select({ roleId: userRoles.roleId, count: sql<number>`count(*)::int` })
			.from(userRoles)
			.groupBy(userRoles.roleId)

		const permsByRole = new Map<number, PermissionName[]>()
		for (const row of permRows) {
			if (!PERMISSION_CATALOG.has(row.name)) continue
			const list = permsByRole.get(row.roleId) ?? []
			list.push(row.name as PermissionName)
			permsByRole.set(row.roleId, list)
		}

		const countByRole = new Map<number, number>()
		for (const row of countRows) {
			countByRole.set(row.roleId, row.count)
		}

		return roleRows.map(role => ({
			id: role.id,
			name: role.name,
			description: role.description,
			permissions: this.orderPermissions(permsByRole.get(role.id) ?? []),
			userCount: countByRole.get(role.id) ?? 0,
			createdAt: role.createdAt,
			updatedAt: role.updatedAt,
		}))
	}

	async createRole(payload: CreateRoleInput): Promise<Role> {
		const [existing] = await db.select().from(roles).where(eq(roles.name, payload.name))
		if (existing) {
			throw new ORPCError("CONFLICT", { message: `Role "${payload.name}" already exists` })
		}

		const [role] = await db
			.insert(roles)
			.values({ name: payload.name, description: payload.description ?? null })
			.returning()

		if (!role) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Role could not be created" })
		}

		return this.buildRole(role.id)
	}

	async updateRole(payload: UpdateRoleRequest): Promise<Role> {
		const role = await this.getRoleRowOrThrow(payload.id)

		if (role.name === ADMIN_ROLE && payload.name !== undefined && payload.name !== ADMIN_ROLE) {
			throw new ORPCError("FORBIDDEN", { message: "The Admin role cannot be renamed" })
		}

		if (payload.name !== undefined && payload.name !== role.name) {
			const [clash] = await db.select().from(roles).where(eq(roles.name, payload.name))
			if (clash) {
				throw new ORPCError("CONFLICT", { message: `Role "${payload.name}" already exists` })
			}
		}

		await db
			.update(roles)
			.set({
				name: payload.name ?? role.name,
				description: payload.description !== undefined ? payload.description : role.description,
				updatedAt: new Date(),
			})
			.where(eq(roles.id, role.id))

		return this.buildRole(role.id)
	}

	async setRolePermissions(payload: SetRolePermissionsRequest): Promise<Role> {
		const role = await this.getRoleRowOrThrow(payload.id)

		const uniqueNames = Array.from(new Set(payload.permissions))
		const permissionRows = uniqueNames.length
			? await db.select().from(permissions).where(inArray(permissions.name, uniqueNames))
			: []

		const foundNames = new Set(permissionRows.map(p => p.name))
		const missing = uniqueNames.filter(name => !foundNames.has(name))
		if (missing.length) {
			throw new ORPCError("BAD_REQUEST", { message: `Unknown permissions: ${missing.join(", ")}` })
		}

		await db.transaction(async tx => {
			await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id))
			if (permissionRows.length) {
				await tx
					.insert(rolePermissions)
					.values(permissionRows.map(p => ({ roleId: role.id, permissionId: p.id })))
			}
		})

		this.cacheService.clear()
		return this.buildRole(role.id)
	}

	async deleteRole(id: number): Promise<{ success: boolean; id: number }> {
		const role = await this.getRoleRowOrThrow(id)

		if (role.name === ADMIN_ROLE) {
			throw new ORPCError("FORBIDDEN", { message: "The Admin role cannot be deleted" })
		}

		await db.delete(roles).where(eq(roles.id, role.id))
		this.cacheService.clear()
		return { success: true, id: role.id }
	}

	// ---------------------------------------------------------- permissions
	async listPermissions(): Promise<PermissionCatalogEntry[]> {
		const rows = await db.select().from(permissions)
		const descByName = new Map(rows.map(row => [row.name, row.description]))

		return PERMISSION_NAMES.filter(name => descByName.has(name)).map(name => ({
			name,
			description: descByName.get(name) ?? null,
		}))
	}

	// ---------------------------------------------------------------- users
	async listUsers(): Promise<UserWithRoles[]> {
		const userRows = await db.select().from(users).orderBy(users.email)

		const roleRows = await db
			.select({ userId: userRoles.userId, name: roles.name })
			.from(userRoles)
			.innerJoin(roles, eq(userRoles.roleId, roles.id))

		const rolesByUser = new Map<string, string[]>()
		for (const row of roleRows) {
			const list = rolesByUser.get(row.userId) ?? []
			list.push(row.name)
			rolesByUser.set(row.userId, list)
		}

		return userRows.map(user => ({
			id: user.id,
			name: user.name,
			email: user.email,
			roles: (rolesByUser.get(user.id) ?? []).sort(),
		}))
	}

	async assignUserRole(payload: AssignRoleRequest) {
		await this.rbacService.assignRole(payload.userId, payload.roleName)
		return { success: true, userId: payload.userId, roleName: payload.roleName }
	}

	async removeUserRole(payload: RemoveRoleRequest) {
		await this.rbacService.removeRole(payload.userId, payload.roleName)
		return { success: true, userId: payload.userId, roleName: payload.roleName }
	}

	// -------------------------------------------------------------- helpers
	private async getRoleRowOrThrow(id: number) {
		const [role] = await db.select().from(roles).where(eq(roles.id, id))
		if (!role) {
			throw new ORPCError("NOT_FOUND", { message: `Role with ID ${id} not found` })
		}
		return role
	}

	private async buildRole(id: number): Promise<Role> {
		const role = await this.getRoleRowOrThrow(id)

		const permRows = await db
			.select({ name: permissions.name })
			.from(rolePermissions)
			.innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
			.where(eq(rolePermissions.roleId, id))

		const [{ count } = { count: 0 }] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(userRoles)
			.where(eq(userRoles.roleId, id))

		const grantedPermissions = permRows
			.map(p => p.name)
			.filter((name): name is PermissionName => PERMISSION_CATALOG.has(name))

		return {
			id: role.id,
			name: role.name,
			description: role.description,
			permissions: this.orderPermissions(grantedPermissions),
			userCount: count,
			createdAt: role.createdAt,
			updatedAt: role.updatedAt,
		}
	}

	private orderPermissions(names: PermissionName[]): PermissionName[] {
		const held = new Set(names)
		return PERMISSION_NAMES.filter(name => held.has(name))
	}
}
