import { Logger, type INestApplication } from "@nestjs/common"

import { MAX_REQUEST_BODY_SIZE } from "@/config/app.config"
import { setupBetterAuth } from "@/config/auth.config"

// The Better Auth node handler: matched auth requests are handed off to this
// (it never calls next()), so if it runs for /api/v1/auth/open-api the docs
// route was NOT reachable.
const authHandler = jest.fn((_req: unknown, res: { end: (body: string) => void }) => {
	res.end("better-auth")
})

const generateBetterAuthSchema = jest.fn(
	async (): Promise<{ openapi: string } | null> => ({ openapi: "3.0.0" })
)

jest.mock("better-auth/node", () => ({
	toNodeHandler: () => authHandler,
}))

jest.mock("@repo/auth", () => ({
	AUTH_BASE_PATH: "/auth",
	getAuth: () => ({}),
}))

jest.mock("@/config/api-versions.config", () => ({
	getVersionKeys: () => ["v1"],
}))

jest.mock("@/utils/openapi", () => ({
	generateBetterAuthSchema: () => generateBetterAuthSchema(),
}))

type Layer =
	| { type: "get"; path: string; handler: (req: unknown, res: unknown) => unknown }
	| { type: "use"; handler: (req: unknown, res: unknown, next: () => void) => void }

// Minimal Express-like server that records registration order, matching the
// real dispatch semantics: layers run in registration order; a matching GET
// route handles and stops, a use() middleware runs and only continues if it
// calls next().
function makeServer() {
	const stack: Layer[] = []

	return {
		stack,
		get(path: string, handler: (req: unknown, res: unknown) => unknown) {
			stack.push({ type: "get", path, handler })
		},
		use(handler: (req: unknown, res: unknown, next: () => void) => void) {
			stack.push({ type: "use", handler })
		},
	}
}

async function dispatch(
	server: ReturnType<typeof makeServer>,
	method: string,
	url: string,
	headers?: Record<string, string>
) {
	let body: unknown
	let statusCode: number | undefined
	let requestDestroyed = false
	const finishers: Array<() => void> = []
	const res = {
		statusCode: undefined as number | undefined,
		writableEnded: false,
		headersSent: false,
		destroyed: false,
		headersOut: {} as Record<string, unknown>,
		setHeader(name: string, value: unknown) {
			this.headersOut[name.toLowerCase()] = value
		},
		once(event: string, fn: () => void) {
			if (event === "finish" || event === "close") finishers.push(fn)
		},
		on(event: string, fn: () => void) {
			this.once(event, fn)
		},
		status(code: number) {
			statusCode = code
			this.statusCode = code
			return this
		},
		json: (b: Record<string, unknown>) => {
			body = b
		},
		end: (b?: string) => {
			body = b
			res.writableEnded = true
			res.headersSent = true
			statusCode = res.statusCode ?? statusCode
			for (const fn of finishers) fn()
		},
		destroy() {
			this.destroyed = true
		},
	}
	const req = {
		url,
		method,
		headers: headers ?? {},
		id: headers?.["x-request-id"],
		destroyed: false,
		on() {
			return this
		},
		once() {
			return this
		},
		removeListener() {
			return this
		},
		pause() {
			return this
		},
		destroy() {
			requestDestroyed = true
			this.destroyed = true
			return this
		},
	}

	for (const layer of server.stack) {
		if (layer.type === "get" && method === "GET" && url === layer.path) {
			await layer.handler({ url }, res)
			return {
				handledBy: "route" as const,
				body,
				statusCode,
				requestDestroyed,
				headers: res.headersOut,
			}
		}

		if (layer.type === "use") {
			let calledNext = false
			layer.handler(req, res, () => {
				calledNext = true
			})
			if (!calledNext) {
				return {
					handledBy: "middleware" as const,
					body,
					statusCode,
					requestDestroyed,
					headers: res.headersOut,
				}
			}
		}
	}

	return { handledBy: "none" as const, body, statusCode, requestDestroyed, headers: res.headersOut }
}

function appWith(server: ReturnType<typeof makeServer>): INestApplication {
	return {
		getHttpAdapter: () => ({ getInstance: () => server }),
	} as unknown as INestApplication
}

describe("setupBetterAuth open-api gating", () => {
	beforeEach(() => {
		authHandler.mockClear()
		generateBetterAuthSchema.mockClear()
	})

	it("serves /api/v1/auth/open-api via the docs route when enableApiDocs is true", async () => {
		const server = makeServer()
		setupBetterAuth(appWith(server), true)

		const result = await dispatch(server, "GET", "/api/v1/auth/open-api")

		expect(result.handledBy).toBe("route")
		expect(generateBetterAuthSchema).toHaveBeenCalledTimes(1)
		expect(authHandler).not.toHaveBeenCalled()
		expect(result.body).toEqual({ openapi: "3.0.0" })
	})

	it("registers the open-api route before the catch-all Better Auth middleware", () => {
		const server = makeServer()
		setupBetterAuth(appWith(server), true)

		const getIndex = server.stack.findIndex(l => l.type === "get")
		const useIndex = server.stack.findIndex(l => l.type === "use")

		expect(getIndex).toBeGreaterThanOrEqual(0)
		expect(useIndex).toBeGreaterThanOrEqual(0)
		expect(getIndex).toBeLessThan(useIndex)
	})

	it("returns 404 when generateBetterAuthSchema is null", async () => {
		generateBetterAuthSchema.mockResolvedValueOnce(null)
		const server = makeServer()
		setupBetterAuth(appWith(server), true)

		const result = await dispatch(server, "GET", "/api/v1/auth/open-api")

		expect(result.handledBy).toBe("route")
		expect(result.statusCode).toBe(404)
		expect(result.body).toEqual({ statusCode: 404, message: "Not Found" })
		expect(authHandler).not.toHaveBeenCalled()
	})

	it("does not serve /api/v1/auth/open-api when enableApiDocs is false", async () => {
		const server = makeServer()
		setupBetterAuth(appWith(server), false)

		const result = await dispatch(server, "GET", "/api/v1/auth/open-api")

		// Falls through to Better Auth middleware, never the docs route.
		expect(result.handledBy).toBe("middleware")
		expect(generateBetterAuthSchema).not.toHaveBeenCalled()
		expect(authHandler).toHaveBeenCalledTimes(1)
	})

	it("always routes non-doc auth requests to Better Auth regardless of the docs flag", async () => {
		const server = makeServer()
		setupBetterAuth(appWith(server), true)

		const result = await dispatch(server, "POST", "/api/v1/auth/sign-in")

		expect(result.handledBy).toBe("middleware")
		expect(authHandler).toHaveBeenCalledTimes(1)
	})

	it("answers 413 from Content-Length before Better Auth reads the body", async () => {
		const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
		try {
			const server = makeServer()
			setupBetterAuth(appWith(server), false)

			const result = await dispatch(server, "POST", "/api/v1/auth/sign-in/email", {
				"content-type": "application/json",
				"content-length": String(MAX_REQUEST_BODY_SIZE + 1),
				"x-request-id": "req-auth-limit",
			})

			expect(result.handledBy).toBe("middleware")
			expect(authHandler).not.toHaveBeenCalled()
			expect(result.statusCode).toBe(413)
			expect(result.headers.connection).toBe("close")
			expect(result.requestDestroyed).toBe(true)
			expect(JSON.parse(String(result.body))).toEqual({
				success: false,
				error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large" },
				timestamp: expect.any(String),
			})
			expect(warn).toHaveBeenCalledWith({
				requestId: "req-auth-limit",
				status: 413,
				type: "entity.too.large",
			})
		} finally {
			warn.mockRestore()
		}
	})

	it("does not limit GET, including the OAuth callback path", async () => {
		const server = makeServer()
		setupBetterAuth(appWith(server), false)

		const session = await dispatch(server, "GET", "/api/v1/auth/get-session", {
			"content-type": "application/json",
			"content-length": String(MAX_REQUEST_BODY_SIZE + 1),
		})
		const callback = await dispatch(server, "GET", "/api/v1/auth/callback/google", {
			"content-length": String(MAX_REQUEST_BODY_SIZE + 1),
		})

		expect(session.handledBy).toBe("middleware")
		expect(callback.handledBy).toBe("middleware")
		expect(authHandler).toHaveBeenCalledTimes(2)
		expect(session.statusCode).not.toBe(413)
		expect(callback.statusCode).not.toBe(413)
	})

	it("forwards an empty auth body", async () => {
		const server = makeServer()
		setupBetterAuth(appWith(server), false)

		const result = await dispatch(server, "POST", "/api/v1/auth/sign-out", {
			"content-type": "application/json",
			"content-length": "0",
		})

		expect(result.handledBy).toBe("middleware")
		expect(authHandler).toHaveBeenCalledTimes(1)
		expect(result.requestDestroyed).toBe(false)
	})
})
