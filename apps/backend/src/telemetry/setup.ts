import { metrics } from "@opentelemetry/api"
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http"
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http"
import { registerInstrumentations } from "@opentelemetry/instrumentation"
import { resourceFromAttributes } from "@opentelemetry/resources"
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics"
import {
	AlwaysOnSampler,
	BatchSpanProcessor,
	ParentBasedSampler,
} from "@opentelemetry/sdk-trace-base"
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node"
import * as Sentry from "@sentry/nestjs"
import { SentryPropagator, SentrySampler, SentrySpanProcessor } from "@sentry/opentelemetry"

import type { OtelConfig } from "@/config/otel-config"

import { ownInstrumentations } from "./instrumentations"
import { ScrubbingSpanExporter } from "./scrubbing-span-exporter"

/** How often HTTP metrics are pushed to the OTLP endpoint. */
const METRIC_EXPORT_INTERVAL_MS = 10_000

export type TelemetryHandle = {
	tracerProvider: NodeTracerProvider
	meterProvider: MeterProvider
	/** Flushes and stops both providers. Called on application shutdown. */
	shutdown(): Promise<void>
}

/**
 * The process's one OpenTelemetry setup, or nothing when export is off.
 *
 * | OTel | Sentry | What this does |
 * | off  | any    | nothing; Sentry (if on) keeps its own setup, as before |
 * | on   | off    | our provider, always-on sampling, OTLP export only |
 * | on   | on     | Sentry's documented v10 custom setup: Sentry's sampler (which
 * |      |        | drops the health check), processor, propagator and context
 * |      |        | manager, plus our OTLP batch processor on the same provider |
 *
 * Exported spans pass `ScrubbingSpanExporter`. Export is always batched, so an
 * OTLP endpoint that is down or slow cannot hold up a request.
 */
export function setupTelemetry(
	config: OtelConfig | undefined,
	sentryClient: Sentry.NodeClient | undefined,
	warn: (message: string) => void = message => console.warn(`[otel] ${message}`)
): TelemetryHandle | undefined {
	if (!config) return undefined

	// Warn, never throw: this runs at import time, before the app exists, and
	// a telemetry fault must not stop the service it was meant to observe.
	try {
		return startProviders(config, sentryClient, warn)
	} catch (error) {
		warn(
			`setup failed (${error instanceof Error ? error.message : String(error)}). ` +
				"OpenTelemetry export is DISABLED for this process."
		)
		return undefined
	}
}

function startProviders(
	config: OtelConfig,
	sentryClient: Sentry.NodeClient | undefined,
	warn: (message: string) => void
): TelemetryHandle {
	if (sentryClient && sentryClient.getOptions().tracesSampleRate === 0) {
		warn(
			"Sentry is on and SENTRY_TRACES_SAMPLE_RATE is 0. Sentry's sampler decides for OTLP too, " +
				"so no traces will be exported (metrics still are). Raise the rate to export traces."
		)
	}

	const resource = resourceFromAttributes({ "service.name": config.serviceName })

	// Metrics first, so the HTTP instrumentation finds the meter provider when it
	// registers and records `http.server.duration` (see docs/opentelemetry.md).
	const meterProvider = new MeterProvider({
		resource,
		readers: [
			new PeriodicExportingMetricReader({
				exporter: new OTLPMetricExporter({ url: `${config.endpoint}/v1/metrics` }),
				exportIntervalMillis: METRIC_EXPORT_INTERVAL_MS,
			}),
		],
	})
	metrics.setGlobalMeterProvider(meterProvider)

	const otlp = new BatchSpanProcessor(
		new ScrubbingSpanExporter(new OTLPTraceExporter({ url: `${config.endpoint}/v1/traces` }))
	)

	const tracerProvider = sentryClient
		? new NodeTracerProvider({
				resource,
				sampler: new SentrySampler(sentryClient),
				spanProcessors: [new SentrySpanProcessor(), otlp],
			})
		: new NodeTracerProvider({
				resource,
				sampler: new ParentBasedSampler({ root: new AlwaysOnSampler() }),
				spanProcessors: [otlp],
			})

	if (sentryClient) {
		tracerProvider.register({
			propagator: new SentryPropagator(),
			contextManager: new Sentry.SentryContextManager(),
		})
	} else {
		tracerProvider.register()
	}

	registerInstrumentations({
		instrumentations: ownInstrumentations(Boolean(sentryClient)),
		tracerProvider,
		meterProvider,
	})

	// Logs a warning for anything missing from the custom setup; silent when
	// the wiring is right.
	if (sentryClient) Sentry.validateOpenTelemetrySetup()

	return {
		tracerProvider,
		meterProvider,
		shutdown: async () => {
			await Promise.all([tracerProvider.shutdown(), meterProvider.shutdown()])
		},
	}
}
