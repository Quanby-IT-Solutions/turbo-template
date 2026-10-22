/**
 * Load the environment the e2e suite boots with, before any spec imports the app.
 *
 * The auth config fails closed: `createEnv` throws at import time when
 * BETTER_AUTH_SECRET or DATABASE_URL are missing. That is correct behaviour, and
 * it means the e2e suite — which boots the real AppModule — needs the same
 * environment the app itself needs.
 *
 * The admin password is not part of that app env. The seeder reads
 * `SEED_ADMIN_PASSWORD` from `packages/db/.env` (cwd when `pnpm db:seed` runs).
 * This file loads that same path after `apps/backend/.env`, without overriding
 * keys the backend file or the process environment already set, then fails fast
 * when no password is available.
 */
import { randomUUID } from "node:crypto"
import { fileURLToPath } from "node:url"
import { config } from "dotenv"

import { resolveE2eAdminPassword } from "./e2e-admin-password"

const backendEnvPath = fileURLToPath(new URL("../.env", import.meta.url))
const seedEnvPath = fileURLToPath(new URL("../../../packages/db/.env", import.meta.url))

// Process environment wins over both files (dotenv's default). The backend
// file wins over the seed file for shared keys such as DATABASE_URL, so the
// suite connects with the API's database. SEED_ADMIN_PASSWORD lives only in
// the seed file and is filled in here when the process has not set it.
config({ path: backendEnvPath })
config({ path: seedEnvPath, override: false })

// Throttle counters and blocks live in Redis under REDIS_KEY_PREFIX. The
// suite boots one app per spec file, and a limit lowered in one file would
// otherwise keep blocking the next file — and the next run — until the TTL
// expires. Give each file its own prefix when Redis is configured. Keys are
// left to expire; a local Redis may hold other data, so nothing is flushed
// or deleted. Without REDIS_URL the prefix is untouched.
//
// This has to happen here, in setupFiles. `createEnv` reads the prefix at
// import time, which is after this file and before the spec.
if (process.env.REDIS_URL) {
	const base = redisKeyPrefixBase(process.env.REDIS_KEY_PREFIX)
	process.env.REDIS_KEY_PREFIX = `${base}:e2e:${randomUUID()}`
}

// Suite startup, before any spec can attempt sign-in.
resolveE2eAdminPassword()

/**
 * Configured prefix, or the app default when none is set.
 *
 * A previous spec file in this process already rewrote the variable (Jest
 * reuses `process.env` under `--runInBand`). Strip one trailing
 * `:e2e:<uuid>` so prefixes don't nest, and so the base stays whatever the
 * developer configured.
 */
function redisKeyPrefixBase(configured: string | undefined): string {
	const prefix = configured?.trim() || "turbo-template"
	return prefix.replace(/:e2e:[0-9a-f-]{36}$/i, "")
}
