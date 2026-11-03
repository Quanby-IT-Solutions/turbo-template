import { createAuth } from "./config.js"

/**
 * Entry point for the Better Auth CLI (`pnpm auth:generate`), which loads a
 * file that exports `auth`. Nothing in the app imports this; the app goes
 * through `getAuth()`.
 *
 * The CLI writes `packages/auth/auth-schema.generated.ts`, a reference to diff
 * against `packages/db/src/schema.ts` after a better-auth upgrade. It never
 * replaces that schema: the template keeps its own table helpers and keys.
 */
export const auth = createAuth()
