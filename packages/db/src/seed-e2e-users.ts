/* eslint-disable no-console -- CLI entrypoint: stdout/stderr is this script's only UI. */
import "dotenv/config"

import { randomBytes, scryptSync } from "node:crypto"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { and, eq } from "drizzle-orm"
import { drizzle } from "drizzle-orm/node-postgres"
import { Pool } from "pg"

import { accounts, schema, userRoles, users } from "./schema.js"
import { ALLOW_REMOTE_SEED_ENV, assertSeedAllowed, SeedRefusedError } from "./seed-guard.js"

/**
 * Local-only userA and userB for web e2e.
 *
 * Email verification stays required, so these accounts are inserted already
 * verified and with no role. Passwords come only from the environment. They
 * are hashed the same way as `seed.ts` and never printed. Every run stores
 * this run's password, including when the account already exists. The admin
 * seeder still refuses to rotate a password unless `--force-password` is set.
 */

const SEEDED_TEMPLATE_EMAILS = new Set([
	"admin@turbo-template.local",
	"alex@turbo-template.local",
	"sam@turbo-template.local",
])

export class E2eSeedPasswordError extends Error {
	readonly variable: "E2E_TEST_PASSWORD" | "E2E_TEST_PASSWORD_B"

	constructor(variable: "E2E_TEST_PASSWORD" | "E2E_TEST_PASSWORD_B") {
		super(
			`Refusing to seed e2e users: ${variable} is not set. There is no default password, and nothing was written.`
		)
		this.name = "E2eSeedPasswordError"
		this.variable = variable
	}
}

export interface E2eSeedUserPlan {
	id: string
	email: string
	name: string
	password: string
}

export interface E2eSeedPlan {
	databaseUrl: string
	userA: E2eSeedUserPlan
	userB: E2eSeedUserPlan
}

function requirePassword(
	variable: "E2E_TEST_PASSWORD" | "E2E_TEST_PASSWORD_B",
	value: string | undefined
): string {
	const supplied = value?.trim()
	if (!supplied) throw new E2eSeedPasswordError(variable)
	return supplied
}

function optionalText(value: string | undefined, fallback: string): string {
	const supplied = value?.trim()
	return supplied ? supplied : fallback
}

/**
 * Resolve the seed plan and run `assertSeedAllowed()` before any connection.
 *
 * @throws {SeedRefusedError} production or a non-local database
 * @throws {E2eSeedPasswordError} a required password is missing
 */
export function prepareE2eSeed(env: NodeJS.ProcessEnv, _argv: readonly string[]): E2eSeedPlan {
	const databaseUrl = env.DATABASE_URL
	if (!databaseUrl) {
		throw new Error("DATABASE_URL environment variable is not set")
	}

	assertSeedAllowed({
		nodeEnv: env.NODE_ENV,
		databaseUrl,
		allowRemote: env[ALLOW_REMOTE_SEED_ENV] === "true",
	})

	const userAEmail = optionalText(env.E2E_TEST_EMAIL, "test@gmail.com")
	const userBEmail = optionalText(env.E2E_TEST_EMAIL_B, "e2e-user-b@turbo-template.local")
	for (const email of [userAEmail, userBEmail]) {
		if (SEEDED_TEMPLATE_EMAILS.has(email)) {
			throw new Error(
				`Refusing to seed e2e users: ${email} belongs to pnpm db:seed (admin, alex, or sam). Set E2E_TEST_EMAIL / E2E_TEST_EMAIL_B to a different address.`
			)
		}
	}

	return {
		databaseUrl,
		userA: {
			id: "e2e-user-a",
			email: userAEmail,
			name: optionalText(env.E2E_TEST_NAME, "E2E Test User"),
			password: requirePassword("E2E_TEST_PASSWORD", env.E2E_TEST_PASSWORD),
		},
		userB: {
			id: "e2e-user-b",
			email: userBEmail,
			name: "E2E User B",
			password: requirePassword("E2E_TEST_PASSWORD_B", env.E2E_TEST_PASSWORD_B),
		},
	}
}

/** Same scrypt encoding as `hashPassword` in seed.ts (and Better Auth). */
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

async function upsertE2eUser(
	tx: Pick<ReturnType<typeof drizzle<typeof schema>>, "select" | "insert" | "update" | "delete">,
	user: E2eSeedUserPlan,
	now: Date
): Promise<void> {
	const byEmail = await tx.select().from(users).where(eq(users.email, user.email)).limit(1)
	const byId = await tx.select().from(users).where(eq(users.id, user.id)).limit(1)

	let userId = user.id
	if (byEmail[0]) {
		userId = byEmail[0].id
		await tx
			.update(users)
			.set({ name: user.name, emailVerified: true, updatedAt: now })
			.where(eq(users.id, userId))
	} else if (byId[0]) {
		await tx
			.update(users)
			.set({ name: user.name, email: user.email, emailVerified: true, updatedAt: now })
			.where(eq(users.id, userId))
	} else {
		await tx.insert(users).values({
			id: user.id,
			name: user.name,
			email: user.email,
			emailVerified: true,
			image: null,
			createdAt: now,
			updatedAt: now,
		})
	}

	// Ordinary users: a previous experiment must not leave a role behind.
	await tx.delete(userRoles).where(eq(userRoles.userId, userId))

	const hashed = await hashPassword(user.password)
	const existingCredential = await tx
		.select({ accountId: accounts.accountId })
		.from(accounts)
		.where(and(eq(accounts.providerId, "credential"), eq(accounts.userId, userId)))
		.limit(1)

	if (existingCredential.length === 0) {
		await tx.insert(accounts).values({
			providerId: "credential",
			accountId: userId,
			userId,
			password: hashed,
			createdAt: now,
			updatedAt: now,
		})
		return
	}

	await tx
		.update(accounts)
		.set({ password: hashed, updatedAt: now })
		.where(and(eq(accounts.providerId, "credential"), eq(accounts.userId, userId)))
}

async function seedE2eUsers() {
	const plan = prepareE2eSeed(process.env, process.argv.slice(2))
	const pool = new Pool({ connectionString: plan.databaseUrl })
	const db = drizzle({ client: pool, schema })
	const now = new Date()

	try {
		await db.transaction(async tx => {
			await upsertE2eUser(tx, plan.userA, now)
			await upsertE2eUser(tx, plan.userB, now)
		})

		console.log(
			`E2E users ready: userA ${plan.userA.email} and userB ${plan.userB.email} (emailVerified, no role).\n` +
				"Passwords stored for this run: 2."
		)
	} finally {
		await pool.end()
	}
}

function isDirectExecution(): boolean {
	const entry = process.argv[1]
	if (!entry) return false
	return import.meta.url === pathToFileURL(path.resolve(entry)).href
}

if (isDirectExecution()) {
	void seedE2eUsers().catch(error => {
		if (error instanceof SeedRefusedError || error instanceof E2eSeedPasswordError) {
			console.error(error.message)
		} else {
			console.error("E2E user seeding failed.")
			console.error(error)
		}
		process.exitCode = 1
	})
}
