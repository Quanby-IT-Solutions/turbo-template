import fs from "fs"
import path from "path"

import { assertE2eBackendThrottle } from "./backend-throttle"
import { ADMIN_AUTH_FILE, AUTH_FILE, LAST_RUN_AT_FILE, USER_B_AUTH_FILE } from "./constants"

/** Better Auth drops a window only after it has been idle for a full minute. */
const AUTH_IDLE_GAP_MS = 61_000

/**
 * Wait out whatever is left of the idle gap. No file, or `E2E_SKIP_IDLE_GAP=1`,
 * means start immediately.
 */
async function waitForAuthIdleGap(): Promise<void> {
	if (process.env.E2E_SKIP_IDLE_GAP === "1") return
	if (!fs.existsSync(LAST_RUN_AT_FILE)) return

	const endedAt = Number(fs.readFileSync(LAST_RUN_AT_FILE, "utf8").trim())
	if (!Number.isFinite(endedAt)) return

	const remainingMs = AUTH_IDLE_GAP_MS - (Date.now() - endedAt)
	if (remainingMs <= 0) return

	const seconds = Math.ceil(remainingMs / 1000)
	console.log(`[e2e] waiting ${seconds}s so the auth limiter's idle window resets`)
	await new Promise(resolve => setTimeout(resolve, remainingMs))
}

/**
 * Runs once before Playwright starts any project.
 * Creates empty auth files so that `storageState: …` in the project config
 * doesn't throw ENOENT on the first run. The real sessions are written by the
 * "setup" project (global.setup.ts).
 */
export default async function globalSetup() {
	await waitForAuthIdleGap()
	await assertE2eBackendThrottle()

	for (const file of [AUTH_FILE, ADMIN_AUTH_FILE, USER_B_AUTH_FILE]) {
		fs.mkdirSync(path.dirname(file), { recursive: true })
		if (!fs.existsSync(file)) {
			fs.writeFileSync(file, JSON.stringify({ cookies: [], origins: [] }))
		}
	}
}
