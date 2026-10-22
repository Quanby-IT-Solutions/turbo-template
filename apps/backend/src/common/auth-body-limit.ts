import { HttpStatus } from "@nestjs/common"
import type { IncomingMessage, ServerResponse } from "http"

import { clientRequestErrorBody } from "@/common/filters/client-request-error"

/**
 * Caps bodies on auth routes at the same byte count as `express.json`.
 *
 * The pinned Better Auth node handler forwards to better-call's `toNodeHandler`,
 * which calls `getRequest` with no `bodySizeLimit`. When that stream has
 * already ended and `req.body` is a string, `serializeParsedBody` returns the
 * string unchanged and `getRequest` copies those UTF-8 bytes into the `Request`.
 * Bodies within the limit are handed over that way. Anything larger is rejected
 * here, before Better Auth runs.
 *
 * An oversized request is not drained. Once the 413 has been handed off, the
 * request is destroyed so the unread remainder is not read.
 */

const BODYLESS_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

export interface PayloadTooLargeLog {
	requestId: string | undefined
	status: number
	type: "entity.too.large"
}

export interface EnforceAuthBodyLimitOptions {
	limit: number
	log: (entry: PayloadTooLargeLog) => void
	forward: () => unknown
}

interface RequestWithBody extends IncomingMessage {
	body?: string
}

/**
 * The standard 413 envelope. `clientRequestErrorBody(413)` supplies the code
 * (`PAYLOAD_TOO_LARGE`) and the fixed message; the wrapper matches every
 * other client error this API returns.
 */
export function payloadTooLargeEnvelope(now: Date = new Date()): {
	success: false
	error: { code: string; message: string }
	timestamp: string
} {
	const { code, message } = clientRequestErrorBody(413)
	return {
		success: false,
		error: { code, message },
		timestamp: now.toISOString(),
	}
}

function headerValue(value: string | string[] | undefined): string | undefined {
	if (Array.isArray(value)) return value[0]
	return value
}

function declaredContentLength(headers: IncomingMessage["headers"]): number | undefined {
	const value = headerValue(headers["content-length"])?.trim()
	if (value === undefined || !/^\d+$/.test(value)) return undefined
	const parsed = Number(value)
	if (!Number.isSafeInteger(parsed)) return undefined
	return parsed
}

/**
 * True when this auth request can carry a body we have to bound.
 * GET, HEAD, OPTIONS, a missing Content-Type, and Content-Length 0 do not.
 */
export function authRequestCarriesBody(req: IncomingMessage): boolean {
	const method = (req.method ?? "").toUpperCase()
	if (method === "" || BODYLESS_METHODS.has(method)) return false

	const contentType = headerValue(req.headers?.["content-type"])
	if (contentType === undefined || contentType.trim() === "") return false

	if (declaredContentLength(req.headers ?? {}) === 0) return false
	return true
}

function requestIdFrom(req: IncomingMessage): string | undefined {
	// pino-http sets this from the sanitized X-Request-Id before the auth
	// middleware runs. The property is `ReqId` (string | number | object).
	const id = req.id
	if (typeof id === "string" && id.length > 0) return id
	if (typeof id === "number") return String(id)
	return undefined
}

function respondPayloadTooLarge(
	req: IncomingMessage,
	res: ServerResponse,
	log: (entry: PayloadTooLargeLog) => void
): void {
	log({
		requestId: requestIdFrom(req),
		status: HttpStatus.PAYLOAD_TOO_LARGE,
		type: "entity.too.large",
	})

	const serialized = JSON.stringify(payloadTooLargeEnvelope())
	const dropRemainder = () => {
		req.on("error", () => {})
		if (!req.destroyed) req.destroy()
	}

	res.once("finish", dropRemainder)
	res.once("close", dropRemainder)

	if (res.writableEnded || res.headersSent) return

	res.statusCode = HttpStatus.PAYLOAD_TOO_LARGE
	res.setHeader("Content-Type", "application/json")
	res.setHeader("Connection", "close")
	res.setHeader("Content-Length", Buffer.byteLength(serialized))
	res.end(serialized)
}

function endQuietly(res: ServerResponse): void {
	if (res.writableEnded || res.destroyed) return
	res.on("error", () => {})
	res.destroy()
}

/**
 * Apply the body limit, then call `forward`.
 *
 * Returns whatever `forward` returns (including its promise) when the request
 * is passed through. Returns a promise when the body is read from the stream.
 * A 413 and a client abort settle without calling `forward`.
 */
export function enforceAuthBodyLimit(
	req: IncomingMessage,
	res: ServerResponse,
	options: EnforceAuthBodyLimitOptions
): unknown {
	if (!authRequestCarriesBody(req)) {
		return options.forward()
	}

	const declared = declaredContentLength(req.headers ?? {})
	if (declared !== undefined && declared > options.limit) {
		respondPayloadTooLarge(req, res, options.log)
		return undefined
	}

	return readBoundedBody(req, res, options)
}

function readBoundedBody(
	req: IncomingMessage,
	res: ServerResponse,
	options: EnforceAuthBodyLimitOptions
): Promise<unknown> {
	const { limit, log, forward } = options
	const chunks: Buffer[] = []
	let received = 0
	let settled = false

	return new Promise(resolve => {
		const detach = () => {
			req.removeListener("data", onData)
			req.removeListener("end", onEnd)
			req.removeListener("error", onFailure)
			req.removeListener("aborted", onFailure)
			req.removeListener("close", onClose)
		}

		const finish = (action: () => unknown) => {
			if (settled) return
			settled = true
			detach()
			try {
				resolve(action())
			} catch (error) {
				resolve(Promise.reject(error))
			}
		}

		const onFailure = () => {
			finish(() => {
				endQuietly(res)
			})
		}

		const onClose = () => {
			// A normal completion emits `end` first. `close` here only covers a
			// client that went away before the body finished.
			if (settled || req.readableEnded) return
			if (!req.aborted && !req.destroyed) return
			onFailure()
		}

		const onData = (chunk: Buffer | string) => {
			if (settled) return
			const buf = typeof chunk === "string" ? Buffer.from(chunk) : chunk
			received += buf.length
			if (received > limit) {
				chunks.length = 0
				if (typeof req.pause === "function") req.pause()
				// Swallow a late error from the destroy that follows the 413.
				req.on("error", () => {})
				finish(() => {
					respondPayloadTooLarge(req, res, log)
				})
				return
			}
			// Retain only bytes that are still within the limit. The chunk
			// that crosses it is counted above and not kept.
			chunks.push(buf)
		}

		const onEnd = () => {
			finish(() => {
				const body = Buffer.concat(chunks).toString("utf8")
				;(req as RequestWithBody).body = body
				return forward()
			})
		}

		req.on("data", onData)
		req.on("end", onEnd)
		req.on("error", onFailure)
		req.on("aborted", onFailure)
		req.on("close", onClose)

		if (req.readableEnded) onEnd()
	})
}
