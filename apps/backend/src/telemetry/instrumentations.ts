import type { Instrumentation } from "@opentelemetry/instrumentation"
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express"
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http"
import { IORedisInstrumentation } from "@opentelemetry/instrumentation-ioredis"
import { NestInstrumentation } from "@opentelemetry/instrumentation-nestjs-core"
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg"

import { pinoTraceIds } from "./pino-trace-ids"

/** Load balancers poll it continuously; it would dominate traces and metrics. */
const HEALTH_CHECK_PATH = "/api/v1/health"

/**
 * The instrumentations this process registers itself when OpenTelemetry is on.
 *
 * Each library must be patched exactly once. HTTP is always ours (spans and
 * the `http.server.request.duration` metric); Sentry's own HTTP spans are
 * turned off in `instrument.ts`, as Sentry documents for a custom setup.
 * Express, pg, Redis and Nest are Sentry's integrations' job when Sentry is
 * on, and ours only when it is off.
 */
export function ownInstrumentations(sentryOn: boolean): Instrumentation[] {
	const always: Instrumentation[] = [
		new HttpInstrumentation({
			ignoreIncomingRequestHook: request => request.url?.startsWith(HEALTH_CHECK_PATH) ?? false,
		}),
		pinoTraceIds(),
	]
	if (sentryOn) return always

	return [
		...always,
		new ExpressInstrumentation(),
		new PgInstrumentation(),
		new IORedisInstrumentation(),
		new NestInstrumentation(),
	]
}
