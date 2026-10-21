import { createServer, request as httpRequest, type IncomingMessage } from "http"
import { Readable } from "stream"

import { clientRequestErrorBody } from "@/common/filters/client-request-error"
import { MAX_REQUEST_BODY_SIZE } from "@/config/app.config"

import {
	authRequestCarriesBody,
	enforceAuthBodyLimit,
	payloadTooLargeEnvelope,
	type PayloadTooLargeLog,
} from "./auth-body-limit"

// app.config pulls @repo/auth's ESM graph, which this jest config does not transform.
jest.mock("@repo/auth", () => ({
	createAuth: jest.fn(),
	auth: {},
}))

interface Hit {
	body: string | undefined
	ended: boolean
}

function isPromise(value: unknown): value is Promise<unknown> {
	return (
		typeof value === "object" &&
		value !== null &&
		"then" in value &&
		typeof (value as { then?: unknown }).then === "function"
	)
}

function listen(limit: number) {
	const hits: Hit[] = []
	const logs: PayloadTooLargeLog[] = []
	const server = createServer((req, res) => {
		// Stand-in for the pino-http middleware, which assigns req.id before auth.
		const inbound = req.headers["x-request-id"]
		if (typeof inbound === "string") {
			;(req as IncomingMessage & { id?: string }).id = inbound
		}
		const result = enforceAuthBodyLimit(req, res, {
			limit,
			log: entry => {
				logs.push(entry)
			},
			forward() {
				const withBody = req as IncomingMessage & { body?: string }
				hits.push({ body: withBody.body, ended: req.readableEnded })
				res.statusCode = 200
				res.end("forwarded")
			},
		})
		if (isPromise(result)) {
			void result.catch(() => {
				if (!res.writableEnded && !res.destroyed) res.destroy()
			})
		}
	})

	return new Promise<{
		port: number
		hits: Hit[]
		logs: PayloadTooLargeLog[]
		close: () => Promise<void>
	}>(resolve => {
		server.listen(0, "127.0.0.1", () => {
			const address = server.address()
			if (address === null || typeof address === "string") {
				throw new Error("expected a TCP port")
			}
			resolve({
				port: address.port,
				hits,
				logs,
				close: () =>
					new Promise((done, reject) => {
						server.close(error => (error ? reject(error) : done()))
					}),
			})
		})
	})
}

interface ResponseSnapshot {
	status: number
	headers: Record<string, string | string[] | undefined>
	text: string
	writableWhenResponse: boolean
}

function withTimeout<T>(promise: Promise<T>, ms = 3000): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms)
		promise.then(
			value => {
				clearTimeout(timer)
				resolve(value)
			},
			error => {
				clearTimeout(timer)
				reject(error)
			}
		)
	})
}

function post(
	port: number,
	body: Buffer | string,
	headers: Record<string, string | number> = {}
): Promise<ResponseSnapshot> {
	const payload = Buffer.isBuffer(body) ? body : Buffer.from(body)
	return new Promise((resolve, reject) => {
		const req = httpRequest(
			{
				hostname: "127.0.0.1",
				port,
				method: "POST",
				path: "/api/v1/auth/sign-in/email",
				headers: {
					"content-type": "application/json",
					"content-length": payload.length,
					...headers,
				},
			},
			res => {
				const writableWhenResponse = req.writable && !req.writableEnded
				const chunks: Buffer[] = []
				res.on("data", chunk => chunks.push(Buffer.from(chunk)))
				res.on("end", () => {
					resolve({
						status: res.statusCode ?? 0,
						headers: res.headers,
						text: Buffer.concat(chunks).toString("utf8"),
						writableWhenResponse,
					})
				})
			}
		)
		req.on("error", reject)
		req.end(payload)
	})
}

function asRequest(partial: Partial<IncomingMessage>): IncomingMessage {
	return partial as IncomingMessage
}

describe("auth body limit", () => {
	it("builds the 413 envelope from clientRequestErrorBody(413)", () => {
		const now = new Date("2026-01-02T03:04:05.006Z")
		const { code, message } = clientRequestErrorBody(413)

		expect(payloadTooLargeEnvelope(now)).toEqual({
			success: false,
			error: { code, message },
			timestamp: "2026-01-02T03:04:05.006Z",
		})
		expect(code).toBe("PAYLOAD_TOO_LARGE")
		expect(message).toBe("Request body too large")
	})

	it("shares the parsers' 102400 byte constant", () => {
		expect(MAX_REQUEST_BODY_SIZE).toBe(100 * 1024)
		expect(MAX_REQUEST_BODY_SIZE).toBe(102400)
	})

	it.each([
		["GET", { "content-type": "application/json", "content-length": "999999" }],
		["HEAD", { "content-type": "application/json", "content-length": "999999" }],
		["OPTIONS", { "content-type": "application/json", "content-length": "999999" }],
		["POST", {}],
		["POST", { "content-length": "0" }],
		["POST", { "content-type": "application/json", "content-length": "0" }],
	])("does not limit %s when the request has no body (%j)", (method, headers) => {
		expect(authRequestCarriesBody(asRequest({ method, headers }))).toBe(false)
	})

	it("limits a POST that declares a content type and a body", () => {
		expect(
			authRequestCarriesBody(
				asRequest({
					method: "POST",
					headers: { "content-type": "application/json", "content-length": "12" },
				})
			)
		).toBe(true)
	})

	describe("over a real socket", () => {
		let open: Awaited<ReturnType<typeof listen>>

		beforeEach(async () => {
			open = await listen(MAX_REQUEST_BODY_SIZE)
		})

		afterEach(async () => {
			await open.close()
		})

		it("forwards a JSON body under the limit as the original text on an ended stream", async () => {
			const raw = '{"email":"a@b.co","password":"secret"}'
			const response = await post(open.port, raw)

			expect(response.status).toBe(200)
			expect(response.text).toBe("forwarded")
			expect(open.hits).toEqual([{ body: raw, ended: true }])
			expect(Buffer.from(open.hits[0]?.body ?? "", "utf8").equals(Buffer.from(raw))).toBe(true)
			expect(open.logs).toEqual([])
		})

		it("forwards an urlencoded body unchanged", async () => {
			const raw = "email=user%40example.com&password=s%20ecret"
			const response = await post(open.port, raw, {
				"content-type": "application/x-www-form-urlencoded",
			})

			expect(response.status).toBe(200)
			expect(open.hits).toEqual([{ body: raw, ended: true }])
		})

		it("forwards a body of exactly 102400 bytes", async () => {
			const body = Buffer.alloc(MAX_REQUEST_BODY_SIZE, 0x61)
			const response = await post(open.port, body)

			expect(response.status).toBe(200)
			expect(open.hits[0]?.body?.length).toBe(102400)
			expect(open.logs).toEqual([])
		})

		it("answers 413 from Content-Length without waiting for the rest of the body", async () => {
			const response = await withTimeout(
				new Promise<ResponseSnapshot>((resolve, reject) => {
					let settled = false
					const req = httpRequest(
						{
							hostname: "127.0.0.1",
							port: open.port,
							method: "POST",
							path: "/api/v1/auth/sign-in/email",
							headers: {
								"content-type": "application/json",
								"content-length": String(MAX_REQUEST_BODY_SIZE + 5000),
								"x-request-id": "req-from-socket",
							},
						},
						res => {
							const writableWhenResponse = req.writable && !req.writableEnded
							const chunks: Buffer[] = []
							res.on("data", chunk => chunks.push(Buffer.from(chunk)))
							res.on("end", () => {
								settled = true
								resolve({
									status: res.statusCode ?? 0,
									headers: res.headers,
									text: Buffer.concat(chunks).toString("utf8"),
									writableWhenResponse,
								})
							})
							res.on("aborted", () => {
								if (settled) return
								settled = true
								resolve({
									status: res.statusCode ?? 0,
									headers: res.headers,
									text: Buffer.concat(chunks).toString("utf8"),
									writableWhenResponse,
								})
							})
						}
					)
					req.on("error", error => {
						if (!settled) reject(error)
					})
					req.write("partial")
				})
			)

			expect(response.status).toBe(413)
			expect(response.writableWhenResponse).toBe(true)
			expect(response.headers.connection).toBe("close")
			expect(JSON.parse(response.text)).toEqual({
				success: false,
				error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large" },
				timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
			})
			expect(response.text).not.toContain("partial")
			expect(open.hits).toEqual([])
			expect(open.logs).toEqual([
				{ requestId: "req-from-socket", status: 413, type: "entity.too.large" },
			])
		})

		it("answers 413 for a chunked body before the client finishes sending", async () => {
			const response = await withTimeout(
				new Promise<{ status: number; text: string; sent: number; writable: boolean }>(
					(resolve, reject) => {
						let settled = false
						const req = httpRequest(
							{
								hostname: "127.0.0.1",
								port: open.port,
								method: "POST",
								path: "/api/v1/auth/sign-in/email",
								headers: { "content-type": "application/json" },
							},
							res => {
								const writable = req.writable && !req.writableEnded
								const chunks: Buffer[] = []
								res.on("data", chunk => chunks.push(Buffer.from(chunk)))
								const finish = () => {
									if (settled) return
									settled = true
									resolve({
										status: res.statusCode ?? 0,
										text: Buffer.concat(chunks).toString("utf8"),
										sent,
										writable,
									})
								}
								res.on("end", finish)
								res.on("aborted", finish)
							}
						)
						req.on("error", error => {
							if (!settled) reject(error)
						})

						const chunk = Buffer.alloc(8 * 1024, 0x61)
						let sent = 0
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
					}
				)
			)

			expect(response.status).toBe(413)
			expect(response.writable).toBe(true)
			expect(response.sent).toBeGreaterThan(MAX_REQUEST_BODY_SIZE)
			expect(response.sent).toBeLessThan(MAX_REQUEST_BODY_SIZE * 4)
			expect(JSON.parse(response.text).error).toEqual({
				code: "PAYLOAD_TOO_LARGE",
				message: "Request body too large",
			})
			expect(open.hits).toEqual([])
		})

		it("ends quietly when the client aborts while the body is being read", async () => {
			const reasons: unknown[] = []
			const onRejection = (reason: unknown) => {
				reasons.push(reason)
			}
			process.on("unhandledRejection", onRejection)
			try {
				await new Promise<void>(resolve => {
					const req = httpRequest(
						{
							hostname: "127.0.0.1",
							port: open.port,
							method: "POST",
							path: "/api/v1/auth/sign-in/email",
							headers: { "content-type": "application/json" },
						},
						res => {
							res.resume()
							res.on("end", () => resolve())
							res.on("aborted", () => resolve())
						}
					)
					req.on("error", () => resolve())
					req.write('{"email":')
					req.destroy()
					setTimeout(resolve, 100)
				})
				await new Promise(resolve => setTimeout(resolve, 50))

				expect(reasons).toEqual([])
				expect(open.hits).toEqual([])
				expect(open.logs).toEqual([])
			} finally {
				process.off("unhandledRejection", onRejection)
			}
		})
	})

	it("stops reading once the buffered count passes the limit", async () => {
		let pulls = 0
		const req = new Readable({
			highWaterMark: 16,
			read() {
				pulls += 1
				if (pulls > 30) {
					this.push(null)
					return
				}
				this.push(Buffer.alloc(40, 0x61))
			},
		}) as Readable & IncomingMessage
		req.method = "POST"
		req.headers = { "content-type": "application/json" }

		let statusCode = 0
		let ended = false
		const finishers: Array<() => void> = []
		const res = {
			statusCode: 0,
			writableEnded: false,
			headersSent: false,
			destroyed: false,
			setHeader() {
				return
			},
			once(event: string, fn: () => void) {
				if (event === "finish" || event === "close") finishers.push(fn)
			},
			on(event: string, fn: () => void) {
				this.once(event, fn)
			},
			end() {
				ended = true
				statusCode = this.statusCode
				this.writableEnded = true
				this.headersSent = true
				for (const fn of finishers) fn()
			},
			destroy() {
				this.destroyed = true
			},
		}

		let forwarded = false
		await enforceAuthBodyLimit(req, res as unknown as import("http").ServerResponse, {
			limit: 100,
			log: () => undefined,
			forward: () => {
				forwarded = true
			},
		})

		expect(forwarded).toBe(false)
		expect(ended).toBe(true)
		expect(statusCode).toBe(413)
		expect(pulls).toBeLessThan(8)
		expect(req.destroyed).toBe(true)
	})
})
