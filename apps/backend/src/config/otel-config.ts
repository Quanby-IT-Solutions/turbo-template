/**
 * OpenTelemetry export settings, read straight from `process.env`.
 *
 * Same documented exemption as `instrument.ts`: this runs before `AppModule`
 * (and so before `env.config.ts` validation) because instrumentation must be
 * registered before http, express and pg are loaded. A bad value here warns
 * and turns export off; it never throws, so a telemetry typo cannot stop the
 * service it was meant to observe. The same variables are also declared in
 * `env.config.ts` for the rest of the app.
 */

export type OtelConfig = {
	/** OTLP/HTTP base URL, e.g. `http://localhost:4318`. Traces go to `/v1/traces`, metrics to `/v1/metrics`. */
	endpoint: string
	serviceName: string
}

const DEFAULT_SERVICE_NAME = "turbo-template-api"

/**
 * The export settings, or `undefined` when OpenTelemetry stays off.
 *
 * On only when `OTEL_ENABLED` is exactly `"true"` (the same rule as
 * `SENTRY_ENABLED`) AND the endpoint is an http(s) URL. The flag without a
 * usable endpoint warns once; an endpoint without the flag is parked for later
 * and says nothing.
 */
export function readOtelConfig(
	env: NodeJS.ProcessEnv,
	warn: (message: string) => void = message => console.warn(`[otel] ${message}`)
): OtelConfig | undefined {
	if (env.OTEL_ENABLED !== "true") return undefined

	// Signal paths are appended (`/v1/traces`), so a trailing slash would give `//v1/traces`.
	const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT?.trim().replace(/\/+$/, "")
	let usable = false
	if (endpoint) {
		try {
			const { protocol } = new URL(endpoint)
			usable = protocol === "http:" || protocol === "https:"
		} catch {
			usable = false
		}
	}
	if (!endpoint || !usable) {
		warn(
			"OTEL_ENABLED=true but OTEL_EXPORTER_OTLP_ENDPOINT is missing or not an http(s) URL. " +
				"OpenTelemetry export is DISABLED for this process."
		)
		return undefined
	}

	return {
		endpoint,
		serviceName: env.OTEL_SERVICE_NAME?.trim() || DEFAULT_SERVICE_NAME,
	}
}
