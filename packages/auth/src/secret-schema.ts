import { z } from "zod"

/**
 * Shared validation for `BETTER_AUTH_SECRET`.
 *
 * Two processes independently sign/verify sessions with this value — the
 * `@repo/auth` package (used by the web app and by Better Auth itself) and the
 * NestJS backend's own env config. They MUST agree on what counts as an
 * acceptable secret, so the rules live here once and both import them.
 *
 * Risky Flow **RF3** (fail-closed boot): a missing, short, or template-default
 * secret must stop the process at startup rather than silently enabling session
 * forgery for every account, including Admin.
 */

/**
 * Minimum accepted length. `openssl rand -base64 32` produces 44 characters, so
 * a real secret clears this comfortably; 32 is the floor below which brute
 * force becomes plausible.
 */
export const AUTH_SECRET_MIN_LENGTH = 32

/**
 * Lowercased prefixes that identify a value copied straight out of the
 * template/docs rather than generated. Matched case-insensitively.
 *
 * `default-secret` is the value `.env.example` used to ship (F-03); the rest
 * cover the common "fill me in" placeholders, including the angle-bracket form
 * the example file now uses.
 */
export const PLACEHOLDER_SECRET_PREFIXES = [
	"default-secret",
	"replace-me",
	"replace_me",
	"change-me",
	"changeme",
	"your-secret",
	"your_secret",
	"<",
] as const

/** True when `value` looks like an unedited template placeholder. */
export function isPlaceholderSecret(value: string): boolean {
	const normalized = value.trim().toLowerCase()
	return PLACEHOLDER_SECRET_PREFIXES.some(prefix => normalized.startsWith(prefix))
}

const GENERATE_HINT =
	"Generate one with: openssl rand -base64 32 (see the Environment Variables table in README.md)."

/**
 * Zod schema for `BETTER_AUTH_SECRET`: present, at least
 * {@link AUTH_SECRET_MIN_LENGTH} characters, and not a template placeholder.
 */
export const authSecretSchema = z
	.string()
	.min(
		AUTH_SECRET_MIN_LENGTH,
		`BETTER_AUTH_SECRET must be at least ${AUTH_SECRET_MIN_LENGTH} characters. ${GENERATE_HINT}`
	)
	.refine(value => !isPlaceholderSecret(value), {
		message: `BETTER_AUTH_SECRET is still the template placeholder — sessions signed with a published secret are forgeable. ${GENERATE_HINT}`,
	})
