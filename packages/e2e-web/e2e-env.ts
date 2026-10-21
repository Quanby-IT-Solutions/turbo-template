/**
 * Passwords for the web e2e suite.
 *
 * Mirrors the backend helper's admin rule: `E2E_ADMIN_PASSWORD` when it is a
 * non-blank override, otherwise `SEED_ADMIN_PASSWORD`. Both are trimmed. There
 * is no literal fallback. This file does not load `.env` and does not import
 * the backend package.
 *
 * Call these from sign-in, not from module scope, so importing the fixtures
 * does not throw when the unauthenticated project has no passwords set.
 */

export class E2eAdminPasswordError extends Error {
	constructor() {
		super(
			"E2E cannot sign in: neither E2E_ADMIN_PASSWORD nor SEED_ADMIN_PASSWORD is set. " +
				"Set SEED_ADMIN_PASSWORD in packages/db/.env (the file `pnpm db:seed` reads), then run `pnpm db:seed`. " +
				"E2E_ADMIN_PASSWORD is an optional explicit override — do not copy the password into apps/backend/.env. " +
				"There is no default password. " +
				"If this database was already seeded with a different or random password, set SEED_ADMIN_PASSWORD and re-run `pnpm db:seed -- --force-password`."
		)
		this.name = "E2eAdminPasswordError"
	}
}

export class E2eAccountPasswordError extends Error {
	constructor(variable: "E2E_TEST_PASSWORD" | "E2E_TEST_PASSWORD_B") {
		super(
			`Web e2e cannot sign in: ${variable} is not set. There is no default password, and sign-up is not attempted.`
		)
		this.name = "E2eAccountPasswordError"
	}
}

const USER_PASSWORD_ENV = {
	userA: "E2E_TEST_PASSWORD",
	userB: "E2E_TEST_PASSWORD_B",
} as const

export type E2eUserRole = keyof typeof USER_PASSWORD_ENV

function trimmed(value: string | undefined): string {
	return value?.trim() ?? ""
}

/**
 * `E2E_ADMIN_PASSWORD` when it is a non-blank explicit override, otherwise the
 * seeder's `SEED_ADMIN_PASSWORD`.
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

/** Names of the admin password variables that are unset or blank. Never their values. */
export function missingAdminPasswordVariables(env: NodeJS.ProcessEnv = process.env): string[] {
	return (["E2E_ADMIN_PASSWORD", "SEED_ADMIN_PASSWORD"] as const).filter(
		name => !trimmed(env[name])
	)
}

/**
 * Password for userA or userB. No default.
 *
 * @throws {E2eAccountPasswordError} when that role's variable is unset or blank.
 */
export function resolveE2eUserPassword(
	role: E2eUserRole,
	env: NodeJS.ProcessEnv = process.env
): string {
	const variable = USER_PASSWORD_ENV[role]
	const value = trimmed(env[variable])
	if (!value) throw new E2eAccountPasswordError(variable)
	return value
}
