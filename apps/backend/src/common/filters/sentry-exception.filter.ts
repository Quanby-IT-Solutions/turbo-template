import { Catch, HttpStatus, type ArgumentsHost, type ExceptionFilter } from "@nestjs/common"
import * as Sentry from "@sentry/nestjs"
import { Logger } from "nestjs-pino"

import { clientRequestErrorBody, readClientRequestError } from "./client-request-error"

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
 *
 * A client request-parsing error is the exception to the 500 path. When the
 * thrown value carries a 4xx status and is either exposed or a known parser
 * type, the response uses that status and nothing is sent to Sentry.
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
	// Injected by Nest DI (registered as APP_FILTER, never `new`-ed).
	constructor(private readonly logger: Logger) {}

	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const request = ctx.getRequest()
		const response = ctx.getResponse()
		const requestId = loggedRequestId(request as { id?: unknown } | undefined)

		const clientError = readClientRequestError(exception)
		if (clientError) {
			// The parser error's own message, stack and limit stay off both the
			// log and the response. These three fields are the whole warn line.
			this.logger.warn({
				requestId,
				status: clientError.status,
				type: clientError.type,
			})

			const { code, message } = clientRequestErrorBody(clientError.status)
			response.status(clientError.status).json({
				success: false,
				error: { code, message },
				timestamp: new Date().toISOString(),
			})
			return
		}

		// No enabled-check: `captureException` is a no-op when `Sentry.init` was
		// never called, so the disabled path costs nothing and needs no branch.
		Sentry.captureException(exception)

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

/**
 * The request id the logger assigned.
 *
 * `genReqId` stores that id on `request.id` and echoes it as `X-Request-Id`.
 * The inbound header is not a fallback: when the client sent none, the field
 * would be undefined, and a value the policy rejects must not be written into
 * the log. No id means this path had no pino-http, so the field is null.
 */
function loggedRequestId(request: { id?: unknown } | null | undefined): string | null {
	const id = request?.id
	if (id === undefined || id === null) {
		return null
	}
	return String(id)
}
