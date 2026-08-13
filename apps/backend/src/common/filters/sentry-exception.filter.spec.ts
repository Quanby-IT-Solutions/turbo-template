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
import type { Server } from "node:http"
import { Logger } from "nestjs-pino"
import request from "supertest"

import { HttpExceptionFilter } from "./http-exception.filter"
import { SentryExceptionFilter } from "./sentry-exception.filter"

const mockCaptureException = jest.fn()

jest.mock("@sentry/nestjs", () => ({
	captureException: (...args: unknown[]) => mockCaptureException(...args),
}))

function createHost() {
	const json = jest.fn()
	const status = jest.fn((_statusCode: number) => ({ json }))

	const host = {
		switchToHttp: () => ({
			getRequest: () => ({ headers: { "x-request-id": "req-1" } }),
			getResponse: () => ({ status }),
		}),
	} as unknown as ArgumentsHost

	return { host, status, json }
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
