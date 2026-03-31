import fs from "fs"
import path from "path"

import { AUTH_FILE } from "./constants"

/**
 * Runs once before Playwright starts any project.
 * Creates an empty auth file so that `storageState: AUTH_FILE` in the
 * chromium-authenticated project config doesn't throw ENOENT on the first run.
 * The real session is written by the "setup" project (global.setup.ts).
 */
export default function globalSetup() {
	fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true })
	if (!fs.existsSync(AUTH_FILE)) {
		fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
	}
}
