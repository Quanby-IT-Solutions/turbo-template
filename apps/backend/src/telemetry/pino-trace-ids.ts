import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino"

/**
 * Puts `trace_id` and `span_id` on every log line written inside a span.
 * `disableLogSending`: the ids only; the logs themselves are not shipped.
 *
 * In its own module so `instrument.ts` can use it without loading the other
 * instrumentation packages.
 */
export function pinoTraceIds(): PinoInstrumentation {
	return new PinoInstrumentation({ disableLogSending: true })
}
