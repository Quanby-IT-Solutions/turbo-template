/**
 * OpenTelemetry for the backend process: traces and HTTP metrics over OTLP.
 *
 * Imported by `main.ts` right after `@/instrument`: it needs Sentry's client
 * (when Sentry is on), and it must register instrumentations before
 * `AppModule` loads http, express and pg. Off unless `OTEL_ENABLED=true` and an
 * endpoint are set; then nothing is registered and the process behaves as
 * before. Settings are read raw from `process.env` (see `config/otel-config.ts`).
 */
import * as Sentry from "@sentry/nestjs"

import { readOtelConfig } from "@/config/otel-config"
import { setupTelemetry, type TelemetryHandle } from "@/telemetry/setup"

/** The live setup, or `undefined` when export is off. Flushed on shutdown by `TelemetryLifecycle`. */
export const telemetry: TelemetryHandle | undefined = setupTelemetry(
	readOtelConfig(process.env),
	Sentry.getClient()
)
