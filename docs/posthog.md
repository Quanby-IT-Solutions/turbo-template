# Product Analytics and Feature Flags (PostHog)

PostHog gives the template product analytics (pageviews, screen views, who signed in) and feature flags on all three apps. Like Sentry, it ships **off**: a clone without a PostHog project builds, boots and behaves exactly as if the SDKs were absent, and makes no request to PostHog.

## Scope

| App                      | Package           | What it does                                                                                                             |
| ------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Web (`apps/web`)         | `posthog-js`      | Pageviews on every App Router navigation, identify on sign-in, reset on sign-out, `useFeatureFlag()`                     |
| Backend (`apps/backend`) | `posthog-node`    | Feature flags through `FeatureFlagsService` and the `@FeatureFlag()` guard; one shared client for any server-side events |
| Mobile (`apps/mobile`)   | `posthog_flutter` | Screen views per route and per bottom tab, identify and reset tied to the auth provider, `featureFlagProvider`           |

Out of scope: session replay, surveys, experiments UI, dashboards, self-hosting PostHog.

## Enablement policy

Every app needs **both** an on switch **and** a project token. A switch without a token logs one warning and stays off; a token without the switch is a value parked for later and says nothing. Neither half alone is consent to start sending data.

| App     | Switch                               | Token                                  | Host (default)                                             |
| ------- | ------------------------------------ | -------------------------------------- | ---------------------------------------------------------- |
| Backend | `POSTHOG_ENABLED`                    | `POSTHOG_TOKEN`                        | `POSTHOG_HOST` (`https://us.i.posthog.com`)                |
| Web     | `NEXT_PUBLIC_POSTHOG_ENABLED`        | `NEXT_PUBLIC_POSTHOG_TOKEN`            | `NEXT_PUBLIC_POSTHOG_HOST` (`https://us.i.posthog.com`)    |
| Mobile  | `--dart-define=POSTHOG_ENABLED=true` | `--dart-define=POSTHOG_PROJECT_TOKEN=` | `--dart-define=POSTHOG_HOST=` (`https://us.i.posthog.com`) |

The project token (`phc_...`) is a public ingest key; it is still kept out of committed files. The backend also accepts an optional `POSTHOG_FEATURE_FLAGS_SECRET_KEY` (`phs_...`, a real secret) that switches flag evaluation from one PostHog request per check to local evaluation.

### Where it is wired

- Web: `instrumentation-client.ts` (starts the load), `core/lib/posthog-client.ts` (the only runtime import of `posthog-js`: downloaded and initialized on demand, never fetched while PostHog is off), `core/lib/posthog-config.ts` (gate and init options), `app/ingest/[...path]/route.ts` with `core/lib/posthog-proxy.ts` (the `/ingest` proxy), `services/analytics/` (identity), `core/hooks/use-feature-flag.ts`.
- Backend: `src/common/analytics/` (`AnalyticsModule`, `FeatureFlagsService`), `src/shared/decorators/feature-flag.decorator.ts` and `src/shared/guards/feature-flag.guard.ts`.
- Mobile: `lib/services/analytics/`, `lib/core/constants/posthog_constants.dart`, identity in `features/auth/presentation/providers/auth_provider.dart`.
- Shared: `scrubEventProperties` in `@repo/observability`.

## How the web proxy works

The browser SDK sends everything to `/ingest` on the app's own origin, so the CSP's `connect-src 'self'` covers it and ad blockers do not drop it. `/ingest` is a route handler, not a `next.config.ts` rewrite: a rewrite forwards the browser's headers, and behind the single-origin Nginx proxy those include the session cookie. The handler builds a fresh request with only the body, content type, user agent and `x-forwarded-for`, never forwards a cookie or authorization header, strips any `set-cookie` from PostHog's reply, and only talks to an `https` `*.i.posthog.com` host. With analytics off, every `/ingest` path answers 404.

## Identity

- Distinct id is the Better Auth user id. No email, name or other person property is sent.
- Person profiles exist only for signed-in users (`identified_only`); anonymous use stays anonymous.
- **No previous user's identity survives into another session.** Sign-out resets before it navigates, so the page it lands on records an anonymous view. A different user signing in on the same browser or device is reset first, then identified.
- Web resets only when the browser was identified (a small `analytics-identified` marker in localStorage), so anonymous visitors keep one id across pages. Mobile resets on every signed-out start, which also covers an expired session on a shared phone.

## Feature flags

A flag is on only when PostHog positively says so. Analytics off, PostHog down, slow or erroring, or an unknown flag: all read as off. A flag can only add behaviour, and an outage can only take it away.

| Where   | How                                                                                                                   | Example                                                        |
| ------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Web     | `useFeatureFlag("key")`; re-renders when flags load                                                                   | `template-preview` shows a Preview badge on `/examples/todos`  |
| Backend | `@FeatureFlag("key")` on a signed-in handler; off answers 404. Or inject `FeatureFlagsService.isEnabled(key, userId)` | `template-preview` gates `GET /api/v1/example/feature-preview` |
| Mobile  | `ref.watch(featureFlagProvider("key"))`; re-reads when flags load                                                     | `mobile-preview` shows a Preview section in Settings           |

Backend flag checks never wait longer than 1500 ms. A timeout or error is logged once per flag (never with the user id) and reads as off.

## Privacy defaults

- `before_send` on web and backend (and the Dart twin on mobile) drops every key on the `@repo/observability` deny-list (the list the request logger and Sentry use) at any depth, and redacts credential query parameters (`?token=`) in URL properties such as `$current_url` and `$referrer`.
- No click autocapture on web: it records the visible text of whatever is clicked, which can be an email on screen, and the scrub only sees property names. Capture named events instead (`posthog.capture("todo_created")`).
- The web `before_send` keeps PostHog's own `token` property (the public project key, which posthog-js requires on every event) while a `token` anywhere inside app data is still removed.
- No session replay, no surveys, no scripts loaded from PostHog at runtime (`disable_external_dependency_loading`), and `defaults` pinned to a date so an SDK upgrade cannot quietly change what is captured.
- Project settings on the Quanby PostHog project (set in PostHog, not in code): **Discard client IP data** is on, and a **Drop precise location** transformation runs after GeoIP and nulls postal code, latitude, longitude and accuracy radius. Country, region and city are kept.

## Verification

- Off: boot web and backend with no PostHog env. No `PostHog` log line, no connection to `*.posthog.com`, `/ingest/*` answers 404, `GET /api/v1/example/feature-preview` answers 404 when signed in.
- On: set the env above, sign in on web. A `$pageview` and an `$identify` under the user id appear in PostHog's activity view. Turn `template-preview` to 100%: the badge appears after a reload and the example route answers 200.
- Outage: point `POSTHOG_HOST` at an address that never answers. The example route answers 404 within about 1.5 s; other routes are unaffected.

## Residual risks and accepted trade-offs

- Web identity relies on a localStorage marker. With storage disabled (some private modes) a signed-out page cannot tell that a reset is due; sign-out itself still resets.
- A session-service outage reads as signed out, so an identified browser resets and re-identifies when the session returns.
- The example flags (`template-preview`, `mobile-preview`) are demos. A project built from the template should replace them with its own.

## Official documentation

- PostHog Next.js: https://posthog.com/docs/libraries/next-js
- PostHog Node.js: https://posthog.com/docs/libraries/node
- PostHog Flutter: https://posthog.com/docs/libraries/flutter
- Reverse proxy: https://posthog.com/docs/advanced/proxy
