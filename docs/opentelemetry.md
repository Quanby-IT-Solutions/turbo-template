# Tracing and Metrics (OpenTelemetry)

The backend can export traces and HTTP metrics over OTLP to any OpenTelemetry backend (a collector, Grafana, Honeycomb, Datadog, a local viewer). It runs beside Sentry without instrumenting anything twice, and every log line written during a request carries that request's `trace_id` and `span_id`. Like Sentry and PostHog it ships **off**: a clone with no OTLP endpoint boots and behaves exactly as before.

## Scope

- Backend only (`apps/backend`). The web app already sends Sentry's trace headers to the backend; a second tracing setup in Next.js is a known source of duplicate spans and is out of scope.
- Traces: HTTP server and client, Express, Nest, Postgres, Redis, plus Better Auth's own spans.
- Metrics: the HTTP request duration histogram (it carries the request count).
- Logs are not shipped. Only the trace ids are added to the existing pino lines.

## Enablement policy

Export needs **both** the switch and an endpoint. The switch without a usable endpoint logs one warning and stays off, and so does a setup that fails for any other reason: telemetry never stops the process.

| Variable                        | Meaning                                                                                                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OTEL_ENABLED`                  | `true` turns export on (exactly `true`, like `SENTRY_ENABLED`)                                                                                                                                           |
| `OTEL_EXPORTER_OTLP_ENDPOINT`   | OTLP/HTTP base URL, e.g. `http://localhost:4318`. Traces go to `/v1/traces`, metrics to `/v1/metrics`                                                                                                    |
| `OTEL_SERVICE_NAME`             | Service name in the backend UI. Default `turbo-template-api`                                                                                                                                             |
| `OTEL_EXPORTER_OTLP_HEADERS`    | Auth headers for a hosted backend (`x-api-key=...`), read by the SDK. A secret                                                                                                                           |
| `OTEL_SEMCONV_STABILITY_OPT_IN` | Optional. `http` switches HTTP spans and metrics to the stable semantic conventions (`http.server.request.duration`, `url.path`); the default is the older names (`http.server.duration`, `http.target`) |

`src/telemetry.ts` reads these straight from `process.env`, before `AppModule` loads, for the same reason `src/instrument.ts` does: instrumentation must be registered before http, express and pg are imported, and a configuration typo must never stop the process. `src/config/env.config.ts` declares the same variables for the rest of the app.

## The four modes

| OTel | Sentry | What runs                                                                                                                                                                                                                                                                         |
| ---- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| off  | off    | Nothing new. No provider, no instrumentation, boot output unchanged                                                                                                                                                                                                               |
| off  | on     | Sentry exactly as before, plus the pino instrumentation so log lines carry Sentry's trace ids                                                                                                                                                                                     |
| on   | off    | Our tracer provider with an always-on sampler; we instrument http, express, nest, pg, ioredis and pino                                                                                                                                                                            |
| on   | on     | One provider following Sentry's documented v10 custom setup: Sentry's sampler, span processor, propagator and context manager, plus our OTLP exporter. We instrument http and pino; Sentry's integrations instrument express, nest, pg and Redis; Sentry's own HTTP spans are off |

In every mode each library is instrumented by exactly one instrumentation. With Sentry on, Sentry's `tracesSampler` still decides what is traced (and drops the health check); with Sentry off, the health check is excluded by the HTTP instrumentation. Both use `isHealthCheckPath` (`src/utils/health-check.ts`): `/api/v1/health` and paths under it, not every path that starts with those characters.

**With both on, `SENTRY_TRACES_SAMPLE_RATE` is the trace rate for OTLP too.** Its default is `0`, which exports no traces at all (metrics still flow). The backend warns once at boot when both are on and the rate is `0`; set it above `0` (for example `1` locally) to export traces.

### Where it is wired

- `src/main.ts`: import order `dotenv/config`, `@/instrument`, `@/telemetry`, `reflect-metadata` (load-bearing; see the comment there).
- `src/instrument.ts`: switches Sentry to `skipOpenTelemetrySetup` and turns its HTTP spans off when export is on; adds the pino instrumentation when it is off.
- `src/telemetry.ts` and `src/telemetry/`: `setup.ts` (providers), `instrumentations.ts` (who instruments what), `scrubbing-span-exporter.ts`, `telemetry.lifecycle.ts` (flush on shutdown).
- `src/config/otel-config.ts`: the gate.

## What leaves the process

Every exported span passes `ScrubbingSpanExporter` first:

- Attributes for request headers the logger never records (`x-request-id`) are dropped.
- Span events get the same rules. `recordException` stores the error message and stack there, and query strings quoted inside them are redacted.
- Any attribute named after a field on the `@repo/observability` deny-list (`authorization`, `cookie`, `password`, `token`, `email`, ...) is dropped.
- Credentials in URLs are redacted with the request logger's own `sanitizeLogUrl`: query parameters (`?token=`) and the reset token Better Auth puts in the path (`/reset-password/<token>`). This covers `url.full`, `http.url`, `http.target`, `url.path`, `http.route`, `url.query`, a captured `referer` header, and the span name.
- Link attributes get the same rules as span attributes.
- Sentry's `sentry.*` entries are removed from the W3C trace state. Sentry's sampler stores the full request URL there (`sentry.url`), query string included, and the OTLP exporter would otherwise ship it.

Sentry's `beforeSendSpan` and `beforeSendTransaction` run span data through the same `scrubSpanAttributes`, so both destinations follow one rule set. Export is batched (spans) and periodic (metrics, every 10 s), so an OTLP endpoint that is down or slow never holds up a request. Queued data is flushed on graceful shutdown (`app.close()` on SIGTERM or SIGINT), for at most 3 s: against an endpoint that never answers, the exporter's own 10 s timeout equals Docker's default stop grace period. Past the limit the queue is dropped with one warning.

## Log lines

`@opentelemetry/instrumentation-pino` runs with log sending off: it only adds `trace_id`, `span_id` and `trace_flags` to lines written while a span is active. The trace id is the one the tracing backend shows for the same request. With OTel off and Sentry tracing off there are no spans, so log lines are unchanged.

## Verification

- `pnpm -F @repo/backend verify:telemetry` (after `pnpm build`, with the local database up): boots the built backend once per mode against a local OTLP receiver, sends a request carrying credential-shaped values, a password-reset link and a sign-in, and checks span counts, single instrumentation per library, the duration metric, that no credential is exported or logged, that log lines carry the exported trace id, and that a dead endpoint does not slow requests. A sixth mode boots with the database unreachable and Sentry pointed at the receiver, and fails if a credential reaches the log or Sentry's payload. Exits 1 on any failure. It is a standalone script because jest cannot observe module patching. CI runs it in the backend e2e job, after building `dist/`.
- Local viewer: `brew install otel-desktop-viewer`, run `otel-desktop-viewer`, then start the backend with `OTEL_ENABLED=true OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318`. Traces and metrics appear in the browser UI it opens.

## Versions

The OpenTelemetry packages are pinned to the releases Sentry 10.70 runs on (API 1.9.1, SDK 2.10.0, instrumentation 0.220.0; OTLP exporters 0.221.0, the release paired with SDK 2.10.0), so the process keeps one instrumentation registry. Upgrade them together with `@sentry/nestjs`, and check `pnpm why @opentelemetry/instrumentation` shows one version.

## Residual risks and accepted trade-offs

- Two copies of `@opentelemetry/core` (2.9.0 via the HTTP instrumentation, 2.10.0 elsewhere) are installed. Core holds no state that must be shared (the context keys live in `@opentelemetry/api`); the mode check confirms the exporter's own requests are not traced.
- With Sentry on, Sentry's integrations instrument Express, Nest and Postgres, so span names follow Sentry's style (middleware by function name, Nest guards included), the root HTTP span is named by method only (`GET`, with the route in its attributes), and the Postgres connection metrics that OpenTelemetry's own pg instrumentation emits are absent. The HTTP duration metric is present in both modes.
- Sentry with OTel on uses Sentry's custom setup, which Sentry documents but does not make the default. A Sentry major upgrade (v11) needs this file and `src/telemetry/setup.ts` revisited.

## Official documentation

- Sentry custom OpenTelemetry setup (v10): https://docs.sentry.io/platforms/javascript/guides/node/opentelemetry/custom-setup__v10.x.md
- OpenTelemetry JS: https://opentelemetry.io/docs/languages/js/
- OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
