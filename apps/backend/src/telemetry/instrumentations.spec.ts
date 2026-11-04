import type { IncomingMessage } from "node:http"
import type { HttpInstrumentationConfig } from "@opentelemetry/instrumentation-http"

import { ownInstrumentations } from "./instrumentations"

const names = (sentryOn: boolean) => ownInstrumentations(sentryOn).map(i => i.instrumentationName)

describe("ownInstrumentations", () => {
	it("instruments everything itself when Sentry is off", () => {
		expect(names(false).sort()).toEqual(
			[
				"@opentelemetry/instrumentation-express",
				"@opentelemetry/instrumentation-http",
				"@opentelemetry/instrumentation-ioredis",
				"@opentelemetry/instrumentation-nestjs-core",
				"@opentelemetry/instrumentation-pg",
				"@opentelemetry/instrumentation-pino",
			].sort()
		)
	})

	it("leaves express, pg, redis and nest to Sentry's integrations when Sentry is on", () => {
		expect(names(true).sort()).toEqual(
			["@opentelemetry/instrumentation-http", "@opentelemetry/instrumentation-pino"].sort()
		)
	})

	it("does not trace the health check", () => {
		const http = ownInstrumentations(false).find(
			i => i.instrumentationName === "@opentelemetry/instrumentation-http"
		)
		const ignore = (http?.getConfig() as HttpInstrumentationConfig).ignoreIncomingRequestHook

		expect(ignore?.({ url: "/api/v1/health" } as IncomingMessage)).toBe(true)
		expect(ignore?.({ url: "/api/v1/health?probe=lb" } as IncomingMessage)).toBe(true)
		expect(ignore?.({ url: "/api/v1/example/todos" } as IncomingMessage)).toBe(false)
	})

	it("adds trace ids to log lines without shipping the logs", () => {
		const pino = ownInstrumentations(true).find(
			i => i.instrumentationName === "@opentelemetry/instrumentation-pino"
		)

		expect(pino?.getConfig()).toMatchObject({ disableLogSending: true })
	})
})
