import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { config as loadEnv } from "dotenv"

/**
 * Environment for the backend test suite.
 *
 * `env.config.ts` validates at module load, so any spec that transitively
 * imports it — which is most of them, via the database client — fails to even
 * load without a valid environment. Setting it here once beats each spec
 * re-deriving its own, and keeps specs honest: they exercise the real
 * validated `env`, not a bypass.
 *
 * `.env` is loaded when present so database-backed tests reach the same
 * Postgres the app uses. The defaults below only fill what is still missing,
 * so a real value always wins.
 */
loadEnv({ path: resolve(__dirname, ".env"), quiet: true })

const fallbacks: Record<string, string> = {
	NODE_ENV: "test",
	CORS_ORIGINS: "http://localhost:3001",
	BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3001",
	// 32+ chars and not a template placeholder, so it satisfies the AC-1 rules
	// rather than skipping them.
	BETTER_AUTH_SECRET: "j8Kq2ZfP5xR7nT1wV4yB6cE9hL0mS3uA",
	DATABASE_URL: "postgres://postgres:password@localhost:5432/turbo-template",
}

for (const [key, value] of Object.entries(fallbacks)) {
	process.env[key] ??= value
}

// Guard against a stale build being picked up instead of source.
if (!existsSync(resolve(__dirname, "src"))) {
	throw new Error("backend jest setup: expected to run against src/")
}
