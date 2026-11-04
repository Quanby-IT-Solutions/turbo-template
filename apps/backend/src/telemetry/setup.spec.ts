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
