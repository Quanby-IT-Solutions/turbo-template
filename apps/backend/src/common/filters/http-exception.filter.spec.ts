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
import type { Logger } from "nestjs-pino"

import { HttpExceptionFilter } from "./http-exception.filter"

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
