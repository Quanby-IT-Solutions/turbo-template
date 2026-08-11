import { randomBytes } from "node:crypto"

/**
 * Boot guards for the database seeder (AC-2 / F-06).
 *
 * The seeder provisions a pre-verified Admin account. Historically it used a
 * fixed password, printed it, reset it on every re-run, and had no environment
 * guard — a known-credential Admin one command away from any database,
 * production included.
 *
 * Risky Flow **RF3** (fail-closed boot): these checks run BEFORE any write and
 * throw, so `seed.ts` exits non-zero rather than relying on operator care.
 *
 * Pure functions, no DB access — directly unit-testable.
 */

/** Hosts treated as developer machines / local Compose services. */
export const LOCAL_DATABASE_HOSTS = [
	"localhost",
	"127.0.0.1",
	"::1",
	"[::1]",
	"host.docker.internal",
	// Compose service names used by the bundled local stack.
	"postgres",
	"db",
	"database",
] as const

/** CLI flag that opts in to overwriting existing seed passwords. */
export const FORCE_PASSWORD_FLAG = "--force-password"

/** Env var that deliberately permits seeding a non-local (but non-production) DB. */
export const ALLOW_REMOTE_SEED_ENV = "ALLOW_REMOTE_SEED"

/** Thrown when the seeder refuses to run. Carries an operator-actionable message. */
export class SeedRefusedError extends Error {
	constructor(message: string) {
		super(message)
		this.name = "SeedRefusedError"
	}
}

/**
 * True when the connection string points at a local development database.
 *
 * Fails closed: anything unparseable is treated as non-local.
 */
export function isLocalDatabaseUrl(databaseUrl: string): boolean {
	let hostname: string
	try {
		hostname = new URL(databaseUrl).hostname
	} catch {
		return false
	}

	if (!hostname) return false

	const normalized = hostname.toLowerCase()
	return (LOCAL_DATABASE_HOSTS as readonly string[]).includes(normalized)
}

/**
 * Refuse to seed production — or any database that is not obviously local —
 * before a single row is written.
 *
 * @throws {SeedRefusedError}
 */
export function assertSeedAllowed(input: {
	nodeEnv: string | undefined
	databaseUrl: string
	allowRemote?: boolean
}): void {
	if (input.nodeEnv === "production") {
		throw new SeedRefusedError(
			"Refusing to seed: NODE_ENV=production. The seeder provisions a privileged Admin account and must never run against a production database."
		)
	}

	if (!isLocalDatabaseUrl(input.databaseUrl) && !input.allowRemote) {
		throw new SeedRefusedError(
			`Refusing to seed: DATABASE_URL does not point at a local database (expected one of ${LOCAL_DATABASE_HOSTS.join(", ")}). ` +
				`If this really is a disposable non-production database, re-run with ${ALLOW_REMOTE_SEED_ENV}=true.`
		)
	}
}

/**
 * Resolve the password used for seeded credential accounts.
 *
 * Operator-supplied values are used as-is and never printed; otherwise a random
 * one is generated and the caller prints it exactly once (only if it is
 * actually written — see `--force-password` handling in seed.ts).
 */
export function resolveSeedPassword(envPassword: string | undefined): {
	password: string
	generated: boolean
} {
	const supplied = envPassword?.trim()
	if (supplied) {
		return { password: supplied, generated: false }
	}

	return { password: randomBytes(24).toString("base64url"), generated: true }
}

/** True when the operator explicitly asked to overwrite existing seed passwords. */
export function hasForcePasswordFlag(argv: readonly string[]): boolean {
	return argv.includes(FORCE_PASSWORD_FLAG)
}

/**
 * Decide whether a seeded credential account's password may be written.
 *
 * Re-running the seeder must never silently rotate a credential that already
 * exists — only `--force-password` does that. Brand-new accounts always get the
 * resolved password, otherwise they would have none at all.
 */
export function shouldWritePassword(input: {
	accountExists: boolean
	forcePassword: boolean
}): boolean {
	return !input.accountExists || input.forcePassword
}
