import { z } from "zod"

import { isApiDocsEnabled } from "@repo/auth/api-docs"

export { isApiDocsEnabled }

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
 *
 * The docs rule itself lives in `@repo/auth/api-docs` and is re-exported
 * above. The auth openAPI plugin and this process both call it, so an
 * explicit `ENABLE_API_DOCS` wins and an unset `NODE_ENV` counts as
 * development on both sides.
 */
export const booleanFromEnv = z.union([
	z.boolean(),
	z.enum(["true", "false", "1", "0"]).transform(v => v === "true" || v === "1"),
])
