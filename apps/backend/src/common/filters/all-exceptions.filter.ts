import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	HttpException,
	HttpStatus,
} from "@nestjs/common"
import type { Request, Response } from "express"

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	catch(exception: unknown, host: ArgumentsHost) {
		const ctx = host.switchToHttp()
		const response = ctx.getResponse<Response>()
		const request = ctx.getRequest<Request>()

		const status =
			exception instanceof HttpException
				? exception.getStatus()
				: HttpStatus.INTERNAL_SERVER_ERROR

		const message =
			exception instanceof HttpException
				? exception.getResponse()
				: "Internal server error"

		// Log ALL exceptions for debugging (especially 401s)
		process.stderr.write(`\n🔴 EXCEPTION FILTER CAUGHT: ${status} - ${request.method} ${request.url}\n`)
		process.stderr.write(`Exception type: ${exception instanceof HttpException ? exception.constructor.name : typeof exception}\n`)
		process.stderr.write(`Exception message: ${exception instanceof HttpException ? exception.message : String(exception)}\n`)
		console.error("🔴 EXCEPTION FILTER CAUGHT:", {
			status,
			method: request.method,
			url: request.url,
			exceptionType: exception instanceof HttpException ? exception.constructor.name : typeof exception,
			exceptionMessage: exception instanceof HttpException ? exception.message : String(exception),
			stack: exception instanceof Error ? exception.stack : undefined,
		})

		const errorResponse = {
			success: false,
			message:
				typeof message === "string"
					? message
					: (message as any).message || "Internal server error",
			error:
				exception instanceof HttpException ? exception.name : "INTERNAL_SERVER_ERROR",
			statusCode: status,
			timestamp: new Date().toISOString(),
			path: request.url,
		}

		// Log error for debugging
		if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
			console.error("Unhandled exception:", exception)
		}

		response.status(status).json(errorResponse)
	}
}
