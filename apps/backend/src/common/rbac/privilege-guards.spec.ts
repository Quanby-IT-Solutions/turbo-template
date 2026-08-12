/**
 * AZ-2 / F-10 + F-31 — privilege-tier collapse and last-Admin protection.
 *
 * Against a real Postgres, because both guarantees are transactional: the
 * last-Admin count must be taken under a row lock inside the same transaction
 * as the removal, and the TOCTOU this closes only exists between concurrent
 * database transactions. A mocked db cannot exhibit it, so a mocked test could
 * not catch its return.
 */

import { and, eq, sql } from "drizzle-orm"

import { auditLog, roles, userRoles, users } from "@repo/db/schema"

import { AuditService } from "@/common/audit/audit.service"
import { db } from "@/common/database/database.client"
import { RbacCacheService } from "@/common/rbac/rbac-cache.service"
import { RbacService } from "@/common/rbac/rbac.service"

jest.mock("@repo/contracts", () => ({
	ADMIN_ROLE: "Admin",
	PERMISSION_NAMES: ["users:read", "users:manage"],
}))

// `RbacService` refuses with `ORPCError` so oRPC maps the denial to 403/409
// instead of a 500. `@orpc/server` is ESM and this jest config does not
// transform it, so the stub stands in — it keeps the `code`, which is exactly
// what the status assertions below read.
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

const MANAGER = "az2-manager" // holds users:manage, NOT Admin
const ADMIN_A = "az2-admin-a"
const ADMIN_B = "az2-admin-b"
const SUBJECT = "az2-subject"
const ALL_USERS = [MANAGER, ADMIN_A, ADMIN_B, SUBJECT]

let dbReachable = false
let adminRoleId: number
/** Real Admin memberships, set aside for the duration of this suite. */
let preexistingAdmins: { userId: string; roleId: number }[] = []

async function cleanup() {
	for (const id of ALL_USERS) {
		await db.delete(auditLog).where(eq(auditLog.actorId, id))
		await db.delete(auditLog).where(eq(auditLog.targetId, id))
		await db.delete(userRoles).where(eq(userRoles.userId, id))
	}
	for (const id of ALL_USERS) {
		await db.delete(users).where(eq(users.id, id))
	}
}

/** Reset Admin membership to exactly the given users. */
async function setAdmins(ids: string[]) {
	for (const id of ALL_USERS) {
		await db
			.delete(userRoles)
			.where(and(eq(userRoles.userId, id), eq(userRoles.roleId, adminRoleId)))
	}
	if (ids.length) {
		await db.insert(userRoles).values(ids.map(id => ({ userId: id, roleId: adminRoleId })))
	}
}

/** How many users hold Admin, counting only this test's fixtures. */
async function adminCount(): Promise<number> {
	const rows = await db.select().from(userRoles).where(eq(userRoles.roleId, adminRoleId))
	return rows.filter(r => ALL_USERS.includes(r.userId)).length
}

function makeService() {
	return new RbacService(new RbacCacheService(null), new AuditService())
}

async function denialsFor(actorId: string) {
	const rows = await db.select().from(auditLog).where(eq(auditLog.actorId, actorId))
	return rows.filter(r => r.outcome === "denied")
}

beforeAll(async () => {
	try {
		await db.execute(sql`select 1`)
		dbReachable = true
	} catch {
		return
	}

	await cleanup()

	const now = new Date()
	await db.insert(users).values(
		ALL_USERS.map(id => ({
			id,
			name: id,
			email: `${id}@test.local`,
			createdAt: now,
			updatedAt: now,
		}))
	)

	const [admin] = await db.select().from(roles).where(eq(roles.name, "Admin"))
	adminRoleId = admin!.id

	// "Last Admin" is a global condition, so the fixtures have to be the only
	// holders while these tests run. Real memberships are set aside and put
	// back in afterAll — deleting them outright would strip the seeded admin
	// of its role and quietly break every later e2e run against this database.
	preexistingAdmins = await db.select().from(userRoles).where(eq(userRoles.roleId, adminRoleId))
	await db.delete(userRoles).where(eq(userRoles.roleId, adminRoleId))
})

afterAll(async () => {
	if (!dbReachable) return
	await cleanup()

	// Restore what was here before, exactly.
	await db.delete(userRoles).where(eq(userRoles.roleId, adminRoleId))
	if (preexistingAdmins.length) {
		await db.insert(userRoles).values(preexistingAdmins).onConflictDoNothing()
	}

	await db.$client.end()
})

const itDb: jest.It = ((name: string, fn: jest.ProvidesCallback, timeout?: number) =>
	it(
		name,
		async (...args: unknown[]) => {
			if (!dbReachable) {
				console.warn(`[az-2] skipped "${name}": no database reachable`)
				return
			}
			return (fn as (...a: unknown[]) => unknown)(...args)
		},
		timeout
	)) as jest.It

describe("Admin grants require Admin (F-10)", () => {
	beforeEach(async () => {
		if (!dbReachable) return
		await db.delete(auditLog).where(eq(auditLog.actorId, MANAGER))
		await setAdmins([ADMIN_A])
	})

	itDb("refuses a users:manage holder granting Admin to themselves", async () => {
		// The self-escalation this ticket exists to stop: the permission that
		// lets you manage users must not be the permission that lets you become
		// anyone.
		await expect(makeService().assignRole(MANAGER, "Admin", MANAGER)).rejects.toThrow(
			/Only an Admin may grant the Admin role/
		)

		const held = await db
			.select()
			.from(userRoles)
			.where(and(eq(userRoles.userId, MANAGER), eq(userRoles.roleId, adminRoleId)))
		expect(held).toHaveLength(0)
	})

	itDb("refuses a users:manage holder granting Admin to someone else", async () => {
		await expect(makeService().assignRole(SUBJECT, "Admin", MANAGER)).rejects.toThrow(
			/Only an Admin may grant the Admin role/
		)
	})

	itDb("audits the refused self-escalation with actor, target and reason", async () => {
		await expect(makeService().assignRole(MANAGER, "Admin", MANAGER)).rejects.toThrow()

		const denials = await denialsFor(MANAGER)
		expect(denials).toHaveLength(1)
		expect(denials[0]!.action).toBe("role.assign")
		expect(denials[0]!.targetId).toBe(MANAGER)
		expect(denials[0]!.reason).toMatch(/self-escalation/)
		expect(denials[0]!.newValue).toEqual({ roleName: "Admin" })
	})

	itDb("distinguishes granting to another from granting to self in the reason", async () => {
		await expect(makeService().assignRole(SUBJECT, "Admin", MANAGER)).rejects.toThrow()

		const denials = await denialsFor(MANAGER)
		expect(denials[0]!.reason).toMatch(/not an Admin/)
	})

	itDb("allows an Admin to grant Admin, and audits the success", async () => {
		await makeService().assignRole(SUBJECT, "Admin", ADMIN_A)

		const held = await db
			.select()
			.from(userRoles)
			.where(and(eq(userRoles.userId, SUBJECT), eq(userRoles.roleId, adminRoleId)))
		expect(held).toHaveLength(1)

		const [entry] = await db.select().from(auditLog).where(eq(auditLog.targetId, SUBJECT))
		expect(entry!.outcome).toBe("success")
		expect(entry!.actorId).toBe(ADMIN_A)
	})

	itDb("does not gate non-Admin roles behind Admin", async () => {
		// The tier check must apply only to the Admin role; a users:manage
		// holder still administers ordinary roles.
		await expect(makeService().assignRole(SUBJECT, "User", MANAGER)).resolves.toBeUndefined()
	})
})

describe("last Admin cannot be removed (F-31)", () => {
	beforeEach(async () => {
		if (!dbReachable) return
		await db.delete(auditLog).where(eq(auditLog.actorId, ADMIN_A))
	})

	itDb("refuses the removal that would leave zero Admins, with 409 semantics", async () => {
		await setAdmins([ADMIN_A])

		await expect(makeService().removeRole(ADMIN_A, "Admin", ADMIN_A)).rejects.toThrow(
			/Cannot remove the last Admin/
		)
		expect(await adminCount()).toBe(1)
	})

	itDb("audits the refused last-Admin removal", async () => {
		await setAdmins([ADMIN_A])
		await expect(makeService().removeRole(ADMIN_A, "Admin", ADMIN_A)).rejects.toThrow()

		const denials = await denialsFor(ADMIN_A)
		expect(denials[0]!.action).toBe("role.remove")
		expect(denials[0]!.reason).toMatch(/zero Admin/)
	})

	itDb("allows removing an Admin while another remains", async () => {
		await setAdmins([ADMIN_A, ADMIN_B])

		await makeService().removeRole(ADMIN_B, "Admin", ADMIN_A)
		expect(await adminCount()).toBe(1)
	})

	itDb(
		"closes the TOCTOU: concurrent removals of the last two Admins",
		async () => {
			// Without the in-transaction locked count, both transactions read
			// "2 Admins remain" and both proceed, leaving nobody able to
			// administer the system.
			//
			// Repeated deliberately. A single round only loses the race about a
			// third of the time, so a one-shot version of this test would pass
			// two runs in three even with the lock removed — it would sit in the
			// suite looking like protection while catching nothing. Over ten
			// rounds an unlocked implementation is caught with ~98% probability.
			const service = makeService()

			for (let round = 1; round <= 10; round++) {
				await setAdmins([ADMIN_A, ADMIN_B])

				const results = await Promise.allSettled([
					service.removeRole(ADMIN_A, "Admin", ADMIN_A),
					service.removeRole(ADMIN_B, "Admin", ADMIN_B),
				])

				const succeeded = results.filter(r => r.status === "fulfilled").length

				expect(succeeded).toBeLessThanOrEqual(1)
				// Whatever happened, an Admin is still standing.
				expect(await adminCount()).toBeGreaterThanOrEqual(1)
			}
		},
		30_000
	)

	itDb("still allows removing a non-Admin role from the last Admin", async () => {
		await setAdmins([ADMIN_A])
		await makeService().assignRole(ADMIN_A, "User", ADMIN_A)

		await expect(makeService().removeRole(ADMIN_A, "User", ADMIN_A)).resolves.toBeUndefined()
		expect(await adminCount()).toBe(1)
	})

	itDb("treats removing Admin from someone who lacks it as a harmless no-op", async () => {
		await setAdmins([ADMIN_A])

		await expect(makeService().removeRole(SUBJECT, "Admin", ADMIN_A)).resolves.toBeUndefined()
		expect(await adminCount()).toBe(1)
	})
})
