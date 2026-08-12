import express from "express"
import { pinoHttp } from "pino-http"
import request from "supertest"

import { buildPinoHttpOptions } from "@/config/pino-logger.config"

/**
 * Log-scan test for LG-1 / F-05.
 *
 * Runs a full auth cycle — sign-up, sign-in, password-reset request, and the
 * emailed reset link — through the **real** pino-http options this app ships,
 * captures everything written to the log stream, and asserts that no password,
 * token, or reset link survives anywhere in it.
 *
 * The middleware is exercised rather than the config object inspected on
 * purpose: `redact` paths and serializers are easy to write and easy to get
 * subtly wrong, and only the emitted bytes prove anything about what a log
 * sink would actually retain.
 */

// Credentials distinctive enough that a substring scan cannot produce a false
// negative against ordinary log furniture.
const PASSWORD = "correct-horse-battery-staple-91"
const NEW_PASSWORD = "replacement-passphrase-42"
const EMAIL = "logscan-subject@example.com"
const RESET_TOKEN = "reset-tok-4f9a2c7e11b3"
const VERIFY_TOKEN = "verify-tok-88de01aa5c"
const SESSION_TOKEN = "sess-tok-7b21ffee90"

/** Every secret that must never appear in a log line. */
const SECRETS = [PASSWORD, NEW_PASSWORD, RESET_TOKEN, VERIFY_TOKEN, SESSION_TOKEN]

function createApp(): { app: express.Express; readLogs: () => string } {
	const chunks: string[] = []

	const stream = {
		write(chunk: string) {
			chunks.push(chunk)
		},
	}

	const app = express()
	app.use(express.json())
	// The same options object main.ts registers, so this test fails the moment
	// the shipped config regresses.
	app.use(pinoHttp({ ...buildPinoHttpOptions(), transport: undefined }, stream))
	app.all(/.*/, (_req, res) => res.status(200).json({ ok: true }))

	return { app, readLogs: () => chunks.join("") }
}

describe("request logging redaction (full auth cycle)", () => {
	let app: express.Express
	let readLogs: () => string

	beforeEach(() => {
		;({ app, readLogs } = createApp())
	})

	async function runAuthCycle() {
		await request(app)
			.post("/api/v1/auth/sign-up/email")
			.set("cookie", `better-auth.session_token=${SESSION_TOKEN}`)
			.set("authorization", `Bearer ${SESSION_TOKEN}`)
			.send({ email: EMAIL, password: PASSWORD, name: "Log Scan" })

		await request(app).post("/api/v1/auth/sign-in/email").send({ email: EMAIL, password: PASSWORD })

		await request(app).post("/api/v1/auth/forget-password").send({ email: EMAIL })

		// The link the user clicks out of the reset email.
		await request(app).get(`/reset-password?token=${RESET_TOKEN}`)

		await request(app)
			.post("/api/v1/auth/reset-password")
			.send({ token: RESET_TOKEN, newPassword: NEW_PASSWORD })

		// And the verification link.
		await request(app).get(`/api/v1/auth/verify-email?token=${VERIFY_TOKEN}&callbackURL=/dashboard`)
	}

	it("writes no password, token, or reset link anywhere in the captured logs", async () => {
		await runAuthCycle()

		const logs = readLogs()

		// Guard against a vacuous pass: if nothing was logged the scan proves nothing.
		expect(logs.length).toBeGreaterThan(0)
		expect(logs).toContain("/api/v1/auth/sign-in/email")

		for (const secret of SECRETS) {
			expect(logs).not.toContain(secret)
		}
	})

	it("keeps the reset and verification tokens out of the logged URL", async () => {
		await runAuthCycle()

		const logs = readLogs()

		// The path is still there — only the credential is gone, so the log stays
		// useful for tracing.
		expect(logs).toContain("/reset-password")
		expect(logs).toContain("/api/v1/auth/verify-email")
		expect(logs).not.toContain(`token=${RESET_TOKEN}`)
		expect(logs).not.toContain(`token=${VERIFY_TOKEN}`)
		expect(logs).toContain("[REDACTED]")
	})

	it("removes the email address from logged request bodies", async () => {
		await runAuthCycle()

		expect(readLogs()).not.toContain(EMAIL)
	})

	it("removes the session cookie and authorization header", async () => {
		await runAuthCycle()

		const logs = readLogs()
		expect(logs).not.toContain(SESSION_TOKEN)
		expect(logs).not.toContain("Bearer ")
	})

	it("still records method, path and status for every request", async () => {
		await runAuthCycle()

		const logs = readLogs()
		expect(logs).toContain("POST")
		expect(logs).toContain("/api/v1/auth/sign-up/email")
		expect(logs).toContain("200")
	})

	it("echoes a request id so lines stay correlatable after redaction", async () => {
		const response = await request(app).get("/api/v1/health")

		expect(response.headers["x-request-id"]).toBeTruthy()
		expect(readLogs()).toContain(response.headers["x-request-id"])
	})
})
