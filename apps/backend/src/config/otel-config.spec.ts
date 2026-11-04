import { readOtelConfig } from "./otel-config"

describe("readOtelConfig", () => {
	it("is off without a word when OTEL_ENABLED is not set", () => {
		const warn = jest.fn()

		expect(
			readOtelConfig({ OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318" }, warn)
		).toBeUndefined()
		expect(warn).not.toHaveBeenCalled()
	})

	it.each([undefined, "", "   ", "not a url", "ftp://collector:21"])(
		"warns once and stays off when enabled with an unusable endpoint (%p)",
		endpoint => {
			const warn = jest.fn()

			expect(
				readOtelConfig({ OTEL_ENABLED: "true", OTEL_EXPORTER_OTLP_ENDPOINT: endpoint }, warn)
			).toBeUndefined()
			expect(warn).toHaveBeenCalledTimes(1)
		}
	)

	it("is on with the trimmed endpoint and the default service name", () => {
		expect(
			readOtelConfig({
				OTEL_ENABLED: "true",
				OTEL_EXPORTER_OTLP_ENDPOINT: " http://localhost:4318 ",
			})
		).toEqual({ endpoint: "http://localhost:4318", serviceName: "turbo-template-api" })
	})

	it.each(["http://collector:4318/", "http://collector:4318//"])(
		"drops trailing slashes from %p so paths do not become //v1/traces",
		endpoint => {
			expect(
				readOtelConfig({ OTEL_ENABLED: "true", OTEL_EXPORTER_OTLP_ENDPOINT: endpoint })?.endpoint
			).toBe("http://collector:4318")
		}
	)

	it("keeps a custom service name", () => {
		expect(
			readOtelConfig({
				OTEL_ENABLED: "true",
				OTEL_EXPORTER_OTLP_ENDPOINT: "https://otlp.example.com",
				OTEL_SERVICE_NAME: "billing-api",
			})?.serviceName
		).toBe("billing-api")
	})

	it("needs the flag spelled exactly true, like SENTRY_ENABLED", () => {
		expect(
			readOtelConfig({ OTEL_ENABLED: "1", OTEL_EXPORTER_OTLP_ENDPOINT: "http://localhost:4318" })
		).toBeUndefined()
	})
})
