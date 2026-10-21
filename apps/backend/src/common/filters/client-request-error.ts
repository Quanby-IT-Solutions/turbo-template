import { HttpException, HttpStatus } from "@nestjs/common"
import { STATUS_CODES } from "node:http"

/**
 * `type` strings the JSON and urlencoded parsers set on a client parse
 * failure. A match qualifies even when `expose` is not set.
 *
 * entity.too.large, entity.parse.failed and encoding.unsupported are the
 * three that must map. charset.unsupported, request.size.invalid,
 * request.aborted, entity.verify.failed, parameters.too.many and
 * querystring.parse.rangeError are the other 4xx types those parsers set.
 */
const BODY_PARSER_CLIENT_TYPES: ReadonlySet<string> = new Set([
	"entity.too.large",
	"entity.parse.failed",
	"encoding.unsupported",
	"charset.unsupported",
	"request.size.invalid",
	"request.aborted",
	"entity.verify.failed",
	"parameters.too.many",
	"querystring.parse.rangeError",
])

const MESSAGE_BY_STATUS: Readonly<Partial<Record<number, string>>> = {
	[HttpStatus.BAD_REQUEST]: "Malformed request body",
	[HttpStatus.PAYLOAD_TOO_LARGE]: "Request body too large",
	[HttpStatus.UNSUPPORTED_MEDIA_TYPE]: "Unsupported request encoding",
}

export interface ClientRequestError {
	status: number
	type: string | undefined
}

/**
 * A non-HttpException is a client request-parsing error when it carries a
 * numeric `status` or `statusCode` in 400-499 and either `expose === true`
 * or its `type` is one of the parser types above.
 */
export function readClientRequestError(exception: unknown): ClientRequestError | null {
	if (exception instanceof HttpException) {
		return null
	}
	if (typeof exception !== "object" || exception === null) {
		return null
	}

	const record = exception as Record<string, unknown>
	const status = numericStatus(record.status) ?? numericStatus(record.statusCode)
	if (status === null || !isClientStatus(status)) {
		return null
	}

	const type = typeof record.type === "string" ? record.type : undefined
	const knownType = type !== undefined && BODY_PARSER_CLIENT_TYPES.has(type)
	if (record.expose !== true && !knownType) {
		return null
	}

	return { status, type }
}

/**
 * Stable code and a fixed message for a client parse failure. The parser's
 * own message, stack and limit are never copied.
 */
export function clientRequestErrorBody(status: number): { code: string; message: string } {
	const enumName = HttpStatus[status as HttpStatus]
	const code = typeof enumName === "string" ? enumName : `HTTP_${status}`
	const message = MESSAGE_BY_STATUS[status] ?? STATUS_CODES[status] ?? "Client error"
	return { code, message }
}

/**
 * Nest rewrites a `SyntaxError` or `URIError` into `BadRequestException` and
 * keeps the thrown message. A JSON parse failure is a SyntaxError, so that
 * rewrite would publish the parser message and the exception class name.
 * Hand the filter a plain Error that still carries the client status and type.
 * Every other error is passed through unchanged.
 */
export function exposeClientParseError(exception: unknown): unknown {
	if (!(exception instanceof SyntaxError) && !(exception instanceof URIError)) {
		return exception
	}

	const clientError = readClientRequestError(exception)
	if (!clientError) {
		return exception
	}

	const visible = new Error("Client request parsing error")
	return Object.assign(visible, {
		status: clientError.status,
		statusCode: clientError.status,
		expose: true,
		type: clientError.type,
	})
}

export function forwardClientParseError(
	error: unknown,
	_request: unknown,
	_response: unknown,
	next?: (error?: unknown) => void
): void {
	next?.(exposeClientParseError(error))
}

function numericStatus(value: unknown): number | null {
	if (typeof value !== "number" || !Number.isInteger(value)) {
		return null
	}
	return value
}

function isClientStatus(status: number): boolean {
	return status >= HttpStatus.BAD_REQUEST && status < HttpStatus.INTERNAL_SERVER_ERROR
}
