import fs from "fs"
import path from "path"

import { LAST_RUN_AT_FILE } from "./constants"

/**
 * Record when this run finished. The next local run reads it and, if that was
 * sooner than the auth limiter's idle window, waits out the rest.
 */
export default function globalTeardown(): void {
	fs.mkdirSync(path.dirname(LAST_RUN_AT_FILE), { recursive: true })
	fs.writeFileSync(LAST_RUN_AT_FILE, String(Date.now()))
}
