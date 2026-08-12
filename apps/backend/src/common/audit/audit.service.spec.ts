/**
 * AZ-4 / F-17 — the audit trail's two load-bearing guarantees.
 *
 * These run against a real Postgres (the same instance the app uses), because
 * the claim under test is transactional: a privileged mutation and its audit
 * entry either both commit or neither does. A mocked `db` would let a broken
 * implementation pass by construction, since the rollback is the database's
 * behaviour, not ours.
 *
 * Skips itself when no database is reachable so the unit suite stays runnable
 * offline; CI provides Postgres (HY-1 wires the compose service).
 */

import { and, eq, sql } from "drizzle-orm"

import { auditLog, roles, userRoles, users } from "@repo/db/schema"

import { AUDIT_DOMAIN_RBAC, AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"
import { RbacCacheService } from "@/common/rbac/rbac-cache.service"
import { RbacService } from "@/common/rbac/rbac.service"
import { RbacAdminService } from "@/modules/v1/rbac/rbac-admin.service"

// The database, the schema and the transaction are all real — that is the
// point. Only `@repo/contracts` is stubbed, matching the convention in the
// other RBAC specs: it pulls an ESM chain (`@orpc/*`) this jest config does
// not transform, and nothing here depends on its runtime values beyond the two
// constants RbacService reads.
jest.mock("@repo/contracts", () => ({
	ADMIN_ROLE: "Admin",
	PERMISSION_NAMES: ["users:read", "users:manage"],
}))

// `RbacAdminService` imports ORPCError from `@orpc/server`, another ESM
// package this jest config does not transform. The stub keeps the one
// behaviour the denial tests rely on — that a refusal throws with its reason.
jest.mock("@orpc/server", () => ({
	ORPCError: class ORPCError extends Error {
		constructor(
			public code: string,
			options?: { message?: string }
		) {
			super(options?.message ?? code)
			this.name = "ORPCError"
		}
	},
}))

const TEST_USER = "az4-test-subject"
const TEST_ACTOR = "az4-test-actor"
const TEST_ROLE = "AZ4TestRole"

let dbReachable = false

async function cleanup() {
	await db.delete(auditLog).where(eq(auditLog.actorId, TEST_ACTOR))
	await db.delete(auditLog).where(eq(auditLog.targetId, TEST_USER))
	await db.delete(userRoles).where(eq(userRoles.userId, TEST_USER))
	await db.delete(roles).where(eq(roles.name, TEST_ROLE))
	await db.delete(users).where(eq(users.id, TEST_USER))
	await db.delete(users).where(eq(users.id, TEST_ACTOR))
}

beforeAll(async () => {
	try {
		await db.execute(sql`select 1`)
		dbReachable = true
	} catch {
		dbReachable = false
		return
	}

	await cleanup()

	const now = new Date()
	await db.insert(users).values([
		{
			id: TEST_USER,
			name: "AZ4 Subject",
			email: "az4-subject@test.local",
			createdAt: now,
			updatedAt: now,
		},
		{
			id: TEST_ACTOR,
			name: "AZ4 Actor",
			email: "az4-actor@test.local",
			createdAt: now,
			updatedAt: now,
		},
	])
	await db.insert(roles).values({ name: TEST_ROLE, description: "AZ-4 fixture" })
})

afterAll(async () => {
	if (!dbReachable) return
	await cleanup()
	// Drizzle keeps a pool open; without this jest hangs after the run rather
	// than exiting, which in CI reads as a stuck job.
	await db.$client.end()
})

const itDb: jest.It = ((name: string, fn: jest.ProvidesCallback, timeout?: number) =>
	it(
		name,
		async (...args: unknown[]) => {
			if (!dbReachable) {
				console.warn(`[az-4] skipped "${name}": no database reachable`)
				return
			}
			return (fn as (...a: unknown[]) => unknown)(...args)
		},
		timeout
	)) as jest.It

function makeRbacService() {
	return new RbacService(new RbacCacheService(), new AuditService())
}

function makeAdminService() {
	const cache = new RbacCacheService()
	const audit = new AuditService()
	return new RbacAdminService(new RbacService(cache, audit), cache, audit)
}

async function entriesFor(targetId: string) {
	return db.select().from(auditLog).where(eq(auditLog.targetId, targetId))
}

describe("audit trail is written in the same transaction as the mutation", () => {
	beforeEach(async () => {
		if (!dbReachable) return
		await db.delete(auditLog).where(eq(auditLog.targetId, TEST_USER))
		await db.delete(userRoles).where(eq(userRoles.userId, TEST_USER))
	})

	itDb("records a grant with actor, target and old→new state", async () => {
		await makeRbacService().assignRole(TEST_USER, TEST_ROLE, TEST_ACTOR)

		const entries = await entriesFor(TEST_USER)
		expect(entries).toHaveLength(1)

		const entry = entries[0]!
		expect(entry.domain).toBe(AUDIT_DOMAIN_RBAC)
		expect(entry.action).toBe("role.assign")
		expect(entry.outcome).toBe("success")
		expect(entry.actorId).toBe(TEST_ACTOR)
		expect(entry.targetType).toBe("user")
		expect(entry.oldValue).toEqual({ roleHeld: false })
		expect(entry.newValue).toEqual({ roleHeld: true, roleName: TEST_ROLE })
	})

	itDb("records a removal with old→new state", async () => {
		const service = makeRbacService()
		await service.assignRole(TEST_USER, TEST_ROLE, TEST_ACTOR)
		await service.removeRole(TEST_USER, TEST_ROLE, TEST_ACTOR)

		const actions = (await entriesFor(TEST_USER)).map(e => e.action)
		expect(actions).toEqual(["role.assign", "role.remove"])
	})

	itDb("rolls the grant back when the audit insert fails", async () => {
		// The whole point of AZ-4: a privileged change must not be able to
		// commit unrecorded. Break only the audit write and the grant must die
		// with it.
		const audit = new AuditService()
		jest.spyOn(audit, "record").mockRejectedValue(new Error("audit sink unavailable"))

		const service = new RbacService(new RbacCacheService(), audit)

		await expect(service.assignRole(TEST_USER, TEST_ROLE, TEST_ACTOR)).rejects.toThrow(
			/audit sink unavailable/
		)

		const [role] = await db.select().from(roles).where(eq(roles.name, TEST_ROLE))
		const held = await db
			.select()
			.from(userRoles)
			.where(and(eq(userRoles.userId, TEST_USER), eq(userRoles.roleId, role!.id)))

		expect(held).toHaveLength(0)
		expect(await entriesFor(TEST_USER)).toHaveLength(0)
	})

	itDb("rolls the removal back when the audit insert fails", async () => {
		await makeRbacService().assignRole(TEST_USER, TEST_ROLE, TEST_ACTOR)

		const audit = new AuditService()
		jest.spyOn(audit, "record").mockRejectedValue(new Error("audit sink unavailable"))

		await expect(
			new RbacService(new RbacCacheService(), audit).removeRole(TEST_USER, TEST_ROLE, TEST_ACTOR)
		).rejects.toThrow(/audit sink unavailable/)

		const [role] = await db.select().from(roles).where(eq(roles.name, TEST_ROLE))
		const held = await db
			.select()
			.from(userRoles)
			.where(and(eq(userRoles.userId, TEST_USER), eq(userRoles.roleId, role!.id)))

		// Still held — the removal was undone with its audit entry.
		expect(held).toHaveLength(1)
	})
})

describe("refused privileged attempts are recorded", () => {
	// AZ-4: "a denial is evidence". Who *tried* to escalate and was stopped is
	// the question an audit trail most often has to answer, so a rejection must
	// leave a row behind rather than only an error response.
	let adminRoleId: number

	beforeAll(async () => {
		if (!dbReachable) return
		const [admin] = await db.select().from(roles).where(eq(roles.name, "Admin"))
		adminRoleId = admin!.id
	})

	beforeEach(async () => {
		if (!dbReachable) return
		await db.delete(auditLog).where(eq(auditLog.actorId, TEST_ACTOR))
	})

	itDb("records the refusal to rename the Admin role", async () => {
		await expect(
			makeAdminService().updateRole({ id: adminRoleId, name: "NotAdmin" }, TEST_ACTOR)
		).rejects.toThrow(/cannot be renamed/)

		const [entry] = await db.select().from(auditLog).where(eq(auditLog.actorId, TEST_ACTOR))

		expect(entry).toBeDefined()
		expect(entry!.domain).toBe(AUDIT_DOMAIN_RBAC)
		expect(entry!.action).toBe("role.update")
		expect(entry!.outcome).toBe("denied")
		expect(entry!.actorId).toBe(TEST_ACTOR)
		expect(entry!.targetType).toBe("role")
		expect(entry!.targetId).toBe(String(adminRoleId))
		expect(entry!.reason).toMatch(/cannot be renamed/)
		// The attempted change is preserved, not just the fact of refusal.
		expect(entry!.newValue).toEqual({ name: "NotAdmin" })
	})

	itDb("records the refusal to delete the Admin role", async () => {
		await expect(makeAdminService().deleteRole(adminRoleId, TEST_ACTOR)).rejects.toThrow(
			/cannot be deleted/
		)

		const [entry] = await db.select().from(auditLog).where(eq(auditLog.actorId, TEST_ACTOR))

		expect(entry!.action).toBe("role.delete")
		expect(entry!.outcome).toBe("denied")
		expect(entry!.reason).toMatch(/cannot be deleted/)
	})

	itDb("leaves the Admin role untouched after a refused attempt", async () => {
		await expect(makeAdminService().deleteRole(adminRoleId, TEST_ACTOR)).rejects.toThrow()

		const [admin] = await db.select().from(roles).where(eq(roles.id, adminRoleId))
		expect(admin?.name).toBe("Admin")
	})

	itDb("surfaces denials through the read API alongside successes", async () => {
		await expect(makeAdminService().deleteRole(adminRoleId, TEST_ACTOR)).rejects.toThrow()

		const { entries } = await new AuditService().list({ limit: 50 })
		const denial = entries.find(e => e.actorId === TEST_ACTOR && e.outcome === "denied")

		expect(denial).toBeDefined()
		expect(denial!.action).toBe("role.delete")
	})
})

describe("audit log reads", () => {
	itDb("returns entries newest first", async () => {
		const service = makeRbacService()
		await service.assignRole(TEST_USER, TEST_ROLE, TEST_ACTOR)
		await service.removeRole(TEST_USER, TEST_ROLE, TEST_ACTOR)

		const { entries } = await new AuditService().list({ limit: 50 })
		const mine = entries.filter(e => e.targetId === TEST_USER)

		expect(mine[0]?.action).toBe("role.remove")
		expect(mine[1]?.action).toBe("role.assign")
		// Ordered by id, so entries sharing a timestamp still sort deterministically.
		expect(mine[0]!.id).toBeGreaterThan(mine[1]!.id)
	})

	itDb("resolves the actor's email for display", async () => {
		await makeRbacService().assignRole(TEST_USER, TEST_ROLE, TEST_ACTOR)

		const { entries } = await new AuditService().list({ limit: 50 })
		const mine = entries.find(e => e.targetId === TEST_USER)

		expect(mine?.actorEmail).toBe("az4-actor@test.local")
	})

	itDb("pages with a cursor and reports the next one", async () => {
		const service = makeRbacService()
		await service.assignRole(TEST_USER, TEST_ROLE, TEST_ACTOR)
		await service.removeRole(TEST_USER, TEST_ROLE, TEST_ACTOR)

		const first = await new AuditService().list({ limit: 1 })
		expect(first.entries).toHaveLength(1)
		expect(first.nextCursor).toBe(first.entries[0]!.id)

		const second = await new AuditService().list({ limit: 1, before: first.nextCursor! })
		expect(second.entries[0]!.id).toBeLessThan(first.entries[0]!.id)
	})

	itDb("exposes no update or delete method", () => {
		// The append-only rule is enforced by there being no other way in.
		const surface = Object.getOwnPropertyNames(AuditService.prototype)
		expect(surface.sort()).toEqual(["constructor", "list", "record"])
	})
})
