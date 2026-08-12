/**
 * Load the backend's real `.env` before the e2e suite imports anything.
 *
 * AC-1 made the auth config fail closed: `createEnv` throws at import time when
 * BETTER_AUTH_SECRET or DATABASE_URL are missing. That is correct behaviour, and
 * it means the e2e suite — which boots the real AppModule — needs the same
 * environment the app itself needs.
 */
import { config } from "dotenv"

config({ path: new URL("../.env", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") })
