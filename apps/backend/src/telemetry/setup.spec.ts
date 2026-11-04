import { metrics, trace } from "@opentelemetry/api"

import { setupTelemetry } from "./setup"

describe("setupTelemetry", () => {
	it("registers nothing when OpenTelemetry is off", () => {
		const tracerBefore = trace.getTracerProvider()
		const meterBefore = metrics.getMeterProvider()

		expect(setupTelemetry(undefined, undefined)).toBeUndefined()
		expect(trace.getTracerProvider()).toBe(tracerBefore)
		expect(metrics.getMeterProvider()).toBe(meterBefore)
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

		const handle = setupTelemetry(
			{ endpoint: "http://127.0.0.1:9", serviceName: "telemetry-spec" },
			client
		)

		expect(openTelemetrySetupCheck()).toEqual(
			expect.arrayContaining([
				"SentryContextManager",
				"SentryPropagator",
				"SentrySpanProcessor",
				"SentrySampler",
			])
		)
		await handle?.shutdown()
	})
})
