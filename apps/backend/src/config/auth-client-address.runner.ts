/**
 * Production-mode check for the auth rate-limit address.
 *
 * Better Auth freezes its production/test detection when its env module
 * loads, so this file is spawned with NODE_ENV already set. It boots the
 * real auth middleware and auth instance, then reports status codes only.
 */
import type { INestApplication } from "@nestjs/common"
import express, { type Express } from "express"
import request from "supertest"

import { AUTH_CLIENT_ADDRESS_HEADER, getAuth } from "@repo/auth"

import { setupBetterAuth } from "@/config/auth.config"
import { env } from "@/config/env.config"

const RESULT_PREFIX = "AUTH_CLIENT_ADDRESS_RESULT "
const IP_WARNING = "could not determine a client IP"
const TEST_BUDGET = 2
const CLIENT_A = "203.0.113.20"
const CLIENT_B = "203.0.113.21"
const SHARED_LEFT = "198.51.100.9"
const FORGED_ADDRESS = "198.51.100.99"

interface SessionRule {
	window: number
	max: number
}

interface RunnerResult {
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

function emit(payload: unknown, code: number): void {
	process.stdout.write(`${RESULT_PREFIX}${JSON.stringify(payload)}\n`, () => {
		process.exit(code)
	})
}

function publicError(error: unknown): string {
	if (!(error instanceof Error)) {
		return "Error"
	}
	const message = error.message.replace(/[a-z]+:\/\/\S+/gi, "[redacted]")
	if (/secret|password|token|postgres|smtp/i.test(message)) {
		return error.name
	}
	return `${error.name}: ${message}`.slice(0, 300)
}

function isSessionRule(rule: unknown): rule is SessionRule {
	if (!rule || typeof rule !== "object") {
		return false
	}
	const candidate = rule as { window?: unknown; max?: unknown }
	return typeof candidate.window === "number" && typeof candidate.max === "number"
}

async function hit(app: Express, rightmost: string): Promise<number> {
	const response = await request(app)
		.get("/api/v1/auth/get-session")
		.set("X-Forwarded-For", `${SHARED_LEFT}, ${rightmost}`)
		.set(AUTH_CLIENT_ADDRESS_HEADER, FORGED_ADDRESS)
	return response.status
}

async function main(): Promise<void> {
	if (process.env.NODE_ENV !== "production") {
		emit({ ok: false, message: "runner requires production mode" }, 1)
		return
	}

	let ipWarning = false
	const originalWarn = console.warn.bind(console)
	console.warn = (...args: unknown[]) => {
		const text = args.map(arg => (typeof arg === "string" ? arg : "")).join(" ")
		if (text.includes(IP_WARNING)) {
			ipWarning = true
		}
		originalWarn(...args)
	}

	const app = express()
	app.set("trust proxy", env.TRUST_PROXY)
	setupBetterAuth(
		{
			getHttpAdapter: () => ({ getInstance: () => app }),
		} as INestApplication,
		false
	)

	const auth = getAuth()
	const rule = auth.options.rateLimit?.customRules?.["/get-session"]
	if (!isSessionRule(rule)) {
		throw new Error("session read budget is not a fixed rule")
	}

	const configuredMax = rule.max
	const ipAddress = auth.options.advanced?.ipAddress as
		| { ipAddressHeaders?: string[]; trustedProxies?: string[] }
		| undefined
	const ipHeaders = [...(ipAddress?.ipAddressHeaders ?? [])]
	const trustedProxies = ipAddress?.trustedProxies
	rule.max = TEST_BUDGET

	try {
		const allowed = [await hit(app, CLIENT_A), await hit(app, CLIENT_A)]
		const exhausted = await hit(app, CLIENT_A)
		const other = await hit(app, CLIENT_B)
		const result: RunnerResult = {
			ok: true,
			nodeEnv: process.env.NODE_ENV,
			trustProxy: env.TRUST_PROXY,
			configuredMax,
			ipHeaders,
			trustedProxiesUnset: !trustedProxies || trustedProxies.length === 0,
			allowed,
			exhausted,
			other,
			ipWarning,
		}
		emit(result, 0)
	} finally {
		rule.max = configuredMax
	}
}

void main().catch(error => {
	emit({ ok: false, message: publicError(error) }, 1)
})
