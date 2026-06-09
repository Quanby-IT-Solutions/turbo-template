import "dotenv/config"

import { randomBytes, scryptSync } from "node:crypto"
import { inArray, or } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import {
	ADMIN_ROLE,
	PERMISSION_NAMES,
	ROLE_NAMES,
	type PermissionName,
	type RoleName,
} from "@repo/contracts"

import {
	accounts,
	permissions,
	rolePermissions,
	roles,
	schema,
	tickets,
	todos,
	userRoles,
	users,
} from "./schema.js"

async function hashPassword(password: string): Promise<string> {
	const saltHex = randomBytes(16).toString("hex")
	const key = scryptSync(password.normalize("NFKC"), saltHex, 64, {
		N: 16384,
		r: 16,
		p: 1,
		maxmem: 128 * 16384 * 16 * 2,
	})

	return `${saltHex}:${key.toString("hex")}`
}

async function seedDatabase() {
	const connectionString = process.env.DATABASE_URL

	if (!connectionString) {
		throw new Error("DATABASE_URL environment variable is not set")
	}

	const pool = new Pool({ connectionString })
	const db = drizzle({ client: pool, schema })
	const now = new Date()
	const seedPassword = "password123"
	const hashedSeedPassword = await hashPassword(seedPassword)

	const seedUsers: Array<typeof users.$inferInsert> = [
		{
			id: "seed-user-admin",
			name: "Admin User",
			email: "admin@turbo-template.local",
			emailVerified: true,
			image: null,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "seed-user-alex",
			name: "Alex Johnson",
			email: "alex@turbo-template.local",
			emailVerified: true,
			image: null,
			createdAt: now,
			updatedAt: now,
		},
		{
			id: "seed-user-sam",
			name: "Sam Rivera",
			email: "sam@turbo-template.local",
			emailVerified: false,
			image: null,
			createdAt: now,
			updatedAt: now,
		},
	]

	const seedTodos: Array<typeof todos.$inferInsert> = [
		{
			title: "Review onboarding checklist",
			completed: true,
			authorId: "seed-user-admin",
			createdAt: now,
			updatedAt: now,
		},
		{
			title: "Verify backend health endpoint",
			completed: false,
			authorId: "seed-user-admin",
			createdAt: now,
			updatedAt: now,
		},
		{
			title: "Connect mobile app to local API",
			completed: false,
			authorId: "seed-user-alex",
			createdAt: now,
			updatedAt: now,
		},
		{
			title: "Draft release notes for staging",
			completed: false,
			authorId: "seed-user-sam",
			createdAt: now,
			updatedAt: now,
		},
	]

	const seedTickets: Array<typeof tickets.$inferInsert> = [
		{
			name: "Admin User",
			email: "admin@turbo-template.local",
			subject: "Initial admin setup check",
			priority: "high" as const,
			concern: "Please verify seeded admin data appears correctly across the dashboard.",
			status: "in_progress" as const,
			authorId: "seed-user-admin",
			createdAt: now,
			updatedAt: now,
		},
		{
			name: "Alex Johnson",
			email: "alex@turbo-template.local",
			subject: "Mobile API connectivity",
			priority: "medium" as const,
			concern: "Android emulator needs a stable local API URL during development.",
			status: "received" as const,
			authorId: "seed-user-alex",
			createdAt: now,
			updatedAt: now,
		},
		{
			name: "Guest Reporter",
			email: "guest@turbo-template.local",
			subject: "Public feedback sample",
			priority: "low" as const,
			concern: "This anonymous ticket exists to test support workflows without a linked account.",
			status: "received" as const,
			authorId: null,
			createdAt: now,
			updatedAt: now,
		},
	]

	const seededUserIds = seedUsers.map(user => user.id)
	const seededTicketEmails = seedTickets.map(ticket => ticket.email)
	const seedCredentialAccounts: Array<typeof accounts.$inferInsert> = seedUsers.map(user => ({
		providerId: "credential",
		accountId: user.id,
		userId: user.id,
		password: hashedSeedPassword,
		createdAt: now,
		updatedAt: now,
	}))

	const roleDescriptions: Record<RoleName, string> = {
		Admin: "Super-administrator; full access via role-name short-circuit",
		Manager: "Can manage posts and read users",
		User: "Standard user with read access to posts",
	}

	const seedRoles: Array<typeof roles.$inferInsert> = ROLE_NAMES.map(name => ({
		name,
		description: roleDescriptions[name],
		createdAt: now,
		updatedAt: now,
	}))

	const permissionDescriptions: Record<PermissionName, string> = {
		"posts:read": "Read posts",
		"posts:create": "Create posts",
		"posts:edit": "Edit posts",
		"posts:delete": "Delete posts",
		"posts:*": "All actions on posts",
		"users:read": "Read user profiles",
		"users:manage": "Manage users",
	}

	const seedPermissions: Array<typeof permissions.$inferInsert> = PERMISSION_NAMES.map(name => ({
		name,
		description: permissionDescriptions[name],
		createdAt: now,
		updatedAt: now,
	}))

	// Role -> permission names. Admin omitted: granted via role-name short-circuit.
	const rolePermissionNames: Partial<Record<RoleName, PermissionName[]>> = {
		Manager: ["posts:*", "users:read"],
		User: ["posts:read"],
	}

	// User id -> role name.
	const userRoleAssignments: Array<{ userId: string; roleName: RoleName }> = [
		{ userId: "seed-user-admin", roleName: ADMIN_ROLE },
		{ userId: "seed-user-alex", roleName: "User" },
		{ userId: "seed-user-sam", roleName: "User" },
	]

	let rolePermissionCount = 0
	let userRoleCount = 0

	try {
		await db.transaction(async tx => {
			for (const user of seedUsers) {
				await tx
					.insert(users)
					.values(user)
					.onConflictDoUpdate({
						target: users.id,
						set: {
							name: user.name,
							email: user.email,
							emailVerified: user.emailVerified,
							image: user.image,
							updatedAt: now,
						},
					})
			}

			for (const account of seedCredentialAccounts) {
				await tx
					.insert(accounts)
					.values(account)
					.onConflictDoUpdate({
						target: [accounts.providerId, accounts.accountId],
						set: {
							userId: account.userId,
							password: account.password,
							updatedAt: now,
						},
					})
			}

			for (const role of seedRoles) {
				await tx
					.insert(roles)
					.values(role)
					.onConflictDoUpdate({
						target: roles.name,
						set: { description: role.description, updatedAt: now },
					})
			}

			for (const permission of seedPermissions) {
				await tx
					.insert(permissions)
					.values(permission)
					.onConflictDoUpdate({
						target: permissions.name,
						set: { description: permission.description, updatedAt: now },
					})
			}

			const roleRows = await tx.select().from(roles)
			const permissionRows = await tx.select().from(permissions)
			const roleIdByName = new Map<string, number>(roleRows.map(r => [r.name, r.id]))
			const permissionIdByName = new Map<string, number>(permissionRows.map(p => [p.name, p.id]))

			const seedRolePermissions: Array<typeof rolePermissions.$inferInsert> = []
			for (const [roleName, permNames] of Object.entries(rolePermissionNames)) {
				const roleId = roleIdByName.get(roleName)
				if (roleId === undefined || !permNames) continue
				for (const permName of permNames) {
					const permissionId = permissionIdByName.get(permName)
					if (permissionId === undefined) continue
					seedRolePermissions.push({ roleId, permissionId })
				}
			}

			for (const row of seedRolePermissions) {
				await tx.insert(rolePermissions).values(row).onConflictDoNothing()
			}
			rolePermissionCount = seedRolePermissions.length

			const seedUserRoles: Array<typeof userRoles.$inferInsert> = []
			for (const assignment of userRoleAssignments) {
				const roleId = roleIdByName.get(assignment.roleName)
				if (roleId === undefined) continue
				seedUserRoles.push({ userId: assignment.userId, roleId })
			}

			for (const row of seedUserRoles) {
				await tx.insert(userRoles).values(row).onConflictDoNothing()
			}
			userRoleCount = seedUserRoles.length

			await tx.delete(todos).where(inArray(todos.authorId, seededUserIds))

			await tx
				.delete(tickets)
				.where(
					or(inArray(tickets.email, seededTicketEmails), inArray(tickets.authorId, seededUserIds))
				)

			await tx.insert(todos).values(seedTodos)
			await tx.insert(tickets).values(seedTickets)
		})

		console.log(
			`Seeded ${seedUsers.length} users, ${seedCredentialAccounts.length} credential accounts, ${seedTodos.length} todos, and ${seedTickets.length} tickets.\n` +
				`RBAC: ${seedRoles.length} roles, ${seedPermissions.length} permissions, ${rolePermissionCount} role-permission mappings, ${userRoleCount} user-role assignments.\n` +
				`Default password: ${seedPassword}`
		)
	} finally {
		await pool.end()
	}
}

void seedDatabase().catch(error => {
	console.error("Database seeding failed.")
	console.error(error)
	process.exitCode = 1
})
