import { type INestApplication } from "@nestjs/common"
import fs from "node:fs"
import { request as httpRequest, type Server } from "node:http"
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import { type App } from "supertest/types"

import { MAX_REQUEST_BODY_SIZE } from "@/config/app.config"

import { createApplication } from "../src/bootstrap"
import { resolveE2eAdminEmail, resolveE2eAdminPassword } from "./e2e-admin-password"

/**
 * Auth routes cap request bodies at the same byte count as the JSON parser
 * and answer with the same 413 envelope. The app under test is the real
 * `createApplication` bootstrap.
 */
describe("auth body limit (e2e)", () => {
	let app: INestApplication<App>
	let port: number

	beforeAll(async () => {
		app = (await createApplication({ apiDocsEnabled: true })) as INestApplication<App>
		await app.listen(0, "127.0.0.1")
		const address = (app.getHttpServer() as Server).address()
		if (address === null || typeof address === "string") {
			throw new Error("expected the e2e server to bind a TCP port")
		}
		port = address.port
	}, 30_000)

	afterAll(async () => {
		await app?.close()
	})

	it("returns the standard 413 for a Content-Length above the limit and does not call Better Auth", async () => {
		const logs = captureProcessOutput()
		const reasons: unknown[] = []
		const onRejection = (reason: unknown) => {
			reasons.push(reason)
		}
		process.on("unhandledRejection", onRejection)
		try {
			const body = "x".repeat(200 * 1024)
			const response = await request(app.getHttpServer())
				.post("/api/v1/auth/sign-in/email")
				.set("Content-Type", "application/json")
				.set("Content-Length", String(Buffer.byteLength(body)))
				.set("X-Request-Id", "auth-body-too-large")
				.send(body)
			const output = await waitForOutput(logs, "entity.too.large")

			expect(response.status).toBe(413)
			expect(response.headers.connection).toBe("close")
			expect(response.body).toEqual({
				success: false,
				error: {
					code: "PAYLOAD_TOO_LARGE",
					message: "Request body too large",
				},
				timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
			})
			expect(Object.keys(response.body).sort()).toEqual(["error", "success", "timestamp"])
			expect(JSON.stringify(response.body)).not.toMatch(/xxxxxxxx|VALIDATION_ERROR|stack/i)
			expect(response.body.message).toBeUndefined()

			const records = jsonLogs(output)
			const warns = records.filter(record => record.type === "entity.too.large")
			expect(warns).toEqual([
				{
					level: 40,
					time: expect.any(Number),
					pid: expect.any(Number),
					hostname: expect.any(String),
					requestId: "auth-body-too-large",
					status: 413,
					type: "entity.too.large",
				},
			])
			expect(records.some(record => "err" in record)).toBe(false)
			expect(output).not.toMatch(/PayloadTooLargeError|request entity too large|xxxxxxxx/)
			await new Promise(resolve => setTimeout(resolve, 20))
			expect(reasons).toEqual([])
		} finally {
			process.off("unhandledRejection", onRejection)
			logs.stop()
		}
	})

	it("returns 413 for a chunked body before the client finishes sending", async () => {
		const chunk = Buffer.alloc(16 * 1024, 0x61)
		let sent = 0
		let status = 0
		let text = ""
		let writableAtResponse = false

		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error("timed out waiting for 413")), 5000)
			let settled = false
			const req = httpRequest(
				{
					hostname: "127.0.0.1",
					port,
					method: "POST",
					path: "/api/v1/auth/sign-in/email",
					headers: { "content-type": "application/json" },
				},
				res => {
					writableAtResponse = req.writable && !req.writableEnded
					const chunks: Buffer[] = []
					res.on("data", piece => chunks.push(Buffer.from(piece)))
					const finish = () => {
						if (settled) return
						settled = true
						clearTimeout(timer)
						status = res.statusCode ?? 0
						text = Buffer.concat(chunks).toString("utf8")
						resolve()
					}
					res.on("end", finish)
					res.on("aborted", finish)
				}
			)
			req.on("error", error => {
				if (settled) return
				clearTimeout(timer)
				reject(error)
			})

			const pump = () => {
				if (settled) return
				while (sent <= MAX_REQUEST_BODY_SIZE + chunk.length) {
					const ok = req.write(chunk)
					sent += chunk.length
					if (!ok) {
						req.once("drain", pump)
						return
					}
				}
			}
			pump()
		})

		expect(status).toBe(413)
		expect(writableAtResponse).toBe(true)
		expect(sent).toBeGreaterThan(MAX_REQUEST_BODY_SIZE)
		expect(sent).toBeLessThan(MAX_REQUEST_BODY_SIZE * 4)
		expect(JSON.parse(text)).toEqual({
			success: false,
			error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large" },
			timestamp: expect.any(String),
		})
	})

	it("lets a JSON body of exactly 102400 bytes reach Better Auth", async () => {
		const prefix = '{"email":"'
		const suffix = '","password":"secret"}'
		const body = `${prefix}${"a".repeat(MAX_REQUEST_BODY_SIZE - prefix.length - suffix.length)}${suffix}`
		expect(Buffer.byteLength(body)).toBe(102400)

		const response = await request(app.getHttpServer())
			.post("/api/v1/auth/sign-in/email")
			.set("Content-Type", "application/json")
			.send(body)

		expect(response.status).toBe(400)
		expect(response.body).toEqual(
			expect.objectContaining({ code: "INVALID_EMAIL", message: expect.any(String) })
		)
		expect(response.body.error?.code).not.toBe("PAYLOAD_TOO_LARGE")
	})

	it("signs up and signs in with normal bodies and sets the session cookie", async () => {
		const email = `auth-body-limit-${Date.now()}@example.com`
		const signUp = await request(app.getHttpServer()).post("/api/v1/auth/sign-up/email").send({
			name: "Body Limit",
			email,
			password: "a-normal-password",
		})

		expect(signUp.status).toBe(200)
		expect(signUp.body).toEqual(
			expect.objectContaining({
				token: null,
				user: expect.objectContaining({ email }),
			})
		)

		const signIn = await request(app.getHttpServer()).post("/api/v1/auth/sign-in/email").send({
			email: resolveE2eAdminEmail(),
			password: resolveE2eAdminPassword(),
		})

		expect(signIn.status).toBe(200)
		const cookies = (signIn.headers["set-cookie"] ?? []) as string[]
		const session = cookies.find(value => value.startsWith("better-auth.session_token="))
		expect(session).toBeDefined()

		const viewer = await request(app.getHttpServer())
			.get("/api/v1/auth/get-session")
			.set("Cookie", cookies.join("; "))
		expect(viewer.status).toBe(200)
		expect(viewer.body).toEqual(
			expect.objectContaining({
				user: expect.objectContaining({ email: resolveE2eAdminEmail() }),
			})
		)

		const anonymous = await request(app.getHttpServer()).get("/api/v1/auth/get-session")
		expect(anonymous.status).toBe(200)
		expect(anonymous.body).toBeNull()

		const signOut = await request(app.getHttpServer())
			.post("/api/v1/auth/sign-out")
			.set("Cookie", cookies.join("; "))
			.set("Content-Type", "application/json")
			.set("Content-Length", "0")
		expect(signOut.status).toBe(200)
		expect(signOut.body?.error?.code).not.toBe("PAYLOAD_TOO_LARGE")
	})

	it("leaves GET auth routes, including the OAuth callback and open-api, unrejected", async () => {
		const callback = await request(app.getHttpServer()).get("/api/v1/auth/callback/google")
		expect(callback.status).toBe(302)
		expect(callback.headers.location).toEqual(expect.stringContaining("error="))
		expect(callback.body?.error?.code).not.toBe("PAYLOAD_TOO_LARGE")

		const openApi = await request(app.getHttpServer()).get("/api/v1/auth/open-api")
		expect(openApi.status).not.toBe(413)
		if (openApi.status === 404) {
			expect(openApi.body).toEqual({ statusCode: 404, message: "Not Found" })
		} else {
			expect(openApi.status).toBe(200)
			expect(openApi.body).toEqual(expect.objectContaining({ openapi: expect.any(String) }))
		}
	})

	it("still returns Better Auth's own body for malformed JSON", async () => {
		// better-call maps a JSON parse failure to its own 400 only when
		// `e instanceof SyntaxError`. Undici throws that error from Node's
		// realm; this Jest VM has a different SyntaxError, so the check misses
		// and the same bytes come back as 500. Point the global at undici's
		// constructor for this request. That is the check plain Node already
		// passes, and it stays inside this Jest process, which loads workspace
		// packages from source.
		const undiciSyntaxError = await syntaxErrorThrownByUndici()
		const previous = globalThis.SyntaxError
		globalThis.SyntaxError = undiciSyntaxError
		try {
			const response = await request(app.getHttpServer())
				.post("/api/v1/auth/sign-in/email")
				.set("Content-Type", "application/json")
				.send("{")

			expect(response.status).toBe(400)
			expect(response.body).toEqual({
				message: "Invalid JSON in request body",
				code: "BAD_REQUEST",
			})
		} finally {
			globalThis.SyntaxError = previous
		}
	})
})

async function syntaxErrorThrownByUndici(): Promise<typeof SyntaxError> {
	try {
		await new Request("http://127.0.0.1/json", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: "{",
		}).json()
	} catch (error) {
		return (error as { constructor: typeof SyntaxError }).constructor
	}
	throw new Error("undici accepted malformed JSON")
}

async function waitForOutput(logs: { text: () => string }, needle: string): Promise<string> {
	const deadline = Date.now() + 500
	let output = logs.text()
	while (!output.includes(needle) && Date.now() < deadline) {
		await new Promise(resolve => setImmediate(resolve))
		output = logs.text()
	}
	return output
}

function captureProcessOutput(): { text: () => string; stop: () => void } {
	const chunks: string[] = []
	const stdoutWrite = process.stdout.write.bind(process.stdout)
	const stderrWrite = process.stderr.write.bind(process.stderr)
	const fsWrite = fs.write
	const fsWriteSync = fs.writeSync
	let stopped = false
	const record = (chunk: unknown) => {
		if (typeof chunk === "string") {
			chunks.push(chunk)
			return
		}
		if (Buffer.isBuffer(chunk) || chunk instanceof Uint8Array) {
			chunks.push(Buffer.from(chunk).toString("utf8"))
		}
	}
	const recordFd = (fd: unknown, chunk: unknown) => {
		if (fd === 1 || fd === 2) record(chunk)
	}

	process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
		record(chunk)
		return stdoutWrite(chunk, ...(rest as []))
	}) as typeof process.stdout.write
	process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
		record(chunk)
		return stderrWrite(chunk, ...(rest as []))
	}) as typeof process.stderr.write
	const write = fsWrite as unknown as (fd: unknown, chunk: unknown, ...rest: unknown[]) => unknown
	const writeSync = fsWriteSync as unknown as (
		fd: unknown,
		chunk: unknown,
		...rest: unknown[]
	) => unknown
	fs.write = ((fd: unknown, chunk: unknown, ...rest: unknown[]) => {
		recordFd(fd, chunk)
		return write(fd, chunk, ...rest)
	}) as typeof fs.write
	fs.writeSync = ((fd: unknown, chunk: unknown, ...rest: unknown[]) => {
		recordFd(fd, chunk)
		return writeSync(fd, chunk, ...rest)
	}) as typeof fs.writeSync

	return {
		text: () => chunks.join(""),
		stop() {
			if (stopped) return
			stopped = true
			process.stdout.write = stdoutWrite as typeof process.stdout.write
			process.stderr.write = stderrWrite as typeof process.stderr.write
			fs.write = fsWrite
			fs.writeSync = fsWriteSync
		},
	}
}

function jsonLogs(output: string): Array<Record<string, unknown>> {
	return output
		.split("\n")
		.map(line => line.trim())
		.filter(line => line.startsWith("{"))
		.flatMap(line => {
			try {
				const parsed: unknown = JSON.parse(line)
				return typeof parsed === "object" && parsed !== null
					? [parsed as Record<string, unknown>]
					: []
			} catch {
				return []
			}
		})
}
