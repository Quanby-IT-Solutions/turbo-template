/**
 * Load the environment the e2e suite boots with, before any spec imports the app.
 *
 * AC-1 made the auth config fail closed: `createEnv` throws at import time when
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

// Suite startup, before any spec can attempt sign-in.
resolveE2eAdminPassword()
