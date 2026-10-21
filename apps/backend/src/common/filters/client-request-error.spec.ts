import { HttpStatus } from "@nestjs/common"

import {
	clientRequestErrorBody,
	exposeClientParseError,
	forwardClientParseError,
	readClientRequestError,
} from "./client-request-error"

describe("readClientRequestError", () => {
	it("reads an exposed parser 413", () => {
		expect(readClientRequestError({ status: 413, type: "entity.too.large", expose: true })).toEqual(
			{ status: 413, type: "entity.too.large" }
		)
	})

	it("reads a known parser type when expose is not set", () => {
		expect(readClientRequestError({ statusCode: 413, type: "entity.too.large" })).toEqual({
			status: 413,
			type: "entity.too.large",
		})
	})

	it("rejects an unexposed unknown 418", () => {
		expect(readClientRequestError({ status: 418, expose: false, type: "not.a.parser" })).toBeNull()
	})

	it("rejects a 503", () => {
		expect(readClientRequestError({ status: 503, expose: true })).toBeNull()
	})

	it("rejects a plain Error", () => {
		expect(readClientRequestError(new Error("boom"))).toBeNull()
	})
})

describe("clientRequestErrorBody", () => {
	it("uses the fixed message and stable code for 400, 413 and 415", () => {
		expect(clientRequestErrorBody(HttpStatus.BAD_REQUEST)).toEqual({
			code: "BAD_REQUEST",
			message: "Malformed request body",
		})
		expect(clientRequestErrorBody(HttpStatus.PAYLOAD_TOO_LARGE)).toEqual({
			code: "PAYLOAD_TOO_LARGE",
			message: "Request body too large",
		})
		expect(clientRequestErrorBody(HttpStatus.UNSUPPORTED_MEDIA_TYPE)).toEqual({
			code: "UNSUPPORTED_MEDIA_TYPE",
			message: "Unsupported request encoding",
		})
	})

	it("uses the status name and reason phrase for any other 4xx", () => {
		expect(clientRequestErrorBody(HttpStatus.I_AM_A_TEAPOT)).toEqual({
			code: "I_AM_A_TEAPOT",
			message: "I'm a Teapot",
		})
	})
})

describe("exposeClientParseError", () => {
	it("turns a JSON SyntaxError into a plain error the filter can classify", () => {
		const syntax = new SyntaxError("Expected property name or '}' in JSON at position 1")
		Object.assign(syntax, {
			status: 400,
			statusCode: 400,
			expose: true,
			type: "entity.parse.failed",
			body: "{",
		})

		const visible = exposeClientParseError(syntax)

		expect(visible).not.toBeInstanceOf(SyntaxError)
		expect(visible).toBeInstanceOf(Error)
		expect((visible as Error).message).toBe("Client request parsing error")
		expect(readClientRequestError(visible)).toEqual({
			status: 400,
			type: "entity.parse.failed",
		})
		expect(JSON.stringify(visible)).not.toContain("Expected property name")
		expect(JSON.stringify(visible)).not.toContain('"body"')
	})

	it("leaves a SyntaxError that is not a client parse error alone", () => {
		const syntax = new SyntaxError("bug in application code")

		expect(exposeClientParseError(syntax)).toBe(syntax)
	})

	it("leaves a non-syntax parser error alone", () => {
		const tooLarge = Object.assign(new Error("request entity too large"), {
			status: 413,
			type: "entity.too.large",
			expose: true,
		})

		expect(exposeClientParseError(tooLarge)).toBe(tooLarge)
	})

	it("keeps four parameters so Express treats it as an error handler", () => {
		expect(forwardClientParseError).toHaveLength(4)
	})

	it("forwards the rewritten error from the parser error middleware", () => {
		const syntax = Object.assign(new SyntaxError("bad json"), {
			status: 400,
			expose: true,
			type: "entity.parse.failed",
		})
		const next = jest.fn()

		forwardClientParseError(syntax, {}, {}, next)

		const forwarded: unknown = next.mock.calls[0]?.[0]
		expect(forwarded).not.toBe(syntax)
		expect(forwarded).not.toBeInstanceOf(SyntaxError)
		expect(readClientRequestError(forwarded)).toEqual({
			status: 400,
			type: "entity.parse.failed",
		})
	})
})
