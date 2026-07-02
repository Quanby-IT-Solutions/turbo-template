import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common"
import { Logger } from "nestjs-pino"
import { ZodSerializationException } from "nestjs-zod"
import { ZodError } from "zod"

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
	// Injected by Nest DI (registered as APP_FILTER, never `new`-ed).
	constructor(private readonly logger: Logger) {}

	catch(exception: HttpException, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const request = ctx.getRequest()
		const response = ctx.getResponse()
		const status = exception.getStatus()
		const exceptionResponse = exception.getResponse()

		// pino-http is the authoritative request/response logger, so we only emit
		// EXTRA server-side diagnostics here (not a line per HttpException).
		const requestId = request?.headers?.["x-request-id"]

		// Zod serialization failures carry structured detail (the Zod issue tree)
		// that the standard pino-http log line does NOT capture, so we emit that
		// extra diagnostic here. Ordinary HttpExceptions (including 5xx) are
		// already logged authoritatively by pino-http, so we do NOT emit a second
		// generic error line for them.
		if (exception instanceof ZodSerializationException) {
			const zodError = exception.getZodError()
			if (zodError instanceof ZodError) {
				this.logger.error({ requestId, err: zodError }, "ZodSerializationException")
			}
		}

		// Extract error details
		let message: string | string[]
		let details: Record<string, unknown> | undefined

		if (typeof exceptionResponse === "string") {
			message = exceptionResponse
		} else if (typeof exceptionResponse === "object" && exceptionResponse !== null) {
			const responseObj = exceptionResponse as Record<string, unknown>
			message = (responseObj.message as string | string[]) || exception.message

			// Only include details if there's meaningful extra info beyond message/statusCode/error
			const extraDetails = Object.fromEntries(
				Object.entries(responseObj).filter(
					([key]) => !["message", "statusCode", "error"].includes(key)
				)
			)
			if (Object.keys(extraDetails).length > 0) {
				details = extraDetails
			}
		} else {
			message = exception.message
		}

		// Consistent error response format
		const errorObject: Record<string, unknown> = {
			code: exception.constructor.name,
			message,
		}

		if (details) {
			errorObject.details = details
		}

		const errorResponse = {
			success: false,
			error: errorObject,
			timestamp: new Date().toISOString(),
		}

		// Any Retry-After header the throttler guard set on `response` before
		// throwing is already present; response.json() below preserves existing
		// headers, so the 429 Retry-After passes through unchanged.
		response.status(status).json(errorResponse)
	}
}
