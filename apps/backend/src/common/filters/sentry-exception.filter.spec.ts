import {
	Controller,
	ForbiddenException,
	Get,
	HttpStatus,
	InternalServerErrorException,
	type ArgumentsHost,
	type INestApplication,
} from "@nestjs/common"
import { APP_FILTER } from "@nestjs/core"
import { Test } from "@nestjs/testing"
import type { IncomingMessage, Server, ServerResponse } from "node:http"
import { Logger } from "nestjs-pino"
import request from "supertest"

import { buildPinoHttpOptions } from "@/config/pino-logger.config"

import { HttpExceptionFilter } from "./http-exception.filter"
import { SentryExceptionFilter } from "./sentry-exception.filter"

const mockCaptureException = jest.fn()

jest.mock("@sentry/nestjs", () => ({
	captureException: (...args: unknown[]) => mockCaptureException(...args),
}))

type RequestStub = { headers: Record<string, string | string[] | undefined>; id?: unknown }

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Built from a char code so this file contains no literal control byte. */
const LF = String.fromCharCode(10)

/**
 * Run the app's `genReqId` on the mock and store the id it returns, the same
 * way pino-http stores it on `req.id` before the filter runs.
 */
function assignRequestId(request: RequestStub): string {
	const response = { setHeader: jest.fn() } as unknown as ServerResponse
	const genReqId = buildPinoHttpOptions().genReqId
	if (genReqId === undefined) {
		throw new Error("buildPinoHttpOptions() did not provide genReqId")
	}
	const id = genReqId(request as IncomingMessage, response)
	request.id = id
	return String(id)
}

function createHost(options?: { header?: string | string[]; assignId?: boolean }) {
	const json = jest.fn()
	const status = jest.fn((_statusCode: number) => ({ json }))

	const request: RequestStub = { headers: {} }
	// No options keeps the historical valid header so existing cases stay put.
	const header = options === undefined ? "req-1" : options.header
	if (header !== undefined) {
		request.headers["x-request-id"] = header
	}

	const requestId = options?.assignId === false ? null : assignRequestId(request)

	const host = {
		switchToHttp: () => ({
			getRequest: () => request,
			getResponse: () => ({ status }),
		}),
	} as unknown as ArgumentsHost

	return { host, status, json, request, requestId }
}

function loggedPayload(mock: jest.Mock): Record<string, unknown> {
	expect(mock).toHaveBeenCalledTimes(1)
	const payload: unknown = mock.mock.calls[0]?.[0]
	expect(payload).toEqual(expect.any(Object))
	return payload as Record<string, unknown>
}

function containsString(value: unknown, needle: string, seen = new Set<unknown>()): boolean {
	if (typeof value === "string") return value.includes(needle)
	if (typeof value !== "object" || value === null || seen.has(value)) return false
	seen.add(value)
	const entries = Array.isArray(value) ? value : Object.values(value)
	return entries.some(item => containsString(item, needle, seen))
}

function createLoggerStub() {
	return { error: jest.fn(), log: jest.fn(), warn: jest.fn() }
}

describe("SentryExceptionFilter", () => {
	beforeEach(() => {
		mockCaptureException.mockClear()
	})

	it("captures an unexpected exception exactly once", () => {
		const filter = new SentryExceptionFilter(createLoggerStub() as unknown as Logger)
		const { host } = createHost()
		const exception = new TypeError("cannot read properties of undefined")

		filter.catch(exception, host)

		expect(mockCaptureException).toHaveBeenCalledTimes(1)
		expect(mockCaptureException).toHaveBeenCalledWith(exception)
	})

	it("renders the same uniform shape as HttpExceptionFilter, as a 500", () => {
		const filter = new SentryExceptionFilter(createLoggerStub() as unknown as Logger)
		const { host, status, json } = createHost()

		filter.catch(new TypeError("boom"), host)

		expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
		expect(json).toHaveBeenCalledWith({
			success: false,
			error: { code: "TypeError", message: "Internal server error" },
			timestamp: expect.any(String),
		})
	})

	// The class name is a useful label; the message is not vetted for a client
	// and may name a table, a path or a connection string.
	it("does not leak the exception message to the client", () => {
		const filter = new SentryExceptionFilter(createLoggerStub() as unknown as Logger)
		const { host, json } = createHost()

		filter.catch(new Error("connect ECONNREFUSED postgres://user:pw@10.0.0.4:5432"), host)

		expect(JSON.stringify(json.mock.calls[0]?.[0])).not.toContain("ECONNREFUSED")
	})

	it("still answers when the thrown value is not an Error", () => {
		const filter = new SentryExceptionFilter(createLoggerStub() as unknown as Logger)
		const { host, status, json } = createHost()

		filter.catch("a bare string was thrown", host)

		expect(mockCaptureException).toHaveBeenCalledTimes(1)
		expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
		expect(json.mock.calls[0]?.[0]).toMatchObject({
			error: { code: "InternalServerError" },
		})
	})

	it("keeps a plain Error on the 500 path", () => {
		const logger = createLoggerStub()
		const filter = new SentryExceptionFilter(logger as unknown as Logger)
		const { host, status, json } = createHost()
		const exception = new Error("boom")

		filter.catch(exception, host)

		expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
		expect(json).toHaveBeenCalledWith({
			success: false,
			error: { code: "Error", message: "Internal server error" },
			timestamp: expect.any(String),
		})
		expect(mockCaptureException).toHaveBeenCalledTimes(1)
		expect(mockCaptureException).toHaveBeenCalledWith(exception)
		expect(logger.error).toHaveBeenCalledWith(
			{ requestId: "req-1", err: exception },
			"Unhandled exception"
		)
		expect(logger.warn).not.toHaveBeenCalled()
	})

	it("maps an exposed entity.too.large error to 413 without capturing it", () => {
		const logger = createLoggerStub()
		const filter = new SentryExceptionFilter(logger as unknown as Logger)
		const { host, status, json } = createHost()
		const exception = {
			status: 413,
			type: "entity.too.large",
			expose: true,
			message: "request entity too large",
			limit: 102400,
			stack: "PayloadTooLargeError: request entity too large",
		}

		filter.catch(exception, host)

		expect(status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE)
		expect(json).toHaveBeenCalledWith({
			success: false,
			error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large" },
			timestamp: expect.any(String),
		})
		expect(JSON.stringify(json.mock.calls[0]?.[0])).not.toMatch(/102400|entity\.too\.large|stack/i)
		expect(mockCaptureException).not.toHaveBeenCalled()
		expect(logger.error).not.toHaveBeenCalled()
		expect(logger.warn).toHaveBeenCalledTimes(1)
		expect(logger.warn).toHaveBeenCalledWith({
			requestId: "req-1",
			status: 413,
			type: "entity.too.large",
		})
	})

	it("keeps an unexposed unknown 418 on the 500 path", () => {
		const logger = createLoggerStub()
		const filter = new SentryExceptionFilter(logger as unknown as Logger)
		const { host, status } = createHost()
		const exception = { status: 418, expose: false, type: "not.a.parser" }

		filter.catch(exception, host)

		expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
		expect(mockCaptureException).toHaveBeenCalledTimes(1)
		expect(mockCaptureException).toHaveBeenCalledWith(exception)
		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ requestId: "req-1", err: exception }),
			"Unhandled exception"
		)
		expect(logger.warn).not.toHaveBeenCalled()
	})

	it("keeps a 503 on the 500 path", () => {
		const logger = createLoggerStub()
		const filter = new SentryExceptionFilter(logger as unknown as Logger)
		const { host, status, json } = createHost()
		const exception = { status: 503 }

		filter.catch(exception, host)

		expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
		expect(json.mock.calls[0]?.[0]).toMatchObject({
			success: false,
			error: { message: "Internal server error" },
		})
		expect(mockCaptureException).toHaveBeenCalledTimes(1)
		expect(logger.error).toHaveBeenCalled()
		expect(logger.warn).not.toHaveBeenCalled()
	})

	// Logs what pino-http cannot: the stack behind the 500.
	it("logs the exception with the request id", () => {
		const logger = createLoggerStub()
		const filter = new SentryExceptionFilter(logger as unknown as Logger)
		const { host } = createHost()

		filter.catch(new Error("boom"), host)

		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ requestId: "req-1" }),
			expect.any(String)
		)
	})
})

const CLIENT_PARSE_ERROR = {
	status: 413,
	type: "entity.too.large",
	expose: true,
	message: "request entity too large",
}

const sentryLogPaths: Array<{
	label: string
	method: "warn" | "error"
	exception: unknown
}> = [
	{ label: "client-error warn", method: "warn", exception: CLIENT_PARSE_ERROR },
	{ label: "unhandled error", method: "error", exception: new Error("boom") },
]

describe.each(sentryLogPaths)(
	"SentryExceptionFilter logs the assigned request id on the $label line",
	({ method, exception }) => {
		function run(options: { header?: string; assignId?: boolean }) {
			const logger = createLoggerStub()
			const filter = new SentryExceptionFilter(logger as unknown as Logger)
			const ctx = createHost(options)
			filter.catch(exception, ctx.host)
			const payload = loggedPayload(logger[method])
			if (method === "warn") {
				expect(logger.error).not.toHaveBeenCalled()
			} else {
				expect(logger.warn).not.toHaveBeenCalled()
			}
			return { payload, assignedId: ctx.requestId }
		}

		it("equals the generated id when the client sends no header", () => {
			const { payload, assignedId } = run({})
			expect(assignedId).toMatch(UUID_RE)
			expect(payload.requestId).toBe(assignedId)
			expect(payload.requestId).not.toBeUndefined()
		})

		it.each([
			["65 characters", "a".repeat(65)],
			["a space", "abc def"],
			["a newline", `trace${LF}forged`],
		])("equals the generated id when the header is rejected (%s)", (_reason, header) => {
			const { payload, assignedId } = run({ header })
			expect(assignedId).toMatch(UUID_RE)
			expect(assignedId).not.toBe(header)
			expect(payload.requestId).toBe(assignedId)
			expect(containsString(payload, header)).toBe(false)
		})

		it("equals a valid header", () => {
			const { payload, assignedId } = run({ header: "abc-123" })
			expect(assignedId).toBe("abc-123")
			expect(payload.requestId).toBe("abc-123")
		})

		it("is null when request.id is missing, and the header is not logged", () => {
			const { payload, assignedId } = run({ header: "abc-123", assignId: false })
			expect(assignedId).toBeNull()
			expect(payload.requestId).toBeNull()
			expect(containsString(payload, "abc-123")).toBe(false)
		})
	}
)

@Controller("boom")
class BoomController {
	@Get("plain")
	plain(): never {
		throw new Error("unexpected failure")
	}

	@Get("http-5xx")
	http5xx(): never {
		throw new InternalServerErrorException("deliberate 5xx")
	}

	@Get("http-4xx")
	http4xx(): never {
		throw new ForbiddenException("Insufficient permissions")
	}
}

/**
 * Both filters wired the way `AppModule` wires them.
 *
 * The point is the dispatch split: Nest hands `HttpException`s to the filter
 * that declares `@Catch(HttpException)` and everything else to the `@Catch()`
 * catch-all, so no single exception can reach both. That is the whole mechanism
 * preventing double-reporting — worth proving against the real container rather
 * than reasoning about.
 */
describe("filter chain (both filters registered)", () => {
	let app: INestApplication

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			controllers: [BoomController],
			providers: [
				{ provide: Logger, useValue: createLoggerStub() },
				{ provide: APP_FILTER, useClass: SentryExceptionFilter },
				{ provide: APP_FILTER, useClass: HttpExceptionFilter },
			],
		}).compile()

		app = moduleRef.createNestApplication()
		await app.init()
	})

	afterAll(async () => {
		await app.close()
	})

	beforeEach(() => {
		mockCaptureException.mockClear()
	})

	it("reports an unexpected exception once, as a uniform 500", async () => {
		const response = await request(app.getHttpServer() as Server).get("/boom/plain")

		expect(response.status).toBe(500)
		expect(response.body).toMatchObject({
			success: false,
			error: { code: "Error", message: "Internal server error" },
		})
		expect(mockCaptureException).toHaveBeenCalledTimes(1)
	})

	it("reports a deliberate 5xx once — not twice", async () => {
		const response = await request(app.getHttpServer() as Server).get("/boom/http-5xx")

		expect(response.status).toBe(500)
		expect(response.body).toMatchObject({
			success: false,
			error: { code: "InternalServerErrorException", message: "deliberate 5xx" },
		})
		expect(mockCaptureException).toHaveBeenCalledTimes(1)
	})

	it("does not report a 4xx at all", async () => {
		const response = await request(app.getHttpServer() as Server).get("/boom/http-4xx")

		expect(response.status).toBe(403)
		expect(response.body).toMatchObject({
			success: false,
			error: { code: "ForbiddenException", message: "Insufficient permissions" },
		})
		expect(mockCaptureException).not.toHaveBeenCalled()
	})
})
