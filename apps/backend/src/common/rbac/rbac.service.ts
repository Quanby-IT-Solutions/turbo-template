import { Injectable } from "@nestjs/common"
import { ORPCError } from "@orpc/server"
import { and, eq } from "drizzle-orm"

import { ADMIN_ROLE, PERMISSION_NAMES, type MePermissions } from "@repo/contracts"
import { permissions, rolePermissions, roles, userRoles, users } from "@repo/db/schema"

import { AUDIT_DOMAIN_RBAC, AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"

import { RbacCacheService, type ResolvedPermissionSet } from "./rbac-cache.service"

/** The transaction handle Drizzle hands to `db.transaction`. */
type TransactionLike = Parameters<Parameters<typeof db.transaction>[0]>[0]

/**
 * A privileged change refused by a guard inside the transaction (AZ-2).
 *
 * Thrown from inside `db.transaction` so the refusal aborts the mutation, then
 * unwrapped outside it by {@link RbacService.runGuarded} — the denial entry has
 * to be written separately, because a row recorded inside the aborted
 * transaction would roll back with it and the refusal would leave no trace at
 * all.
 */
class PrivilegeGuardError extends Error {
	constructor(
		/** Which status the caller should see. */
		readonly kind: "FORBIDDEN" | "CONFLICT",
		message: string,
		/** Recorded verbatim on the denial entry. */
		readonly reason: string
	) {
		super(message)
		this.name = "PrivilegeGuardError"
	}
}

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
	 * Whether a user holds the Admin role, read straight from the database.
	 *
	 * Deliberately not routed through {@link hasRole}: that consults the
	 * in-process cache, and a privilege-tier decision must not be made from a
	 * value that a stale or poisoned cache entry could supply. Reading inside
	 * the caller's transaction also means the check sees the same snapshot as
	 * the write it guards.
	 */
	private async holdsAdmin(tx: TransactionLike, candidateId: string): Promise<boolean> {
		const [row] = await tx
			.select({ userId: userRoles.userId })
			.from(userRoles)
			.innerJoin(roles, eq(userRoles.roleId, roles.id))
			.where(and(eq(userRoles.userId, candidateId), eq(roles.name, ADMIN_ROLE)))

		return Boolean(row)
	}

	/**
	 * Grant a role.
	 *
	 * AZ-4 / RF5: the membership row and its audit entry are written in one
	 * transaction, so a privileged grant can never commit unrecorded — if the
	 * audit insert fails, the grant rolls back with it. The cache is
	 * invalidated only after the commit, because invalidating earlier would let
	 * a concurrent request repopulate it from a state that then rolled back.
	 *
	 * AZ-2 / F-10: granting Admin additionally requires the caller to hold
	 * Admin. Without this, any `users:manage` holder could grant themselves the
	 * top tier — the permission that lets you manage users became the
	 * permission that lets you become anyone.
	 */
	async assignRole(userId: string, roleName: string, actorId: string | null): Promise<void> {
		await this.runGuarded(
			{
				action: "role.assign",
				actorId,
				targetType: "user",
				targetId: userId,
				attempted: { roleName },
			},
			async tx => {
				const [user] = await tx.select().from(users).where(eq(users.id, userId))
				if (!user) throw new ORPCError("NOT_FOUND", { message: `User with ID ${userId} not found` })

				const [role] = await tx.select().from(roles).where(eq(roles.name, roleName))
				if (!role) throw new ORPCError("NOT_FOUND", { message: `Role "${roleName}" not found` })

				if (role.name === ADMIN_ROLE) {
					const actorIsAdmin = actorId ? await this.holdsAdmin(tx, actorId) : false
					if (!actorIsAdmin) {
						throw new PrivilegeGuardError(
							"FORBIDDEN",
							"Only an Admin may grant the Admin role",
							actorId === userId ? "self-escalation attempt" : "caller is not an Admin"
						)
					}
				}

				const [existing] = await tx
					.select()
					.from(userRoles)
					.where(and(eq(userRoles.userId, userId), eq(userRoles.roleId, role.id)))

				await tx.insert(userRoles).values({ userId, roleId: role.id }).onConflictDoNothing()

				// A re-grant of a role the user already holds changes nothing, so
				// it is recorded as a no-op rather than as a state transition.
				// Silence would be worse: the attempt still happened.
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
			}
		)

		this.cacheService.invalidate(userId)
	}

	/**
	 * Revoke a role. Same in-transaction audit guarantee as {@link assignRole}.
	 *
	 * AZ-2 / F-31: removing the last Admin is refused. The count is taken
	 * **inside** the transaction and takes a row lock, which is what closes the
	 * TOCTOU: two concurrent removals of the last two Admins would each
	 * otherwise read "2 remain, fine to remove one" and between them leave the
	 * system with nobody able to administer it.
	 */
	async removeRole(userId: string, roleName: string, actorId: string | null): Promise<void> {
		await this.runGuarded(
			{
				action: "role.remove",
				actorId,
				targetType: "user",
				targetId: userId,
				attempted: { roleName },
			},
			async tx => {
				const [user] = await tx.select().from(users).where(eq(users.id, userId))
				if (!user) throw new ORPCError("NOT_FOUND", { message: `User with ID ${userId} not found` })

				const [role] = await tx.select().from(roles).where(eq(roles.name, roleName))
				if (!role) throw new ORPCError("NOT_FOUND", { message: `Role "${roleName}" not found` })

				if (role.name === ADMIN_ROLE) {
					// `FOR UPDATE` locks every Admin membership row for the rest of
					// this transaction. A concurrent removal blocks here until we
					// commit or roll back, then re-reads the real remaining count
					// instead of a stale one.
					const holders = await tx
						.select({ userId: userRoles.userId })
						.from(userRoles)
						.where(eq(userRoles.roleId, role.id))
						.for("update")

					const targetHolds = holders.some(holder => holder.userId === userId)

					if (targetHolds && holders.length <= 1) {
						throw new PrivilegeGuardError(
							"CONFLICT",
							"Cannot remove the last Admin — at least one Admin must remain",
							"removal would leave zero Admin holders"
						)
					}
				}

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
			}
		)

		this.cacheService.invalidate(userId)
	}

	/**
	 * Run a privileged mutation, converting a guard rejection into an audited
	 * denial and the right HTTP status.
	 *
	 * The guard runs inside the transaction so it reads the same snapshot as
	 * the write it protects, but its rejection rolls that transaction back —
	 * which would take the denial entry with it. So the denial is written
	 * afterwards, on its own: a refused attempt has nothing to roll back, and
	 * losing the record of who tried is worse than recording it separately.
	 */
	private async runGuarded(
		context: {
			action: string
			actorId: string | null
			targetType: string
			targetId: string
			attempted: Record<string, unknown>
		},
		work: (tx: TransactionLike) => Promise<void>
	): Promise<void> {
		try {
			await db.transaction(work)
		} catch (error) {
			if (!(error instanceof PrivilegeGuardError)) throw error

			await this.auditService.record({
				domain: AUDIT_DOMAIN_RBAC,
				action: context.action,
				outcome: "denied",
				actorId: context.actorId,
				targetType: context.targetType,
				targetId: context.targetId,
				newValue: context.attempted,
				reason: error.reason,
			})

			// `ORPCError`, not a Nest exception: these methods run inside an oRPC
			// handler, and oRPC does not understand Nest's HTTP exceptions — it
			// wraps them as a 500, which would turn a deliberate refusal into an
			// apparent server fault. `RbacAdminService` throws `ORPCError` for the
			// same reason.
			throw new ORPCError(error.kind, { message: error.message })
		}
	}
}
