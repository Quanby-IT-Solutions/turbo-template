import { z } from "zod"

/**
 * Strict boolean-from-env parser.
 *
 * `z.coerce.boolean()` delegates to `Boolean(value)`, so the string "false"
 * coerces to `true` (any non-empty string is truthy). This union instead
 * accepts actual booleans plus the strings "true"/"1" -> true and
 * "false"/"0" -> false, rejecting anything else. Mirrors
 * `packages/auth/src/mailer/bool-schema.ts` (copied inline because the
 * backend cannot import from that package's internal module).
 *
 * Kept in this pure helper (no `createEnv()` at import time) so it can be
 * unit-tested without booting the app's env validation.
 */
export const booleanFromEnv = z.union([
	z.boolean(),
	z.enum(["true", "false", "1", "0"]).transform(v => v === "true" || v === "1"),
])

/**
 * Resolve the API docs flag with an environment-aware default.
 *
 * `@t3-oss/env-core` cannot express a default that depends on another var,
 * so `ENABLE_API_DOCS` is declared optional and resolved here:
 * - explicit `true`/`false` wins
 * - otherwise docs are on only in development
 */
export function isApiDocsEnabled(nodeEnv: string, rawFlag: boolean | undefined): boolean {
	if (rawFlag !== undefined) {
		return rawFlag
	}

	return nodeEnv === "development"
}
