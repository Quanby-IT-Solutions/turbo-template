import { type INestApplication } from "@nestjs/common"
import fs from "node:fs"
import { afterAll, beforeAll, describe, expect, it } from "@jest/globals"
import request from "supertest"
import { type App } from "supertest/types"

import { createApplication } from "../src/bootstrap"

/**
 * Client request-parsing errors on the booted app (the same `createApplication`
 * path `main.ts` uses). Two requests, so the strict throttler window is not
 * approached.
 */
describe("request parsing errors (e2e)", () => {
	let app: INestApplication<App>

	beforeAll(async () => {
		app = (await createApplication()) as INestApplication<App>
		await app.init()
	}, 30_000)

	afterAll(async () => {
		await app.close()
	})

	it("returns 413 for a JSON body over the configured limit", async () => {
		const logs = captureProcessOutput()
		try {
			const response = await request(app.getHttpServer())
				.post("/api/v1/example/todos")
				.set("Content-Type", "application/json")
				.set("X-Request-Id", "req-body-too-large")
				.send({ title: "x".repeat(200 * 1024) })
			const output = logs.text()

			expect(response.status).toBe(413)
			expect(response.body).toEqual({
				success: false,
				error: {
					code: "PAYLOAD_TOO_LARGE",
					message: "Request body too large",
				},
				timestamp: expect.any(String),
			})
			expect(JSON.stringify(response.body)).not.toMatch(
				/102400|100kb|entity\.too\.large|limit|stack/i
			)

			const records = jsonLogs(output)
			expect(records.some(record => JSON.stringify(record).includes("Unhandled exception"))).toBe(
				false
			)
			const warn = records.find(
				record => record.level === 40 && record.requestId === "req-body-too-large"
			)
			expect(warn).toEqual({
				level: 40,
				time: expect.any(Number),
				pid: expect.any(Number),
				hostname: expect.any(String),
				requestId: "req-body-too-large",
				status: 413,
				type: "entity.too.large",
			})
			expect(records.some(record => "err" in record)).toBe(false)
			expect(output).not.toMatch(/102400|PayloadTooLargeError|request entity too large/)
		} finally {
			logs.stop()
		}
	})

	it("returns 400 for malformed JSON", async () => {
		const logs = captureProcessOutput()
		try {
			const response = await request(app.getHttpServer())
				.post("/api/v1/example/todos")
				.set("Content-Type", "application/json")
				.set("X-Request-Id", "req-malformed-json")
				.send("{")
			const output = logs.text()

			expect(response.status).toBe(400)
			expect(response.body).toEqual({
				success: false,
				error: {
					code: "BAD_REQUEST",
					message: "Malformed request body",
				},
				timestamp: expect.any(String),
			})
			expect(JSON.stringify(response.body)).not.toMatch(
				/Unexpected|SyntaxError|entity\.parse\.failed|Expected property name|stack/i
			)

			const records = jsonLogs(output)
			expect(records.some(record => JSON.stringify(record).includes("Unhandled exception"))).toBe(
				false
			)
			const warn = records.find(
				record => record.level === 40 && record.requestId === "req-malformed-json"
			)
			expect(warn).toMatchObject({
				requestId: "req-malformed-json",
				status: 400,
				type: "entity.parse.failed",
			})
			expect(records.some(record => "err" in record)).toBe(false)
			expect(output).not.toContain("Expected property name")
		} finally {
			logs.stop()
		}
	})
})

function captureProcessOutput(): { text: () => string; stop: () => void } {
	const chunks: string[] = []
	const stdoutWrite = process.stdout.write.bind(process.stdout)
	const stderrWrite = process.stderr.write.bind(process.stderr)
	const fsWrite = fs.write
	const fsWriteSync = fs.writeSync
	let stopped = false
	const record = (chunk: unknown) => {
		if (typeof chunk === "string") {
			chunks.push(chunk)
			return
		}
		if (Buffer.isBuffer(chunk) || chunk instanceof Uint8Array) {
			chunks.push(Buffer.from(chunk).toString("utf8"))
		}
	}

	// Pino writes straight to the stdout file descriptor, so hooking
	// `process.stdout.write` alone misses the warn line.
	const recordFd = (fd: unknown, chunk: unknown) => {
		if (fd === 1 || fd === 2) {
			record(chunk)
		}
	}

	process.stdout.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
		record(chunk)
		return stdoutWrite(chunk, ...(rest as []))
	}) as typeof process.stdout.write
	process.stderr.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
		record(chunk)
		return stderrWrite(chunk, ...(rest as []))
	}) as typeof process.stderr.write
	const write = fsWrite as unknown as (fd: unknown, chunk: unknown, ...rest: unknown[]) => unknown
	const writeSync = fsWriteSync as unknown as (
		fd: unknown,
		chunk: unknown,
		...rest: unknown[]
	) => unknown
	fs.write = ((fd: unknown, chunk: unknown, ...rest: unknown[]) => {
		recordFd(fd, chunk)
		return write(fd, chunk, ...rest)
	}) as typeof fs.write
	fs.writeSync = ((fd: unknown, chunk: unknown, ...rest: unknown[]) => {
		recordFd(fd, chunk)
		return writeSync(fd, chunk, ...rest)
	}) as typeof fs.writeSync

	return {
		text: () => chunks.join(""),
		stop() {
			if (stopped) {
				return
			}
			stopped = true
			process.stdout.write = stdoutWrite as typeof process.stdout.write
			process.stderr.write = stderrWrite as typeof process.stderr.write
			fs.write = fsWrite
			fs.writeSync = fsWriteSync
		},
	}
}

function jsonLogs(output: string): Array<Record<string, unknown>> {
	return output
		.split("\n")
		.map(line => line.trim())
		.filter(line => line.startsWith("{"))
		.flatMap(line => {
			try {
				const parsed: unknown = JSON.parse(line)
				return typeof parsed === "object" && parsed !== null
					? [parsed as Record<string, unknown>]
					: []
			} catch {
				return []
			}
		})
}
