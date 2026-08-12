import fs from "fs"
import path from "path"

import { ADMIN_AUTH_FILE, AUTH_FILE } from "./constants"

/**
 * Runs once before Playwright starts any project.
 * Creates empty auth files so that `storageState: …` in the project config
 * doesn't throw ENOENT on the first run. The real sessions are written by the
 * "setup" project (global.setup.ts).
 */
export default function globalSetup() {
	for (const file of [AUTH_FILE, ADMIN_AUTH_FILE]) {
		fs.mkdirSync(path.dirname(file), { recursive: true })
		if (!fs.existsSync(file)) {
			fs.writeFileSync(file, JSON.stringify({ cookies: [], origins: [] }))
		}
	}
}
