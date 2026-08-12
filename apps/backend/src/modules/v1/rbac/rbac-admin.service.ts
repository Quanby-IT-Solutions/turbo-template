import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { eq, inArray, sql } from "drizzle-orm"

import {
	ADMIN_ROLE,
	PERMISSION_NAMES,
	type AssignRoleRequest,
	type CreateRoleInput,
	type ListAuditLogRequest,
	type ListAuditLogResponse,
	type PermissionCatalogEntry,
	type PermissionName,
	type RemoveRoleRequest,
	type Role,
	type SetRolePermissionsRequest,
	type UpdateRoleRequest,
	type UserWithRoles,
} from "@repo/contracts"
import { permissions, rolePermissions, roles, userRoles, users } from "@repo/db/schema"

import { AUDIT_DOMAIN_RBAC, AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"
import { RbacCacheService } from "@/common/rbac/rbac-cache.service"
import { RbacService } from "@/common/rbac/rbac.service"

const PERMISSION_CATALOG = new Set<string>(PERMISSION_NAMES)

@Injectable()
export class RbacAdminService {
	constructor(
		private readonly rbacService: RbacService,
		private readonly cacheService: RbacCacheService,
		private readonly auditService: AuditService
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

	async createRole(payload: CreateRoleInput, actorId: string | null): Promise<Role> {
		// AZ-4: the role row and its audit entry share one transaction, so a
		// role can never appear without a record of who created it.
		const roleId = await db.transaction(async tx => {
			const [existing] = await tx.select().from(roles).where(eq(roles.name, payload.name))
			if (existing) {
				throw new ORPCError("CONFLICT", { message: `Role "${payload.name}" already exists` })
			}

			const [role] = await tx
				.insert(roles)
				.values({ name: payload.name, description: payload.description ?? null })
				.returning()

			if (!role) {
				throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Role could not be created" })
			}

			await this.auditService.record(
				{
					domain: AUDIT_DOMAIN_RBAC,
					action: "role.create",
					actorId,
					targetType: "role",
					targetId: String(role.id),
					oldValue: null,
					newValue: { name: role.name, description: role.description },
				},
				tx
			)

			return role.id
		})

		return this.buildRole(roleId)
	}

	async updateRole(payload: UpdateRoleRequest, actorId: string | null): Promise<Role> {
		const role = await this.getRoleRowOrThrow(payload.id)

		if (role.name === ADMIN_ROLE && payload.name !== undefined && payload.name !== ADMIN_ROLE) {
			// A denial is evidence: record the refused attempt, then reject.
			await this.auditService.record({
				domain: AUDIT_DOMAIN_RBAC,
				action: "role.update",
				outcome: "denied",
				actorId,
				targetType: "role",
				targetId: String(role.id),
				oldValue: { name: role.name },
				newValue: { name: payload.name },
				reason: "The Admin role cannot be renamed",
			})
			throw new ORPCError("FORBIDDEN", { message: "The Admin role cannot be renamed" })
		}

		await db.transaction(async tx => {
			if (payload.name !== undefined && payload.name !== role.name) {
				const [clash] = await tx.select().from(roles).where(eq(roles.name, payload.name))
				if (clash) {
					throw new ORPCError("CONFLICT", { message: `Role "${payload.name}" already exists` })
				}
			}

			const next = {
				name: payload.name ?? role.name,
				description: payload.description !== undefined ? payload.description : role.description,
			}

			await tx
				.update(roles)
				.set({ ...next, updatedAt: new Date() })
				.where(eq(roles.id, role.id))

			await this.auditService.record(
				{
					domain: AUDIT_DOMAIN_RBAC,
					action: "role.update",
					actorId,
					targetType: "role",
					targetId: String(role.id),
					oldValue: { name: role.name, description: role.description },
					newValue: next,
				},
				tx
			)
		})

		return this.buildRole(role.id)
	}

	async setRolePermissions(
		payload: SetRolePermissionsRequest,
		actorId: string | null
	): Promise<Role> {
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

		// Captured before the transaction so the audit entry can show old→new.
		const previous = await db
			.select({ name: permissions.name })
			.from(rolePermissions)
			.innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
			.where(eq(rolePermissions.roleId, role.id))

		await db.transaction(async tx => {
			await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id))
			if (permissionRows.length) {
				await tx
					.insert(rolePermissions)
					.values(permissionRows.map(p => ({ roleId: role.id, permissionId: p.id })))
			}

			// This is the single most privilege-relevant RBAC write there is:
			// it decides what every holder of the role may do.
			await this.auditService.record(
				{
					domain: AUDIT_DOMAIN_RBAC,
					action: "role.setPermissions",
					actorId,
					targetType: "role",
					targetId: String(role.id),
					oldValue: { permissions: previous.map(p => p.name).sort() },
					newValue: { permissions: uniqueNames.slice().sort() },
				},
				tx
			)
		})

		await this.cacheService.clear()
		return this.buildRole(role.id)
	}

	async deleteRole(id: number, actorId: string | null): Promise<{ success: boolean; id: number }> {
		const role = await this.getRoleRowOrThrow(id)

		if (role.name === ADMIN_ROLE) {
			await this.auditService.record({
				domain: AUDIT_DOMAIN_RBAC,
				action: "role.delete",
				outcome: "denied",
				actorId,
				targetType: "role",
				targetId: String(role.id),
				oldValue: { name: role.name },
				reason: "The Admin role cannot be deleted",
			})
			throw new ORPCError("FORBIDDEN", { message: "The Admin role cannot be deleted" })
		}

		// Deleting a role revokes it from every holder at once, so the entry
		// records what was destroyed -- the row itself is about to be gone.
		const grantedPermissions = await db
			.select({ name: permissions.name })
			.from(rolePermissions)
			.innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
			.where(eq(rolePermissions.roleId, role.id))

		await db.transaction(async tx => {
			await tx.delete(roles).where(eq(roles.id, role.id))

			await this.auditService.record(
				{
					domain: AUDIT_DOMAIN_RBAC,
					action: "role.delete",
					actorId,
					targetType: "role",
					targetId: String(role.id),
					oldValue: {
						name: role.name,
						description: role.description,
						permissions: grantedPermissions.map(p => p.name).sort(),
					},
					newValue: null,
				},
				tx
			)
		})

		await this.cacheService.clear()
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
	/**
	 * List users (AZ-5 / F-51).
	 *
	 * `includeDirectory` decides whether email addresses are returned. Holding
	 * `users:read` used to yield the complete email directory, so granting
	 * someone support-ticket triage (AZ-1, also on `users:read`) handed them
	 * every address as a side effect.
	 *
	 * The design call: the endpoint OMITS the emails rather than returning 403.
	 * A 403 would break the user-management screen entirely for triage staff
	 * who legitimately need to see who exists and what roles they hold; the
	 * useful part of the list survives without the PII.
	 */
	async listUsers(includeDirectory: boolean): Promise<UserWithRoles[]> {
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
			// Empty string, not the address, when the caller lacks the directory
			// permission. The field stays present so the contract is unchanged
			// and clients need no conditional handling.
			email: includeDirectory ? user.email : "",
			roles: (rolesByUser.get(user.id) ?? []).sort(),
		}))
	}

	async assignUserRole(payload: AssignRoleRequest, actorId: string | null) {
		await this.rbacService.assignRole(payload.userId, payload.roleName, actorId)
		return { success: true, userId: payload.userId, roleName: payload.roleName }
	}

	async removeUserRole(payload: RemoveRoleRequest, actorId: string | null) {
		await this.rbacService.removeRole(payload.userId, payload.roleName, actorId)
		return { success: true, userId: payload.userId, roleName: payload.roleName }
	}

	// ------------------------------------------------------------ audit log
	async listAuditLog(query: ListAuditLogRequest): Promise<ListAuditLogResponse> {
		return this.auditService.list(query)
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
