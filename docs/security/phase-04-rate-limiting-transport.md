> These records are summarised for a public repo. They keep what was found, what changed, and where, without internal finding ids or step-by-step misuse.

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
| POST /tickets | strict | ❌ | none | Unbounded concern (Unbounded concern field on ticket submission) |
| /api/v1/auth/* (all) | Better Auth only (10/60s) | n/a | Better Auth internal | Does not enter Nest |

Read endpoints all sit on the default limiter (100/60s) with no pagination.

## Findings

### Throttle keys could be influenced by request headers
Severity: High · Confidence: High

Affected: `apps/backend/src/shared/guards/throttler-proxy.guard.ts`, `apps/backend/src/bootstrap.ts`, `apps/backend/src/config/env.config.ts` (`TRUST_PROXY`), `nginx/nginx.conf`, and `docker-compose.production.yml` (published app port). The throttle key could be influenced by request headers. Fixed by setting the forwarded header from the connection address and `TRUST_PROXY` equal to the hop count.

Evidence. The throttle key in `throttler-proxy.guard.ts` could be influenced by request headers. `nginx/nginx.conf` did not set the forwarded header from the connection address, and `TRUST_PROXY` did not equal the hop count. Guard tests cover extraction and do not cover the trust boundary.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Root cause. The throttle key was not taken from the trusted proxy hop.

Remediation. Set the forwarded header from the connection address. Set `TRUST_PROXY` equal to the hop count (0 when the app is directly exposed). Derive the throttle key only from that trusted hop, and change the tracker and the hop count together.

### No request body size limit on any endpoint
Severity: Medium · Confidence: High

express.json() and express.urlencoded with no limit option. Nginx no client_max_body_size. Express default ~100kb is accidental cap for Unbounded concern field on ticket submission. No timeouts configured either.

Remediation. express.json({ limit: "100kb" }); client_max_body_size 1m; plus timeout directives.

### Idempotency keys are globally unique, unbounded, never expired, and unvalidated
Severity: Medium · Confidence: High

Four issues: cross-user key squatting (global PK not composite); no expiry/cleanup; no key validation/length cap; advisory-lock hashtext() 32-bit collisions under unlimited request volume (throttle keys could be influenced by request headers).

Remediation. Composite (authorId, key) PK; .max(255); expiresAt + cleanup; consider bigint hash for advisory lock.

### Security headers absent at every layer
Severity: Medium · Confidence: High (consolidated — three layers)

No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy in next.config.ts, bootstrap.ts, or nginx.conf. helmet absent from package.json.

Concrete consequences: no frame protection → framing of RBAC UI (users:manage permits self-escalation to Admin (privilege boundary collapse) path); no Referrer-Policy amplifies Reset and verification tokens travel in URL query strings token URLs; no HSTS and TLS block commented out; no CSP.

Remediation. headers() in next.config.ts, helmet() in bootstrap.ts, add_header in nginx.conf.

### typescript.ignoreBuildErrors: true in the production Next.js build
Severity: Medium · Confidence: High

next.config.ts:25. Type errors in permission-check code (access.ts, get-access.ts, rbac.hooks.ts) ship silently.

Remediation. Remove the flag; fix underlying errors.

### Health endpoint leaks environment, version, uptime, and raw database errors
Severity: Low · Confidence: High

Unauthenticated via @AllowAnonymous(). On DB failure returns (error as Error)?.message verbatim — may embed host/port/dbname.

Remediation. Generic "database check failed" externally; gate version/environment behind non-production check.

### CORS allowlist admits empty entries and is unvalidated
Severity: Low · Confidence: High (shared root cause with trustedOrigins parsed without trimming or empty-entry filtering)

split(",").map(trim) without .filter(Boolean). Trailing comma yields [""] with credentials: true. Fails safe. Consolidate with trustedOrigins parsed without trimming or empty-entry filtering.

### Inbound correlation IDs used in logs are not validated
Severity: Low · Confidence: High

Inbound X-Request-Id accepted verbatim, logged and echoed. Request ids must be validated (format and length) before they are logged or echoed.

Remediation. Validate UUID pattern or cap length.

### In-memory throttler and RBAC cache are ineffective in multi-instance deployment
Severity: Low · Confidence: High (consolidates in-memory throttler storage + RBAC permission cache holds a 60-second stale-permission window)

Both per-process. Production compose describes ASG behind ALB. Effective limits become limit × instance_count; RBAC clear() only affects one instance. Kept Low because the throttle-key finding already means per-client limits are not the binding control.

### RBAC write endpoints are not idempotent
Severity: Low · Confidence: High (confirms RBAC writes without idempotency)

No RBAC write applies IdempotencyInterceptor; every todo write does. Most ops naturally idempotent; consistency gap.

### API documentation exposure is correctly gated
Severity: Info · Confidence: High

isApiDocsEnabled defaults on only in development; production Compose sets ENABLE_API_DOCS=false; tested. Residual: Better Auth openAPI plugin ungated (Better Auth OpenAPI /reference plugin registered with no environment gate); swagger routes outside Nest guard pipeline if flag enabled.

## Positive Assurance

Error response shape clean (uniform { success, error: { code, message }, timestamp }; no stack). Stack-trace suppression. Non-HttpException handling falls to generic 500. Retry-After passthrough tested. Rate-limit header contract end-to-end. Strict/default limiter isolation tested. Idempotency race safety unusually rigorous (advisory lock, re-check under lock). Idempotency author from session. Middleware ordering documented. Single correlation ID tested. Pino redaction clean for HTTP. CORS not permissive. Graceful shutdown. Container healthcheck. oRPC context clean. OpenAPI generation safety. CSRF posture deferred (SameSite unresolved).

## DoS Surface: Unpaginated List Endpoints

listTodos, listTickets, listUsers, listRoles return complete tables with no LIMIT. Not a standalone finding — sits on default limiter; amplification sits with the throttle-key finding. Pagination is hardening backlog.

## Unresolved Coverage

1. docker-compose.staging.yml and Dockerfiles deferred to Areas 11/12.
2. Express json default 100kb assumed (documented behaviour).
3. @nestjs/throttler v6 internal header names not verifiable from source.
4. SameSite still unresolved (Cross-subdomain cookies enabled by mere presence of an unvalidated domain variable) — CSRF posture open.
5. Nginx TLS block entirely commented out — full proxy audit Areas 11/12.

## Summary

One High, four Medium, five Low, one Info. The High (throttle keys could be influenced by request headers) is central: rate limiting is the only abuse control on mutation endpoints, and the key must come from the trusted hop. Amplifies Unbounded concern field on ticket submission, No request body size limit on any endpoint, Idempotency keys are globally unique, unbounded, never expired, and unvalidated, and unpaginated lists.

Ready for Areas 6 and 7 — Next.js Browser Security and PWA Offline Persistence.
