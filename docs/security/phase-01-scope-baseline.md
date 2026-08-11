# Phase 1 — Audit Scope Baseline & Attack-Surface Inventory

Status: Complete. Mode: READ-ONLY. No file was created, modified, deleted, or formatted. No installs, migrations, seeders, autofix, or commits were run. All evidence comes from reading tracked files.

Method note: I have no shell in this session, so git ls-files could not be executed literally. Scope was enumerated by recursive workspace listing, which already excludes node_modules/, .next/, dist/, build/, coverage/, and .turbo/. I cross-checked every exclusion against .gitignore. This substitution is logged in Unresolved Coverage. No ignored local .env file was opened.

## Artifact 1 — Scope Table

| Area | Files | Notes |
|------|-------|-------|
| Repo root | 15 | package.json, pnpm-workspace.yaml, pnpm-lock.yaml, turbo.json, vitest.config.ts, Dockerfile, docker-compose{,.staging,.production}.yml, .dockerignore, .gitignore, .env.example, README.md, TESTING.md |
| apps/web | ~163 | 21 under app/, 70 under core/ (52 are shadcn primitives), 50 under features/, 7 under services/ |
| apps/backend | ~63 | 3 entry, 8 common/, 10 config/, 19 modules/v1/, 7 shared/, 1 utils/, 3 test/ |
| apps/mobile | ~86 | 59 Dart under lib/, 14 Android config, 1 test, 12 root |
| packages/* | ~70 | auth 15, contracts 28, db 18, e2e-web 9 |
| tooling/ | 14 | eslint 6, prettier 3, typescript 5 |
| .github/ | 5 | ci.yml, deploy-staging.yml, deploy-production.yml, release-changelog.yml, auto-draft-pr.yml |
| nginx/ | 1 | nginx.conf |
| scripts/ | 1 | tickets-to-issues.mjs |
| docs/ | 5 | incl. security-audit-prompt.md (this audit's own brief, checked in) |

Exclusions confirmed. .gitignore lines 4, 9, 28–35, 38, 60–61, 67, 70, 96 cover node_modules, .next/, Flutter build output, build, .env / .env*.local, dist/, .turbo, **/coverage/. .dockerignore lines 2–29 additionally strip tests, build output, and all .env* including .env.example from build context.

Tracked .env.example inventory (names only — contents deferred to the secrets phase): root .env.example, apps/web/.env.example, apps/backend/.env.example, apps/mobile/.env.example, packages/db/.env.example. All five expected files are present.

Two observations relevant to later phases: docs/security-audit/ does not exist yet (the publishing phase will create it). Tool output files apps/mobile/analyze.txt and apps/mobile/analyze_output.txt are tracked, and apps/web/test-tailwind.tsx sits at the web app root — flagged for the CI/CD phase as hygiene, not security.

## Artifact 2 — oRPC Contract Route Enumeration

Root router: packages/contracts/src/modules/v1/v1.contract.ts:13 applies prefix /v1 over five sub-routers. Global prefix api plus URI versioning is set in apps/backend/src/bootstrap.ts:18-19, so every path below resolves to /api/v1/....

| Contract path | Method + effective path | Definition |
|---------------|------------------------|------------|
| health.check | GET /api/v1/health | health.contract.ts:14-23 |
| example.todo.list | GET /api/v1/example/todos | todos.contract.ts:16-25 |
| example.todo.get | GET /api/v1/example/todos/{id} | todos.contract.ts:31-40 |
| example.todo.create | POST /api/v1/example/todos | todos.contract.ts:46-55 |
| example.todo.update | PUT /api/v1/example/todos/{id} | todos.contract.ts:61-70 |
| example.todo.delete | DELETE /api/v1/example/todos/{id} | todos.contract.ts:76-85 |
| me.permissions | GET /api/v1/me/permissions | me.contract.ts:6-14 |
| rbac.roles.list | GET /api/v1/rbac/roles | rbac.contract.ts:27-35 |
| rbac.roles.create | POST /api/v1/rbac/roles | rbac.contract.ts:37-46 |
| rbac.roles.update | PUT /api/v1/rbac/roles/{id} | rbac.contract.ts:48-57 |
| rbac.roles.setPermissions | PUT /api/v1/rbac/roles/{id}/permissions | rbac.contract.ts:59-68 |
| rbac.roles.delete | DELETE /api/v1/rbac/roles/{id} | rbac.contract.ts:70-79 |
| rbac.permissions.list | GET /api/v1/rbac/permissions | rbac.contract.ts:83-91 |
| rbac.users.list | GET /api/v1/rbac/users | rbac.contract.ts:95-103 |
| rbac.users.assignRole | POST /api/v1/rbac/users/{userId}/roles | rbac.contract.ts:105-114 |
| rbac.users.removeRole | DELETE /api/v1/rbac/users/{userId}/roles/{roleName} | rbac.contract.ts:116-125 |
| ticket.list | GET /api/v1/tickets | tickets.contract.ts:11-20 |
| ticket.get | GET /api/v1/tickets/{id} | tickets.contract.ts:26-35 |
| ticket.submit | POST /api/v1/tickets | tickets.contract.ts:41-51 |

19 oRPC routes total. Four declare `spec: spec => ({ ...spec, security: [] })` — health.check, example.todo.list, ticket.list, ticket.submit — which marks them public in the generated OpenAPI document. Only two of those four carry a matching runtime @AllowAnonymous(). See the mismatch flagged as PF-02.

## Artifact 3 — Endpoint Matrix

Global registrations, from apps/backend/src/app.module.ts:66-88: APP_PIPE = ZodValidationPipe, APP_INTERCEPTOR = ZodSerializerInterceptor, APP_FILTER = HttpExceptionFilter, APP_GUARD = ThrottlerProxyGuard then RbacGuard. AuthModule.forRoot({ auth: getAuth(), disableControllers: true }) at line 58 supplies the library's own authentication guard; @AllowAnonymous() is the opt-out.

| Route | Method + path | Contract | Controller | Service | Auth | Perm guard | Owner-scoped | Throttle | Idempotency | User ID source |
|-------|---------------|----------|------------|---------|------|------------|--------------|----------|-------------|----------------|
| health.check | GET /health | health.contract.ts:14 | health.controller.ts:14-15 | health.service.ts | No — @AllowAnonymous() | No | n/a | default only | No | n/a |
| todo.list | GET /example/todos | todos.contract.ts:16 | todos.controller.ts:17-18 | todos.service.ts:16 | No — @AllowAnonymous() | No | No — all rows | default only | No | n/a |
| todo.get | GET /example/todos/{id} | todos.contract.ts:31 | todos.controller.ts:25-26 | todos.service.ts:24 | No — @AllowAnonymous() | No | No | default only | No | n/a |
| todo.create | POST /example/todos | todos.contract.ts:46 | todos.controller.ts:33-36 | todos.service.ts:31 | Yes | posts:create | Sets owner | @StrictThrottle() | Yes | Session (session.user.id, line 42) |
| todo.update | PUT /example/todos/{id} | todos.contract.ts:61 | todos.controller.ts:46-49 | todos.service.ts:44 | Yes | posts:edit | No — where(eq(todos.id, id)) only | @StrictThrottle() | Yes | none consumed |
| todo.delete | DELETE /example/todos/{id} | todos.contract.ts:76 | todos.controller.ts:56-59 | todos.service.ts:59 | Yes | posts:delete | No — id only | @StrictThrottle() | Yes | none consumed |
| me.permissions | GET /me/permissions | me.contract.ts:6 | me.controller.ts:13-14 | rbac.service.ts | Yes + explicit 401 at line 17-19 | No | Self | default only | No | Session (line 16) |
| rbac.roles.list | GET /rbac/roles | rbac.contract.ts:27 | rbac.controller.ts:16-17 | rbac-admin.service.ts | Yes | users:read | n/a | default only | No | n/a |
| rbac.roles.create | POST /rbac/roles | rbac.contract.ts:37 | rbac.controller.ts:24-26 | rbac-admin.service.ts | Yes | users:manage | n/a | @StrictThrottle() | No | n/a |
| rbac.roles.update | PUT /rbac/roles/{id} | rbac.contract.ts:48 | rbac.controller.ts:33-35 | rbac-admin.service.ts | Yes | users:manage | n/a | @StrictThrottle() | No | n/a |
| rbac.roles.setPermissions | PUT /rbac/roles/{id}/permissions | rbac.contract.ts:59 | rbac.controller.ts:42-44 | rbac-admin.service.ts | Yes | users:manage | n/a | @StrictThrottle() | No | n/a |
| rbac.roles.delete | DELETE /rbac/roles/{id} | rbac.contract.ts:70 | rbac.controller.ts:51-53 | rbac-admin.service.ts | Yes | users:manage | n/a | @StrictThrottle() | No | n/a |
| rbac.permissions.list | GET /rbac/permissions | rbac.contract.ts:83 | rbac.controller.ts:61-62 | rbac-admin.service.ts | Yes | users:read | n/a | default only | No | n/a |
| rbac.users.list | GET /rbac/users | rbac.contract.ts:95 | rbac.controller.ts:70-71 | rbac-admin.service.ts | Yes | users:read | n/a | default only | No | n/a |
| rbac.users.assignRole | POST /rbac/users/{userId}/roles | rbac.contract.ts:105 | rbac.controller.ts:78-80 | rbac-admin.service.ts | Yes | users:manage | Request userId | @StrictThrottle() | No | request path param |
| rbac.users.removeRole | DELETE /rbac/users/{userId}/roles/{roleName} | rbac.contract.ts:116 | rbac.controller.ts:87-89 | rbac-admin.service.ts | Yes | users:manage | Request userId | @StrictThrottle() | No | request path param |
| ticket.list | GET /tickets | tickets.contract.ts:11 | tickets.controller.ts:14 | tickets.service.ts:14 | Presumed yes — no @AllowAnonymous() | No | No — all rows, all PII | default only | No | n/a |
| ticket.get | GET /tickets/{id} | tickets.contract.ts:26 | tickets.controller.ts:21 | tickets.service.ts:19 | Presumed yes | No | No | default only | No | n/a |
| ticket.submit | POST /tickets | tickets.contract.ts:41 | tickets.controller.ts:28-29 | tickets.service.ts:26 | Presumed yes (contract says public) | No | Never sets authorId | @StrictThrottle() | No | none |

Enforcement primitives read. rbac.guard.ts:34-36 is inert without @RequirePermissions; it re-resolves the session from headers at lines 64-73 if the library guard has not run, and fails closed at 76-78. require-permissions.decorator.ts:21 widens the type to PermissionName | string. strict-throttle.decorator.ts:21-28 makes the strict limiter opt-in — every route without @StrictThrottle() sits on the default limiter only. idempotency.interceptor.ts bypasses when no Idempotency-Key header (line 60) or no resolvable author (line 68), serializes on pg_advisory_xact_lock(hashtext(key)) (line 77), and rejects cross-author key reuse with 409 (line 91).

## Artifact 4 — Non-oRPC Attack Surface

Better Auth (Express-level, bypasses the Nest pipeline). apps/backend/src/config/auth.config.ts:76 mounts createAuthMiddleware(["/api/v1/auth"]) via httpServer.use(). Lines 25-35 rewrite any URL matching url.startsWith("/api/v1/auth") to the internal base path /auth (packages/auth/src/config.ts:60) and hand it to toNodeHandler, returning without calling next(). Consequence: all /api/v1/auth/* traffic never reaches NestJS guards, the throttler, or the Zod pipe.

Middleware order in apps/backend/src/bootstrap.ts is: trust proxy (line 40) → CORS (46) → pino-http (55) → Better Auth (63) → body parser + versioning (64-65). Each ordering choice is documented in-file.

A documentation-only endpoint GET /api/v1/auth/open-api is registered at auth.config.ts:42 and gated by enableApiDocs. Separately, packages/auth/src/config.ts:180-184 registers the Better Auth openAPI({ path: "/reference" }) plugin unconditionally.

Next.js. Exactly one route handler: apps/web/app/serwist/[path]/route.ts, force-static, returning 404 outside production (line 82). Zero Server Actions — a repo-wide search for "use server" across apps/web/**/*.{ts,tsx} returned no matches. This contradicts the documented pattern in AGENTS.md; noted as drift, not a vulnerability.

Flutter. apps/mobile/lib/core/constants/api_constants.dart:6-19 derives all endpoints from dotenv.env['API_BASE_URL'] with a cleartext fallback http://10.0.2.2:3000/api. Four auth endpoints and two todo endpoints are reachable. The client lives in apps/mobile/lib/services/api/api_client.dart.

## Artifact 5 — Capability-Absence Evidence

One combined regex was run across *.{ts,tsx,dart,json,yml,yaml,mjs,js,md,conf}: stripe|Stripe|STRIPE|paymentIntent|wallet|Wallet|kyc|KYC|notariz|Notariz|livekit|LiveKit|socket\.io|SocketIO|WebSocketGateway|multer|Multer|@aws-sdk|S3Client|openai|OpenAI|anthropic|webhook|Webhook.

| Capability | Verdict | Evidence |
|------------|---------|----------|
| Payments / Stripe | N/A — absent | Zero hits outside docs/security-audit-prompt.md:51 |
| Wallet | N/A — absent | Same; prompt text only |
| KYC | N/A — absent | Same |
| Notarization | N/A — absent | Same |
| File upload / multer | N/A — absent | multer@2.0.2 appears only in pnpm-lock.yaml:7018, 10818, 15445 as a transitive dep of @nestjs/platform-express. No FileInterceptor, no @UploadedFile. .gitignore:81 reserves apps/backend/uploads/ but no code writes there |
| S3 / AWS SDK object storage | N/A — absent | @aws-sdk/client-rds-data appears at pnpm-lock.yaml:5275, 5311 solely as an optional peer of drizzle-orm; not installed, not imported |
| LiveKit | N/A — absent | Zero hits |
| Socket.IO / WebSockets | N/A — no application code | socket.io@2.5.1 and socket.io-client@2.5.0 are present in the lockfile only as dependencies of the orpc@0.1.1 package (pnpm-lock.yaml:564, 15669-15672). No WebSocketGateway, no @nestjs/websockets in any package.json. Per the brief, Nginx upgrade headers must not be read as evidence of WebSocket use |
| Webhooks | N/A — absent | Zero hits outside the prompt document |
| AI / LLM services | N/A — absent | No openai, anthropic, or equivalent |

## Provisional Findings (no severity assigned — for later phases to confirm)

| ID | Observation | Location | Owner phase |
|----|-------------|----------|-------------|
| PF-01 | packages/contracts depends on a package literally named orpc ^0.1.1 — an unrelated, abandoned 2018-era package, not the real @orpc/* scope. It drags in socket.io@2.5.1, socket.io-client@2.5.0, and uuid@3.4.0. No source file imports bare orpc. Name-collision / dependency-confusion shape | packages/contracts/package.json:27; pnpm-lock.yaml:560-564, 15669-15675 | Dependencies & Supply Chain |
| PF-02 | Contract declares security: [] for ticket.list and ticket.submit, but neither controller method carries @AllowAnonymous(). Published OpenAPI and runtime enforcement disagree | tickets.contract.ts:18, 48 vs tickets.controller.ts:14, 28 | Authorization & Contracts |
| PF-03 | Ticket read endpoints have no @RequirePermissions and no scoping; findAll() returns every ticket with name, email, subject, and concern | tickets.controller.ts:14, 21; tickets.service.ts:14-24 | Authorization & IDOR |
| PF-04 | todo.update / todo.delete filter on id alone. posts:edit / posts:delete is a capability check, not an ownership check | todos.service.ts:44-63 | Authorization & IDOR |
| PF-05 | socialProviders.google is registered unconditionally with clientId: authEnv.GOOGLE_CLIENT_ID as string even when the variable is .optional() and undefined | packages/auth/src/config.ts:31-32, 164-170 | Authentication |
| PF-06 | Better Auth openAPI({ path: "/reference" }) plugin registered with no environment gate, unlike the separately gated /open-api route | packages/auth/src/config.ts:180-184 vs auth.config.ts:64 | Authentication / API docs |
| PF-07 | BETTER_AUTH_SECRET: z.string() — no minimum length or entropy floor, in both env validators | packages/auth/src/config.ts:26; apps/backend/src/config/env.config.ts:38 | Auth / Secrets |
| PF-08 | trustedOrigins: authEnv.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") — no .trim(), no empty-entry filter. CORS_ORIGINS.split(",").map(trim) trims but does not drop empties | packages/auth/src/config.ts:171; app.config.ts:29 | Authentication / Transport |
| PF-09 | skipValidation: !!process.env.CI \|\| npm_lifecycle_event === "lint" in both env validators — CI never exercises env validation | packages/auth/src/config.ts:52; env.config.ts:46 | Secrets & Environment |
| PF-10 | Throttler uses default in-memory storage; the limitation is acknowledged in a code comment | app.module.ts:40-41 | Rate Limiting |
| PF-11 | No RBAC write endpoint applies IdempotencyInterceptor, though every todo write does | rbac.controller.ts (all @StrictThrottle methods) | Rate Limiting & Idempotency |
| PF-12 | CreateTicketSchema inherits concern: z.string().min(1) with no .max() — unbounded body field on a strict-throttled but otherwise open write | tickets.schema.ts:15, 32-38 | Contracts & Validation |
| PF-13 | Flutter default base URL is cleartext http://10.0.2.2:3000/api when API_BASE_URL is unset | api_constants.dart:7 | Flutter Mobile |
| PF-14 | Build-time, not injectable. execSync("git rev-parse HEAD") runs with a static literal command at module scope in a force-static route. Recorded now so it is not later misclassified as command injection | apps/web/app/serwist/[path]/route.ts:1, 31-34 | Contracts & Injection |
| PF-15 | @RequirePermissions accepts PermissionName \| string, so a typo silently becomes an unknown permission. RbacService is documented to fail closed — needs verification | require-permissions.decorator.ts:21 | Authorization |
| PF-16 | Docs describe services/orpc/client.ts and Server Actions; only services/orpc/orpc-server.ts exists and no "use server" module exists | AGENTS.md vs apps/web/services/orpc/ | CI/CD & Docs Drift |

## Unresolved Coverage

1. git ls-files not executed — no shell available. Scope derived from recursive listing plus .gitignore cross-check. File counts are approximate (±2 per area); route, line, and content evidence is exact.

2. Global AuthGuard registration not directly confirmed. AuthModule.forRoot({ disableControllers: true }) (app.module.ts:58) plus the presence of @AllowAnonymous() on todos list/get and health strongly implies a globally applied library guard, but the registration lives inside @thallesp/nestjs-better-auth v2.2.0, outside the tracked tree. Every "Presumed yes" in the matrix depends on this. The Authentication phase must confirm it before PF-02 and PF-03 can be graded — if the guard is not global, the ticket endpoints are anonymous and PF-03 escalates sharply.

3. rbac-admin.service.ts and rbac.service.ts bodies not yet read — deferred to the Authorization phase. Default-role bootstrap, reserved-role protection, and cache invalidation are unassessed.

4. nginx.conf, all Dockerfiles, all Compose files, and all five workflows were inventoried but not opened — deferred to the CI/CD & Containers phase.

5. pnpm audit not run. Reserved for the Dependencies phase, where the git status --porcelain before/after check is mandated.

6. No tracked apps/mobile/ios/ directory. Recursive listing shows android/ only. iOS transport and entitlement configuration is N/A — untracked, with this listing as evidence.

7. rbac.catalog.ts, me.schema.ts, rbac.schema.ts, and packages/db/src/schema.ts not yet read — deferred to their owning phases.

## Confirmation

No file was created, modified, deleted, renamed, or formatted during this phase. No command that mutates the working tree was executed. No ignored .env file was read. No severity was assigned; all sixteen observations are recorded as provisional pending their owning phase.

The baseline is ready. Assign Area 1 — Authentication, Sessions and Account Lifecycle next; its first task should be resolving Unresolved Coverage item 2, since three provisional findings hinge on it.
