import { spawn } from "node:child_process"
import { join } from "node:path"

import { AUTH_CLIENT_ADDRESS_HEADER } from "../../../../packages/auth/src/client-address"

interface RunnerSuccess {
	ok: true
	nodeEnv: string
	trustProxy: number
	configuredMax: number
	ipHeaders: string[]
	trustedProxiesUnset: boolean
	allowed: number[]
	exhausted: number
	other: number
	ipWarning: boolean
}

interface RunnerFailure {
	ok: false
	message: string
}

const RESULT_PREFIX = "AUTH_CLIENT_ADDRESS_RESULT "

function safeLog(text: string): string {
	return text
		.split("\n")
		.filter(
			line => !/[a-z]+:\/\//i.test(line) && !/secret|password|token|postgres|smtp/i.test(line)
		)
		.slice(-30)
		.join("\n")
		.slice(0, 2000)
}

function runIsolated(): Promise<RunnerSuccess> {
	const runner = join(__dirname, "auth-client-address.runner.ts")
	const backendRoot = join(__dirname, "..", "..")

	return new Promise((resolve, reject) => {
		const child = spawn(process.execPath, ["--import", "tsx", runner], {
			cwd: backendRoot,
			env: {
				...process.env,
				NODE_ENV: "production",
				SMTP_HOST: process.env.SMTP_HOST || "127.0.0.1",
				BETTER_AUTH_TELEMETRY: "0",
			},
		})

		let stdout = ""
		let stderr = ""
		let settled = false
		const timer = setTimeout(() => {
			child.kill("SIGKILL")
		}, 20_000)

		child.stdout.setEncoding("utf8")
		child.stderr.setEncoding("utf8")
		child.stdout.on("data", (chunk: string) => {
			stdout += chunk
		})
		child.stderr.on("data", (chunk: string) => {
			stderr += chunk
		})

		child.on("error", error => {
			if (settled) {
				return
			}
			settled = true
			clearTimeout(timer)
			reject(error)
		})

		child.on("close", code => {
			if (settled) {
				return
			}
			settled = true
			clearTimeout(timer)
			const line = stdout
				.split("\n")
				.map(entry => entry.trim())
				.find(entry => entry.startsWith(RESULT_PREFIX))
			if (!line) {
				reject(new Error(`runner exited ${code ?? "null"} without a result\n${safeLog(stderr)}`))
				return
			}
			const payload = JSON.parse(line.slice(RESULT_PREFIX.length)) as RunnerSuccess | RunnerFailure
			if (!payload.ok) {
				reject(new Error(payload.message))
				return
			}
			resolve(payload)
		})
	})
}

describe("server-side session reads keyed on the client address", () => {
	let result: RunnerSuccess

	beforeAll(async () => {
		result = await runIsolated()
	}, 30_000)

	it("uses a test-only budget against the real session-read rule", () => {
		expect(result.nodeEnv).toBe("production")
		expect(result.trustProxy).toBe(1)
		expect(result.configuredMax).toBe(500)
		expect(result.ipHeaders).toEqual([AUTH_CLIENT_ADDRESS_HEADER])
		expect(result.trustedProxiesUnset).toBe(true)
	})

	it("keeps a second client allowed after another address from the same socket uses up its budget", () => {
		expect(result.allowed).toEqual([200, 200])
		expect(result.exhausted).toBe(429)
		expect(result.other).toBe(200)
	})

	it("does not log a missing client IP for proxied requests", () => {
		expect(result.ipWarning).toBe(false)
	})
})
