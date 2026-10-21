const authState: {
	api: { generateOpenAPISchema?: () => Promise<unknown> }
} = { api: {} }

jest.mock("@repo/auth", () => ({
	getAuth: () => ({ api: authState.api }),
}))

const MISSING_PLUGIN = "Better Auth openAPI plugin is not registered"

interface OpenApiDocument {
	openapi?: string
	info?: Record<string, unknown>
	paths?: Record<string, Record<string, unknown> | undefined>
	tags?: Array<{ name: string; description?: string }>
}

interface OpenApiModule {
	generateBetterAuthSchema: () => Promise<OpenApiDocument | null>
	mergeBetterAuthSchema: (baseDoc: OpenApiDocument, version: string) => Promise<OpenApiDocument>
}

interface NestLoggerCtor {
	prototype: {
		warn: (message: unknown) => void
		error: (message: unknown) => void
	}
}

const baseDoc: OpenApiDocument = {
	openapi: "3.0.0",
	info: { title: "API" },
	paths: { "/v1/health": { get: { summary: "Health" } } },
	tags: [{ name: "Health" }],
}

/**
 * `jest.resetModules()` reloads `@nestjs/common`. Spy on that copy's Logger
 * before the module under test constructs its instance.
 */
function loadNestLogger(): NestLoggerCtor {
	jest.resetModules()
	const nest = require("@nestjs/common") as { Logger: NestLoggerCtor }
	return nest.Logger
}

function loadOpenApi(): OpenApiModule {
	return require("@/utils/openapi") as OpenApiModule
}

describe("mergeBetterAuthSchema", () => {
	afterEach(() => {
		jest.restoreAllMocks()
	})

	it("returns the base document and warns once when generateOpenAPISchema is missing", async () => {
		authState.api = {}
		const Logger = loadNestLogger()
		const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
		const openapi = loadOpenApi()

		await expect(openapi.generateBetterAuthSchema()).resolves.toBeNull()
		await expect(openapi.mergeBetterAuthSchema(baseDoc, "v1")).resolves.toBe(baseDoc)
		await expect(openapi.mergeBetterAuthSchema(baseDoc, "v1")).resolves.toBe(baseDoc)

		const warnings = warn.mock.calls
			.map(call => String(call[0]))
			.filter(message => message.includes(MISSING_PLUGIN))
		expect(warnings).toHaveLength(1)
	})

	it("logs generator failures through Logger and returns the base document", async () => {
		authState.api = {
			generateOpenAPISchema: async () => {
				throw new Error("schema failed")
			},
		}
		const Logger = loadNestLogger()
		const error = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined)
		const openapi = loadOpenApi()
		const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined)

		await expect(openapi.mergeBetterAuthSchema(baseDoc, "v1")).resolves.toBe(baseDoc)
		expect(error).toHaveBeenCalledTimes(1)
		expect(String(error.mock.calls[0]?.[0])).toContain("Failed to merge Better Auth OpenAPI schema")
		expect(String(error.mock.calls[0]?.[0])).toContain("schema failed")
		expect(consoleError).not.toHaveBeenCalled()
	})

	it("merges auth paths when the plugin schema is present and does not warn", async () => {
		authState.api = {
			generateOpenAPISchema: async () => ({
				paths: {
					"/sign-in/email": { post: { tags: ["Default"] } },
				},
				tags: [{ name: "Default", description: "Default" }],
				components: { schemas: { Session: { type: "object" } } },
			}),
		}
		const Logger = loadNestLogger()
		const warn = jest.spyOn(Logger.prototype, "warn").mockImplementation(() => undefined)
		const openapi = loadOpenApi()

		const merged = await openapi.mergeBetterAuthSchema(baseDoc, "v1")

		expect(merged).not.toBe(baseDoc)
		expect(merged.paths?.["/v1/health"]).toEqual(baseDoc.paths?.["/v1/health"])
		expect(merged.paths?.["/v1/auth/sign-in/email"]).toMatchObject({
			post: { summary: "Sign In (Email)", tags: ["Auth"] },
		})
		expect(warn).not.toHaveBeenCalled()
	})
})
