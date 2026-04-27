import "dotenv/config"

import { inArray, or } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { schema, tickets, todos, users } from "./schema.js"

async function seedDatabase() {
	const connectionString = process.env.DATABASE_URL

	if (!connectionString) {
		throw new Error("DATABASE_URL environment variable is not set")
	}

	const pool = new Pool({ connectionString })
	const db = drizzle({ client: pool, schema })
	const now = new Date()

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

			await tx.delete(todos).where(inArray(todos.authorId, seededUserIds))

			await tx
				.delete(tickets)
				.where(or(inArray(tickets.email, seededTicketEmails), inArray(tickets.authorId, seededUserIds)))

			await tx.insert(todos).values(seedTodos)
			await tx.insert(tickets).values(seedTickets)
		})

		console.log(`Seeded ${seedUsers.length} users, ${seedTodos.length} todos, and ${seedTickets.length} tickets.`)
	} finally {
		await pool.end()
	}
}

void seedDatabase().catch(error => {
	console.error("Database seeding failed.")
	console.error(error)
	process.exitCode = 1
})