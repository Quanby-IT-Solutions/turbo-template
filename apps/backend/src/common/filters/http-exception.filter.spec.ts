import {
	BadRequestException,
	ForbiddenException,
	HttpException,
	HttpStatus,
	InternalServerErrorException,
	ServiceUnavailableException,
	type ArgumentsHost,
} from "@nestjs/common"
import { ThrottlerException } from "@nestjs/throttler"
import type { IncomingMessage, ServerResponse } from "node:http"
import type { Logger } from "nestjs-pino"
import { ZodSerializationException } from "nestjs-zod"
import { z } from "zod"

import { buildPinoHttpOptions } from "@/config/pino-logger.config"

import { HttpExceptionFilter } from "./http-exception.filter"

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

function zodSerializationFailure(): ZodSerializationException {
	const parsed = z.object({ name: z.string() }).safeParse({})
	if (parsed.success) {
		throw new Error("expected the serialization schema to reject")
	}
	return new ZodSerializationException(parsed.error)
}

function createFilter() {
	const logger = { error: jest.fn(), log: jest.fn(), warn: jest.fn() }
	return { filter: new HttpExceptionFilter(logger as unknown as Logger), logger }
}

/**
 * Sentry capture policy for deliberate `HttpException`s.
 *
 * The response-shaping behaviour of this filter is unchanged and stays its own
 * concern; what is asserted here is WHICH exceptions become Sentry events. A
 * 403 or a 429 is a working system saying no — reporting those buries the 5xx
 * that actually needs a human.
 */
describe("HttpExceptionFilter — Sentry capture policy", () => {
	beforeEach(() => {
		mockCaptureException.mockClear()
	})

	it.each([
		["ForbiddenException (RBAC denial)", () => new ForbiddenException("Forbidden")],
		["ThrottlerException (rate limit)", () => new ThrottlerException()],
		["BadRequestException (validation)", () => new BadRequestException("Invalid payload")],
	])("does not capture 4xx: %s", (_label, build) => {
		const { filter } = createFilter()
		const { host, status } = createHost()

		filter.catch(build(), host)

		expect(mockCaptureException).not.toHaveBeenCalled()
		// Still rendered, and still with the real status.
		expect(status).toHaveBeenCalledTimes(1)
		expect(status.mock.calls[0]?.[0]).toBeLessThan(500)
	})

	it.each([
		["InternalServerErrorException", () => new InternalServerErrorException("boom")],
		["ServiceUnavailableException", () => new ServiceUnavailableException()],
		[
			"bare HttpException with a 5xx status",
			() => new HttpException("upstream failed", HttpStatus.BAD_GATEWAY),
		],
	])("captures 5xx exactly once: %s", (_label, build) => {
		const { filter } = createFilter()
		const { host, status } = createHost()
		const exception = build()

		filter.catch(exception, host)

		expect(mockCaptureException).toHaveBeenCalledTimes(1)
		expect(mockCaptureException).toHaveBeenCalledWith(exception)
		expect(status.mock.calls[0]?.[0]).toBeGreaterThanOrEqual(500)
	})

	it("keeps rendering the uniform error shape", () => {
		const { filter } = createFilter()
		const { host, status, json } = createHost()

		filter.catch(new ForbiddenException("Insufficient permissions"), host)

		expect(status).toHaveBeenCalledWith(HttpStatus.FORBIDDEN)
		expect(json).toHaveBeenCalledWith(
			expect.objectContaining({
				success: false,
				error: expect.objectContaining({
					code: "ForbiddenException",
					message: "Insufficient permissions",
				}),
				timestamp: expect.any(String),
			})
		)
	})
})

describe("HttpExceptionFilter logs the assigned request id on the Zod serialization line", () => {
	function run(options: { header?: string; assignId?: boolean }) {
		const { filter, logger } = createFilter()
		const ctx = createHost(options)
		filter.catch(zodSerializationFailure(), ctx.host)
		const payload = loggedPayload(logger.error)
		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ requestId: payload.requestId }),
			"ZodSerializationException"
		)
		expect(ctx.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR)
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
})
