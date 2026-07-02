import { z } from "zod"

/**
 * Strict boolean-from-env parser.
 *
 * `z.coerce.boolean()` delegates to `Boolean(value)`, so the string "false"
 * coerces to `true` (any non-empty string is truthy). That silently flips
 * verification-gating flags, so this schema instead accepts:
 *
 * - actual booleans, passed through unchanged
 * - the strings "true" / "1" -> true
 * - the strings "false" / "0" -> false
 *
 * Anything else (e.g. "yes", "on", "") is rejected with a Zod validation error,
 * making the parse deterministic and auditable.
 */
export const booleanFromEnv = z.union([
	z.boolean(),
	z.enum(["true", "false", "1", "0"]).transform(v => v === "true" || v === "1"),
])
