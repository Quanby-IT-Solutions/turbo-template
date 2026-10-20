/**
 * Admin credential the backend e2e suite signs in with.
 *
 * The seeder (`packages/db/src/seed.ts`) hashes `SEED_ADMIN_PASSWORD` from
 * `packages/db/.env`. This helper reads that same variable, after `setup-env.ts`
 * has loaded the seed env file. `E2E_ADMIN_PASSWORD` is an explicit override for
 * a single run — not a second copy of the password, and not a default.
 *
 * There is no literal fallback. A missing value throws here, at suite startup,
 * instead of signing in with a guess.
 */

/** Seeded admin address. An email is not a secret, so the default stays. */
export const SEEDED_ADMIN_EMAIL = "admin@turbo-template.local"

export class E2eAdminPasswordError extends Error {
	constructor() {
		super(
			"Backend e2e cannot sign in: neither E2E_ADMIN_PASSWORD nor SEED_ADMIN_PASSWORD is set. " +
				"Set SEED_ADMIN_PASSWORD in packages/db/.env (the file `pnpm db:seed` reads), then run `pnpm db:seed`. " +
				"E2E_ADMIN_PASSWORD is an optional explicit override — do not copy the password into apps/backend/.env. " +
				"There is no default password. " +
				"If this database was already seeded with a different or random password, set SEED_ADMIN_PASSWORD and re-run `pnpm db:seed -- --force-password`."
		)
		this.name = "E2eAdminPasswordError"
	}
}

function trimmed(value: string | undefined): string {
	return value?.trim() ?? ""
}

/**
 * `E2E_ADMIN_PASSWORD` when it is a non-blank explicit override, otherwise the
 * seeder's `SEED_ADMIN_PASSWORD`. Both are trimmed the same way
 * `resolveSeedPassword` trims a supplied seed password.
 *
 * @throws {E2eAdminPasswordError} when neither variable has a non-blank value.
 */
export function resolveE2eAdminPassword(env: NodeJS.ProcessEnv = process.env): string {
	const override = trimmed(env.E2E_ADMIN_PASSWORD)
	if (override) return override

	const seeded = trimmed(env.SEED_ADMIN_PASSWORD)
	if (seeded) return seeded

	throw new E2eAdminPasswordError()
}

/** `E2E_ADMIN_EMAIL` when set, otherwise the seeded admin address. */
export function resolveE2eAdminEmail(env: NodeJS.ProcessEnv = process.env): string {
	return trimmed(env.E2E_ADMIN_EMAIL) || SEEDED_ADMIN_EMAIL
}
