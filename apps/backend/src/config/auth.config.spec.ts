import type { INestApplication } from "@nestjs/common"

import { setupBetterAuth } from "@/config/auth.config"

// The Better Auth node handler: matched auth requests are handed off to this
// (it never calls next()), so if it runs for /api/v1/auth/open-api the docs
// route was NOT reachable.
const authHandler = jest.fn((_req: unknown, res: { end: (body: string) => void }) => {
	res.end("better-auth")
})

const generateBetterAuthSchema = jest.fn(async () => ({ openapi: "3.0.0" }))

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

async function dispatch(server: ReturnType<typeof makeServer>, method: string, url: string) {
	let body: unknown
	const res = {
		json: (b: Record<string, unknown>) => {
			body = b
		},
		end: (b: string) => {
			body = b
		},
	}

	for (const layer of server.stack) {
		if (layer.type === "get" && method === "GET" && url === layer.path) {
			await layer.handler({ url }, res)
			return { handledBy: "route" as const, body }
		}

		if (layer.type === "use") {
			let calledNext = false
			layer.handler({ url }, res, () => {
				calledNext = true
			})
			if (!calledNext) {
				return { handledBy: "middleware" as const, body }
			}
		}
	}

	return { handledBy: "none" as const, body }
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
})
