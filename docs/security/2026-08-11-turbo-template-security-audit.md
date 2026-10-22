> These records are summarised for a public repo. They keep what was found, what changed, and where, without internal finding ids or step-by-step misuse.

Turbo Template — Pre-Production Security Audit
Audit date: 11 August 2026 · Scope: Git-tracked tree only · Mode: READ-ONLY (no file written, no command that mutates the working tree)

1. Executive Summary
Production assessment: NO-GO
Nine High-severity, repository-remediable findings have code-supported impact. At least three require no exotic preconditions: any authenticated user can read every support ticket's PII; the throttle key could be influenced by request headers; and a working authentication secret is checked into the repository as a functional default.

This verdict is based solely on findings fixable by changing files in this repository. No cloud, IAM, WAF, DNS, or third-party defect contributed to it.

Path to CONDITIONAL GO — remediate ungated ticket reads, client-controlled rate-limit keys, the shipped signing secret, the shared browser cache, the fixed Admin seed password, and the stray dependency. These six are small, well-scoped changes (one is a single deleted line) and together remove every High with a low-precondition impact. credential logging, the unpinned staging host key, and the unpinned CI workflow may then be scheduled inside 30 days with compensating controls.

Top five risks
#	Finding	Why it ranks here
1	ungated ticket reads — All support-ticket PII readable by any authenticated user	Lowest-precondition data breach in the audit: any authenticated user can read every reporter's name, email, subject, and free-text concern. Two-line fix.
2	the shipped signing secret — Working BETTER_AUTH_SECRET in .env.example, no strength validation	A public template ships a functional signing secret. An operator who follows the documented setup and misses one line enables untrustworthy sessions for any account, including Admin.
3	client-controlled rate-limit keys — the throttle key could be influenced by request headers	Rate limiting is the only abuse control on mutation endpoints. Fixed by setting the forwarded header from the connection address and TRUST_PROXY equal to the hop count. Amplifies four other findings.
4	the shared browser cache — Authenticated data persisted to IndexedDB, never cleared on sign-out	A full day of cached data — including the complete user directory with emails — survives sign-out under one shared, user-agnostic key and is restored for the next person on that browser profile.
5	the stray dependency — packages/contracts depends on the wrong orpc package	An abandoned 2018 package with a live caret range and a dormant maintainer, pulling a deprecated Socket.IO stack. Unused by any source file. One deleted line removes it and every deprecated transitive dependency.
Scope and coverage
Enumerated: 19 oRPC routes across 5 modules, mapped contract → controller → service; Better Auth's Express-mounted surface (which does not enter the NestJS pipeline); 1 Next.js route handler; 6 Flutter API endpoints; 5 GitHub Actions workflows; 3 Dockerfiles; 3 Compose files; 1 Nginx config; 3 database migrations verified line-by-line against the schema.

Confirmed early and load-bearing: @thallesp/nestjs-better-auth v2.2.0 registers a global AuthGuard; app.module.ts:58 omits disableGlobalAuthGuard, so every route is authenticated unless it carries @AllowAnonymous(). Three provisional findings were re-graded against this.

Not fully covered: the CI quality gate is an external reusable workflow pinned to @main (the unpinned CI workflow) and could not be read — this audit cannot confirm that CI runs lint, typecheck, or any test. node_modules is absent, so better-auth and @thallesp/nestjs-better-auth internals were unreadable; three findings are held at reduced confidence as a result (an unvalidated cookie domain, verification not required, unpinned cookie attributes). Deployed artifacts differ from the repository: production Compose is stored in SSM and pulled at boot.

Areas marked N/A (capability absent, with search evidence)
A single repository-wide regex across *.{ts,tsx,dart,json,yml,yaml,mjs,js,md,conf} established the following. All matches outside docs/security-audit-prompt.md (the audit brief itself) are noted.

Capability	Verdict	Evidence
Payments / Stripe, Wallet, KYC, Notarization	N/A	Zero hits outside the brief
File upload	N/A	multer@2.0.2 present only as a transitive of @nestjs/platform-express (pnpm-lock.yaml:10818). No FileInterceptor, no @UploadedFile
S3 / AWS object storage	N/A	@aws-sdk/client-rds-data appears only as an optional peer of drizzle-orm (pnpm-lock.yaml:5275, 5311) — not installed, not imported
LiveKit, Webhooks, AI/LLM	N/A	Zero hits
WebSockets / Socket.IO application code	N/A	socket.io@2.5.1 exists only under the stray orpc@0.1.1 (the stray dependency). No WebSocketGateway, no @nestjs/websockets in any manifest. Per the brief, the Nginx upgrade headers at nginx.conf:41-42 are not treated as evidence
Server Actions	N/A	Zero "use server" matches in apps/web
iOS platform configuration	N/A — untracked	No apps/mobile/ios/ directory exists. ATS, entitlements, and Keychain accessibility unassessable
MFA	Not assessed	Per instruction, absence not reported
Dependency-audit limitations
pnpm audit was NOT run. node_modules is absent from this workspace, so the command would first resolve the dependency graph and can rewrite pnpm-lock.yaml when lockfile and manifests disagree. Without shell access I could not verify git status --porcelain before and after, which the read-only constraint requires. All npm advisory analysis is derived from deprecated: annotations already present in the checked-in pnpm-lock.yaml. A CVE affecting a non-deprecated package would not appear in this report.

No Flutter/Dart advisory database was consulted. Dart has no pub audit equivalent; OSV.dev's Pub feed has materially thinner coverage than npm's. The 17 direct dependencies in apps/mobile/pubspec.yaml:14-59 have not been checked for known vulnerabilities. This is a genuine coverage gap, not an assurance of safety.

2. Findings Table
ID	Severity	Area	File:Line	Issue	Fix	Confidence (High/Medium/Low)
ungated ticket reads	High	2	apps/backend/src/modules/v1/tickets/tickets.controller.ts:14,21; tickets.service.ts:14-24	Ticket read endpoints have no @RequirePermissions and no scoping — all reporter PII to any authenticated user	Add permission guard or owner-scope the query	High
client-controlled rate-limit keys	High	4, 12	apps/backend/src/shared/guards/throttler-proxy.guard.ts:15; nginx/nginx.conf:28,39	Throttle key could be influenced by request headers	Set the forwarded header from the connection address; TRUST_PROXY equals the hop count	High
the shipped signing secret	High	1, 10	apps/backend/.env.example:21; packages/auth/src/config.ts:26; apps/backend/src/config/env.config.ts:38	Functional default auth secret shipped; validation is presence-only	Placeholder + .min(32) + reject known default	Medium
the shared browser cache	High	6, 7	apps/web/services/tanstack-query/provider.tsx:31-37; query-client.ts:27-32,58; features/auth/api/session.hooks.ts:52-57	All queries persisted to one shared IndexedDB key; sign-out invalidates only ["session"]	Exclude sensitive keys; queryClient.clear() + persister purge	High
credential logging	High	1, 8, 9	apps/mobile/lib/features/auth/data/auth_repository.dart:52-57,81-86,115-120; packages/auth/src/mailer/send-mail.ts:34; apps/backend/src/config/pino-logger.config.ts:36-42	Session tokens, reset links, and PII written to unredacted logs on three independent paths	Gate on build mode; extend Pino redaction	High
the fixed Admin seed password	High	9, 12	packages/db/src/seed.ts:50,55-62,199,307; packages/db/package.json:44	Seed provisions pre-verified Admin with a fixed password, prints it, resets on re-run, no env guard	Refuse in production; random/env password	Medium
the unpinned staging host key	High	12	.github/workflows/deploy-staging.yml:130,138-152	Host key is not pinned, and the deploy script can expand values on the runner	Pin the host key; pass values through literally; fix the web image variable at line 140	High
the stray dependency	High	11	packages/contracts/package.json:26; pnpm-lock.yaml:560-564,7231	Wrong/abandoned orpc@0.1.1 dependency pulls deprecated Socket.IO stack	Delete the dependency line	High
the unpinned CI workflow	High	11, 12	.github/workflows/ci.yml:13-14	Entire CI gate is external @main ref with secrets: inherit	Pin to SHA; scope secrets explicitly	Medium
the Admin self-grant	Medium	2	apps/backend/src/modules/v1/rbac/rbac.controller.ts:78-85; rbac.service.ts:94-104	users:manage can grant self Admin — privilege tier collapse	Reject Admin grant unless caller holds it	High
unowned todo updates	Medium	2	apps/backend/src/modules/v1/examples/todos/todos.service.ts:44-63	Update/delete filter on id only — capability check, not ownership	Add eq(todos.authorId, session.user.id)	High
missing security headers	Medium	5, 6, 12	apps/web/next.config.ts:10-31; apps/backend/src/bootstrap.ts; nginx/nginx.conf:12-44	No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy at any layer	headers() + helmet() + add_header	High
global idempotency keys	Medium	4	packages/db/src/schema.ts:122-127; idempotency.interceptor.ts:56-57,81-92	Idempotency keys globally unique, unvalidated, unbounded, never expired	Composite (authorId,key) PK; length cap; TTL	High
unbounded request bodies	Medium	4, 12	apps/backend/src/config/app.config.ts:15-16; nginx/nginx.conf	No explicit body-size limit; no Nginx client_max_body_size or timeouts	Set limit on parsers; add Nginx directives	High
the commented-out TLS block	Medium	5, 12	nginx/nginx.conf:23,34,51-86	TLS block entirely commented out; upstreams use host.docker.internal, not service names	Ship TLS config; fix upstreams	High
validation skipped in CI	Medium	10	apps/backend/src/config/env.config.ts:46; packages/auth/src/config.ts:52; apps/web/env.ts:62	skipValidation triggers on CI, disabling env validation exactly where it would help	Explicit SKIP_ENV_VALIDATION opt-out	High
the missing audit trail	Medium	9	packages/db/src/schema.ts:133-177; rbac-admin.service.ts:71-197	No audit trail for RBAC mutations; docs/TICKETS.md:44 specifies one	Append-only audit_log written in-transaction	High
distinguishable reset errors	Medium	1	packages/auth/src/config.ts:150-162 vs :127-144; forgot-password.hooks.ts:26-28	Forgot-password responses and UI state must be identical whether or not the account exists, including when mail delivery fails	Mirror the try/catch + APIError	Medium
paused-mutation replay	Medium	7	provider.tsx:93-96; query-client.ts:34-36; todos.hooks.ts:207	Paused mutations replay under whichever session is active at reconnect	Record queueing user id; abort on mismatch	Medium
cached token URLs	Medium	6, 7	app/(auth)/reset-password/page.tsx:6-13; app/sw.ts:35,40-49	Reset/verification tokens in URLs are SW-cacheable and referrer-exposed	NetworkOnly matcher + Referrer-Policy	Medium
a framable admin UI	Medium	5, 6	apps/web/next.config.ts:10-31; user-management/page.tsx	RBAC admin UI framable; framed clicks reach role-assignment (see the Admin self-grant)	frame-ancestors 'none'	Medium
ignored type errors	Medium	6, 12	apps/web/next.config.ts:25	typescript.ignoreBuildErrors: true — type errors in permission logic ship silently	Remove flag	High
the duplicated mobile cookie	Medium	8	apps/mobile/lib/services/api/api_client.dart:47-65	Cookie duplicated into secure storage, malformed on re-serialisation, unscoped, overwrites CookieManager	Delete the manual interceptor	Medium
cleartext mobile traffic	Medium	8	android/app/src/main/AndroidManifest.xml:19; api_constants.dart:7	usesCleartextTraffic="true" in the release manifest; non-TLS fallback URL	Move to debug manifest; fail on missing URL	High
secrets written to disk on deploy	Medium	10, 12	.github/workflows/deploy-production.yml:196-220	Secret material can remain on the runner; cleanup is not guaranteed; no permissions	Pass secrets with no file on the runner; fail the step on error	High
unpinned actions	Medium	12	All five workflows	No action SHA-pinned; CI and both deploys declare no permissions	Pin to SHAs; add least-privilege blocks	High
a broad build-cache restore	Medium	12	deploy-production.yml:117-123; deploy-staging.yml:86-91	Broad buildx cache restore-keys restorable across refs	Content-hash key; narrow restore	Medium
the unpinned postinstall	Medium	11	package.json:30-31	postinstall shells out to pnpm dlx sherif@latest — unpinned remote execution on every install	Pin as devDependency; drop from postinstall	High
the unbounded concern field	Low	3	packages/contracts/src/modules/v1/tickets/tickets.schema.ts:15	concern has .min(1) but no .max() — only unbounded string in the schema set	Add .max(5000)	High
tickets without an author	Low	2, 3	tickets.service.ts:26-39; tickets.controller.ts:28-34	ticket.submit never records authorId despite requiring auth	Thread session.user.id into insert	High
last-Admin removal	Low	2	apps/backend/src/common/rbac/rbac.service.ts:106-118	No last-Admin protection on role removal; a check-then-write race between concurrent requests	Count-in-transaction guard	High
untrimmed origin lists	Low	1, 5	packages/auth/src/config.ts:171; apps/backend/src/config/app.config.ts:29	Origin allowlists split without .trim()/.filter(Boolean)	Trim and filter both	High
an unvalidated cookie domain	Low	1	packages/auth/src/config.ts:28,172-179	Any value for BETTER_AUTH_COOKIE_DOMAIN enables cross-subdomain cookies, unvalidated	Validate hostname; unset by default	Medium
the ungated API reference	Low	1, 5	packages/auth/src/config.ts:180-184	Better Auth openAPI({path:"/reference"}) registered with no env gate	Conditional registration	High
the always-on Google provider	Low	1	packages/auth/src/config.ts:31-32,164-170	Google provider always registered; as string launders undefined	Register only when both vars present	High
a verbose health response	Low	5	apps/backend/src/modules/v1/health/health.service.ts:16-17,43	Unauthenticated health leaks env, version, uptime, and raw DB error text	Generic message; gate metadata	High
verbatim request ids	Low	5	apps/backend/src/config/pino-logger.config.ts:53-63	Inbound X-Request-Id accepted verbatim, logged and reflected	Validate UUID / cap length	High
process-local limits	Low	2, 4, 12	app.module.ts:40-41; rbac-cache.service.ts:14-18; docker-compose.production.yml:1-14	In-memory throttler and RBAC cache in an ASG topology — limits multiply, revocation is per-instance	Shared Redis store	High
RBAC writes without idempotency	Low	4	apps/backend/src/modules/v1/rbac/rbac.controller.ts	No RBAC write applies IdempotencyInterceptor, unlike every todo write	Apply interceptor consistently	High
unpruned verification rows	Low	9	packages/db/src/schema.ts:61-75	verifications rows never cleaned up; no index on expires_at	Scheduled delete + index	High
the example database credential	Low	10	packages/db/.env.example:6	Working database credential with no warning comment	Placeholder + comment	High
the bundled mobile env file	Low	8, 10	apps/mobile/pubspec.yaml:78-79	.env bundled as a Flutter asset — cleartext inside the APK	Warn in example; prefer --dart-define	High
a cookie jar kept after sign-out	Low	8	auth_repository.dart:98-105; api_client.dart:41-43	Sign-out clears secure storage but PersistCookieJar is unreachable and unpurged	Expose jar via provider; deleteAll()	High
debug signing on release	Low	8	android/app/build.gradle.kts:24,33-39	Release signed with debug keystore; com.example.mobile appId	Real signing config; unique appId	High
raw mobile error text	Low	8	login_screen.dart:48-57	Non-Dio exceptions rendered via error.toString(); Dio messages embed host/port	Map to fixed user-facing strings	Medium
the mismatched password minimum	Low	1, 8	login_screen.dart:175-177 vs register.schema.ts:6	Mobile enforces 6-char minimum, web 8	Align on server minimum	High
unused mobile permissions	Low	8	AndroidManifest.xml:10,13,15-19	SCHEDULE_EXACT_ALARM/RECEIVE_BOOT_COMPLETED unused; allowBackup defaults true	Remove permissions; allowBackup="false"	High
offline fallback on authenticated routes	Low	7	app/sw.ts:40-49	Offline fallback served for authenticated navigations	Exclude authenticated routes	High
mid-session service-worker claim	Low	7	app/sw.ts:26-27; serwist-provider.tsx:19-22	skipWaiting+clientsClaim mid-session claim; unregister path is dev-only	Consider prompted update; add prod recovery	Medium
the third-party connectivity probe	Low	7	features/pwa/lib/use-online-status.ts:9,73	15-second probe to gstatic.com leaks IP and session duration to a third party	Probe /api/v1/health	High
full email-directory reads	Low	3	packages/contracts/src/modules/v1/rbac/rbac.schema.ts:63-68	users:read yields the full email directory	Finer-grained PII permission	Medium
the unused root Dockerfile	Low	12	Docker12-45	Unused root Dockerfile ships full source + dev deps, no healthcheck	Delete or mark as example	High
the beta ORM in production	Low	11	packages/db/package.json:58; pnpm-workspace.yaml:26	drizzle-orm/drizzle-kit beta in production runtime	Track for 1.0	High
missing regression tests	Low	12	apps/backend/package.json:109-117; apps/backend/test/app.e2e-spec.ts:32	No ownership/idempotency/cache-isolation tests; e2e targets a non-existent path	Add tests; fix path	High
a contract that marks session routes public	Info	3	tickets.contract.ts:18,48	Contract declares security: [] but runtime requires a session — OpenAPI misleads integrators	Align spec with runtime	High
unpinned session lifetime	Info	1	packages/auth/src/config.ts:88-185	No explicit session expiresIn/rotation/revocation config — library defaults unpinned	Pin explicitly	Medium
a non-boundary auth path match	Info	1	apps/backend/src/config/auth.config.ts:25-35	startsWith match swallows any /api/v1/auth* path	Match on prefix boundary	High
verification not required	Info	1	apps/backend/.env.example:63; packages/auth/src/config.ts:45	Verification not required by default; accountLinking unconfigured	Configure explicitly	Low
unpinned cookie attributes	Info	1, 5, 6	packages/auth/src/config.ts:172-179	CSRF posture unresolved — SameSite value not verifiable from tracked files	Pin cookie attributes explicitly	Low
the open backend bind	Info	12	docker-compose.production.yml:24,44	Backend binds 0.0.0.0:3000 with no proxy in the deploy topology — external dependency / residual risk	Confirm security-group filtering	High
credential-shaped placeholders	Info	10	README.md:335,405,411,414	Credential-shaped documentation placeholders will trigger secret scanners	Use <angle-bracket> placeholders	High
the mock ticket form	Info	6	app/(site)/submit-ticket/page.tsx:62-65	Form discards input and reports success — functional trap for adopters	Wire to the API or label as mock	High
3. Detailed Findings
HIGH
ungated ticket reads — All support-ticket PII readable by any authenticated user
Severity: High · Confidence: High · Areas 2, 9

Affected: apps/backend/src/modules/v1/tickets/tickets.controller.ts:14-19, 21-26 · tickets.service.ts:14-17, 19-24 · packages/contracts/src/modules/v1/tickets/tickets.schema.ts:9-24

Evidence. Ticket reads in `tickets.controller.ts` carry no permission metadata, and `tickets.service.ts` does not scope list or get to the caller. `rbac.guard.ts` allows the request when no permission metadata is present. The response includes name, email, subject, and concern. Sibling handlers in `RbacController` require a permission. The rule is a permission gate or an owner scope on ticket reads.

Impact. Complete disclosure of the support-ticket corpus, which the audit brief classifies as sensitive.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Root cause. The tickets module was written without RBAC decorators while every neighbouring module received them.

Remediation (illustrative — not applied).


@RequirePermissions("users:read")   // or a new tickets:read permission
@Implement(v1.ticket.list)
async listTickets() { ... }
For per-user access instead, scope the query: .where(eq(tickets.authorId, session.user.id)) — but note this requires tickets without an author first, since authorId is never populated.

Verification. A session without the ticket permission receives 403 on ticket reads.

Residual risk. Anonymous tickets have authorId = null (schema.ts:113), so owner-scoping alone leaves them unreachable by their reporter; a staff permission is needed regardless.

client-controlled rate-limit keys — the throttle key could be influenced by request headers
Severity: High · Confidence: High · Areas 4, 12 (merged with Nginx has no body limit, no timeouts, no security headers, and TLS is entirely commented out)

Affected: apps/backend/src/shared/guards/throttler-proxy.guard.ts:15 · apps/backend/src/bootstrap.ts:40 · apps/backend/src/config/env.config.ts:32 · nginx/nginx.conf:28, 39 · docker-compose.production.yml:44

Evidence. The throttle key in `throttler-proxy.guard.ts` could be influenced by request headers. `nginx/nginx.conf` did not set the forwarded header from the connection address, and `TRUST_PROXY` in `env.config.ts` did not equal the hop count. Guard tests cover extraction (`throttler-proxy.guard.spec.ts`) and do not cover the trust boundary. Fixed by setting the forwarded header from the connection address and `TRUST_PROXY` equal to the hop count.

Impact. Rate limiting is the only abuse control on every mutation endpoint. A key that is not per client amplifies global idempotency keys (unbounded key growth), unbounded request bodies (no body limit), the unbounded concern field (unbounded concern), and the unpaginated list endpoints.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Mitigating note. Auth endpoints are unaffected — they short-circuit to Better Auth's own limiter (packages/auth/src/config.ts:101-105) before Nest, so credential guessing remains separately limited.

Remediation (illustrative). Set the forwarded header from the connection address in `nginx/nginx.conf`. Set `TRUST_PROXY` equal to the hop count in `env.config.ts` (0 when the app is directly exposed). Derive the throttle key in `throttler-proxy.guard.ts` only from that trusted hop. Change the tracker and the hop count together.

Verification. Repeated requests from one client are limited; the limit holds.

Residual risk. Correct hop count depends on deployed topology — external dependency for the ALB layer. Binding the key to the trusted hop is fully repository-remediable.

the shipped signing secret — Working default BETTER_AUTH_SECRET with no strength validation
Severity: High · Confidence: Medium · Areas 1, 10

Affected: apps/backend/.env.example:21 · packages/auth/src/config.ts:26, 100 · apps/backend/src/config/env.config.ts:38 · both skipValidation lines (validation skipped in CI)

Evidence. `apps/backend/.env.example` ships a syntactically valid `BETTER_AUTH_SECRET` rather than a placeholder. Both Zod validators (`packages/auth/src/config.ts`, `apps/backend/src/config/env.config.ts`) accept any string: no minimum length and no rejection of a known placeholder. Sibling variables in the same file use obvious placeholders. The rule is a non-functional placeholder, a minimum length, and rejection of known placeholders.

Impact. Complete authentication skip if the default survives to deployment.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Root cause. A usable default is checked in, and secret validation is presence-only.

Remediation (illustrative).


Require a minimum length of 32 and reject known template placeholders in both `BETTER_AUTH_SECRET` schemas. Replace `.env.example` with a non-functional placeholder and keep the documented generation hint (`openssl rand -base64 32`, already at README.md:415).

Verification. Boot fails for the example value. Boot succeeds for a secret that meets the length rule.

Residual risk. Operators can still supply a weak-but-long secret. Secret distribution is external; the checked-in default and missing validator are fully repository-remediable — which is why this is graded rather than deferred. Confidence is Medium because reaching production requires operator omission.

the shared browser cache — Authenticated data persisted to IndexedDB under one shared key, never cleared on sign-out
Severity: High · Confidence: High · Areas 1, 6, 7 (merged: Sign-out invalidates only the session query, leaving other authenticated data cached + Authenticated data persists to IndexedDB under one shared key and is never cleared on sign-out)

Affected: apps/web/services/tanstack-query/provider.tsx:31-37 · services/tanstack-query/query-client.ts:27-32, 52, 58 · features/auth/api/session.hooks.ts:13, 52-57 · features/user-management/api/rbac.hooks.ts:56, 78 · features/pwa/components/serwist-provider.tsx:19-22, 39-45

Evidence. `provider.tsx` persists queries under one shared browser key with no per-user boundary and no age limit. `query-client.ts` persists every query, including session and administration data, for 24 hours. Sign-out in `session.hooks.ts` does not clear that store, and the only clear path (`serwist-provider.tsx`) is gated to non-production. The rule is a per-user key, sensitive queries excluded from persistence, and a full clear on sign-out.

Impact. Cross-user disclosure of authenticated data, including an administrative user directory, on any shared browser profile.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Root cause. Persistence was configured for offline capability without a per-identity cache boundary or a sign-out purge.

Remediation (illustrative).


// query-client.ts — exclude sensitive query roots from persistence
export function shouldDehydrateQuery(query) {
  const root = (query.queryKey?.[0] as string) ?? ""
  if (root === "session" || root === "rbac") return false
  return defaultShouldDehydrateQuery(query) || query.state.status === "pending"
}

// session.hooks.ts — purge on sign-out
onSuccess: async () => { queryClient.clear(); await persister.removeClient(); ... }
Also pass maxAge and a per-user key to the persister.

Verification. After sign-out, the shared browser store holds no previous account data.

Residual risk. Even with a purge, data written during the session sits on disk until the purge runs; excluding sensitive keys from persistence entirely is the stronger control.

credential logging — Unredacted credential logging across three independent paths
Severity: High · Confidence: High · Areas 1, 8, 9 (merged: Mailer silently fails open to a console transport, printing reset and verification tokens + Session tokens and cookies written to device logs on every auth call + Pino redaction misses reset tokens, emails, and ticket content)

Affected:

Mobile (High): apps/mobile/lib/features/auth/data/auth_repository.dart:31-32, 52-57, 81-86, 115-120
Backend SMTP (Medium): packages/auth/src/mailer/transport-factory.ts:24, 40-44 · send-mail.ts:33-35 · packages/auth/src/config.ts:35, 115, 151
Pino gaps (Medium): apps/backend/src/config/pino-logger.config.ts:36-42, 64-66
Evidence. Three logging paths, and only one redacts. Mobile `auth_repository.dart` writes full auth response bodies with no debug-only gate, and that log is not removed from release builds. `packages/auth/src/mailer` can write the full outbound message, including reset and verification links, when mail is not configured, and that path does not use Pino. Pino (`pino-logger.config.ts`) redacts some credential headers and still omits token, new-password, and email fields, and it logs the request URL. The rule is: release builds and production mail log no credentials, and redaction covers those fields and query values.
Impact. Session tokens, single-use reset tokens, and PII reach log sinks in plaintext.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Root cause. Debug instrumentation left in a shared template with no release gate, plus a development convenience that fails open rather than closed.

Remediation (illustrative).


if (kDebugMode) developer.log('signIn status=${response.statusCode}', name: 'AuthRepository');

if (!opts.smtpHost) {
  if (process.env.NODE_ENV === "production") throw new Error("SMTP_HOST is required in production")
  // dev-only console transport
}
Extend Pino redact.paths with req.body.token, req.body.newPassword, req.body.email, req.query.token.

Verification. A release mobile build's device log contains no token or email. Production boot fails when mail is not configured.

Residual risk. Log retention and third-party SDK capture remain external. Note the Pino sub-claim about req.body.token is Medium confidence: auth routes short-circuit before express.json(), so Pino may see no parsed body on exactly those routes.

the fixed Admin seed password — Seed script provisions a hardcoded Admin account with no environment guard
Severity: High · Confidence: Medium · Areas 9, 12

Affected: packages/db/src/seed.ts:41-45, 50-51, 55-62, 152-159, 199, 213-236, 307 · packages/db/package.json:44 · package.json:18

Evidence. `packages/db/src/seed.ts` creates a pre-verified Admin and can reset that password on re-run. The Admin role short-circuits permission checks (`rbac.service.ts`). The seed prints the credential and does not refuse a production database. The rule is: refuse a production seed unless explicitly allowed, and take the password from the environment or a random value.

Can it reach production? No workflow invokes it — neither deploy workflow nor either Dockerfile runs db:seed. But packages/db/package.json:44 defines "seed": "... && pnpm push && tsx src/seed.ts", so pnpm db:seed silently runs drizzle-kit push first. A developer with a production DATABASE_URL in their shell performs a schema push and an admin-credential reset in one command with no warning.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Remediation (illustrative).


if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
  throw new Error("Refusing to seed a production database")
}
const seedPassword = process.env.SEED_PASSWORD ?? randomBytes(18).toString("base64url")
Decouple pnpm push from pnpm seed so schema mutation is explicit.

Verification. In production, the seed exits without changing the database.

Residual risk. Confidence is Medium because reaching production requires operator action; the unguarded destructive script with fixed credentials is unambiguous and repository-remediable.

the unpinned staging host key — Staging deploy does not pin the host key, and the deploy script can expand values on the runner
Severity: High · Confidence: High · Area 12

Affected: .github/workflows/deploy-staging.yml:125-126, 130, 138-152, 155-157 · line 140 specifically

Evidence. Three rules are missed in `.github/workflows/deploy-staging.yml`. (1) The SSH step does not pin the host key, so the deploy is not bound to a known host. (2) Line 140 names the web image from the backend repository variable, so the web service does not receive the web image. (3) The deploy script is not passed through literally, so the runner can expand values before they are sent. The rule is: pin the host key, name the web image variable from the web repository at line 140, and pass values through literally.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Remediation. Pin the host key and follow the production pattern of letting the instance pull secrets. Fix the web image variable at line 140 so it names the web repository. Pass the deploy script through literally so the runner does not expand values.

Verification. A deploy to a host whose key is not pinned fails.

Residual risk. Instance-side secret handling after SSM retrieval remains external.

the stray dependency — packages/contracts depends on the wrong orpc package
Severity: High · Confidence: High · Area 11

Affected: packages/contracts/package.json:26 · pnpm-lock.yaml:560-564, 7231-7237, 15669-15675 · deprecated transitives at :5117-5121 (debug@4.1.1, ReDoS) and :8697-8701 (uuid@3.4.0)

Evidence. The real oRPC packages are scoped @orpc/* and are correctly declared in the catalog (pnpm-workspace.yaml:11-12). The bare orpc name is an unrelated, abandoned 2018 package. No file imports it — zero from "orpc" matches repo-wide. It is dead weight that nonetheless materialises socket.io@2.5.1, socket.io-client@2.5.0, engine.io@3.6.2, and two packages the registry itself flags as deprecated.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Remediation. Delete line 26 from packages/contracts/package.json and refresh the lockfile in a normal workflow.

Verification. The lockfile has no socket.io entry, and build and typecheck still pass.

Residual risk. None once removed. Highest value-to-effort ratio in the audit: one deleted line also clears every deprecated package from the graph.

the unpinned CI workflow — CI gate is an external workflow on a mutable ref with secrets: inherit
Severity: High · Confidence: Medium · Areas 11, 12

Affected: .github/workflows/ci.yml:13-14 · deploy-production.yml:26, 30 · deploy-staging.yml:23, 27

Evidence. `.github/workflows/ci.yml` calls the external quality gate on a mutable `@main` ref. `secrets: inherit` passes every repository secret into that workflow. The rule is a pinned commit SHA and an explicit secret map limited to what the gate requires.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Second-order consequence. Because the gate is unreadable here, this audit cannot verify that CI runs lint, typecheck, or any test.

Remediation. Pin to a 40-character commit SHA; replace secrets: inherit with an explicit secrets: map listing only what the gate requires.

Verification. The workflow reference is a commit SHA, and the gate still succeeds with an explicit secret map.

Residual risk. Confidence Medium — the external workflow's current contents are unknown. The pinning and scoping weakness is fully verifiable from ci.yml alone.

MEDIUM
the Admin self-grant — users:manage permits self-escalation to Admin. rbac.controller.ts:78-85, rbac-admin.service.ts:189-192, rbac.service.ts:94-104, rbac-admin.service.ts:115-140. Admin is protected from renaming (:92-94) and deletion (:145-147) but not from being granted. assignUserRole accepts any userId (including the caller's) and any roleName (including "Admin"). The rule is: reject Admin grants unless the caller holds Admin, and reject permission edits on a role the caller holds. Impact: users:manage is de facto Admin — the intended delegated-admin tier does not exist. No seeded non-Admin role currently holds users:manage, so this is latent until an operator creates one, which the UI fully supports. Outcome: a caller who does not hold Admin cannot grant it. Residual: audit trail still absent (the missing audit trail).

unowned todo updates — Todo update/delete are capability-gated but not ownership-scoped. todos.service.ts:44-57, 59-63; handlers take no @Session() (todos.controller.ts:50, 60). create correctly threads session.user.id (:42), proving the concept is understood. Any holder of posts:edit/posts:delete can mutate any user's todo by ID; the seeded Manager role holds posts:* (seed.ts:193), which the wildcard matcher expands to both. Not elevated because this is the examples/ module — no PII, excluded from coverage (package.json:117). Its real risk is as the template's only CRUD reference, which downstream projects will copy onto real data. Fix: scope update and delete to the session author. Outcome: a caller cannot change another caller's todo.

missing security headers — Security headers absent at all three layers. apps/web/next.config.ts:10-31 (no headers()), apps/backend/src/bootstrap.ts (no helmet; helmet absent from the manifest), nginx/nginx.conf:12-44 (no add_header). No CSP, HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy anywhere. Concrete consequences rather than generic best practice: no frame protection enables a framable admin UI; no Referrer-Policy amplifies cached token URLs (the browser default still sends full URLs same-origin, and these pages load same-origin subresources); no HSTS while the TLS redirect is commented out (the commented-out TLS block) means the repository expresses no HTTPS expectation at all. Fix: headers() in Next.js, helmet() in bootstrap.ts, add_header in Nginx — layered so one misconfiguration does not remove all protection. Outcome: each layer sends the security headers.

global idempotency keys — Idempotency keys are global, unbounded, unvalidated, and never expire. schema.ts:122-127 (key: text().primaryKey()), idempotency.interceptor.ts:56-57, 77, 81-92, 103. Four issues from one design decision — a global rather than per-user key: (a) keys are not scoped to the caller (a composite primary key removes that); (b) no TTL, no cleanup, no DELETE anywhere — every idempotent write persists forever including the full response body; (c) no length or charset validation on the header, so multi-kilobyte keys are storable; (d) hashtext() is 32-bit, so distinct keys collide around every ~77k keys, causing unnecessary lock serialisation that becomes a contention vector under client-controlled rate-limit keys. Fix: composite (authorId, key) PK, .max(255) header validation, expiresAt column plus cleanup. Outcome: two callers can use the same key string, and an over-long key is rejected.

unbounded request bodies — No request body size limit; no Nginx limits or timeouts. app.config.ts:15-16 calls express.json() and express.urlencoded() with no limit, after bootstrap.ts:28 disabled the default parser. nginx.conf sets no client_max_body_size, proxy_read_timeout, proxy_send_timeout, or client_body_timeout. Express's 100 KB default is the accidental mitigating control for the unbounded concern field's unbounded concern — it is implicit and undocumented, and anyone raising it silently removes the cap. Absent timeouts leave slow-request exhaustion unbounded. Fix: express.json({ limit: "100kb" }), matching urlencoded, plus client_max_body_size 1m; and explicit proxy timeouts. Outcome: an oversized body is rejected at the parser and at the proxy.

the commented-out TLS block — Nginx TLS commented out; upstreams point at the wrong host. nginx.conf:51-86 has the entire TLS server block, including the HTTP→HTTPS 301, commented out — so the active config is HTTP-only on port 80 and the repository expresses no HTTPS enforcement. :23, 34 route to host.docker.internal, but docker-compose.yml:47-48 defines services named web/backend on app-network; the resolver 127.0.0.11 comment at :19 describes re-resolving Docker service names, which these are not. Combined with cleartext mobile traffic's mobile cleartext flag, the shipped default posture is plaintext end to end. Lines 41-42 are not evidence of WebSockets — confirmed absent. Fix: ship the TLS block behind a documented cert path or delete it and document ALB termination; correct the upstreams. Outcome: API routes resolve in the deployed topology, and the repository states an HTTPS expectation.

validation skipped in CI — Env validation is skipped whenever CI is set. env.config.ts:46, packages/auth/src/config.ts:52, apps/web/env.ts:62 — all three use skipValidation: !!process.env.CI || .... GitHub Actions sets CI=true for every step, so all validators return raw process.env with no schema checks and no defaults applied. Two consequences: CI cannot catch env misconfiguration (the production workflow compensates with a hand-written require_var at deploy-production.yml:70-94 that checks presence only, for ~15 fewer variables than Compose consumes — so SMTP can be silently unset, triggering credential logging's fail-open transport); and defaults are silently lost, which pino-logger.config.ts:22 explicitly works around with env.LOG_LEVEL ?? "info" in one place while dozens of other reads assume defaults exist. Fix: explicit SKIP_ENV_VALIDATION=1 set only for lint/test tasks. Outcome: a malformed environment value fails CI.

the missing audit trail — No audit trail for RBAC changes. schema.ts:133-177 defines no audit table; rbac-admin.service.ts:71-197 writes none. updatedAt captures when, never who. The repository's own docs/TICKETS.md:42, 44, 48 specifies an audit_log table and a reusable writeAudit() helper — unimplemented. Directly compounds the Admin self-grant: a users:manage holder can grant themselves Admin with no record. Fix: append-only audit_log (actor, action, target, timestamp, request id) written inside the same transaction as each mutation. Outcome: a role assignment leaves an audit row.

distinguishable reset errors — Forgot-password responses and UI state must be identical whether or not the account exists, including when mail delivery fails (forgot-password.hooks.ts:26-28). The reset sender wraps and sanitises mail errors the same way the verification sender does (packages/auth/src/config.ts:150-162 vs :127-144). Outcome: known and unknown emails return the same status and body when mail delivery fails.

paused-mutation replay — Paused mutations replay under whichever session is active at reconnect. query-client.ts:34-36 persists any paused mutation; provider.tsx:93-96 calls resumePausedMutations() unconditionally after restore, with no check that the session still belongs to the queueing user; todos.hooks.ts:21 sends credentials: "include". A queued write can replay under whichever session is active on reconnect. The backend sets authorId from the verified session, so the row is attributed to that later session — no privilege escalation, but an unauthorised write. The idempotency interceptor does not prevent it: the key is unused, so it takes the insert path. Held at Medium because there is no cross-user authorization compromise, and the feature is the example todos module. Existing mitigations are good: retryUnlessAuth (:78-81) refuses to retry 401/403 by status, and useTodoReplayErrors (:256-276) surfaces failures. Fix: record the queueing user id in mutation variables and abort on mismatch — or purge paused mutations on sign-out, which the shared browser cache's fix achieves.

cached token URLs — Reset/verification tokens are SW-cacheable and referrer-exposed. app/(auth)/reset-password/page.tsx:6-13 and verify-email/page.tsx:6-13 read the token from searchParams and pass it into a client component, so it appears in the URL, the RSC payload, and the initial HTML. app/sw.ts:35 overrides only /api with NetworkOnly; :38 lets defaultCache handle document navigations, so reset and verification navigations are cache-eligible. Neither page sets force-dynamic or Cache-Control. With no Referrer-Policy (missing security headers), same-origin subresource requests can carry the full URL. Bounded because tokens are single-use and short-lived. Fix: do not cache those navigations; set Referrer-Policy: no-referrer on (auth) routes. Outcome: reset and verification navigations are not stored in the service-worker cache.

a framable admin UI — RBAC administration UI is framable. No frame-protection header at any layer (missing security headers); target UI at app/(site)/user-management/page.tsx → user-management-view.tsx:19-30. The admin UI can be framed. That matters because role assignment changes privilege. Held at Medium: cookie attributes are unpinned, so a cross-site frame may carry no credentials. Fix: X-Frame-Options: DENY and frame-ancestors 'none'.

ignored type errors — typescript.ignoreBuildErrors: true. apps/web/next.config.ts:25. Type errors do not fail next build. The repository otherwise takes types seriously — end-to-end typed contracts, documented pnpm typecheck — making this a deliberate escape hatch that undermines the design. Security-relevant because access.ts, get-access.ts, and rbac.hooks.ts are type-driven: a renamed PermissionName or changed MePermissions shape ships silently. Partially counterweighted by turbo.json:9 (build depends on ^typecheck), but that does not cover Next.js's own check. eslint.ignoreDuringBuilds is not set. Fix: remove the flag.

the duplicated mobile cookie — Mobile session cookie duplicated into secure storage and re-injected on every request. api_client.dart:41-44 already installs PersistCookieJar + CookieManager; :47-65 adds a redundant second interceptor. Two defects: setCookie.join('; ') (:60) concatenates full Set-Cookie headers including attributes and sends them as a Cookie: request header — syntactically wrong — and because this interceptor is registered after CookieManager, line 52 overwrites the correctly computed value. It also applies no domain/path scoping, so the stored value attaches to every request the client makes; harmless today with a single host, but a cross-host leak the moment a second host is added. Compounds a cookie jar kept after sign-out and the default-true allowBackup (unused mobile permissions). Fix: delete the manual interceptor.

cleartext mobile traffic — Cleartext HTTP enabled app-wide; non-TLS default base URL. AndroidManifest.xml:19 sets usesCleartextTraffic="true" on the release manifest (src/main/), not a debug variant, disabling Android 9+'s default block for all destinations. No network_security_config.xml exists to narrow it. api_constants.dart:7 falls back to http://10.0.2.2:3000/api when API_BASE_URL is unset. Fix: move the flag to src/debug/AndroidManifest.xml or add a scoped network_security_config.xml; make the constants fallback fail loudly.

secrets written to disk on deploy — `deploy-production.yml` can leave secret material on the runner, and cleanup is not guaranteed when the step fails. The workflow declares no permissions. The parameter-store value is a SecureString, and the registry login masks its password. The rule is: pass secret material through the parameter store with no file on the runner, fail the step on error, and declare least-privilege workflow permissions.

unpinned actions — No action SHA-pinning; no permissions on the three most privileged workflows.

Workflow	permissions	Pinning
ci.yml	none	❌ @main branch
deploy-production.yml	none	❌ checkout@v6, configure-aws-credentials@v4, amazon-ecr-login@v2, setup-buildx-action@v3, cache@v5
deploy-staging.yml	none	❌ same set at v4
release-changelog.yml	✅ contents: write, pull-requests: read	❌ checkout@v4
auto-draft-pr.yml	✅ contents: read	❌ create-github-app-token@v3
Major-version tags are mutable; a compromised publisher can move v4 to a different commit executing in a job holding AWS credentials. The practice is clearly understood — auto-draft-pr.yml:7-9 declares least privilege with an explanatory comment — it simply was not applied to the deploy workflows. Fix: pin every action to a full SHA with a version comment; add permissions blocks.

a broad build-cache restore — Buildx cache restorable across refs. deploy-production.yml:117-123 and deploy-staging.yml:86-91 use broad restore-keys prefixes; caches feed --cache-from and are baked into pushed images. Confidence Medium: neither deploy is pull_request-triggered (both are push to protected branches plus workflow_dispatch), so the path requires branch-push access. Fix: include a content hash in the key and narrow restore-keys.

the unpinned postinstall — Root postinstall runs an unpinned remote package. package.json:31 → :30 → pnpm dlx sherif@latest. Every pnpm install downloads and executes an unpinned package with no lockfile entry and no integrity check; the try/catch swallows all errors including a tampered download. pnpm install --frozen-lockfile in both Dockerfiles still triggers postinstall, so this reaches the build container. sherif is legitimate — the issue is the unpinned dlx path. Fix: add sherif as a pinned devDependency, or move it to an explicit CI step.

LOW
the unbounded concern field — tickets.schema.ts:15: concern is the only unbounded user-controlled string reaching the database; every sibling has .max(255). Storage-abuse path bounded by @StrictThrottle() and Express's implicit 100 KB (unbounded request bodies), amplified by client-controlled rate-limit keys. Fix: .max(5000). tickets without an author — tickets.service.ts:26-39: authorId exists, is nullable, is related, and is seeded — but the submit handler never sets it, so every API-created ticket is orphaned despite requiring auth. The name and email supplied with the request are the only identity recorded, and this forecloses owner-scoping as a fix for ungated ticket reads. Fix: thread session.user.id, as todos.controller.ts:42 already does. last-Admin removal — rbac.service.ts:106-118: no check that the last Admin assignment is being removed, and no transaction — the last-Admin check and the removal must run in one transaction. Availability, unrecoverable without direct DB access. Fix: count-in-transaction guard. untrimmed origin lists (merged trustedOrigins parsed without trimming or empty-entry filtering + CORS allowlist admits empty entries and is unvalidated) — packages/auth/src/config.ts:171 splits BETTER_AUTH_TRUSTED_ORIGINS with no .trim(); app.config.ts:29 trims but does not .filter(Boolean), so a trailing comma yields "" in a credentials: true allowlist. Fails safe — a mistyped origin is not trusted, breaking flows rather than weakening them — but the failure mode is opaque and invites over-broadening. Fix: .map(s => s.trim()).filter(Boolean) in both, plus URL-shape validation. an unvalidated cookie domain — packages/auth/src/config.ts:28, 172-179: any value enables crossSubDomainCookies and passes straight through as the cookie Domain, with no hostname validation. .env.example:23 ships a populated value, so this is the default-followed path. A broad apex domain scopes sessions to every subdomain. Confidence Medium — the exact SameSite/Secure values Better Auth emits under this mode were not verifiable. Fix: validate the domain; leave unset by default. the ungated API reference — packages/auth/src/config.ts:180-184: the Better Auth openAPI plugin is registered unconditionally, skipping the otherwise-careful docs gating (bootstrap.ts:61-72, tested at auth.config.spec.ts:120-130). GET /api/v1/auth/reference is served in production regardless of ENABLE_API_DOCS. Reconnaissance only. Fix: conditional registration. the always-on Google provider — packages/auth/src/config.ts:31-32, 164-170: as string launders undefined, so the Google provider is always registered and the UI always shows an enabled button (social-login-buttons.tsx:24-28). Silently degrades instead of failing closed. Fix: register only when both variables are present. a verbose health response — health.service.ts:16-17, 24-33, 43: the unauthenticated endpoint returns version, raw NODE_ENV, and uptime, and on DB failure returns (error as Error)?.message verbatim — a pg error typically embeds host, port, and database name, disclosed precisely when the system is degraded. Also no liveness/readiness split despite @nestjs/terminus being an unused declared dependency. Fix: generic external message, log the real error. verbatim request ids — pino-logger.config.ts:53-63: inbound X-Request-Id accepted with no length, charset, or format validation, written to every log line and reflected in the response header (tested behaviour at request-id.spec.ts:89-94). JSON encoding escapes newlines, so the practical risks are downstream processor confusion, deliberate correlation-ID collision, and unbounded entry length. Fix: validate as UUID or cap at 64 safe characters. process-local limits (merged RBAC permission cache holds a 60-second stale-permission window + In-memory throttler and RBAC cache are ineffective in multi-instance deployment + in-memory throttler storage) — app.module.ts:40-41 (in-code comment acknowledges it) and rbac-cache.service.ts:14-18 are both per-process, while docker-compose.production.yml:1-14 explicitly describes an ASG. Effective limits become limit × instances; RbacCacheService.clear() after a revocation affects only the serving instance, leaving up to 60 s of stale permissions elsewhere. Kept Low because the client-controlled rate-limit keys finding already outweighs it — reconsider upward if that finding is fixed without shared state. Fix: Redis for both. RBAC writes without idempotency — rbac.controller.ts: none of the six mutation handlers applies IdempotencyInterceptor, while every todo write does. Damage is limited because most operations are naturally idempotent (onConflictDoNothing, deterministic replace-all), so this is a consistency gap in the template's own stated pattern. Fix: apply consistently. unpruned verification rows — schema.ts:61-75: verifications has expiresAt but no cleanup anywhere, so expired token material accumulates indefinitely on a table written on every signup, reset, and resend. The composite PK is (identifier, value) with no index on expires_at, so a future cleanup would full-scan. Fix: scheduled delete plus index. the example database credential — packages/db/.env.example:6: bare four-line file presenting postgres:password with no guidance, unlike apps/backend/.env.example:13-16 which surrounds the same value with explanation. Same class as the shipped signing secret — a functional value where a placeholder belongs. Fix: <user>:<password> placeholder plus a development-only comment. the bundled mobile env file (merged .env bundled as a Flutter asset + Flutter .env bundled as an app asset) — apps/mobile/pubspec.yaml:78-79 declares .env as a Flutter asset; assets ship in the APK/IPA in cleartext and are recoverable with unzip. Currently benign — the tracked example holds only API_BASE_URL and API_VERSION — but structurally invites a downstream developer to add a key. Note apps/mobile/.gitignore does not list .env; only the root .gitignore:60 covers it. Fix: prominent warning comment; prefer --dart-define. a cookie jar kept after sign-out — auth_repository.dart:98-105 clears both secure-storage keys, but the PersistCookieJar created at api_client.dart:41-43 is a local variable never exposed on a provider, so nothing can call deleteAll(). SecureStorageService.clearAll() exists (:41) and is never called. Mobile sign-out is nonetheless better than web — it clears local credential stores and resets provider state, leaving only invalidated cookie files inside the app sandbox, versus the shared browser cache's 24 hours of PII. Fix: expose the jar via a provider and purge it. debug signing on release — build.gradle.kts:33-39: release { signingConfig = signingConfigs.getByName("debug") }, with a TODO acknowledging it. The debug keystore is universally shared, so the APK can be re-signed by anyone with the shared debug key, cannot be published, and undermines signature-based trust for secure storage and backup. applicationId = "com.example.mobile" (:24) remains the scaffold default. Fix: real signing config from CI secrets; unique application ID. raw mobile error text — login_screen.dart:48-57: prefers data['message'], but falls back to error.response?.statusMessage ?? error.message and, for non-Dio errors, renders error.toString() verbatim. The backend's filter returns a controlled shape, so exposure is limited to non-Dio exceptions — e.g. the json['token'] as String cast at session_model.dart:57 throwing a TypeError — and Dio connection errors, whose message typically embeds the full URL with host and port. Fix: map to fixed user-facing strings. the mismatched password minimum — login_screen.dart:175-177 enforces ≥ 6 characters; register.schema.ts:6 enforces ≥ 8. Client validation is UX only, but the two clients present different contracts for the same account. Fix: derive both from a shared constant. unused mobile permissions — AndroidManifest.xml:10, 13 declare SCHEDULE_EXACT_ALARM and RECEIVE_BOOT_COMPLETED, but notification_service.dart:64-78 only calls createNotification — no scheduling code exists. Unnecessary surface, and SCHEDULE_EXACT_ALARM triggers Play policy review. Separately, no allowBackup/dataExtractionRules declared, so Android's default true applies — making the cookie jar (a cookie jar kept after sign-out) and SharedPreferences backup-eligible while secure storage is not. Fix: remove the permissions; set allowBackup="false". offline fallback on authenticated routes — app/sw.ts:40-49: the fallback matcher is request.destination === "document", i.e. every navigation including /dashboard. Benign alone — ~offline is a static shell with no user data, and the server-side gate still runs on the next real navigation — but it interacts with the shared browser cache, since a signed-out user reaching the offline shell can still have the previous user's IndexedDB snapshot restored beneath it. Resolved by fixing the shared browser cache. mid-session service-worker claim — app/sw.ts:26-27: skipWaiting + clientsClaim mean a new SW claims open pages mid-session, risking asset/chunk mismatch; the trade-off is documented at serwist-provider.tsx:52-55. Separately, the unregister-and-clear routine at :28-45 returns early in production (:19-22), so there is no in-app recovery path for a bad SW deployment. Fix: consider prompted update; add a production recovery mechanism. the third-party connectivity probe — use-online-status.ts:9, 51-56, 73: every active session fetches https://www.gstatic.com/generate_204 on mount and every 15 seconds, disclosing client IP and session duration to a third party. mode: "no-cors" means no data is read, so this is privacy/data-residency (GDPR-relevant for EU deployments) plus an availability coupling. The repository already has a suitable first-party target: /api/v1/health, anonymous. Fix: probe first-party or make the URL configurable. full email-directory reads — rbac.schema.ts:63-68 + rbac-admin.service.ts:166-187: users:read — a read-only permission held by the seeded Manager role — yields the complete email directory. Arguably by design for a user-management screen, and the service correctly exposes no password, token, or session data. Recorded as permission granularity, explicitly not elevated. Fix: a separate users:read-pii tier. the unused root Dockerfile — Docker12-45: referenced by no Compose file or workflow — both deploys name the app-specific Dockerfiles explicitly. Dead configuration, but markedly worse than the two in use: installs dev dependencies into the runtime, copies the entire source tree rather than build output, has no HEALTHCHECK, and CMD ["pnpm","start"] may attempt a build at container start via turbo.json:17-20. .dockerignore prevents secret leakage. Fix: delete or clearly mark as an unused example. the beta ORM in production — packages/db/package.json:58 and pnpm-workspace.yaml:26 pin drizzle-kit/drizzle-orm to 1.0.0-beta.9-e89174b, a production runtime dependency. The exact pin is the right handling for a beta and the two are consistent; the residual concerns are absent security-patch guarantees and possible unpublishing. Note next: 16.1.1 and react: 19.2.3 are stable, not prereleases. Fix: track for 1.0. missing regression tests — Security-test coverage is strong where it exists and absent elsewhere: RBAC guard (12 cases incl. fail-closed and prod/non-prod error shape), throttler, request-ID, and docs gating are all well tested; ownership/IDOR, idempotency, PWA cache isolation, mobile session cleanup, and XFF trust have no tests at all. Coverage thresholds are 25% lines / 20% branches with the examples module excluded (package.json:109-117) — which is exactly where unowned todo updates lives. Additionally apps/backend/test/app.e2e-spec.ts:32-84 targets /api/v1/examples/todos while the real path is /api/v1/example/todos, so those e2e tests cannot be passing.

INFO
a contract that marks session routes public — tickets.contract.ts:18, 48 declare security: [], advertising ticket.list and ticket.submit as public, but runtime requires a session. The pattern is correct elsewhere (todos.contract.ts:23 and health.contract.ts:21 pair security: [] with @AllowAnonymous()). Important: the "anonymous ticket submission" abuse path named in the audit brief does not exist. If made anonymous, ungated ticket reads escalates to Critical — the two must be decided together. unpinned session lifetime — packages/auth/src/config.ts:88-185 contains no session block: no expiresIn, updateAge, freshAge, or reset-revocation. All behaviour is library default and unpinned. Not elevated — absence of an explicit setting is not a vulnerability. Recommend pinning so an upgrade cannot silently change session lifetime. a non-boundary auth path match — auth.config.ts:25-35 uses url.startsWith(path) and never calls next(), so /api/v1/authfoo matches and is rewritten. No unintended handler is reached, and auth.config.spec.ts:108-118 proves correct registration ordering. Recorded because any future controller under a path beginning auth would be silently unreachable. verification not required — .env.example:63 and config.ts:45 default EMAIL_VERIFICATION_REQUIRED=false, and no account.accountLinking configuration exists. Whether an unverified email can be linked depends on Better Auth's default accountLinking.enabled/trustedProviders, not verifiable without library source. Confidence Low by design. Recommend configuring explicitly and shipping true in the example. unpinned cookie attributes — CSRF posture unresolved. Cookie auth plus credentials: "include" (todos.hooks.ts:21, rbac.hooks.ts:22) means protection rests on the SameSite value Better Auth emits, which could not be determined from tracked files. Per instruction, no assertion is made in either direction. This caps a framable admin UI's severity and is the single most valuable open question for the team to close. the open backend bind — External dependency / residual risk. docker-compose.production.yml:24, 44 and docker-compose.staging.yml:24, 44 bind 0.0.0.0, documented as intentional for ALB health checks. No Nginx service exists in either file, so whether anything filters direct access to port 3000 depends entirely on AWS security groups — outside repository scope. This substantiates client-controlled rate-limit keys's precondition. Positively, docker-compose.yml:68, 104 binds the development stack to 127.0.0.1 with an explanatory comment, and no Compose file defines a database service, so there is no exposed Postgres. credential-shaped placeholders — README.md:335, 405, 411, 414 contain AKIA..., wJal..., -----BEGIN RSA PRIVATE KEY-----..., GOCSPX-.... All are truncated placeholders — a targeted grep for complete key material returned zero matches. They will trigger secret scanners and generate adopter false positives. Positively, :415 correctly instructs openssl rand -base64 32. the mock ticket form — app/(site)/submit-ticket/page.tsx:62-65 builds payload from FormData, awaits an 800 ms setTimeout, discards it with void payload, and reports success (:120). No data leaves the browser — not a vulnerability, but a functional trap for adopters, and confirmation that no frontend anonymous ticket path exists.

Positive assurance by audit area
Area 1 — Authentication, Sessions, Account Lifecycle
Checked: cookie configuration, session lifecycle, hashing, verification, reset flows, enumeration, auth rate limiting, CSRF/origin validation, Google OAuth, versioned path rewriting, SMTP handling, partial config, secret validation, docs exposure. Clean with evidence: password hashing untouched — no password.hash/verify override, Better Auth scrypt retained (config.ts:147-163). Better Auth's own rate limiter explicitly enabled at 10/60 s (:101-105), which matters because auth routes skip the Nest throttler. Anti-enumeration correctly implemented on both forgot-password (forgot-password.hooks.ts:13-28) and resend-verification (verify-email.hooks.ts:28-38). No open redirect — every navigation target is a literal (router.push("/"), router.push("/login")); no redirect/next/callbackURL parameter is read anywhere, and signIn.social passes no callbackURL, so OAuth open-redirect is N/A. Auth docs gating is correct and tested (auth.config.spec.ts:96-140). Middleware ordering is correct and each step carries an in-code rationale (bootstrap.ts:36-65). Server-side session retrieval uses cache: "no-store" and fails closed to null (auth-server.ts:16-36). No localStorage/sessionStorage anywhere in apps/web. Notably strong: bool-schema.ts:17-20 implements a custom boolean parser specifically to avoid the z.coerce.boolean() trap where "false" becomes true — directly protecting the verification-gating flags, with the rationale documented at :3-15.

Area 2 — Authorization, RBAC, IDOR
Checked: all 19 endpoints for auth requirement, permission guard, ownership, user-ID derivation, ID-substitution, default roles, reserved-role protection, self-escalation, lockout, cache invalidation, frontend/backend consistency. Clean with evidence: the guard fails closed without a resolvable session (rbac.guard.ts:76-78, tested :87-103) and defensively re-resolves from headers when global guard ordering is non-deterministic (:64-73, tested :149-159). Unknown permissions fail closed with an explicit catalog check (rbac.service.ts:49-50), neutralising the PermissionName | string widening. Production error hygiene is correct and tested — missingPermissions only in non-production, and only unmet permissions are reported (rbac.guard.spec.ts:180-220). Admin is protected from rename and delete. Role-name uniqueness is enforced at both service and DB level. setRolePermissions is transactional. Cache invalidation is handled correctly with a documented rationale for the per-user vs global distinction (rbac-cache.service.ts:33-37). Frontend guards are UX-only and the backend enforces independently — user-management/page.tsx has no page-level permission gate, but every RBAC route requires users:read/users:manage, so no capability is guarded only in the client; frontend wildcard logic (access.ts:23-30) correctly mirrors the backend (rbac.service.ts:54-55).

Area 3 — Contracts, Validation, Injection
Checked: every Zod schema and corresponding service for bounds, coercion, unknown keys, mass assignment, response exposure, and all injection classes. Clean with evidence: SQL injection — none. Every query uses Drizzle's parameterised builder; the only raw fragments are a static count(*)::int (rbac-admin.service.ts:43, 218) and pg_advisory_xact_lock(hashtext(${key})) where ${key} is a bound parameter. No dynamic identifiers. Mass assignment — clean: CreateTodoSchema picks only title/completed; CreateTicketSchema excludes id, status, authorId, timestamps; Zod strips unknown keys by default and no schema uses .passthrough(). Coercion — clean: z.coerce.number().int().positive() on every path ID rejects 0, negatives, and non-numerics. Permission input — fail-closed twice: closed enum at the schema (rbac.catalog.ts:59) plus DB re-validation (rbac-admin.service.ts:123-127). XSS — clean: one dangerouslySetInnerHTML (chart.tsx:81), fed from a hardcoded THEMES constant; all user content renders as escaped JSX. Command injection — N/A: the single execSync (serwist/[path]/route.ts:32) runs the static literal "git rev-parse HEAD" at module scope in a force-static route. eval, prototype pollution, path traversal, SSRF, ReDoS — all N/A with grep evidence.

Area 4 — Rate Limiting, Abuse, Idempotency
Checked: throttler config, decorator coverage, body limits, proxy trust, header contract, and the full idempotency lifecycle. Clean with evidence: the strict and default limiters are properly isolated — exhausting reads does not consume the mutation budget, explicitly tested (throttler-proxy.guard.spec.ts:148-160). Retry-After passthrough is preserved by the exception filter and tested for both plain and named-throttler headers (:119, 142). The header contract matches end to end: the backend exposes Retry-After/X-Retry-After via CORS (app.config.ts:33) and the client reads exactly those (rate-limit-utils.ts:50). Idempotency concurrency handling is unusually rigorous — a transaction-scoped advisory lock, a re-check under the lock, the handler running exactly once, and persistence failure rolling back rather than returning an unrecorded success (idempotency.interceptor.ts:72-107), with the reasoning documented at :30-45. The author is derived from the verified session, mirroring RbacGuard.

Area 5 — API, Transport, Errors, Docs
Checked: CORS, CSRF, headers, HTTPS expectations, error serialisation, logging, middleware order, docs exposure, health output, request IDs, proxy headers. Clean with evidence: the error filter emits a uniform { success, error: { code, message }, timestamp } with no stack trace, no cause, no request body (http-exception.filter.ts:58-76); it is @Catch(HttpException) only, so unexpected errors fall through to a generic 500. Zod serialisation failures are logged server-side with full detail but not returned (:27-32). CORS uses an explicit array allowlist with no wildcard and no origin reflection. One correlation ID is maintained across the log line, the route handler, and the response header — a genuinely subtle correctness property, tested (request-id.spec.ts:96-130). API docs are correctly gated: environment-aware default (api-docs.config.ts:29-35), ENABLE_API_DOCS=false explicit in production Compose, and the gating tested. Graceful shutdown handlers registered. OpenAPI merge failure is caught and degrades to the base document (openapi.ts:159-162).

Area 6 — Next.js and Browser Security
Checked: route gating, cookie forwarding, redirects, NEXT_PUBLIC_*, client storage, SSR caching, token URLs, XSS, build safety, logout cleanup. Clean with evidence: the (site) layout performs a server-side session check and redirects (layout.tsx:14-18), with /dashboard repeating it as defence in depth. Both server-side fetches use cache: "no-store", so session and permission data never enter the Next.js data cache (auth-server.ts:25, get-access.ts:39). getAccess fails closed to empty roles/permissions and the sidebar surfaces a visible retry (get-access.ts:21-28, app-sidebar.tsx:121-141), and the response is schema-validated with safeParse. Only three NEXT_PUBLIC_* values exist, all URLs — and apps/web/.env.example:21-24 adds an explicit note that APP_WEB_URL is backend-side and deliberately not public. Cookie forwarding is inbound-header-only to the configured internal API. Server Actions: N/A.

Area 7 — PWA, Service Worker, Offline Persistence
Checked: SW scope and routing, cacheability of API/auth responses, navigation fallback, IndexedDB persistence, sign-out clearing, cross-account isolation, paused-mutation replay, SW update behaviour, manifest. Clean with evidence: API responses cannot enter Cache Storage — NetworkOnly for /api/* is registered before defaultCache, with an in-code comment stating "Order matters" and "Auth/dynamic responses must never be cached" (sw.ts:29-39). The SW is dev-gated at both ends: the route returns 404 outside production and the provider skips registration (serwist/[path]/route.ts:66-82, serwist-provider.tsx:48-50). The persister explicitly reuses the same serializer-aware dehydrate/hydrate helpers as the QueryClient, with a comment noting PersistQueryClientProvider does not inherit defaults (provider.tsx:78-87). registerTodosMutationDefaults is called before resumePausedMutations() so restored mutations have their mutationFn — a subtle bug correctly avoided. The manifest exposes no share_target, protocol_handlers, or file_handlers. The connectivity probe is well-engineered: a single shared module-scoped loop, ref-counted subscribers, AbortController timeout, proper teardown.

Area 8 — Flutter Mobile
Checked: cookie integration, storage, sign-out, logging, cleartext, TLS, .env, manifest, deep links, SharedPreferences, notifications, interceptors, error messages, generated code. Clean with evidence: TLS validation is intact — zero occurrences of badCertificateCallback or HttpOverrides. No Dio LogInterceptor. Session material uses the correct primitive (flutter_secure_storage, Keystore/Keychain-backed) with a clear doc comment on intent. SharedPreferences holds only theme, onboarding, and tour flags — no credentials or PII. Deep links / OAuth callbacks: N/A — the only intent filter is MAIN/LAUNCHER; no <data android:scheme>, no App Links. Exported components: clean — only MainActivity, as required. Explicit 10-second connect and receive timeouts. The CSRF Origin header handling is a well-reasoned interoperability fix (api_client.dart:19-23) — native clients send no Origin, so one is set explicitly to the trusted backend origin, with the reasoning documented. Sign-out is resilient: local deletion runs in a finally so a failed server call still logs the user out. Models are read-only response DTOs — requests send explicit literal maps, so there is no mass-assignment path. Certificate pinning: N/A — optional hardening, no repository-specific requirement. iOS: N/A — untracked.

Area 9 — Data Protection, Logging, Database Integrity
Checked: stored tokens and hashes, ticket PII, idempotency storage, cascades, retention, logging, redaction, audit, transactions, races, constraints, schema/migration consistency, seed data, indexes. Clean with evidence: foreign keys and cascades are deliberate and correct — sessions, accounts, todos, and userRoles cascade on user delete, while tickets.author_id uses SET NULL to preserve support history; that distinction is the right call. Uniqueness is enforced on users.email, sessions.token, roles.name, permissions.name, with composite PKs preventing duplicates on the join tables. Schema ↔ migration consistency verified line-by-line across all three migrations — every column, type, default, constraint, and index matches schema.ts. Indexes are adequate: user_roles_user_id_idx directly serves the query executed on every permission check. The seed's password hashing is real scrypt with correct parameters, random salt, and NFKC normalisation — not a shortcut. Seed operations are idempotent throughout. pgTableCreator(name => name) is an identity function with no injection surface. Encryption at rest is not claimed as a finding — no code requires application-level encryption.

Area 10 — Secrets and Environment
Checked: hardcoded secrets, .env.example contents, Actions secret exposure, Docker layers, raw process.env reads, validation strength, CI skips, NEXT_PUBLIC_*, Flutter assets, documentation, drift. Clean with evidence: no hardcoded secrets in source — targeted greps for BEGIN * PRIVATE KEY, AKIA[0-9A-Z]{16}, ghp_, sk_live, and xox[baprs]- matched only README documentation placeholders; zero matches in apps/, packages/, tooling/, scripts/, workflows, or Dockerfiles. process.env discipline is enforced by tooling — every occurrence is a legitimate env-validator input, build tool, CLI, or test setup, and apps/web/vitest.setup.ts:7, 11 carries eslint-disable no-restricted-properties, proving a lint rule actively forbids raw access in app code. No secret enters a Docker layer — no secret ARG/ENV; only the three public NEXT_PUBLIC_* values, correctly placed after the install layer with a comment on cache behaviour. .dockerignore:26-32 excludes all .env* including .env.example plus .git/. Workflow secrets are referenced via env: and never interpolated into run: bodies.

Area 11 — Dependencies and Supply Chain
Checked: manifests, lockfile, onlyBuiltDependencies, install scripts, child_process, frozen-lockfile enforcement, workspace/catalog consistency, name collisions, action pinning, base images, generated-code provenance, dev tooling in production images. Clean with evidence: onlyBuiltDependencies is a genuine, correctly configured supply-chain control — an explicit 10-package allowlist blocking arbitrary install scripts (pnpm-workspace.yaml:50-60). --frozen-lockfile is enforced in both production Dockerfiles. Workspace protocol and catalog usage are consistent across all 11 manifests with no version drift found. Dependency confusion via @repo/*: N/A — unpublished scope, every reference is workspace:*, and linkWorkspacePackages: true enforces local resolution. Generated Dart code has correct provenance — every .g.dart/.freezed.dart has a matching source with proper part directives. prepare: husky is a standard pinned git-hook installer. turbo.json:63 sets globalEnv: [] with a narrow pass-through list, so no secret enters the Turbo cache key. Limitations restated: pnpm audit not run; no Flutter advisory database consulted.

Area 12 — CI/CD, Containers, Reverse Proxy, Guardrails
Checked: Dockerfiles, runtime users, multi-stage boundaries, secrets in layers, build context, healthchecks, Compose bindings and privileges, both deploy workflows, AWS credentials, permissions, environment protection, concurrency, shell injection, cache trust, Nginx, drift, security tests, build escapes. Clean with evidence: the container layer is the strongest part of this audit. Both production images run as a non-root system user created before any copy, with --chown throughout. turbo prune --docker produces a pruned workspace so only dist/.next/standalone reach the runner — no source, no dev dependencies. Healthchecks probe /api/v1/health in the backend image and both deploy Compose files. Shell injection: clean, and checked specifically — no github.event.*, head_ref, PR title, or issue body is interpolated into any run: block; auto-draft-pr.yml:60-66 correctly passes the fetched title through an env: variable and quotes it, which is exactly the pattern that prevents injection. scripts/tickets-to-issues.mjs uses JSON.stringify() on every interpolated value and is invoked by no workflow. Deploys are gated on CI (needs: ci) and declare environment:, enabling approval gates. Concurrency is correctly differentiated — production never cancels an in-flight rolling refresh, staging does. Images are tagged with ${{ github.sha }}, so deployments are commit-traceable. No continue-on-error anywhere. No Compose file defines a database service, so there is no exposed Postgres or default DB credential. turbo.json:9 makes build depend on ^lint and ^typecheck.

4. Prioritized Remediation Roadmap
Block release
All nine are High, repository-remediable, and have code-supported impact.

ID	Finding	Effort
ungated ticket reads	Add a permission guard to the ticket read endpoints	~15 min
client-controlled rate-limit keys	Set the forwarded header from the connection address; TRUST_PROXY equals the hop count	~30 min
the shipped signing secret	Placeholder secret + .min(32) validation in both validators	~30 min
the shared browser cache	Exclude sensitive query keys from persistence; purge on sign-out	~2 h
credential logging	Gate mobile logging on kDebugMode; fail closed on missing SMTP_HOST; extend Pino redaction	~2 h
the fixed Admin seed password	Refuse to seed a production database; randomise the seed password	~30 min
the unpinned staging host key	Pin known_hosts; fix the ECR_REPOSITORY_WEB variable swap	~1 h
the stray dependency	Delete "orpc": "^0.1.1" and refresh the lockfile	~5 min
the unpinned CI workflow	Pin the CI workflow to a SHA; scope secrets: explicitly	~30 min
Exception noted: the shipped signing secret, the fixed Admin seed password, and the unpinned CI workflow have Medium confidence because their preconditions involve operator action or an external repository. They still block because each yields total compromise — full authentication skip, a known-credential Admin account, and repository secrets handed to that workflow respectively — and each fix is under an hour.

Fix within 30 days
Authorization boundaries: the Admin self-grant (users:manage self-escalation), unowned todo updates (todo ownership), the missing audit trail (RBAC audit trail), last-Admin removal (last-Admin protection). Transport and browser: missing security headers (security headers, all three layers), the commented-out TLS block (Nginx TLS and upstreams), cached token URLs (token caching and referrer), a framable admin UI (framing), unpinned cookie attributes (resolve the SameSite/CSRF question — this gates the correct severity of a framable admin UI and should be answered first). Abuse and integrity: global idempotency keys (idempotency key model), unbounded request bodies (body limits and timeouts), paused-mutation replay (paused-mutation replay). Configuration and pipeline: validation skipped in CI (CI env validation), ignored type errors (ignoreBuildErrors), secrets written to disk on deploy (secrets to temp file), unpinned actions (action pinning and workflow permissions), a broad build-cache restore (cache scoping), the unpinned postinstall (postinstall remote execution). Mobile: the duplicated mobile cookie (cookie duplication), cleartext mobile traffic (cleartext manifest flag), debug signing on release (release signing). Correctness: distinguishable reset errors (reset-email error handling), tickets without an author (ticket authorId), a contract that marks session routes public (contract/runtime mismatch — decide alongside ungated ticket reads).

Hardening backlog
the unbounded concern field, untrimmed origin lists, an unvalidated cookie domain, the ungated API reference, the always-on Google provider, a verbose health response, verbatim request ids, process-local limits, RBAC writes without idempotency, unpruned verification rows, the example database credential, the bundled mobile env file, a cookie jar kept after sign-out, raw mobile error text, the mismatched password minimum, unused mobile permissions, offline fallback on authenticated routes, mid-session service-worker claim, the third-party connectivity probe, full email-directory reads, the unused root Dockerfile, the beta ORM in production, missing regression tests, unpinned session lifetime, a non-boundary auth path match, verification not required, the open backend bind, credential-shaped placeholders, the mock ticket form.

Two backlog items deserve early attention despite their severity: missing regression tests (no ownership, idempotency, or cache-isolation tests) means the fixes for ungated ticket reads, the shared browser cache, unowned todo updates, and global idempotency keys will ship without regression protection — pair each fix with a test. process-local limits (in-memory throttler and RBAC cache in an ASG) should be re-evaluated immediately after client-controlled rate-limit keys lands, since client-controlled rate-limit keys currently masks it.

5. Quick Wins
Each is under one engineering day and maps to a finding ID.

 the stray dependency — Delete line 26 ("orpc": "^0.1.1") from packages/contracts/package.json and refresh the lockfile. Removes an abandoned package and every deprecated transitive dependency in the graph. (~5 min — best value-to-effort in the audit.)
 ungated ticket reads — Add @RequirePermissions("users:read") to listTickets and getTicket in tickets.controller.ts:14, 21. (~15 min)
 client-controlled rate-limit keys — In throttler-proxy.guard.ts and nginx.conf, set the forwarded header from the connection address and set TRUST_PROXY equal to the hop count. (~30 min)
 the shipped signing secret — Replace apps/backend/.env.example:21 with a non-functional placeholder; add .min(32) plus a default-value refinement to both BETTER_AUTH_SECRET schemas. (~30 min)
 the fixed Admin seed password — Add a NODE_ENV === "production" guard at the top of seed.ts; source seedPassword from env or randomBytes. (~30 min)
 ignored type errors — Delete typescript: { ignoreBuildErrors: true } from next.config.ts:25 and fix whatever surfaces. (~1 h)
 unbounded request bodies — Add { limit: "100kb" } to both parsers in app.config.ts:15-16; add client_max_body_size 1m; and proxy timeouts to nginx.conf. (~30 min)
 the unbounded concern field — Add .max(5000) to concern in tickets.schema.ts:15. (~5 min)
 untrimmed origin lists — Add .map(s => s.trim()).filter(Boolean) to packages/auth/src/config.ts:171 and app.config.ts:29. (~10 min)
 a verbose health response — Return a generic "database check failed" from health.service.ts:43 and log the real error server-side. (~15 min)
 the ungated API reference — Make the Better Auth openAPI plugin registration conditional on the docs flag (config.ts:180-184). (~30 min)
 the always-on Google provider — Register the Google provider only when both credentials are present (config.ts:164-170), removing the as string casts. (~20 min)
 credential logging (mobile half) — Wrap the three developer.log calls in auth_repository.dart with if (kDebugMode) and drop response.data from the message. (~15 min)
 cleartext mobile traffic — Move usesCleartextTraffic="true" from src/main/AndroidManifest.xml:19 to src/debug/AndroidManifest.xml. (~10 min)
 unused mobile permissions — Remove the unused SCHEDULE_EXACT_ALARM and RECEIVE_BOOT_COMPLETED permissions; add android:allowBackup="false". (~10 min)
 unpinned actions — Add permissions: { contents: read } to ci.yml, deploy-production.yml, and deploy-staging.yml. (~15 min — SHA-pinning is a separate, larger task.)
 the unpinned staging host key (bug half) — Fix the web image variable at deploy-staging.yml:140 so it names the web repository. (~2 min — staging has not run the web image.)
 the example database credential — Replace the credential in packages/db/.env.example:6 with a placeholder plus a development-only comment. (~5 min)
 the third-party connectivity probe — Point the connectivity probe at /api/v1/health instead of gstatic.com (use-online-status.ts:9). (~15 min)
 the unused root Dockerfile — Delete the unused root Dockerfile, or add a header comment marking it an unused example. (~5 min)
 the mock ticket form — Wire submit-ticket/page.tsx:62-65 to the real endpoint, or label the form clearly as a mock so adopters are not misled. (~30 min)
End of report. Produced as output only — no file was written. Persisting this document to docs/security-audit/2026-08-11-turbo-template-security-audit.md is the sole task of the final publishing phase.*
