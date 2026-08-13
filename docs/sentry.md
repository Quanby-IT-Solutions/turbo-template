# Error Monitoring (Sentry)

Crash reporting for all three apps — web (Next.js), backend (NestJS), mobile
(Flutter) — plus the CI wiring that configures it in production.

**Monitoring ships OFF.** Every surface requires *both* an enable flag *and* a
DSN before the SDK initialises. A clone with no Sentry account builds, boots and
behaves byte-for-byte as it did before Sentry was added.

## Scope

Primary audience: the team running this deployment. Secondary audience: anyone
adopting the template who wants monitoring in their own Sentry org.

This document covers configuration, verification and the privacy contract. It
does not cover alerting rules, dashboards or on-call routing — those live in the
Sentry UI.

## Recommended project layout

Three Sentry projects, one per runtime, so an event's project already says which
app produced it:

| Project | Platform | Receives |
| --- | --- | --- |
| `turbo-template-web` | `javascript-nextjs` | Browser, Node server and edge runtime events |
| `turbo-template-api` | `node-nestjs` | Backend exceptions and (optionally) traces |
| `turbo-template-mobile` | `flutter` | Uncaught Dart errors and native crashes |

Separate projects are what the production wiring assumes by default: the deploy
carries one DSN per server-side app (`WEB_SENTRY_DSN`, `BACKEND_SENTRY_DSN`) and
maps each onto the `SENTRY_DSN` its container reads. Adopters may collapse these
into a single project by setting both variables to the same DSN. Nothing in the
code assumes separate projects — the enablement mechanics, scrubbing and release
tagging are per app either way. The cost is that environment and release tags
become the only way to tell surfaces apart.

All examples below use placeholders:
`https://<publicKey>@<org>.ingest.sentry.io/<projectId>`, `<org-slug>`,
`<project-slug>`.

## Enablement policy

### Backend and web

On these two surfaces enabled means **flag AND parseable DSN**. Either alone is
treated as a misconfiguration, never as consent to start sending:

| State | Result |
| --- | --- |
| No flag | SDK never initialises. No log line — a DSN parked in the environment for later is not an error. |
| Flag on, DSN missing | One `console.warn`, SDK disabled. The deployment is unfinished and the operator has to hear about it. |
| Flag on, DSN malformed | One `console.warn`, SDK disabled. `Sentry.init` accepts a bad DSN, logs nothing and drops every event — a failure mode indistinguishable from "no errors happened". |
| Flag on, DSN valid | SDK initialises. |

A bad DSN **never throws**. A mistyped observability credential must not be able
to stop the service it was installed to observe. This is also why the DSNs are
plain `z.string()` in `apps/web/env.ts` rather than `z.url()`.

Implementations that must agree on this, and do:
`apps/backend/src/instrument.ts` (`isParseableDsn`) and
`apps/web/core/lib/sentry-config.ts` (`resolveSentryDsn`,
`isParseableSentryDsn`).

Environment resolution is the same rule on both: the configured Sentry
environment wins, `NODE_ENV` is the fallback.

### Mobile

The table above does **not** describe mobile. `SentryConstants.isEnabled` in
`apps/mobile/lib/core/constants/sentry_constants.dart` is
`SENTRY_ENABLED=true` **and** a non-empty `SENTRY_DSN` — a non-empty check, not
a parse:

- **No parse check.** A malformed DSN counts as "configured", so the SDK
  initialises and then drops every event.
- **No warning.** `apps/mobile/lib/main.dart` has no warning path at all. Flag
  on with a missing or malformed DSN is silent — nothing is printed at startup.
- **No `NODE_ENV` fallback.** A Flutter build has no `NODE_ENV`;
  `SENTRY_ENVIRONMENT` defaults to the compiled-in literal `development` unless
  a `--dart-define` overrides it.

Mobile also has no diagnostics page and no test-error button — see
*Verification → Mobile* below.

### Where it is wired

| Environment | Status |
| --- | --- |
| Local / development | Off. Set the variables in your own `.env` (backend, web) or `--dart-define`s (mobile) to turn it on. |
| Production | Wired end to end — `.github/workflows/deploy-production.yml` passes build args and writes the runtime payload to SSM. Still inert until the GitHub Environment values are populated. |
| Staging | **Deliberately untouched.** `docker-compose.staging.yml` and `.github/workflows/deploy-staging.yml` carry no Sentry configuration. Wire it manually if you want it — mirror the production workflow's build args and env payload. |

## Configuration

### Backend (`apps/backend`)

Read straight off `process.env` in `apps/backend/src/instrument.ts`, which is
imported at the very top of `main.ts` so `Sentry.init` runs before the
instrumented libraries load. That file deliberately does **not** import
`@/config/env.config`: full fail-fast validation on the error-reporting critical
path would mean one unrelated bad variable kills the crash reporter exactly when
it is needed. The same keys are also declared in `env.config.ts` for the rest of
the app.

| Variable | Where set | Default | Purpose |
| --- | --- | --- | --- |
| `SENTRY_ENABLED` | Runtime env | unset (off) | Master switch. Only the literal `true` enables. |
| `SENTRY_DSN` | Runtime env | unset | Ingest DSN. Never logged or echoed by the diagnostics endpoint. |
| `SENTRY_ENVIRONMENT` | Runtime env | `NODE_ENV` | Environment tag. Separate from `NODE_ENV` because "production build running in staging" is the case `NODE_ENV` cannot express. |
| `SENTRY_TRACES_SAMPLE_RATE` | Runtime env | `0` | Performance sampling **for the backend only**, clamped to 0–1. `0` = errors only. `/api/v1/health` is always excluded regardless. Web tracing does not read it — see the web table below. |
| `IMAGE_TAG` | Set by the deploy workflow | unset | Reported as the Sentry release. Nothing to configure locally. |

### Web (`apps/web`)

Three runtimes initialise the SDK — browser (`instrumentation-client.ts`), Node
server (`sentry.server.config.ts`) and edge (`sentry.edge.config.ts`, both
dispatched from `instrumentation.ts`). All three share the gate and scrubbers in
`core/lib/sentry-config.ts`. Declared and validated in `apps/web/env.ts`.

**Browser runtime** (inlined into the client bundle at build time):

| Variable | Where set | Default | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SENTRY_ENABLED` | Build env | unset (off) | Browser master switch. Accepts `true`/`false`/`1`/`0`; empty is normalised to unset so an unconfigured Docker build still validates. |
| `NEXT_PUBLIC_SENTRY_DSN` | Build env | unset | Browser DSN. Public by nature — a write-only ingest key shipped to every visitor. |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Build env | falls back to `SENTRY_ENVIRONMENT`, then `NODE_ENV` | Browser environment tag. When only `SENTRY_ENVIRONMENT` is set, `next.config.ts` projects it onto this key at build time so client and server tag events identically. |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | Build env | `0` | The sampling knob for **all three** web runtimes — server and edge read this build-time value too, not the runtime `SENTRY_TRACES_SAMPLE_RATE`. Bounded 0–1 at validation: Sentry reads out-of-range values as "sample everything", which is a billing incident rather than an error. |

**Server and edge runtimes** (read at container start):

| Variable | Where set | Default | Purpose |
| --- | --- | --- | --- |
| `SENTRY_ENABLED` | Runtime env | unset (off) | Server/edge master switch. |
| `SENTRY_DSN` | Runtime env | unset | Server/edge DSN. Server-scoped, never inlined into the browser bundle. |
| `SENTRY_ENVIRONMENT` | Runtime env | `NODE_ENV` | Server/edge environment tag; also projected onto the browser twin at build time. |

There is deliberately **no runtime sampling variable here**.
`sentry.server.config.ts` and `sentry.edge.config.ts` both take
`tracesSampleRate` from `env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE`, which is
fixed at build time. Setting `SENTRY_TRACES_SAMPLE_RATE` in the container
environment changes backend sampling only and leaves web tracing untouched;
re-sampling web needs a rebuild with a new `--build-arg`.

**Source-map upload** (build time only, read by the bundler plugin in
`next.config.ts`):

| Variable | Where set | Default | Purpose |
| --- | --- | --- | --- |
| `SENTRY_ORG` | Build env | unset | Sentry org slug. |
| `SENTRY_PROJECT` | Build env | unset | Sentry project slug. |
| `SENTRY_AUTH_TOKEN` | Build env (BuildKit secret) | unset | Write credential for the org. **Never** `NEXT_PUBLIC_*` — a public var is inlined into the browser bundle verbatim. Absent = upload skipped, build still green. |

### Mobile (`apps/mobile`)

Compile-time only, via `--dart-define`. Nothing arrives from a bundled `.env`
asset: a Flutter asset ships inside the APK in cleartext and is readable by
unzipping it. Defaults live in
`lib/core/constants/sentry_constants.dart`.

| Define | Default | Purpose |
| --- | --- | --- |
| `SENTRY_ENABLED` | `false` | Master switch. Only the literal `true` enables. |
| `SENTRY_DSN` | empty | Ingest DSN. Must never be logged, printed or interpolated into a message. Checked for **non-emptiness only** — never parsed. |
| `SENTRY_ENVIRONMENT` | `development` | Environment tag. There is no `NODE_ENV` in a Flutter build, so the literal `development` is the default unless a `--dart-define` overrides it. |

Reporting starts on `SENTRY_ENABLED=true` **plus** a non-empty `SENTRY_DSN`.
Nothing warns when the flag is on and the DSN is missing or malformed, so check
the dashboard rather than the console after changing these defines.

```bash
flutter build apk --release \
  --dart-define=SENTRY_ENABLED=true \
  --dart-define=SENTRY_DSN=https://<publicKey>@<org>.ingest.sentry.io/<projectId> \
  --dart-define=SENTRY_ENVIRONMENT=production
```

There is **no `SENTRY_TRACES_SAMPLE_RATE` define**. `tracesSampleRate` is
hardcoded to `0.0` in `lib/main.dart` — errors only. Change it there if you want
mobile tracing; do not expect a variable to exist for it.

The release tag is `mobile@<appVersion>+<buildNumber>`, mirrored manually from
`pubspec.yaml` into `SentryConstants.appVersion` / `buildNumber` (Dart cannot
read `pubspec.yaml` at runtime and the app carries no `package_info_plus`
dependency). **Keep those two constants in sync on every version bump** — a
stale value only mislabels a release, which is exactly why it is easy to forget.

### CI / GitHub (production environment)

All of it is optional. Leave every value unset and the deploy behaves exactly as
it did before Sentry existed. `.github/workflows/deploy-production.yml`
validates none of these.

`vars` vs `secrets` follows what the value actually is:

| Name | Type | Consumed as |
| --- | --- | --- |
| `SENTRY_AUTH_TOKEN` | **Secret** | BuildKit secret mount: `--secret id=sentry_auth_token,env=SENTRY_AUTH_TOKEN`. Never a build arg — build args are recorded in image history. |
| `SENTRY_ORG` | Variable | `--build-arg` to the web image |
| `SENTRY_PROJECT` | Variable | `--build-arg` to the web image |
| `NEXT_PUBLIC_SENTRY_ENABLED` | Variable | `--build-arg` (inlined into the client bundle, so build time, not SSM) |
| `NEXT_PUBLIC_SENTRY_DSN` | Variable | `--build-arg` |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Variable | `--build-arg` |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | Variable | `--build-arg` (drives web tracing for browser, server **and** edge) |
| `SENTRY_ENABLED` | Variable | SSM env payload (web server/edge + backend) |
| `WEB_SENTRY_DSN` | Variable | SSM env payload (mapped to `SENTRY_DSN` in the web container) |
| `BACKEND_SENTRY_DSN` | Variable | SSM env payload (mapped to `SENTRY_DSN` in the backend container) |
| `SENTRY_ENVIRONMENT` | Variable | SSM env payload **and** a web build arg (projected onto the browser twin) |
| `SENTRY_TRACES_SAMPLE_RATE` | Variable | SSM env payload (**backend container only** — compose injects it there and nowhere else) |

A DSN is a `vars` entry, not a secret, on purpose: it is a write-only ingest key
that gets inlined into the browser bundle and shipped to every visitor, so
masking it in CI logs would protect nothing. `SENTRY_AUTH_TOKEN` is the one real
credential — it can write releases and read source for the whole org.

Every Sentry build arg is passed unconditionally. Unset ones arrive as empty
strings, which `apps/web/env.ts` normalises back to "unset", so a deploy with no
Sentry configuration builds and ships unchanged.

## Verification

### Backend

Two development-only endpoints. `V1Module` imports `DiagnosticsModule` only when
`NODE_ENV=development`, so outside development the routes are **not registered
at all** and 404 — there is no auth check to misconfigure and no handler to
reach.

```bash
# Resolved state. Never echoes the DSN — dsnParsed is the part worth knowing.
curl http://localhost:3000/api/v1/diagnostics/sentry
# → { "enabled": true, "environment": "development", "release": "...", "dsnParsed": true }

# Real capture: throws a plain Error (not an HttpException) and lets it
# propagate uncaught, so it travels the exact path a real bug would —
# through SentryExceptionFilter, which captures it and renders the uniform 500.
curl -X POST http://localhost:3000/api/v1/diagnostics/sentry/test-error
# → 500 { "success": false, "error": { "code": "Error", "message": "Internal server error" } }
```

With Sentry on in development, boot also prints one line carrying the resolved
environment, release and the diagnostics URL.

**Do not verify production this way.** There is no shipped debug endpoint to
call. Use Sentry's own test-event feature in the project settings, or a
temporary safe throw path you remove afterwards.

### Web

`/sentry-diagnostics` — development only. The `notFound()` runs at build time
for a production build, so the page is never emitted rather than merely hidden.
It shows the resolved status (enabled / environment / DSN parsed) and a **Send
test error** button that exercises the real crash path.

The last-resort crash screen is `app/global-error.tsx`. It replaces the root
layout when rendering fails above it, and:

- captures the error **before first paint** (`useLayoutEffect`, ref-guarded so
  Strict Mode's double-invoke does not become two events);
- offers **Try again** (`reset()`) and **Go home**;
- renders a `Reference: <eventId>` line **only** when reporting is enabled. With
  Sentry off there is no event id, and an empty "Reference:" is worse than none
  because a user will try to quote it.

### Mobile

Build and run with the three defines, then confirm events arrive in the Sentry
dashboard. That is the only signal: the mobile app prints **no startup line and
no warning**, whether reporting is on, off, or half-configured. A build that
looks healthy but sends nothing is what a typo'd `SENTRY_DSN` define looks like.

There is **no diagnostics screen and no test-error button** in the mobile app.
`SentryFlutter` captures uncaught Dart errors and native crashes automatically;
to verify, add a temporary `throw` during manual testing, check the dashboard,
then remove it. Do not add a permanent debug route.

## Privacy defaults

`sendDefaultPii: false` on all three surfaces. Nothing is attached on the SDK's
own initiative — no IPs, no cookies, no headers. What reaches Sentry is only
what the scrubbers let through.

The deny-list is shared: `packages/observability` is the single source of truth,
mirrored for Dart by `redaction-manifest.json` (parity asserted by a test, so
the two cannot drift).

**Structured fields removed** (`REDACTED_FIELD_NAMES`): `authorization`,
`cookie`, `set-cookie`, `password`, `token`, `newPassword`, `currentPassword`,
`email`.

**Query parameters redacted** (`REDACTED_QUERY_PARAMS`, via `sanitizeLogUrl` /
`sanitizeLogQuery`): `token`, `code`, `secret`, `password`, `access_token`,
`refresh_token`, `id_token`, `state`. These cover Better Auth's
verification and password-reset links, which are `?token=…` URLs. Names are
matched case-insensitively wherever the parameter appears — not exempted by
route, because a path-based rule stops covering a route the moment someone adds
one.

On **backend and web**, scrubbing is applied in both `beforeSend` and
`beforeBreadcrumb`. Breadcrumbs are scrubbed as they are *recorded*, so a
credential never sits in the in-memory trail at all.

On **mobile**, scrubbing runs only in `beforeSend` (`_scrubEvent` in
`apps/mobile/lib/main.dart`), right before an event is sent — there is no
`beforeBreadcrumb` hook. Native breadcrumbs (app lifecycle, system events) stay
enabled at the SDK default, and HTTP breadcrumbs are absent entirely because
`sentry_dio` is not a dependency, so no request ever becomes a breadcrumb to
scrub in the first place.

The parsed `cookies` twin of the `cookie` header is dropped wholesale —
otherwise the value just removed comes back in a tidier shape.

Also on by default, deliberately:

- **No Session Replay.** The SDK is not imported anywhere.
- **Mobile**: `attachScreenshot: false` (a crash screenshot captures whatever
  was on screen), `attachViewHierarchy: false` (carries the text of every
  rendered widget). No `sentry_dio` dependency and no `SentryDioInterceptor`, so
  no request URL, header or body ever becomes a breadcrumb.
- **Mobile identity**: `user.id` only, set through a single sink in
  `auth_provider.dart` that follows every auth-state transition including sign
  out. `beforeSend` re-nulls `email`, `username` and `ipAddress` so no other
  code path can widen it.
- **Backend 500 bodies** carry only the exception's class name and a generic
  message. An unexpected exception's message may name a table, a file path or a
  connection string, so it is never surfaced to the client — the stack goes to
  the logger and to Sentry, not to the response.
- **Health check excluded from tracing** (`/api/v1/health`). Load balancers poll
  it continuously; it would dominate the trace quota carrying no diagnostic
  value.

## Source maps and symbols

Web source maps upload during the **production build only**, driven by
`withSentryConfig` in `apps/web/next.config.ts`:

- The auth token reaches the build as a BuildKit `--secret`, never a
  `--build-arg` (build args are recorded in image history).
- `sourcemaps.deleteSourcemapsAfterUpload: true` — `.map` files are emitted next
  to the client bundle, and `output: "standalone"` would copy them into the
  image where Next serves them from `/_next/static/`, publishing the unminified
  source of the whole app. Sentry only needs them at upload time.
- With no `SENTRY_AUTH_TOKEN` the plugin skips upload entirely and the build
  **still succeeds**, printing one line:
  `[sentry] SENTRY_AUTH_TOKEN is not set — skipping source-map upload; stack traces will stay minified.`
  A missing observability credential is not a reason to fail a contributor's
  build, but a production build that ships minified traces should not look
  identical to one that uploaded them.

**Mobile symbol upload is not implemented.** Android mapping files and iOS
dSYMs are not uploaded by any workflow, so mobile stack traces arrive
unsymbolicated. Wiring `sentry-cli` (or the Sentry Gradle/Xcode plugins) into
the mobile release job is tracked as follow-up work.

## Residual risks and accepted trade-offs

1. **`/monitoring` is a fixed, public tunnel route.** Browser events are POSTed
   same-origin and rewritten to Sentry's ingest endpoint, which keeps
   `connect-src 'self'` sufficient and stops ad blockers eating reports — at the
   cost of an unauthenticated endpoint that forwards to your Sentry project.
   Anyone who finds it can burn event quota. Accepted: the alternative is adding
   a Sentry origin to the CSP and losing most browser reports.
2. **Better Auth internal errors bypass the Nest filter chain.** Failures inside
   `/api/v1/auth/*` are handled by Better Auth itself and never reach
   `SentryExceptionFilter`, so they are not captured. Accepted as a phase-one
   gap.
3. **Mobile configuration is build-time only.** `--dart-define` values are
   compiled in, so there is no runtime kill switch — turning mobile reporting on
   or off requires a new build and a new release.
4. **Mobile symbol/mapping upload is backlog**, per the section above:
   unsymbolicated mobile traces until that CI work lands.
5. **Staging has no Sentry wiring.** Its compose file and workflow were left
   untouched, so staging crashes are not reported unless someone wires it
   manually.

## Official documentation

- [Sentry for Next.js — manual setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/)
- [Sentry for NestJS](https://docs.sentry.io/platforms/javascript/guides/nestjs/)
- [Sentry for Flutter](https://docs.sentry.io/platforms/dart/guides/flutter/)
