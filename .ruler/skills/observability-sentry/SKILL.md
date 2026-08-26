---
name: observability-sentry
description: Crash reporting and observability with Sentry across backend (NestJS), web (Next.js) and mobile (Flutter), plus the shared @repo/observability redaction policy. Use when wiring Sentry, adding an exception filter, configuring source-map upload, or debugging why events are or aren't being sent. Triggers on Sentry, crash reporting, monitoring, DSN, instrument.ts, beforeSend/scrubbing, tracesSampleRate.
frameworks:
  - sentry
  - nestjs
  - nextjs
category: observability
updated: 2026-08-15
---

# Observability & Sentry

Sentry is **off by default in every runtime**. A clone with no Sentry account behaves byte-for-byte as if the SDK were absent. See `docs/sentry.md` for the full operator guide.

## The dual-gate rule (the thing to remember)

Every runtime initializes the SDK only when **BOTH** are true:

1. the flag is on — `SENTRY_ENABLED=true` (backend/edge/server) / `NEXT_PUBLIC_SENTRY_ENABLED` (browser) / `--dart-define=SENTRY_ENABLED=true` (mobile), and
2. the DSN is present **and structurally parseable** (`https://<publicKey>@<host>/<projectId>`).

Neither alone initializes:
- flag on, DSN missing/malformed → **warn once, stay disabled** (a flag with no DSN is an unfinished deployment; `Sentry.init` with a bad DSN silently no-ops, which is indistinguishable from "no errors"). Never throws — a mistyped observability credential must not take down the service it observes.
- DSN present, flag off → silent no-op (a DSN parked for later is not consent to ship events).

The parse check (`isParseableDsn` / `isParseableSentryDsn`) is duplicated backend↔web deliberately so both agree on what counts as usable.

## Shared package: `@repo/observability`

Framework-agnostic. Exports the canonical **log-redaction deny-list** and helpers: `REDACTED_FIELD_NAMES`, `REDACTED_QUERY_PARAMS`, `REDACTED_VALUE`, `PINO_REDACT_PATHS`, `sanitizeLogUrl`, `sanitizeLogQuery`. The backend pino logger, the web Sentry scrubbers, and the Flutter client all derive from this one list — add a field here and it is scrubbed everywhere with no second edit. It is built before web in the Dockerfile (`pnpm --filter @repo/observability build`).

## Backend (NestJS)

- **`apps/backend/src/instrument.ts`** — imported at the very top of `main.ts` (order is load-bearing: `dotenv/config` → `@/instrument` → `reflect-metadata` → bootstrap), so `Sentry.init()` runs before the instrumented libs (http, express, pg) load. It reads the four `SENTRY_*` vars straight off `process.env` (documented exemption from `env.config.ts`, to keep fail-fast env validation off the crash-reporter's critical path). `beforeSend`/`beforeBreadcrumb` run `scrubSentryEvent`/`scrubSentryBreadcrumb`; `sendDefaultPii: false`; `/api/v1/health` is excluded from tracing via `tracesSampler`; `release` = `IMAGE_TAG`.
- **`SentryModule.forRoot()`** in `app.module.ts` — wires the Nest-specific request/span instrumentation. No-op if `init` never ran.
- **`SentryExceptionFilter`** (`common/filters/sentry-exception.filter.ts`) — `@Catch()` catch-all registered as the FIRST `APP_FILTER`. Captures unexpected (non-`HttpException`) failures and renders a generic 500 in the app's uniform `{ success, error, timestamp }` shape. `HttpExceptionFilter` (`@Catch(HttpException)`) handles typed errors and captures only 5xx. The split by exception type means nothing is double-reported. Note: **only 5xx / unexpected errors are captured** — expected 4xx are not.
- **Diagnostics** (development-only; `DiagnosticsModule` is imported by `V1Module` only when `NODE_ENV=development`, so both routes 404 otherwise — no auth check, no handler). Both are `@AllowAnonymous()`:
  - `GET /api/v1/diagnostics/sentry` (via `getSentryDiagnostics()`) — reports enabled/environment/release/dsnParsed, never the DSN itself.
  - `POST /api/v1/diagnostics/sentry/test-error` — throws a plain `Error` (not an `HttpException`) and lets it propagate uncaught, so it travels the real bug path through `SentryExceptionFilter` and renders the uniform 500, exercising the production capture path end to end.

## Web (Next.js)

Framework entrypoints at the app root (Next.js loads them automatically):
- **`instrumentation.ts`** — server `register()` dynamically imports `sentry.server.config.ts` (nodejs runtime) or `sentry.edge.config.ts` (edge); node and edge SDKs have incompatible trees, hence dynamic + separate files. Exports `onRequestError = Sentry.captureRequestError`.
- **`instrumentation-client.ts`** — browser init, gated on `clientSentryDsn`. Exports `onRouterTransitionStart` for App Router navigation. Session Replay is **deliberately never imported** (it re-collects the exact PII the deny-list exists to keep out).
- **`core/lib/sentry-config.ts`** — the single source of the gate + scrubbers for all three web runtimes (`resolveSentryDsn`, `resolveSentryEnvironment`, `scrubSentryEvent`, `scrubSentryBreadcrumb`). Environment resolution: configured env `||` `NODE_ENV` (`||` not `??` — a Docker build passes unset args as empty strings).
- **`next.config.ts`** — `withSentryConfig` with `tunnelRoute: "/monitoring"` (bypasses ad-blockers) and source-map upload from `SENTRY_ORG`/`SENTRY_PROJECT`; projects `SENTRY_ENVIRONMENT` onto `NEXT_PUBLIC_SENTRY_ENVIRONMENT` at build time when the latter is unset.

Web tracing (browser + server + edge) reads the **build-time** `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, not the runtime one.

## Mobile (Flutter)

`apps/mobile/lib/core/constants/sentry_constants.dart`. All config arrives as `--dart-define` (a bundled `.env` asset ships in the APK in cleartext). `isEnabled = SENTRY_ENABLED && dsn.isNotEmpty` (same dual gate). Differences from backend/web: **no `NODE_ENV`** — `SENTRY_ENVIRONMENT` defaults to the compiled-in literal `"development"`; there is **no startup warning and no diagnostics screen** (a build that supplies none of the defines is byte-for-byte the pre-Sentry app). Release id is `mobile@<appVersion>+<buildNumber>` (manually mirrored from `pubspec.yaml`).

## Environment variables

| Variable | Scope | Default | Notes |
|---|---|---|---|
| `SENTRY_ENABLED` | backend/web runtime env | off | master switch; only literal `true` enables |
| `SENTRY_DSN` | backend/web-server runtime env | unset | never logged/echoed |
| `SENTRY_ENVIRONMENT` | runtime env | `NODE_ENV` | e.g. "production build in staging"; also projected onto browser twin at build |
| `SENTRY_TRACES_SAMPLE_RATE` | runtime env | `0` | **backend only**, clamped 0–1; health check always excluded |
| `NEXT_PUBLIC_SENTRY_ENABLED` | web build arg | off | browser switch; empty normalised to unset |
| `NEXT_PUBLIC_SENTRY_DSN` | web build arg | unset | public (write-only ingest key, shipped to browsers) |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | web build arg | ← `SENTRY_ENVIRONMENT` → `NODE_ENV` | browser env tag |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | web build arg | `0` | sampling for **all three** web runtimes; bounded 0–1 |
| `SENTRY_ORG`, `SENTRY_PROJECT` | web build arg | unset | source-map upload target (plain identifiers) |
| `SENTRY_AUTH_TOKEN` | web build **secret** | unset | org write credential; BuildKit secret mount, never a build arg |
| `WEB_SENTRY_DSN`, `BACKEND_SENTRY_DSN` | CI/SSM | unset | per-app DSN; compose maps each onto its container's `SENTRY_DSN`. Set equal to collapse into one project |

Deploy/build wiring lives in the `ci-cd-pipelines` and `docker-deployment` skills. Cross-reference: `docs/sentry.md`.
