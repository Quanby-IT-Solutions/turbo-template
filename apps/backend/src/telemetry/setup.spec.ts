import { metrics, trace } from "@opentelemetry/api"

import type { NodeClient } from "@sentry/nestjs"

import { setupTelemetry } from "./setup"

const config = { endpoint: "http://127.0.0.1:9", serviceName: "telemetry-spec" }

describe("setupTelemetry", () => {
	it("registers nothing when OpenTelemetry is off", () => {
		const tracerBefore = trace.getTracerProvider()
		const meterBefore = metrics.getMeterProvider()

		expect(setupTelemetry(undefined, undefined)).toBeUndefined()
		expect(trace.getTracerProvider()).toBe(tracerBefore)
		expect(metrics.getMeterProvider()).toBe(meterBefore)
	})

	it("warns and stays off instead of throwing when setup fails", () => {
		const warn = jest.fn()
		const broken = {
			getOptions: () => {
				throw new Error("boom")
			},
		} as unknown as NodeClient

		expect(setupTelemetry(config, broken, warn)).toBeUndefined()
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("boom"))
	})
})

describe("setupTelemetry with Sentry on", () => {
	afterAll(async () => {
		const Sentry = await import("@sentry/nestjs")
		await Sentry.close()
	})

	it("installs every component Sentry's validateOpenTelemetrySetup checks for", async () => {
		const Sentry = await import("@sentry/nestjs")
		const { openTelemetrySetupCheck } = await import("@sentry/opentelemetry")
		const client = Sentry.init({
			dsn: "https://public@127.0.0.1:9/1",
			tracesSampleRate: 1,
			skipOpenTelemetrySetup: true,
		})

		const warn = jest.fn()
		const handle = setupTelemetry(config, client, warn)

		expect(openTelemetrySetupCheck()).toEqual(
			expect.arrayContaining([
				"SentryContextManager",
				"SentryPropagator",
				"SentrySpanProcessor",
				"SentrySampler",
			])
		)
		expect(warn).not.toHaveBeenCalled()
		await handle?.shutdown()
	})

	it("warns once that nothing is exported when Sentry's traces sample rate is 0", async () => {
		// Sentry's sampler decides for both destinations, and the template's
		// default SENTRY_TRACES_SAMPLE_RATE is 0, so OTLP would get no traces.
		const Sentry = await import("@sentry/nestjs")
		const client = Sentry.init({
			dsn: "https://public@127.0.0.1:9/1",
			tracesSampleRate: 0,
			skipOpenTelemetrySetup: true,
		})
		const warn = jest.fn()

		const handle = setupTelemetry(config, client, warn)

		expect(warn).toHaveBeenCalledTimes(1)
		expect(warn).toHaveBeenCalledWith(expect.stringContaining("SENTRY_TRACES_SAMPLE_RATE"))
		await handle?.shutdown()
	})
})
