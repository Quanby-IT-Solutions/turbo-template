import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common"
import * as Sentry from "@sentry/nestjs"
import { Logger } from "nestjs-pino"

/**
 * Catch-all filter: reports unexpected failures to Sentry and renders them in
 * the app's uniform error shape.
 *
 * WHY NOT `SentryGlobalFilter` (the SDK's own): it extends Nest's
 * `BaseExceptionFilter`, so anything it catches comes back in Nest's DEFAULT
 * body — `{ statusCode, message }` — while every other error in this API is
 * `{ success, error, timestamp }`. Clients would then need two parsers, and
 * which one they need depends on whether the server hit an expected failure or
 * an unexpected one. This filter keeps the contract single.
 *
 * `@Catch()` with no argument claims everything Nest does not hand to a more
 * specific filter. `HttpExceptionFilter` declares `@Catch(HttpException)`, so
 * in practice this one only ever sees non-`HttpException` failures — which is
 * exactly why the two can both call `captureException` without ever
 * double-reporting the same error.
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
	// Injected by Nest DI (registered as APP_FILTER, never `new`-ed).
	constructor(private readonly logger: Logger) {}

	catch(exception: unknown, host: ArgumentsHost) {
		// No enabled-check: `captureException` is a no-op when `Sentry.init` was
		// never called, so the disabled path costs nothing and needs no branch.
		Sentry.captureException(exception)

		const ctx = host.switchToHttp()
		const request = ctx.getRequest()
		const response = ctx.getResponse()
		const requestId = request?.headers?.["x-request-id"]

		// pino-http logs the 500 response line but not the stack behind it, and an
		// unexpected exception is precisely the case where the stack is the whole
		// diagnostic. Same reasoning as the ZodSerializationException branch in
		// HttpExceptionFilter: log only what the request logger cannot carry.
		this.logger.error({ requestId, err: exception }, "Unhandled exception")

		const code =
			typeof exception === "object" && exception !== null && exception.constructor?.name
				? exception.constructor.name
				: "InternalServerError"

		// The message is deliberately generic. An unexpected exception carries no
		// message vetted for a client — it may name a table, a file path or a
		// connection string — so only its class name is surfaced.
		const errorResponse = {
			success: false,
			error: {
				code,
				message: "Internal server error",
			},
			timestamp: new Date().toISOString(),
		}

		response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(errorResponse)
	}
}
