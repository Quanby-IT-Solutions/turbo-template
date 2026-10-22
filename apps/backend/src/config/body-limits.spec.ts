import express from "express"
import request from "supertest"

import { MAX_REQUEST_BODY_SIZE } from "@/config/app.config"

// `app.config` pulls in `@repo/auth`, which pulls the `better-auth` ESM chain
// this jest config does not transform. Stubbed as the other config specs do —
// the limit constant under test is app.config's own and is unaffected.
jest.mock("@repo/auth", () => ({
	createAuth: jest.fn(),
	auth: {},
}))

/**
 * Request bodies are bounded.
 *
 * Both parsers were unbounded, so any mutation endpoint would buffer an
 * arbitrarily large body into memory before application code ran. These
 * exercise the real `express.json`/`express.urlencoded` middleware with the
 * shipped limit rather than asserting on the constant, because the limit only
 * matters if the parser actually enforces it.
 */

function appWithLimits() {
	const app = express()
	app.use(express.json({ limit: MAX_REQUEST_BODY_SIZE }))
	app.use(express.urlencoded({ extended: true, limit: MAX_REQUEST_BODY_SIZE }))
	app.post("/echo", (_req, res) => res.status(200).json({ ok: true }))
	return app
}

/** A JSON body of roughly `kb` kilobytes. */
function jsonBodyOf(kb: number) {
	return { concern: "x".repeat(kb * 1024) }
}

/** A valid JSON body of exactly `byteLength` bytes. */
function rawJson(byteLength: number): Buffer {
	const prefix = Buffer.from('{"concern":"')
	const suffix = Buffer.from('"}')
	const filler = byteLength - prefix.length - suffix.length
	return Buffer.concat([prefix, Buffer.alloc(filler, 0x61), suffix])
}

describe("request body limits", () => {
	it("is the shared 102400 byte ceiling", () => {
		expect(MAX_REQUEST_BODY_SIZE).toBe(100 * 1024)
		expect(MAX_REQUEST_BODY_SIZE).toBe(102400)
	})

	it("accepts a JSON body of exactly the shared byte limit", async () => {
		const body = rawJson(MAX_REQUEST_BODY_SIZE).toString("utf8")
		expect(Buffer.byteLength(body)).toBe(102400)

		const response = await request(appWithLimits())
			.post("/echo")
			.set("Content-Type", "application/json")
			.send(body)

		expect(response.status).toBe(200)
	})

	it("rejects one byte over the shared limit", async () => {
		const response = await request(appWithLimits())
			.post("/echo")
			.set("Content-Type", "application/json")
			.send("x".repeat(MAX_REQUEST_BODY_SIZE + 1))

		expect(response.status).toBe(413)
	})

	it("rejects an oversized JSON body with 413", async () => {
		const response = await request(appWithLimits()).post("/echo").send(jsonBodyOf(200))

		expect(response.status).toBe(413)
	})

	it("rejects an oversized urlencoded body with 413", async () => {
		const response = await request(appWithLimits())
			.post("/echo")
			.type("form")
			.send(`concern=${"x".repeat(200 * 1024)}`)

		expect(response.status).toBe(413)
	})

	it("accepts the largest legitimate payload", async () => {
		// The biggest field this app accepts is a support ticket's `concern`,
		// capped at 5000 characters by the contract. Even as 4-byte UTF-8 that is
		// ~20kb, so a 5000-character concern must pass with room to spare.
		const response = await request(appWithLimits())
			.post("/echo")
			.send({
				name: "Reporter",
				email: "reporter@example.com",
				subject: "A representative subject line",
				concern: "é".repeat(5000),
			})

		expect(response.status).toBe(200)
	})

	it("accepts a body just under the limit", async () => {
		const response = await request(appWithLimits()).post("/echo").send(jsonBodyOf(90))

		expect(response.status).toBe(200)
	})

	it("still accepts an ordinary small body", async () => {
		const response = await request(appWithLimits())
			.post("/echo")
			.send({ title: "an ordinary todo" })

		expect(response.status).toBe(200)
	})
})
