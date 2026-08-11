Turbo Template — Pre-Production Security Audit
Audit date: 11 August 2026 · Scope: Git-tracked tree only · Mode: READ-ONLY (no file written, no command that mutates the working tree)

1. Executive Summary
Production assessment: NO-GO
Nine High-severity, repository-remediable findings have code-supported attack paths. At least three require no exotic preconditions: any user who completes self-registration can read every support ticket's PII; any client can defeat all IP rate limiting with a single header; and a working authentication secret is checked into the repository as a functional default.

This verdict is based solely on findings fixable by changing files in this repository. No cloud, IAM, WAF, DNS, or third-party defect contributed to it.

Path to CONDITIONAL GO — remediate F-01, F-02, F-03, F-04, F-06, and F-08. These six are small, well-scoped changes (one is a single deleted line) and together remove every High with a low-precondition attack path. F-05, F-07, and F-09 may then be scheduled inside 30 days with compensating controls.

Top five risks
#	Finding	Why it ranks here
1	F-01 — All support-ticket PII readable by any authenticated user	Lowest-precondition data breach in the audit: register, then GET /api/v1/tickets. Returns every reporter's name, email, subject, and free-text concern. Two-line fix.
2	F-03 — Working BETTER_AUTH_SECRET in .env.example, no strength validation	A public template ships a functional signing secret. An operator who follows the documented setup and forgets one line enables session forgery for any account, including Admin.
3	F-02 — X-Forwarded-For leftmost-entry trust	Rate limiting is the only abuse control on mutation endpoints and is keyed on a client-controlled header. Amplifies four other findings.
4	F-04 — Authenticated data persisted to IndexedDB, never cleared on sign-out	A full day of cached data — including the complete user directory with emails — survives sign-out under one shared, user-agnostic key and is restored for the next person on that browser profile.
5	F-08 — packages/contracts depends on the wrong orpc package	An abandoned 2018 package with a live caret range and a dormant maintainer, pulling a deprecated Socket.IO stack. Unused by any source file. One deleted line removes it and every deprecated transitive dependency.
Scope and coverage
Enumerated: 19 oRPC routes across 5 modules, mapped contract → controller → service; Better Auth's Express-mounted surface (which bypasses the NestJS pipeline entirely); 1 Next.js route handler; 6 Flutter API endpoints; 5 GitHub Actions workflows; 3 Dockerfiles; 3 Compose files; 1 Nginx config; 3 database migrations verified line-by-line against the schema.

Confirmed early and load-bearing: @thallesp/nestjs-better-auth v2.2.0 registers a global AuthGuard; app.module.ts:58 omits disableGlobalAuthGuard, so every route is authenticated unless it carries @AllowAnonymous(). Three provisional findings were re-graded against this.

Not fully covered: the CI quality gate is an external reusable workflow pinned to @main (F-09) and could not be read — this audit cannot confirm that CI runs lint, typecheck, or any test. node_modules is absent, so better-auth and @thallesp/nestjs-better-auth internals were unreadable; three findings are held at reduced confidence as a result (F-33, F-58, F-59). Deployed artifacts differ from the repository: production Compose is stored in SSM and pulled at boot.

Areas marked N/A (capability absent, with search evidence)
A single repository-wide regex across *.{ts,tsx,dart,json,yml,yaml,mjs,js,md,conf} established the following. All matches outside docs/security-audit-prompt.md (the audit brief itself) are noted.

Capability	Verdict	Evidence
Payments / Stripe, Wallet, KYC, Notarization	N/A	Zero hits outside the brief
File upload	N/A	multer@2.0.2 present only as a transitive of @nestjs/platform-express (pnpm-lock.yaml:10818). No FileInterceptor, no @UploadedFile
S3 / AWS object storage	N/A	@aws-sdk/client-rds-data appears only as an optional peer of drizzle-orm (pnpm-lock.yaml:5275, 5311) — not installed, not imported
LiveKit, Webhooks, AI/LLM	N/A	Zero hits
WebSockets / Socket.IO application code	N/A	socket.io@2.5.1 exists only under the stray orpc@0.1.1 (F-08). No WebSocketGateway, no @nestjs/websockets in any manifest. Per the brief, the Nginx upgrade headers at nginx.conf:41-42 are not treated as evidence
Server Actions	N/A	Zero "use server" matches in apps/web
iOS platform configuration	N/A — untracked	No apps/mobile/ios/ directory exists. ATS, entitlements, and Keychain accessibility unassessable
MFA	Not assessed	Per instruction, absence not reported
Dependency-audit limitations
pnpm audit was NOT run. node_modules is absent from this workspace, so the command would first resolve the dependency graph and can rewrite pnpm-lock.yaml when lockfile and manifests disagree. Without shell access I could not verify git status --porcelain before and after, which the read-only constraint requires. All npm advisory analysis is derived from deprecated: annotations already present in the checked-in pnpm-lock.yaml. A CVE affecting a non-deprecated package would not appear in this report.

No Flutter/Dart advisory database was consulted. Dart has no pub audit equivalent; OSV.dev's Pub feed has materially thinner coverage than npm's. The 17 direct dependencies in apps/mobile/pubspec.yaml:14-59 have not been checked for known vulnerabilities. This is a genuine coverage gap, not an assurance of safety.

2. Findings Table
ID	Severity	Area	File:Line	Issue	Fix	Confidence (High/Medium/Low)
F-01	High	2	apps/backend/src/modules/v1/tickets/tickets.controller.ts:14,21; tickets.service.ts:14-24	Ticket read endpoints have no @RequirePermissions and no scoping — all reporter PII to any authenticated user	Add permission guard or owner-scope the query	High
F-02	High	4, 12	apps/backend/src/shared/guards/throttler-proxy.guard.ts:15; nginx/nginx.conf:28,39	Throttler keys on client-controlled leftmost X-Forwarded-For; Nginx appends rather than overwrites	Use rightmost-untrusted IP; Nginx $remote_addr	High
F-03	High	1, 10	apps/backend/.env.example:21; packages/auth/src/config.ts:26; apps/backend/src/config/env.config.ts:38	Functional default auth secret shipped; validation is presence-only	Placeholder + .min(32) + reject known default	Medium
F-04	High	6, 7	apps/web/services/tanstack-query/provider.tsx:31-37; query-client.ts:27-32,58; features/auth/api/session.hooks.ts:52-57	All queries persisted to one shared IndexedDB key; sign-out invalidates only ["session"]	Exclude sensitive keys; queryClient.clear() + persister purge	High
F-05	High	1, 8, 9	apps/mobile/lib/features/auth/data/auth_repository.dart:52-57,81-86,115-120; packages/auth/src/mailer/send-mail.ts:34; apps/backend/src/config/pino-logger.config.ts:36-42	Session tokens, reset links, and PII written to unredacted logs on three independent paths	Gate on build mode; extend Pino redaction	High
F-06	High	9, 12	packages/db/src/seed.ts:50,55-62,199,307; packages/db/package.json:44	Seed provisions pre-verified Admin with password123, prints it, resets on re-run, no env guard	Refuse in production; random/env password	Medium
F-07	High	12	.github/workflows/deploy-staging.yml:130,138-152	Secrets expanded on runner and streamed over SSH with StrictHostKeyChecking=no	Pin known_hosts; move to SSM pattern	High
F-08	High	11	packages/contracts/package.json:26; pnpm-lock.yaml:560-564,7231	Wrong/abandoned orpc@0.1.1 dependency pulls deprecated Socket.IO stack	Delete the dependency line	High
F-09	High	11, 12	.github/workflows/ci.yml:13-14	Entire CI gate is external @main ref with secrets: inherit	Pin to SHA; scope secrets explicitly	Medium
F-10	Medium	2	apps/backend/src/modules/v1/rbac/rbac.controller.ts:78-85; rbac.service.ts:94-104	users:manage can grant self Admin — privilege tier collapse	Reject Admin grant unless caller holds it	High
F-11	Medium	2	apps/backend/src/modules/v1/examples/todos/todos.service.ts:44-63	Update/delete filter on id only — capability check, not ownership	Add eq(todos.authorId, session.user.id)	High
F-12	Medium	5, 6, 12	apps/web/next.config.ts:10-31; apps/backend/src/bootstrap.ts; nginx/nginx.conf:12-44	No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy at any layer	headers() + helmet() + add_header	High
F-13	Medium	4	packages/db/src/schema.ts:122-127; idempotency.interceptor.ts:56-57,81-92	Idempotency keys globally unique, unvalidated, unbounded, never expired	Composite (authorId,key) PK; length cap; TTL	High
F-14	Medium	4, 12	apps/backend/src/config/app.config.ts:15-16; nginx/nginx.conf	No explicit body-size limit; no Nginx client_max_body_size or timeouts	Set limit on parsers; add Nginx directives	High
F-15	Medium	5, 12	nginx/nginx.conf:23,34,51-86	TLS block entirely commented out; upstreams use host.docker.internal, not service names	Ship TLS config; fix upstreams	High
F-16	Medium	10	apps/backend/src/config/env.config.ts:46; packages/auth/src/config.ts:52; apps/web/env.ts:62	skipValidation triggers on CI, disabling env validation exactly where it would help	Explicit SKIP_ENV_VALIDATION opt-out	High
F-17	Medium	9	packages/db/src/schema.ts:133-177; rbac-admin.service.ts:71-197	No audit trail for RBAC mutations; docs/TICKETS.md:44 specifies one	Append-only audit_log written in-transaction	High
F-18	Medium	1	packages/auth/src/config.ts:150-162 vs :127-144; forgot-password.hooks.ts:26-28	Reset path lacks the verification path's error sanitising → SMTP disclosure + enumeration oracle	Mirror the try/catch + APIError	Medium
F-19	Medium	7	provider.tsx:93-96; query-client.ts:34-36; todos.hooks.ts:207	Paused mutations replay under whichever session is active at reconnect	Record queueing user id; abort on mismatch	Medium
F-20	Medium	6, 7	app/(auth)/reset-password/page.tsx:6-13; app/sw.ts:35,40-49	Reset/verification tokens in URLs are SW-cacheable and referrer-exposed	NetworkOnly matcher + Referrer-Policy	Medium
F-21	Medium	5, 6	apps/web/next.config.ts:10-31; user-management/page.tsx	RBAC admin UI framable; framed clicks reach role-assignment (see F-10)	frame-ancestors 'none'	Medium
F-22	Medium	6, 12	apps/web/next.config.ts:25	typescript.ignoreBuildErrors: true — type errors in permission logic ship silently	Remove flag	High
F-23	Medium	8	apps/mobile/lib/services/api/api_client.dart:47-65	Cookie duplicated into secure storage, malformed on re-serialisation, unscoped, overwrites CookieManager	Delete the manual interceptor	Medium
F-24	Medium	8	android/app/src/main/AndroidManifest.xml:19; api_constants.dart:7	usesCleartextTraffic="true" in the release manifest; non-TLS fallback URL	Move to debug manifest; fail on missing URL	High
F-25	Medium	10, 12	.github/workflows/deploy-production.yml:196-220	All secrets written plaintext to /tmp/deploy.env; rm not guaranteed; no permissions:	Pipe to base64 without disk; set -euo pipefail	High
F-26	Medium	12	All five workflows	No action SHA-pinned; CI and both deploys declare no permissions	Pin to SHAs; add least-privilege blocks	High
F-27	Medium	12	deploy-production.yml:117-123; deploy-staging.yml:86-91	Broad buildx cache restore-keys restorable across refs	Content-hash key; narrow restore	Medium
F-28	Medium	11	package.json:30-31	postinstall shells out to pnpm dlx sherif@latest — unpinned remote execution on every install	Pin as devDependency; drop from postinstall	High
F-29	Low	3	packages/contracts/src/modules/v1/tickets/tickets.schema.ts:15	concern has .min(1) but no .max() — only unbounded string in the schema set	Add .max(5000)	High
F-30	Low	2, 3	tickets.service.ts:26-39; tickets.controller.ts:28-34	ticket.submit never records authorId despite requiring auth	Thread session.user.id into insert	High
F-31	Low	2	apps/backend/src/common/rbac/rbac.service.ts:106-118	No last-Admin protection on role removal; TOCTOU on concurrent removals	Count-in-transaction guard	High
F-32	Low	1, 5	packages/auth/src/config.ts:171; apps/backend/src/config/app.config.ts:29	Origin allowlists split without .trim()/.filter(Boolean)	Trim and filter both	High
F-33	Low	1	packages/auth/src/config.ts:28,172-179	Any value for BETTER_AUTH_COOKIE_DOMAIN enables cross-subdomain cookies, unvalidated	Validate hostname; unset by default	Medium
F-34	Low	1, 5	packages/auth/src/config.ts:180-184	Better Auth openAPI({path:"/reference"}) registered with no env gate	Conditional registration	High
F-35	Low	1	packages/auth/src/config.ts:31-32,164-170	Google provider always registered; as string launders undefined	Register only when both vars present	High
F-36	Low	5	apps/backend/src/modules/v1/health/health.service.ts:16-17,43	Unauthenticated health leaks env, version, uptime, and raw DB error text	Generic message; gate metadata	High
F-37	Low	5	apps/backend/src/config/pino-logger.config.ts:53-63	Inbound X-Request-Id accepted verbatim, logged and reflected	Validate UUID / cap length	High
F-38	Low	2, 4, 12	app.module.ts:40-41; rbac-cache.service.ts:14-18; docker-compose.production.yml:1-14	In-memory throttler and RBAC cache in an ASG topology — limits multiply, revocation is per-instance	Shared Redis store	High
F-39	Low	4	apps/backend/src/modules/v1/rbac/rbac.controller.ts	No RBAC write applies IdempotencyInterceptor, unlike every todo write	Apply interceptor consistently	High
F-40	Low	9	packages/db/src/schema.ts:61-75	verifications rows never cleaned up; no index on expires_at	Scheduled delete + index	High
F-41	Low	10	packages/db/.env.example:6	Working postgres:password credential with no warning comment	Placeholder + comment	High
F-42	Low	8, 10	apps/mobile/pubspec.yaml:78-79	.env bundled as a Flutter asset — cleartext inside the APK	Warn in example; prefer --dart-define	High
F-43	Low	8	auth_repository.dart:98-105; api_client.dart:41-43	Sign-out clears secure storage but PersistCookieJar is unreachable and unpurged	Expose jar via provider; deleteAll()	High
F-44	Low	8	android/app/build.gradle.kts:24,33-39	Release signed with debug keystore; com.example.mobile appId	Real signing config; unique appId	High
F-45	Low	8	login_screen.dart:48-57	Non-Dio exceptions rendered via error.toString(); Dio messages embed host/port	Map to fixed user-facing strings	Medium
F-46	Low	1, 8	login_screen.dart:175-177 vs register.schema.ts:6	Mobile enforces 6-char minimum, web 8	Align on server minimum	High
F-47	Low	8	AndroidManifest.xml:10,13,15-19	SCHEDULE_EXACT_ALARM/RECEIVE_BOOT_COMPLETED unused; allowBackup defaults true	Remove permissions; allowBackup="false"	High
F-48	Low	7	app/sw.ts:40-49	Offline fallback served for authenticated navigations	Exclude authenticated routes	High
F-49	Low	7	app/sw.ts:26-27; serwist-provider.tsx:19-22	skipWaiting+clientsClaim mid-session takeover; unregister path is dev-only	Consider prompted update; add prod recovery	Medium
F-50	Low	7	features/pwa/lib/use-online-status.ts:9,73	15-second probe to gstatic.com leaks IP and session duration to a third party	Probe /api/v1/health	High
F-51	Low	3	packages/contracts/src/modules/v1/rbac/rbac.schema.ts:63-68	users:read yields the full email directory	Finer-grained PII permission	Medium
F-52	Low	12	Docker12-45	Unused root Dockerfile ships full source + dev deps, no healthcheck	Delete or mark as example	High
F-53	Low	11	packages/db/package.json:58; pnpm-workspace.yaml:26	drizzle-orm/drizzle-kit beta in production runtime	Track for 1.0	High
F-54	Low	12	apps/backend/package.json:109-117; apps/backend/test/app.e2e-spec.ts:32	No ownership/idempotency/cache-isolation tests; e2e targets a non-existent path	Add tests; fix path	High
F-55	Info	3	tickets.contract.ts:18,48	Contract declares security: [] but runtime requires a session — OpenAPI misleads integrators	Align spec with runtime	High
F-56	Info	1	packages/auth/src/config.ts:88-185	No explicit session expiresIn/rotation/revocation config — library defaults unpinned	Pin explicitly	Medium
F-57	Info	1	apps/backend/src/config/auth.config.ts:25-35	startsWith match swallows any /api/v1/auth* path	Match on prefix boundary	High
F-58	Info	1	apps/backend/.env.example:63; packages/auth/src/config.ts:45	Verification not required by default; accountLinking unconfigured	Configure explicitly	Low
F-59	Info	1, 5, 6	packages/auth/src/config.ts:172-179	CSRF posture unresolved — SameSite value not verifiable from tracked files	Pin cookie attributes explicitly	Low
F-60	Info	12	docker-compose.production.yml:24,44	Backend binds 0.0.0.0:3000 with no proxy in the deploy topology — external dependency / residual risk	Confirm security-group filtering	High
F-61	Info	10	README.md:335,405,411,414	Credential-shaped documentation placeholders will trigger secret scanners	Use <angle-bracket> placeholders	High
F-62	Info	6	app/(site)/submit-ticket/page.tsx:62-65	Form discards input and reports success — functional trap for adopters	Wire to the API or label as mock	High
3. Detailed Findings
HIGH
F-01 — All support-ticket PII readable by any authenticated user
Severity: High · Confidence: High · Areas 2, 9

Affected: apps/backend/src/modules/v1/tickets/tickets.controller.ts:14-19, 21-26 · tickets.service.ts:14-17, 19-24 · packages/contracts/src/modules/v1/tickets/tickets.schema.ts:9-24

Evidence. Both read handlers carry only @Implement. RbacGuard returns true immediately when no permission metadata is present (rbac.guard.ts:34-36), so the sole gate is "has a session." findAll() applies no where clause. The response schema includes name, email, subject, and concern. Every handler in the sibling RbacController carries @RequirePermissions — the omission is inconsistent within one codebase.

Impact. Complete disclosure of the support-ticket corpus, which the audit brief classifies as sensitive.

Attack scenario. Preconditions: the ability to self-register. EMAIL_VERIFICATION_REQUIRED=false by default (apps/backend/.env.example:63), so even verification is unnecessary. No role assignment is needed — a user with zero roles passes, because the guard never runs. Attack: register, then GET /api/v1/tickets. Gain: every reporter's full name, email address, subject line, and free-text concern body; seed data at seed.ts:114-148 confirms these carry real identities. Why controls don't stop it: authentication is satisfied legitimately; no permission is required; no ownership filter exists; and the users:read permission that gates the far less sensitive rbac.users.list is simply not applied here.

Root cause. The tickets module was written without RBAC decorators while every neighbouring module received them.

Remediation (illustrative — not applied).


@RequirePermissions("users:read")   // or a new tickets:read permission
@Implement(v1.ticket.list)
async listTickets() { ... }
For per-user access instead, scope the query: .where(eq(tickets.authorId, session.user.id)) — but note this requires F-30 first, since authorId is never populated.

Verification. Register a fresh no-role account; confirm GET /api/v1/tickets and GET /api/v1/tickets/1 both return 403.

Residual risk. Anonymous tickets have authorId = null (schema.ts:113), so owner-scoping alone leaves them unreachable by their reporter; a staff permission is needed regardless.

F-02 — X-Forwarded-For spoofing defeats all IP rate limiting
Severity: High · Confidence: High · Areas 4, 12 (merged: A4-01 + A12-05 XFF)

Affected: apps/backend/src/shared/guards/throttler-proxy.guard.ts:15 · apps/backend/src/bootstrap.ts:40 · apps/backend/src/config/env.config.ts:32 · nginx/nginx.conf:28, 39 · docker-compose.production.yml:44

Evidence. getTracker returns req.ips[0] — the leftmost, client-supplied entry. With trust proxy = 1, a request arriving with a pre-set X-Forwarded-For: 1.2.3.4 yields req.ips = ["1.2.3.4"]. Nginx uses $proxy_add_x_forwarded_for, which appends rather than replaces, preserving any attacker-supplied value ahead of the real IP. The guard's own tests assert extraction (throttler-proxy.guard.spec.ts:52-64) but never the trust boundary.

Impact. Rate limiting is the only abuse control on every mutation endpoint. Defeating it amplifies F-13 (unbounded key growth), F-14 (no body limit), F-29 (unbounded concern), and the unpaginated list endpoints.

Attack scenario. Preconditions: network reachability. In production the backend binds 0.0.0.0:3000 with no proxy service in the Compose file (F-60), so the attacker may reach it directly — in which case Express trusts a header from an untrusted peer outright. Even routed through Nginx, append semantics preserve the forged leftmost value. Attack: send each request with a fresh random X-Forwarded-For. Gain: unlimited requests against every @StrictThrottle() endpoint — RBAC role churn, ticket flooding, storage abuse. Why controls don't stop it: the throttler is the sole control and is keyed entirely on the spoofable value; .env.example:37-39 documents the danger but no code enforces it.

Mitigating note. Auth endpoints are unaffected — they short-circuit to Better Auth's own limiter (packages/auth/src/config.ts:101-105) before Nest, so credential brute-force remains separately limited.

Remediation (illustrative).


protected async getTracker(req: Record<string, unknown>): Promise<string> {
  const ips = req.ips as string[] | undefined
  return ips?.length ? ips[ips.length - 1]! : (req.ip as string)
}
Pair with proxy_set_header X-Forwarded-For $remote_addr; in Nginx (overwrite, not append), and TRUST_PROXY=0 wherever the app is directly exposed.

Verification. Send N+1 requests with rotating X-Forwarded-For values; expect 429 after the limit.

Residual risk. Correct hop count depends on deployed topology — external dependency for the ALB layer. The leftmost-vs-rightmost selection is fully repository-remediable.

F-03 — Working default BETTER_AUTH_SECRET with no strength validation
Severity: High · Confidence: Medium · Areas 1, 10

Affected: apps/backend/.env.example:21 · packages/auth/src/config.ts:26, 100 · apps/backend/src/config/env.config.ts:38 · both skipValidation lines (F-16)

Evidence. The example ships BETTER_AUTH_SECRET=default-secret-for-testing-change-in-production — a syntactically valid, immediately usable value, not a placeholder. Both Zod validators accept any string: no .min(), no entropy floor, no rejection of the known default. Contrast the correct pattern two lines later: GOOGLE_CLIENT_ID=your-google-client-id....

Impact. Complete authentication bypass if the default survives to deployment.

Attack scenario. Preconditions: an operator copies .env.example to .env — the documented onboarding step — and ships without rotating this one line. Nothing warns or fails. Attack: this is a public reusable template, so the string is world-readable. Better Auth derives session-cookie signing material from secret. An attacker recognising the deployment forges a validly signed session cookie for any known or guessed userId. rbac.guard.ts:65-67 resolves it via getAuth().api.getSession(), which validates the signature against the same known secret. Gain: authentication bypass; with a forged Admin userId, unconditional access to all RBAC administration (rbac.service.ts:47 short-circuits every permission check for Admin). Why controls don't stop it: the guard trusts any signature-valid session; no boot-time strength gate exists; and skipValidation on CI means no pipeline check surfaces the weak value.

Root cause. A usable default is checked in, and secret validation is presence-only.

Remediation (illustrative).


BETTER_AUTH_SECRET: z.string()
  .min(32, "BETTER_AUTH_SECRET must be >= 32 characters")
  .refine(v => !v.startsWith("default-secret"), "Replace the template default secret"),
Replace .env.example:21 with a non-functional placeholder and document openssl rand -base64 32 (already correctly documented at README.md:415).

Verification. Boot with the example value; expect non-zero exit. Boot with a 32-char random value; expect success.

Residual risk. Operators can still supply a weak-but-long secret. Secret distribution is external; the checked-in default and missing validator are fully repository-remediable — which is why this is graded rather than deferred. Confidence is Medium because reaching production requires operator omission.

F-04 — Authenticated data persisted to IndexedDB under one shared key, never cleared on sign-out
Severity: High · Confidence: High · Areas 1, 6, 7 (merged: A1-04 + A7-01)

Affected: apps/web/services/tanstack-query/provider.tsx:31-37 · services/tanstack-query/query-client.ts:27-32, 52, 58 · features/auth/api/session.hooks.ts:13, 52-57 · features/user-management/api/rbac.hooks.ts:56, 78 · features/pwa/components/serwist-provider.tsx:19-22, 39-45

Evidence. createAsyncStoragePersister is constructed with no key, no maxAge, no buster — so it uses the library default, a single IndexedDB entry shared by every user of the browser profile. shouldDehydrateQuery applies no allowlist, so every query persists: ["session"] (user id, name, email), ["rbac","users"] (the complete user directory with emails), ["rbac","roles"], ["todos"]. gcTime is 24 hours. Sign-out invalidates only the ["session"] key — there is no queryClient.clear(), no persister.removeClient(), no del() from idb-keyval anywhere in the sign-out path. The only cache-clearing code in the repository is explicitly gated to non-production (serwist-provider.tsx:20-22 returns early when NODE_ENV === "production").

Impact. Cross-user disclosure of authenticated data, including an administrative user directory, on any shared browser profile.

Attack scenario. Preconditions: two users share a browser profile — shared workstation, kiosk, support desk, family device. No network position or credentials required. Attack: User A (an administrator) signs in and opens /user-management, populating ["rbac","users"] with every user's name and email. A signs out; the IndexedDB snapshot is untouched. User B opens the app; PersistQueryClientProvider restores the entire snapshot at mount, before any session check. Gain: B reads A's identity and the full user directory. Because networkMode: "offlineFirst", any component reading those keys paints A's data immediately; the data is also readable via DevTools without authenticating at all. Why controls don't stop it: the server-side layout gate ((site)/layout.tsx:14-18) protects rendering, not the client cache; the backend never sees these reads; and the 24-hour gcTime with no maxAge means a full-day window.

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

Verification. Sign in as A, visit /user-management, sign out, then inspect Application → IndexedDB for residual emails. Repeat post-fix and confirm absence.

Residual risk. Even with a purge, data written during the session sits on disk until the purge runs; excluding sensitive keys from persistence entirely is the stronger control.

F-05 — Unredacted credential logging across three independent paths
Severity: High · Confidence: High · Areas 1, 8, 9 (merged: A1-02 + A8-01 + A9-05)

Affected:

Mobile (High): apps/mobile/lib/features/auth/data/auth_repository.dart:31-32, 52-57, 81-86, 115-120
Backend SMTP (Medium): packages/auth/src/mailer/transport-factory.ts:24, 40-44 · send-mail.ts:33-35 · packages/auth/src/config.ts:35, 115, 151
Pino gaps (Medium): apps/backend/src/config/pino-logger.config.ts:36-42, 64-66
Evidence. Three separate logging paths exist and only one has redaction.

Mobile interpolates the entire response body into developer.log on sign-in, sign-up, and get-session. The file's own doc comment (:39-42) documents that body as { "session": { "token": "..." }, "user": {...} }. There is no kDebugMode guard — a repo-wide grep returned zero matches — and dart:developer log() is not stripped from release builds.
SMTP fails open: SMTP_HOST is optional with no environment check, so an unset value silently returns jsonTransport, and send-mail.ts:34 writes the fully serialised message — including /reset-password?token=… — to stdout via console.log. Because this is console.log and not Pino, the redaction block does not apply.
Pino redacts authorization, cookie, set-cookie, and body.password, but not body.token, body.newPassword, or body.email, and it logs req.url on every request — carrying any query-string token into the logs.
Impact. Session tokens, single-use reset tokens, and PII reach log sinks in plaintext.

Attack scenario. Preconditions: the attacker can read a log stream. On Android, adb logcat requires only USB debugging — no root; a crash/diagnostics SDK capturing platform logs suffices equally. Server-side, anyone with access to the container log stream (aggregator, CloudWatch, docker logs) qualifies. Attack: observe the log during sign-in, or scrape captured diagnostics. Gain: the raw session token, replayable against every authenticated route — including GET /api/v1/tickets, which per F-01 returns all ticket PII. Server-side, a production deployment missing SMTP_HOST emits every password-reset token to stdout while appearing healthy, enabling account takeover for any user. Why controls don't stop it: the mobile app stores tokens correctly in flutter_secure_storage — and then prints them in plaintext, bypassing that control entirely; the SMTP path bypasses Pino's redaction by using console.log.

Root cause. Debug instrumentation left in a shared template with no release gate, plus a development convenience that fails open rather than closed.

Remediation (illustrative).


if (kDebugMode) developer.log('signIn status=${response.statusCode}', name: 'AuthRepository');

if (!opts.smtpHost) {
  if (process.env.NODE_ENV === "production") throw new Error("SMTP_HOST is required in production")
  // dev-only console transport
}
Extend Pino redact.paths with req.body.token, req.body.newPassword, req.body.email, req.query.token.

Verification. Build a release APK, sign in, confirm adb logcat contains no token or email. Start the backend with NODE_ENV=production and no SMTP_HOST; confirm boot failure.

Residual risk. Log retention and third-party SDK capture remain external. Note the Pino sub-claim about req.body.token is Medium confidence: auth routes short-circuit before express.json(), so Pino may see no parsed body on exactly those routes.

F-06 — Seed script provisions a hardcoded Admin account with no environment guard
Severity: High · Confidence: Medium · Areas 9, 12

Affected: packages/db/src/seed.ts:41-45, 50-51, 55-62, 152-159, 199, 213-236, 307 · packages/db/package.json:44 · package.json:18

Evidence. The seed creates a fully functional, pre-verified Admin login: admin@turbo-template.local / password123. ADMIN_ROLE short-circuits every permission check (rbac.service.ts:47). onConflictDoUpdate means re-running resets the password even if an operator changed it. The credential is printed to stdout (:307). The only precondition check is that DATABASE_URL is set — no NODE_ENV check, no prompt, no refusal on a non-empty database.

Can it reach production? No workflow invokes it — neither deploy workflow nor either Dockerfile runs db:seed. But packages/db/package.json:44 defines "seed": "... && pnpm push && tsx src/seed.ts", so pnpm db:seed silently runs drizzle-kit push first. A developer with a production DATABASE_URL in their shell performs a schema push and an admin-credential reset in one command with no warning.

Attack scenario. Preconditions: either (a) an operator runs pnpm db:seed against a production or staging DATABASE_URL — plausible given the innocuous command name and absent guard; or (b) a staging environment seeded this way is internet-reachable, which docker-compose.staging.yml:44 (0.0.0.0:3000) makes plausible. Attack: sign in with the publicly known template credentials. Gain: Admin role, therefore all RBAC endpoints plus, via F-01, all ticket PII. Why controls don't stop it: the account is created emailVerified: true, bypassing verification; the password satisfies Better Auth's minimum; nothing prevents seeding a non-development database.

Remediation (illustrative).


if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
  throw new Error("Refusing to seed a production database")
}
const seedPassword = process.env.SEED_PASSWORD ?? randomBytes(18).toString("base64url")
Decouple pnpm push from pnpm seed so schema mutation is explicit.

Verification. Set NODE_ENV=production; confirm the seed exits non-zero without touching the database.

Residual risk. Confidence is Medium because reaching production requires operator action; the unguarded destructive script with fixed credentials is unambiguous and repository-remediable.

F-07 — Staging deploy streams secrets over SSH with host-key verification disabled
Severity: High · Confidence: High · Area 12

Affected: .github/workflows/deploy-staging.yml:125-126, 130, 138-152, 155-157 · line 140 specifically

Evidence. Three defects compound. (1) ssh -o StrictHostKeyChecking=no accepts any host key. The outer heredoc << DEPLOY is unquoted, so $DATABASE_URL, $BETTER_AUTH_SECRET, $GOOGLE_CLIENT_SECRET, and $CORS_ORIGINS are expanded by the runner's shell before transmission and sent as literal text. (2) Line 140 reads ECR_REPOSITORY_WEB=$ECR_REPOSITORY_BACKEND — the wrong variable, so staging pulls the backend image for the web service and has never actually run the frontend. (3) The nested heredoc at :155-157 opens << 'COMPOSE' (quoted) yet contains $(cat docker-compose.staging.yml), which executes on the runner via the outer unquoted heredoc — working by accident.

Attack scenario. Preconditions: a network position between the GitHub runner and $STG_EC2_HOST, or control of an IP that hostname later resolves to. STG_EC2_HOST is a vars. value (not a secret) pointing at an Elastic IP, so reassignment after teardown is a realistic path. Attack: answer the SSH connection; the runner streams the expanded heredoc. Gain: DATABASE_URL (full Postgres credentials), BETTER_AUTH_SECRET (which per F-03 enables session forgery), GOOGLE_CLIENT_SECRET. Why controls don't stop it: no known_hosts pinning, no bastion, and secrets are pushed in the payload rather than pulled by the instance from SSM — unlike the production workflow, which does use SSM correctly.

Remediation. Store an ssh-keyscan result as a secret and drop StrictHostKeyChecking=no; migrate staging to the production SSM pattern; fix line 140; quote the outer delimiter (<< 'DEPLOY').

Verification. Confirm the deploy fails against a host whose key is not in the pinned known_hosts.

Residual risk. Instance-side secret handling after SSM retrieval remains external.

F-08 — packages/contracts depends on the wrong orpc package
Severity: High · Confidence: High · Area 11

Affected: packages/contracts/package.json:26 · pnpm-lock.yaml:560-564, 7231-7237, 15669-15675 · deprecated transitives at :5117-5121 (debug@4.1.1, ReDoS) and :8697-8701 (uuid@3.4.0)

Evidence. The real oRPC packages are scoped @orpc/* and are correctly declared in the catalog (pnpm-workspace.yaml:11-12). The bare orpc name is an unrelated, abandoned 2018 package. No file imports it — zero from "orpc" matches repo-wide. It is dead weight that nonetheless materialises socket.io@2.5.1, socket.io-client@2.5.0, engine.io@3.6.2, and two packages the registry itself flags as deprecated.

Attack scenario. Preconditions: an attacker gains publish rights to the dormant orpc package — maintainer account takeover or expired-domain email reset. Abandoned packages with an established name and a live dependent are exactly the profile targeted in real supply-chain incidents. Attack: publish orpc@0.1.2 (satisfying ^0.1.1) containing malicious module or install-script code. Gain: on the next install that resolves a new version — fresh clone, cold CI cache, any lockfile refresh — arbitrary code executes in a context holding BETTER_AUTH_SECRET, DATABASE_URL, GOOGLE_CLIENT_SECRET, and AWS_SECRET_ACCESS_KEY. Why controls don't stop it: --frozen-lockfile pins the current resolution, but the caret range means any legitimate refresh pulls the new version; onlyBuiltDependencies blocks install scripts but not module code executed at import time.

Remediation. Delete line 26 from packages/contracts/package.json and refresh the lockfile in a normal workflow.

Verification. Confirm pnpm-lock.yaml contains no socket.io entry and that pnpm build/pnpm typecheck still pass — they will, since nothing imports it.

Residual risk. None once removed. Highest value-to-effort ratio in the audit: one deleted line also clears every deprecated package from the graph.

F-09 — CI gate is an external workflow on a mutable ref with secrets: inherit
Severity: High · Confidence: Medium · Areas 11, 12

Affected: .github/workflows/ci.yml:13-14 · deploy-production.yml:26, 30 · deploy-staging.yml:23, 27

Evidence. The entire quality gate is one call to Quanby-IT-Solutions/.github/.github/workflows/quality-gate.yml@main. @main is mutable — the workflow's content can change without any commit here. secrets: inherit passes every repository secret into it, including AWS_SECRET_ACCESS_KEY and PR_BOT_APP_PRIVATE_KEY.

Attack scenario. Preconditions: write access to the Quanby-IT-Solutions/.github repository — a separate repo whose access controls are likely broader than production-deploy access, since org .github repos are commonly writable by more maintainers. Attack: modify quality-gate.yml@main to exfiltrate inherited secrets and to always report success. Gain: the full secret set for both environments, plus a permanently-green gate that lets deploy-production proceed (needs: ci). Why controls don't stop it: @main provides no integrity pinning, secrets: inherit no scoping, and both deploys treat CI success as authoritative.

Second-order consequence. Because the gate is unreadable here, this audit cannot verify that CI runs lint, typecheck, or any test.

Remediation. Pin to a 40-character commit SHA; replace secrets: inherit with an explicit secrets: map listing only what the gate requires.

Verification. Confirm ci.yml references a SHA and that removing secrets: inherit does not break the gate.

Residual risk. Confidence Medium — the external workflow's current contents are unknown. The pinning and scoping weakness is fully verifiable from ci.yml alone.

MEDIUM
F-10 — users:manage permits self-escalation to Admin. rbac.controller.ts:78-85, rbac-admin.service.ts:189-192, rbac.service.ts:94-104, rbac-admin.service.ts:115-140. Admin is protected from renaming (:92-94) and deletion (:145-147) but not from being granted. assignUserRole accepts any userId (including the caller's) and any roleName (including "Admin"). Two equivalent paths: POST /rbac/users/{ownId}/roles {"roleName":"Admin"}, or adding all catalog permissions to one's own role. Impact: users:manage is de facto Admin — the intended delegated-admin tier does not exist. No seeded non-Admin role currently holds users:manage, so this is latent until an operator creates one, which the UI fully supports. Fix: reject Admin grants unless the caller holds Admin; reject setRolePermissions on a role the caller holds. Verify: as a users:manage non-Admin, attempt self-grant; expect 403. Residual: audit trail still absent (F-17).

F-11 — Todo update/delete are capability-gated but not ownership-scoped. todos.service.ts:44-57, 59-63; handlers take no @Session() (todos.controller.ts:50, 60). create correctly threads session.user.id (:42), proving the concept is understood. Any holder of posts:edit/posts:delete can mutate any user's todo by ID; the seeded Manager role holds posts:* (seed.ts:193), which the wildcard matcher expands to both. Not elevated because this is the examples/ module — no PII, excluded from coverage (package.json:117). Its real risk is as the template's only CRUD reference, which downstream projects will copy onto real data. Fix: and(eq(todos.id, id), eq(todos.authorId, session.user.id)). Verify: as A, attempt to modify B's todo; expect 404/403.

F-12 — Security headers absent at all three layers. apps/web/next.config.ts:10-31 (no headers()), apps/backend/src/bootstrap.ts (no helmet; helmet absent from the manifest), nginx/nginx.conf:12-44 (no add_header). No CSP, HSTS, X-Frame-Options/frame-ancestors, X-Content-Type-Options, Referrer-Policy, or Permissions-Policy anywhere. Concrete consequences rather than generic best practice: no frame protection enables F-21; no Referrer-Policy amplifies F-20 (the browser default still sends full URLs same-origin, and these pages load same-origin subresources); no HSTS while the TLS redirect is commented out (F-15) means the repository expresses no HTTPS expectation at all. Fix: headers() in Next.js, helmet() in bootstrap.ts, add_header in Nginx — layered so one misconfiguration does not remove all protection. Verify: curl -I each layer.

F-13 — Idempotency keys are global, unbounded, unvalidated, and never expire. schema.ts:122-127 (key: text().primaryKey()), idempotency.interceptor.ts:56-57, 77, 81-92, 103. Four issues from one design decision — a global rather than per-user key: (a) a user can permanently squat a key another user might choose (mitigated in practice by crypto.randomUUID() client-side, but eliminated entirely by a composite PK); (b) no TTL, no cleanup, no DELETE anywhere — every idempotent write persists forever including the full response body; (c) no length or charset validation on the header, so multi-kilobyte keys are storable; (d) hashtext() is 32-bit, so distinct keys collide around every ~77k keys, causing unnecessary lock serialisation that becomes a contention vector under F-02. Fix: composite (authorId, key) PK, .max(255) header validation, expiresAt column plus cleanup. Verify: confirm two users can independently use the same key string; confirm a 300-char key is rejected.

F-14 — No request body size limit; no Nginx limits or timeouts. app.config.ts:15-16 calls express.json() and express.urlencoded() with no limit, after bootstrap.ts:28 disabled the default parser. nginx.conf sets no client_max_body_size, proxy_read_timeout, proxy_send_timeout, or client_body_timeout. Express's 100 KB default is the accidental mitigating control for F-29's unbounded concern — it is implicit and undocumented, and anyone raising it silently removes the cap. Absent timeouts leave slow-request exhaustion unbounded. Fix: express.json({ limit: "100kb" }), matching urlencoded, plus client_max_body_size 1m; and explicit proxy timeouts. Verify: POST 200 KB; expect 413 at both layers.

F-15 — Nginx TLS commented out; upstreams point at the wrong host. nginx.conf:51-86 has the entire TLS server block, including the HTTP→HTTPS 301, commented out — so the active config is HTTP-only on port 80 and the repository expresses no HTTPS enforcement. :23, 34 route to host.docker.internal, but docker-compose.yml:47-48 defines services named web/backend on app-network; the resolver 127.0.0.11 comment at :19 describes re-resolving Docker service names, which these are not. Combined with F-24's mobile cleartext flag, the shipped default posture is plaintext end to end. Lines 41-42 are not evidence of WebSockets — confirmed absent. Fix: ship the TLS block behind a documented cert path or delete it and document ALB termination; correct the upstreams. Verify: docker compose up and confirm /api/ routes resolve.

F-16 — Env validation is skipped whenever CI is set. env.config.ts:46, packages/auth/src/config.ts:52, apps/web/env.ts:62 — all three use skipValidation: !!process.env.CI || .... GitHub Actions sets CI=true for every step, so all validators return raw process.env with no schema checks and no defaults applied. Two consequences: CI cannot catch env misconfiguration (the production workflow compensates with a hand-written require_var at deploy-production.yml:70-94 that checks presence only, for ~15 fewer variables than Compose consumes — so SMTP can be silently unset, triggering F-05's fail-open transport); and defaults are silently lost, which pino-logger.config.ts:22 explicitly works around with env.LOG_LEVEL ?? "info" in one place while dozens of other reads assume defaults exist. Fix: explicit SKIP_ENV_VALIDATION=1 set only for lint/test tasks. Verify: run a CI build with a deliberately malformed CORS_ORIGINS; expect failure.

F-17 — No audit trail for RBAC changes. schema.ts:133-177 defines no audit table; rbac-admin.service.ts:71-197 writes none. updatedAt captures when, never who. The repository's own docs/TICKETS.md:42, 44, 48 specifies an audit_log table and a reusable writeAudit() helper — unimplemented. Directly compounds F-10: a users:manage holder can grant themselves Admin with no record. Fix: append-only audit_log (actor, action, target, timestamp, request id) written inside the same transaction as each mutation. Verify: perform a role assignment; confirm a row appears.

F-18 — Reset-email error asymmetry leaks SMTP internals and creates an enumeration oracle. packages/auth/src/config.ts:150-162 calls sendMail with no try/catch, while the adjacent verification sender at :127-144 deliberately wraps and sanitises with the comment "so SMTP internals never leak." Raw nodemailer errors typically embed host, port, and response code. Worse, Better Auth only invokes sendResetPassword when the account exists — so under SMTP degradation a registered email yields 500 while an unregistered one yields the neutral 200, and forgot-password.hooks.ts:26-28 actively amplifies this by re-throwing on status >= 500 while swallowing everything else. This defeats the anti-enumeration design the surrounding comment claims. Fix: mirror the verification path's try/catch + sanitised APIError. Verify: point SMTP_HOST at a closed port; confirm known and unknown emails return identical status and body.

F-19 — Paused mutations replay under whichever session is active at reconnect. query-client.ts:34-36 persists any paused mutation; provider.tsx:93-96 calls resumePausedMutations() unconditionally after restore, with no check that the session still belongs to the queueing user; todos.hooks.ts:21 sends credentials: "include". User A queues offline and signs out; B signs in on the same profile; on reconnect the mutation replays under B's session. The backend sets authorId from the verified session, so the row is created as B's — no privilege escalation, but an unauthorised write attributed to B. The idempotency interceptor does not prevent it: the key is unused, so it takes the insert path. Held at Medium because there is no cross-user authorization compromise, and the feature is the example todos module. Existing mitigations are good: retryUnlessAuth (:78-81) refuses to retry 401/403 by status, and useTodoReplayErrors (:256-276) surfaces failures. Fix: record the queueing user id in mutation variables and abort on mismatch — or purge paused mutations on sign-out, which F-04's fix achieves.

F-20 — Reset/verification tokens are SW-cacheable and referrer-exposed. app/(auth)/reset-password/page.tsx:6-13 and verify-email/page.tsx:6-13 read the token from searchParams and pass it into a client component, so it appears in the URL, the RSC payload, and the initial HTML. app/sw.ts:35 overrides only /api with NetworkOnly; :38 lets defaultCache handle document navigations, so /reset-password?token=… is cache-eligible keyed by full URL. Neither page sets force-dynamic or Cache-Control. With no Referrer-Policy (F-12), same-origin subresource requests carry the full URL in Referer. Bounded because tokens are single-use and short-lived. Fix: NetworkOnly matcher for /reset-password and /verify-email; Referrer-Policy: no-referrer on (auth) routes. Verify: complete a reset, then inspect Cache Storage keys.

F-21 — RBAC administration UI is framable. No frame-protection header at any layer (F-12); target UI at app/(site)/user-management/page.tsx → user-management-view.tsx:19-30. An authenticated administrator visiting an attacker page that iframes /user-management with opacity 0 can be click-jacked into role assignment — and per F-10 that is a privilege-escalation primitive, not a nuisance. Held at Medium: the attack requires precise targeting through a tabbed interface with dialogs, and the CSRF question is unresolved (F-59) — if Better Auth emits SameSite=Lax/Strict, the framed page carries no credentials and the attack fails outright. Fix: X-Frame-Options: DENY and frame-ancestors 'none'.

F-22 — typescript.ignoreBuildErrors: true. apps/web/next.config.ts:25. Type errors do not fail next build. The repository otherwise takes types seriously — end-to-end typed contracts, documented pnpm typecheck — making this a deliberate escape hatch that undermines the design. Security-relevant because access.ts, get-access.ts, and rbac.hooks.ts are type-driven: a renamed PermissionName or changed MePermissions shape ships silently. Partially counterweighted by turbo.json:9 (build depends on ^typecheck), but that does not cover Next.js's own check. eslint.ignoreDuringBuilds is not set. Fix: remove the flag.

F-23 — Mobile session cookie duplicated into secure storage and re-injected on every request. api_client.dart:41-44 already installs PersistCookieJar + CookieManager; :47-65 adds a redundant second interceptor. Two defects: setCookie.join('; ') (:60) concatenates full Set-Cookie headers including attributes and sends them as a Cookie: request header — syntactically wrong — and because this interceptor is registered after CookieManager, line 52 overwrites the correctly computed value. It also applies no domain/path scoping, so the stored value attaches to every request the client makes; harmless today with a single host, but a cross-host leak the moment a second host is added. Compounds F-43 and the default-true allowBackup (F-47). Fix: delete the manual interceptor.

F-24 — Cleartext HTTP enabled app-wide; non-TLS default base URL. AndroidManifest.xml:19 sets usesCleartextTraffic="true" on the release manifest (src/main/), not a debug variant, disabling Android 9+'s default block for all destinations. No network_security_config.xml exists to narrow it. api_constants.dart:7 falls back to http://10.0.2.2:3000/api when API_BASE_URL is unset. Fix: move the flag to src/debug/AndroidManifest.xml or add a scoped network_security_config.xml; make the constants fallback fail loudly.

F-25 — Production workflow writes all secrets to a plaintext temp file. deploy-production.yml:196-211 heredocs DATABASE_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_SECRET, and CORS_ORIGINS unencrypted to /tmp/deploy.env; :213 base64-encodes into a shell variable; :220's rm -f does not run if an earlier command fails (the step lacks set -e, unlike :68). Base64 is encoding, not encryption — GitHub's log masking matches the raw secret, so the $ENV_B64 form is unmasked. No permissions: block. Credit: the SSM parameter is correctly SecureString (:216) and ECR login uses mask-password: true (:112). Fix: pipe the heredoc directly into base64 without touching disk; add set -euo pipefail and permissions: { contents: read }.

F-26 — No action SHA-pinning; no permissions on the three most privileged workflows.

Workflow	permissions	Pinning
ci.yml	none	❌ @main branch
deploy-production.yml	none	❌ checkout@v6, configure-aws-credentials@v4, amazon-ecr-login@v2, setup-buildx-action@v3, cache@v5
deploy-staging.yml	none	❌ same set at v4
release-changelog.yml	✅ contents: write, pull-requests: read	❌ checkout@v4
auto-draft-pr.yml	✅ contents: read	❌ create-github-app-token@v3
Major-version tags are mutable; a compromised publisher can move v4 to malicious code executing in a job holding AWS credentials. The practice is clearly understood — auto-draft-pr.yml:7-9 declares least privilege with an explanatory comment — it simply was not applied to the deploy workflows. Fix: pin every action to a full SHA with a version comment; add permissions blocks.

F-27 — Buildx cache restorable across refs. deploy-production.yml:117-123 and deploy-staging.yml:86-91 use broad restore-keys prefixes; caches feed --cache-from and are baked into pushed images. Confidence Medium: neither deploy is pull_request-triggered (both are push to protected branches plus workflow_dispatch), so the path requires branch-push access. Fix: include a content hash in the key and narrow restore-keys.

F-28 — Root postinstall runs an unpinned remote package. package.json:31 → :30 → pnpm dlx sherif@latest. Every pnpm install downloads and executes an unpinned package with no lockfile entry and no integrity check; the try/catch swallows all errors including a tampered download. pnpm install --frozen-lockfile in both Dockerfiles still triggers postinstall, so this reaches the build container. sherif is legitimate — the issue is the unpinned dlx path. Fix: add sherif as a pinned devDependency, or move it to an explicit CI step.

LOW
F-29 — tickets.schema.ts:15: concern is the only unbounded user-controlled string reaching the database; every sibling has .max(255). Storage-abuse path bounded by @StrictThrottle() and Express's implicit 100 KB (F-14), amplified by F-02. Fix: .max(5000). F-30 — tickets.service.ts:26-39: authorId exists, is nullable, is related, and is seeded — but the submit handler never sets it, so every API-created ticket is orphaned despite requiring auth. Attacker-controlled name/email are the only identity recorded, and this forecloses owner-scoping as a fix for F-01. Fix: thread session.user.id, as todos.controller.ts:42 already does. F-31 — rbac.service.ts:106-118: no check that the last Admin assignment is being removed, and no transaction — two concurrent removals of the final two Admins both succeed. Availability, unrecoverable without direct DB access. Fix: count-in-transaction guard. F-32 (merged A1-07 + A4-07) — packages/auth/src/config.ts:171 splits BETTER_AUTH_TRUSTED_ORIGINS with no .trim(); app.config.ts:29 trims but does not .filter(Boolean), so a trailing comma yields "" in a credentials: true allowlist. Fails safe — a mistyped origin is not trusted, breaking flows rather than weakening them — but the failure mode is opaque and invites over-broadening. Fix: .map(s => s.trim()).filter(Boolean) in both, plus URL-shape validation. F-33 — packages/auth/src/config.ts:28, 172-179: any value enables crossSubDomainCookies and passes straight through as the cookie Domain, with no hostname validation. .env.example:23 ships a populated value, so this is the default-followed path. A broad apex domain scopes sessions to every subdomain. Confidence Medium — the exact SameSite/Secure values Better Auth emits under this mode were not verifiable. Fix: validate the domain; leave unset by default. F-34 — packages/auth/src/config.ts:180-184: the Better Auth openAPI plugin is registered unconditionally, bypassing the otherwise-careful docs gating (bootstrap.ts:61-72, tested at auth.config.spec.ts:120-130). GET /api/v1/auth/reference is served in production regardless of ENABLE_API_DOCS. Reconnaissance only. Fix: conditional registration. F-35 — packages/auth/src/config.ts:31-32, 164-170: as string launders undefined, so the Google provider is always registered and the UI always shows an enabled button (social-login-buttons.tsx:24-28). Silently degrades instead of failing closed. Fix: register only when both variables are present. F-36 — health.service.ts:16-17, 24-33, 43: the unauthenticated endpoint returns version, raw NODE_ENV, and uptime, and on DB failure returns (error as Error)?.message verbatim — a pg error typically embeds host, port, and database name, disclosed precisely when the system is degraded. Also no liveness/readiness split despite @nestjs/terminus being an unused declared dependency. Fix: generic external message, log the real error. F-37 — pino-logger.config.ts:53-63: inbound X-Request-Id accepted with no length, charset, or format validation, written to every log line and reflected in the response header (tested behaviour at request-id.spec.ts:89-94). JSON encoding escapes newlines, so the practical risks are downstream processor confusion, deliberate correlation-ID collision, and unbounded entry length. Fix: validate as UUID or cap at 64 safe characters. F-38 (merged A3-04 + A4-09 + PF-10) — app.module.ts:40-41 (in-code comment acknowledges it) and rbac-cache.service.ts:14-18 are both per-process, while docker-compose.production.yml:1-14 explicitly describes an ASG. Effective limits become limit × instances; RbacCacheService.clear() after a revocation affects only the serving instance, leaving up to 60 s of stale permissions elsewhere. Kept Low because F-02 already permits unlimited evasion — reconsider upward if F-02 is fixed without shared state. Fix: Redis for both. F-39 — rbac.controller.ts: none of the six mutation handlers applies IdempotencyInterceptor, while every todo write does. Damage is limited because most operations are naturally idempotent (onConflictDoNothing, deterministic replace-all), so this is a consistency gap in the template's own stated pattern. Fix: apply consistently. F-40 — schema.ts:61-75: verifications has expiresAt but no cleanup anywhere, so expired token material accumulates indefinitely on a table written on every signup, reset, and resend. The composite PK is (identifier, value) with no index on expires_at, so a future cleanup would full-scan. Fix: scheduled delete plus index. F-41 — packages/db/.env.example:6: bare four-line file presenting postgres:password with no guidance, unlike apps/backend/.env.example:13-16 which surrounds the same value with explanation. Same class as F-03 — a functional value where a placeholder belongs. Fix: <user>:<password> placeholder plus a development-only comment. F-42 (merged A8-04 + A9-08) — apps/mobile/pubspec.yaml:78-79 declares .env as a Flutter asset; assets ship in the APK/IPA in cleartext and are recoverable with unzip. Currently benign — the tracked example holds only API_BASE_URL and API_VERSION — but structurally invites a downstream developer to add a key. Note apps/mobile/.gitignore does not list .env; only the root .gitignore:60 covers it. Fix: prominent warning comment; prefer --dart-define. F-43 — auth_repository.dart:98-105 clears both secure-storage keys, but the PersistCookieJar created at api_client.dart:41-43 is a local variable never exposed on a provider, so nothing can call deleteAll(). SecureStorageService.clearAll() exists (:41) and is never called. Mobile sign-out is nonetheless better than web — it clears local credential stores and resets provider state, leaving only invalidated cookie files inside the app sandbox, versus F-04's 24 hours of PII. Fix: expose the jar via a provider and purge it. F-44 — build.gradle.kts:33-39: release { signingConfig = signingConfigs.getByName("debug") }, with a TODO acknowledging it. The debug keystore is universally shared, so the APK can be re-signed and impersonated, cannot be published, and undermines signature-based trust for secure storage and backup. applicationId = "com.example.mobile" (:24) remains the scaffold default. Fix: real signing config from CI secrets; unique application ID. F-45 — login_screen.dart:48-57: prefers data['message'], but falls back to error.response?.statusMessage ?? error.message and, for non-Dio errors, renders error.toString() verbatim. The backend's filter returns a controlled shape, so exposure is limited to non-Dio exceptions — e.g. the json['token'] as String cast at session_model.dart:57 throwing a TypeError — and Dio connection errors, whose message typically embeds the full URL with host and port. Fix: map to fixed user-facing strings. F-46 — login_screen.dart:175-177 enforces ≥ 6 characters; register.schema.ts:6 enforces ≥ 8. Client validation is UX only, but the two clients present different contracts for the same account. Fix: derive both from a shared constant. F-47 — AndroidManifest.xml:10, 13 declare SCHEDULE_EXACT_ALARM and RECEIVE_BOOT_COMPLETED, but notification_service.dart:64-78 only calls createNotification — no scheduling code exists. Unnecessary surface, and SCHEDULE_EXACT_ALARM triggers Play policy review. Separately, no allowBackup/dataExtractionRules declared, so Android's default true applies — making the cookie jar (F-43) and SharedPreferences backup-eligible while secure storage is not. Fix: remove the permissions; set allowBackup="false". F-48 — app/sw.ts:40-49: the fallback matcher is request.destination === "document", i.e. every navigation including /dashboard. Benign alone — ~offline is a static shell with no user data, and the server-side gate still runs on the next real navigation — but it interacts with F-04, since a signed-out user reaching the offline shell can still have the previous user's IndexedDB snapshot restored beneath it. Resolved by fixing F-04. F-49 — app/sw.ts:26-27: skipWaiting + clientsClaim mean a new SW claims open pages mid-session, risking asset/chunk mismatch; the trade-off is documented at serwist-provider.tsx:52-55. Separately, the unregister-and-clear routine at :28-45 returns early in production (:19-22), so there is no in-app recovery path for a bad SW deployment. Fix: consider prompted update; add a production recovery mechanism. F-50 — use-online-status.ts:9, 51-56, 73: every active session fetches https://www.gstatic.com/generate_204 on mount and every 15 seconds, disclosing client IP and session duration to a third party. mode: "no-cors" means no data is read, so this is privacy/data-residency (GDPR-relevant for EU deployments) plus an availability coupling. The repository already has a suitable first-party target: /api/v1/health, anonymous. Fix: probe first-party or make the URL configurable. F-51 — rbac.schema.ts:63-68 + rbac-admin.service.ts:166-187: users:read — a read-only permission held by the seeded Manager role — yields the complete email directory. Arguably by design for a user-management screen, and the service correctly exposes no password, token, or session data. Recorded as permission granularity, explicitly not elevated. Fix: a separate users:read-pii tier. F-52 — Docker12-45: referenced by no Compose file or workflow — both deploys name the app-specific Dockerfiles explicitly. Dead configuration, but markedly worse than the two in use: installs dev dependencies into the runtime, copies the entire source tree rather than build output, has no HEALTHCHECK, and CMD ["pnpm","start"] may attempt a build at container start via turbo.json:17-20. .dockerignore prevents secret leakage. Fix: delete or clearly mark as an unused example. F-53 — packages/db/package.json:58 and pnpm-workspace.yaml:26 pin drizzle-kit/drizzle-orm to 1.0.0-beta.9-e89174b, a production runtime dependency. The exact pin is the right handling for a beta and the two are consistent; the residual concerns are absent security-patch guarantees and possible unpublishing. Note next: 16.1.1 and react: 19.2.3 are stable, not prereleases. Fix: track for 1.0. F-54 — Security-test coverage is strong where it exists and absent elsewhere: RBAC guard (12 cases incl. fail-closed and prod/non-prod error shape), throttler, request-ID, and docs gating are all well tested; ownership/IDOR, idempotency, PWA cache isolation, mobile session cleanup, and XFF trust have no tests at all. Coverage thresholds are 25% lines / 20% branches with the examples module excluded (package.json:109-117) — which is exactly where F-11 lives. Additionally apps/backend/test/app.e2e-spec.ts:32-84 targets /api/v1/examples/todos while the real path is /api/v1/example/todos, so those e2e tests cannot be passing.

INFO
F-55 — tickets.contract.ts:18, 48 declare security: [], advertising ticket.list and ticket.submit as public, but runtime requires a session. The pattern is correct elsewhere (todos.contract.ts:23 and health.contract.ts:21 pair security: [] with @AllowAnonymous()). Important: the "anonymous ticket submission" abuse path named in the audit brief does not exist. If made anonymous, F-01 escalates to Critical — the two must be decided together. F-56 — packages/auth/src/config.ts:88-185 contains no session block: no expiresIn, updateAge, freshAge, or reset-revocation. All behaviour is library default and unpinned. Not elevated — absence of an explicit setting is not a vulnerability. Recommend pinning so an upgrade cannot silently change session lifetime. F-57 — auth.config.ts:25-35 uses url.startsWith(path) and never calls next(), so /api/v1/authfoo matches and is rewritten. No unintended handler is reached, and auth.config.spec.ts:108-118 proves correct registration ordering. Recorded because any future controller under a path beginning auth would be silently unreachable. F-58 — .env.example:63 and config.ts:45 default EMAIL_VERIFICATION_REQUIRED=false, and no account.accountLinking configuration exists. The classic pre-verified-email takeover risk depends on Better Auth's default accountLinking.enabled/trustedProviders, not verifiable without library source. Confidence Low by design. Recommend configuring explicitly and shipping true in the example. F-59 — CSRF posture unresolved. Cookie auth plus credentials: "include" (todos.hooks.ts:21, rbac.hooks.ts:22) means protection rests on the SameSite value Better Auth emits, which could not be determined from tracked files. Per instruction, no assertion is made in either direction. This caps F-21's severity and is the single most valuable open question for the team to close. F-60 — External dependency / residual risk. docker-compose.production.yml:24, 44 and docker-compose.staging.yml:24, 44 bind 0.0.0.0, documented as intentional for ALB health checks. No Nginx service exists in either file, so whether anything filters direct access to port 3000 depends entirely on AWS security groups — outside repository scope. This substantiates F-02's precondition. Positively, docker-compose.yml:68, 104 binds the development stack to 127.0.0.1 with an explanatory comment, and no Compose file defines a database service, so there is no exposed Postgres. F-61 — README.md:335, 405, 411, 414 contain AKIA..., wJal..., -----BEGIN RSA PRIVATE KEY-----..., GOCSPX-.... All are truncated placeholders — a targeted grep for complete key material returned zero matches. They will trigger secret scanners and generate adopter false positives. Positively, :415 correctly instructs openssl rand -base64 32. F-62 — app/(site)/submit-ticket/page.tsx:62-65 builds payload from FormData, awaits an 800 ms setTimeout, discards it with void payload, and reports success (:120). No data leaves the browser — not a vulnerability, but a functional trap for adopters, and confirmation that no frontend anonymous ticket path exists.

Positive assurance by audit area
Area 1 — Authentication, Sessions, Account Lifecycle
Checked: cookie configuration, session lifecycle, hashing, verification, reset flows, enumeration, auth rate limiting, CSRF/origin validation, Google OAuth, versioned path rewriting, SMTP handling, partial config, secret validation, docs exposure. Clean with evidence: password hashing untouched — no password.hash/verify override, Better Auth scrypt retained (config.ts:147-163). Better Auth's own rate limiter explicitly enabled at 10/60 s (:101-105), which matters because auth routes bypass the Nest throttler. Anti-enumeration correctly implemented on both forgot-password (forgot-password.hooks.ts:13-28) and resend-verification (verify-email.hooks.ts:28-38). No open redirect — every navigation target is a literal (router.push("/"), router.push("/login")); no redirect/next/callbackURL parameter is read anywhere, and signIn.social passes no callbackURL, so OAuth open-redirect is N/A. Auth docs gating is correct and tested (auth.config.spec.ts:96-140). Middleware ordering is correct and each step carries an in-code rationale (bootstrap.ts:36-65). Server-side session retrieval uses cache: "no-store" and fails closed to null (auth-server.ts:16-36). No localStorage/sessionStorage anywhere in apps/web. Notably strong: bool-schema.ts:17-20 implements a custom boolean parser specifically to avoid the z.coerce.boolean() trap where "false" becomes true — directly protecting the verification-gating flags, with the rationale documented at :3-15.

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
Checked: hardcoded secrets, .env.example contents, Actions secret exposure, Docker layers, process.env bypass, validation strength, CI bypasses, NEXT_PUBLIC_*, Flutter assets, documentation, drift. Clean with evidence: no hardcoded secrets in source — targeted greps for BEGIN * PRIVATE KEY, AKIA[0-9A-Z]{16}, ghp_, sk_live, and xox[baprs]- matched only README documentation placeholders; zero matches in apps/, packages/, tooling/, scripts/, workflows, or Dockerfiles. process.env discipline is enforced by tooling — every occurrence is a legitimate env-validator input, build tool, CLI, or test setup, and apps/web/vitest.setup.ts:7, 11 carries eslint-disable no-restricted-properties, proving a lint rule actively forbids raw access in app code. No secret enters a Docker layer — no secret ARG/ENV; only the three public NEXT_PUBLIC_* values, correctly placed after the install layer with a comment on cache behaviour. .dockerignore:26-32 excludes all .env* including .env.example plus .git/. Workflow secrets are referenced via env: and never interpolated into run: bodies.

Area 11 — Dependencies and Supply Chain
Checked: manifests, lockfile, onlyBuiltDependencies, install scripts, child_process, frozen-lockfile enforcement, workspace/catalog consistency, name collisions, action pinning, base images, generated-code provenance, dev tooling in production images. Clean with evidence: onlyBuiltDependencies is a genuine, correctly configured supply-chain control — an explicit 10-package allowlist blocking arbitrary install scripts (pnpm-workspace.yaml:50-60). --frozen-lockfile is enforced in both production Dockerfiles. Workspace protocol and catalog usage are consistent across all 11 manifests with no version drift found. Dependency confusion via @repo/*: N/A — unpublished scope, every reference is workspace:*, and linkWorkspacePackages: true enforces local resolution. Generated Dart code has correct provenance — every .g.dart/.freezed.dart has a matching source with proper part directives. prepare: husky is a standard pinned git-hook installer. turbo.json:63 sets globalEnv: [] with a narrow pass-through list, so no secret enters the Turbo cache key. Limitations restated: pnpm audit not run; no Flutter advisory database consulted.

Area 12 — CI/CD, Containers, Reverse Proxy, Guardrails
Checked: Dockerfiles, runtime users, multi-stage boundaries, secrets in layers, build context, healthchecks, Compose bindings and privileges, both deploy workflows, AWS credentials, permissions, environment protection, concurrency, shell injection, cache trust, Nginx, drift, security tests, build escapes. Clean with evidence: the container layer is the strongest part of this audit. Both production images run as a non-root system user created before any copy, with --chown throughout. turbo prune --docker produces a pruned workspace so only dist/.next/standalone reach the runner — no source, no dev dependencies. Healthchecks probe /api/v1/health in the backend image and both deploy Compose files. Shell injection: clean, and checked specifically — no github.event.*, head_ref, PR title, or issue body is interpolated into any run: block; auto-draft-pr.yml:60-66 correctly passes the fetched title through an env: variable and quotes it, which is exactly the pattern that prevents injection. scripts/tickets-to-issues.mjs uses JSON.stringify() on every interpolated value and is invoked by no workflow. Deploys are gated on CI (needs: ci) and declare environment:, enabling approval gates. Concurrency is correctly differentiated — production never cancels an in-flight rolling refresh, staging does. Images are tagged with ${{ github.sha }}, so deployments are commit-traceable. No continue-on-error anywhere. No Compose file defines a database service, so there is no exposed Postgres or default DB credential. turbo.json:9 makes build depend on ^lint and ^typecheck.

4. Prioritized Remediation Roadmap
Block release
All nine are High, repository-remediable, and have code-supported attack paths.

ID	Finding	Effort
F-01	Add a permission guard to the ticket read endpoints	~15 min
F-02	Use the rightmost-untrusted IP; make Nginx overwrite XFF	~30 min
F-03	Placeholder secret + .min(32) validation in both validators	~30 min
F-04	Exclude sensitive query keys from persistence; purge on sign-out	~2 h
F-05	Gate mobile logging on kDebugMode; fail closed on missing SMTP_HOST; extend Pino redaction	~2 h
F-06	Refuse to seed a production database; randomise the seed password	~30 min
F-07	Pin known_hosts; fix the ECR_REPOSITORY_WEB variable swap	~1 h
F-08	Delete "orpc": "^0.1.1" and refresh the lockfile	~5 min
F-09	Pin the CI workflow to a SHA; scope secrets: explicitly	~30 min
Exception noted: F-03, F-06, and F-09 have Medium confidence because their preconditions involve operator action or an external repository. They still block because each yields total compromise — full authentication bypass, a known-credential Admin account, and CI secret exfiltration respectively — and each fix is under an hour.

Fix within 30 days
Authorization boundaries: F-10 (users:manage self-escalation), F-11 (todo ownership), F-17 (RBAC audit trail), F-31 (last-Admin protection). Transport and browser: F-12 (security headers, all three layers), F-15 (Nginx TLS and upstreams), F-20 (token caching and referrer), F-21 (clickjacking), F-59 (resolve the SameSite/CSRF question — this gates the correct severity of F-21 and should be answered first). Abuse and integrity: F-13 (idempotency key model), F-14 (body limits and timeouts), F-19 (paused-mutation replay). Configuration and pipeline: F-16 (CI env validation), F-22 (ignoreBuildErrors), F-25 (secrets to temp file), F-26 (action pinning and workflow permissions), F-27 (cache scoping), F-28 (postinstall remote execution). Mobile: F-23 (cookie duplication), F-24 (cleartext manifest flag), F-44 (release signing). Correctness: F-18 (reset-email error handling), F-30 (ticket authorId), F-55 (contract/runtime mismatch — decide alongside F-01).

Hardening backlog
F-29, F-32, F-33, F-34, F-35, F-36, F-37, F-38, F-39, F-40, F-41, F-42, F-43, F-45, F-46, F-47, F-48, F-49, F-50, F-51, F-52, F-53, F-54, F-56, F-57, F-58, F-60, F-61, F-62.

Two backlog items deserve early attention despite their severity: F-54 (no ownership, idempotency, or cache-isolation tests) means the fixes for F-01, F-04, F-11, and F-13 will ship without regression protection — pair each fix with a test. F-38 (in-memory throttler and RBAC cache in an ASG) should be re-evaluated immediately after F-02 lands, since F-02 currently masks it.

5. Quick Wins
Each is under one engineering day and maps to a finding ID.

 F-08 — Delete line 26 ("orpc": "^0.1.1") from packages/contracts/package.json and refresh the lockfile. Removes an abandoned package and every deprecated transitive dependency in the graph. (~5 min — best value-to-effort in the audit.)
 F-01 — Add @RequirePermissions("users:read") to listTickets and getTicket in tickets.controller.ts:14, 21. (~15 min)
 F-02 — Change throttler-proxy.guard.ts:15 to return the last entry of req.ips, and set proxy_set_header X-Forwarded-For $remote_addr; at nginx.conf:28, 39. (~30 min)
 F-03 — Replace apps/backend/.env.example:21 with a non-functional placeholder; add .min(32) plus a default-value refinement to both BETTER_AUTH_SECRET schemas. (~30 min)
 F-06 — Add a NODE_ENV === "production" guard at the top of seed.ts; source seedPassword from env or randomBytes. (~30 min)
 F-22 — Delete typescript: { ignoreBuildErrors: true } from next.config.ts:25 and fix whatever surfaces. (~1 h)
 F-14 — Add { limit: "100kb" } to both parsers in app.config.ts:15-16; add client_max_body_size 1m; and proxy timeouts to nginx.conf. (~30 min)
 F-29 — Add .max(5000) to concern in tickets.schema.ts:15. (~5 min)
 F-32 — Add .map(s => s.trim()).filter(Boolean) to packages/auth/src/config.ts:171 and app.config.ts:29. (~10 min)
 F-36 — Return a generic "database check failed" from health.service.ts:43 and log the real error server-side. (~15 min)
 F-34 — Make the Better Auth openAPI plugin registration conditional on the docs flag (config.ts:180-184). (~30 min)
 F-35 — Register the Google provider only when both credentials are present (config.ts:164-170), removing the as string casts. (~20 min)
 F-05 (mobile half) — Wrap the three developer.log calls in auth_repository.dart with if (kDebugMode) and drop response.data from the message. (~15 min)
 F-24 — Move usesCleartextTraffic="true" from src/main/AndroidManifest.xml:19 to src/debug/AndroidManifest.xml. (~10 min)
 F-47 — Remove the unused SCHEDULE_EXACT_ALARM and RECEIVE_BOOT_COMPLETED permissions; add android:allowBackup="false". (~10 min)
 F-26 — Add permissions: { contents: read } to ci.yml, deploy-production.yml, and deploy-staging.yml. (~15 min — SHA-pinning is a separate, larger task.)
 F-07 (bug half) — Fix deploy-staging.yml:140 to ECR_REPOSITORY_WEB=$ECR_REPOSITORY_WEB. (~2 min — staging has never run the web image.)
 F-41 — Replace the credential in packages/db/.env.example:6 with a placeholder plus a development-only comment. (~5 min)
 F-50 — Point the connectivity probe at /api/v1/health instead of gstatic.com (use-online-status.ts:9). (~15 min)
 F-52 — Delete the unused root Dockerfile, or add a header comment marking it an unused example. (~5 min)
 F-62 — Wire submit-ticket/page.tsx:62-65 to the real endpoint, or label the form clearly as a mock so adopters are not misled. (~30 min)
End of report. Produced as output only — no file was written. Persisting this document to docs/security-audit/2026-08-11-turbo-template-security-audit.md is the sole task of the final publishing phase.*