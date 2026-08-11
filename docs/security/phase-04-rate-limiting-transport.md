# Phase 4 — Areas 4 & 5: Rate Limiting, Idempotency, Transport, Error Handling & Docs

Status: Complete. Mode: READ-ONLY. No file created, modified, deleted, or formatted. No installs, migrations, seeders, autofix, or commits. Per handoff, no anonymous ticket-submission abuse path was modelled.

## Throttle / Idempotency Coverage Table (write endpoints)

| Write endpoint | Throttle | Idempotency | Body limit | Notes |
|----------------|----------|-------------|------------|-------|
| POST /example/todos | strict (10/min) | ✅ IdempotencyInterceptor | none | Client sends Idempotency-Key |
| PUT /example/todos/{id} | strict | ✅ | none | Client sends key |
| DELETE /example/todos/{id} | strict | ✅ | none | Client sends key |
| POST /rbac/roles | strict | ❌ | none | — |
| PUT /rbac/roles/{id} | strict | ❌ | none | — |
| PUT /rbac/roles/{id}/permissions | strict | ❌ | none | Destructive replace-all |
| DELETE /rbac/roles/{id} | strict | ❌ | none | — |
| POST /rbac/users/{userId}/roles | strict | ❌ | none | — |
| DELETE /rbac/users/{userId}/roles/{roleName} | strict | ❌ | none | — |
| POST /tickets | strict | ❌ | none | Unbounded concern (A3-01) |
| /api/v1/auth/* (all) | Better Auth only (10/60s) | n/a | Better Auth internal | Bypasses Nest entirely |

Read endpoints all sit on the default limiter (100/60s) with no pagination.

## Findings

### A4-01 — X-Forwarded-For spoofing lets any client evade all IP rate limiting
Severity: High · Confidence: High

Affected: throttler-proxy.guard.ts:15 — return (req.ips as string[])?.[0]; bootstrap.ts:40 trust proxy; env.config.ts:32 TRUST_PROXY default 1; nginx.conf:28,39 proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; docker-compose.production.yml "0.0.0.0:3000:3000".

Evidence. getTracker returns req.ips[0] — the leftmost, client-supplied entry. With trust proxy = 1, a pre-set X-Forwarded-For: 1.2.3.4 produces req.ips = ["1.2.3.4"]. Nginx appends rather than replaces, preserving attacker-supplied value. Guard tests only assert the mechanism, never the trust boundary.

Attack scenario. Preconditions: network reachability. Production backend binds 0.0.0.0:3000 with no proxy in compose — attacker may reach backend directly, in which case Express trusts a header from an untrusted peer. Even via Nginx, append preserves forged leftmost value. Attack: send each request with fresh random X-Forwarded-For. Gain: unlimited requests against every strict-limited mutation — RBAC role churn, ticket flooding, unbounded-concern storage abuse. Auth endpoints unaffected (Better Auth own limiter).

Root cause. Trusting the leftmost XFF entry instead of the rightmost-untrusted one.

Remediation. Return ips[ips.length - 1]; Nginx proxy_set_header X-Forwarded-For $remote_addr; TRUST_PROXY=0 when directly exposed.

### A4-02 — No request body size limit on any endpoint
Severity: Medium · Confidence: High

express.json() and express.urlencoded with no limit option. Nginx no client_max_body_size. Express default ~100kb is accidental cap for A3-01. No timeouts configured either.

Remediation. express.json({ limit: "100kb" }); client_max_body_size 1m; plus timeout directives.

### A4-03 — Idempotency keys are globally unique, unbounded, never expired, and unvalidated
Severity: Medium · Confidence: High

Four issues: cross-user key squatting (global PK not composite); no expiry/cleanup; no key validation/length cap; advisory-lock hashtext() 32-bit collisions under unlimited request volume (A4-01).

Remediation. Composite (authorId, key) PK; .max(255); expiresAt + cleanup; consider bigint hash for advisory lock.

### A4-04 — Security headers absent at every layer
Severity: Medium · Confidence: High (consolidated — three layers)

No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy in next.config.ts, bootstrap.ts, or nginx.conf. helmet absent from package.json.

Concrete consequences: no frame protection → clickjacking of RBAC UI (A2-03 path); no Referrer-Policy amplifies A1-09 token URLs; no HSTS and TLS block commented out; no CSP.

Remediation. headers() in next.config.ts, helmet() in bootstrap.ts, add_header in nginx.conf.

### A4-05 — typescript.ignoreBuildErrors: true in the production Next.js build
Severity: Medium · Confidence: High

next.config.ts:25. Type errors in permission-check code (access.ts, get-access.ts, rbac.hooks.ts) ship silently.

Remediation. Remove the flag; fix underlying errors.

### A4-06 — Health endpoint leaks environment, version, uptime, and raw database errors
Severity: Low · Confidence: High

Unauthenticated via @AllowAnonymous(). On DB failure returns (error as Error)?.message verbatim — may embed host/port/dbname.

Remediation. Generic "database check failed" externally; gate version/environment behind non-production check.

### A4-07 — CORS allowlist admits empty entries and is unvalidated
Severity: Low · Confidence: High (shared root cause with A1-07)

split(",").map(trim) without .filter(Boolean). Trailing comma yields [""] with credentials: true. Fails safe. Consolidate with A1-07.

### A4-08 — Unauthenticated attacker controls the correlation ID used in logs
Severity: Low · Confidence: High

Inbound X-Request-Id accepted verbatim, logged and echoed. Log-injection / correlation-ID collision risk.

Remediation. Validate UUID pattern or cap length.

### A4-09 — In-memory throttler and RBAC cache are ineffective in multi-instance deployment
Severity: Low · Confidence: High (consolidates PF-10 + A3-04)

Both per-process. Production compose describes ASG behind ALB. Effective limits become limit × instance_count; RBAC clear() only affects one instance. Kept Low because A4-01 already permits unlimited evasion.

### A4-10 — RBAC write endpoints are not idempotent
Severity: Low · Confidence: High (confirms PF-11)

No RBAC write applies IdempotencyInterceptor; every todo write does. Most ops naturally idempotent; consistency gap.

### A4-11 — API documentation exposure is correctly gated
Severity: Info · Confidence: High

isApiDocsEnabled defaults on only in development; production Compose sets ENABLE_API_DOCS=false; tested. Residual: Better Auth openAPI plugin ungated (A1-05); swagger routes outside Nest guard pipeline if flag enabled.

## Positive Assurance

Error response shape clean (uniform { success, error: { code, message }, timestamp }; no stack). Stack-trace suppression. Non-HttpException handling falls to generic 500. Retry-After passthrough tested. Rate-limit header contract end-to-end. Strict/default limiter isolation tested. Idempotency race safety unusually rigorous (advisory lock, re-check under lock). Idempotency author from session. Middleware ordering documented. Single correlation ID tested. Pino redaction clean for HTTP. CORS not permissive. Graceful shutdown. Container healthcheck. oRPC context clean. OpenAPI generation safety. CSRF posture deferred (SameSite unresolved).

## DoS Surface: Unpaginated List Endpoints

listTodos, listTickets, listUsers, listRoles return complete tables with no LIMIT. Not a standalone finding — sits on default limiter; amplification factor of A4-01. Pagination is hardening backlog.

## Unresolved Coverage

1. docker-compose.staging.yml and Dockerfiles deferred to Areas 11/12.
2. Express json default 100kb assumed (documented behaviour).
3. @nestjs/throttler v6 internal header names not verifiable from source.
4. SameSite still unresolved (A1-08) — CSRF posture open.
5. Nginx TLS block entirely commented out — full proxy audit Areas 11/12.

## Summary

One High, four Medium, five Low, one Info. The High (A4-01) is central: rate limiting is the only abuse control on mutation endpoints and is keyed on a client-controlled header. Amplifies A3-01, A4-02, A4-03, and unpaginated lists.

Ready for Areas 6 and 7 — Next.js Browser Security and PWA Offline Persistence.
