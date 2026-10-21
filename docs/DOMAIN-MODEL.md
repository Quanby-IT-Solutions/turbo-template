# DOMAIN-MODEL — Turbo Template Security Remediation

One page of shared vocabulary. Every ticket uses these names; every permission string in TICKETS.md is one of the keys below.

## Permission-key convention

The codebase already uses **`resource:action`** (colon-separated, e.g. `users:read`, `users:manage`) — tickets keep that convention rather than introducing a new one.

| Key | Grants | Status |
|---|---|---|
| `users:read` | Read user directory; **after permission-gated ticket reads** also gates support-ticket reads | Existing |
| `users:manage` | RBAC mutations (assign/remove roles) — **after the admin-grant guard** cannot self-grant Admin | Existing |
| *(future, the finer directory permission / full email-directory reads)* finer split, e.g. `users:read-directory` vs `tickets:read` | Separates ticket triage from full email-directory access | Wave 3 |

Enforcement chain: `@thallesp/nestjs-better-auth` global `AuthGuard` (session required everywhere unless `@AllowAnonymous()`) → `RbacGuard` reads `@RequirePermissions(...)` metadata → **no metadata = pass-through** (root cause of ungated ticket reads). Rule going forward: **every non-anonymous read of user-supplied or PII data carries explicit `@RequirePermissions`.**

## Glossary (ubiquitous language)

- **Session** — Better Auth cookie session. Policy (expiry, rotation, SameSite, cookie domain, verification requirement) is **pinned explicitly**, never left to library defaults.
- **Ticket** — a support request (name, email, subject, concern). PII. Gains `authorId` in ownership scoping.
- **Todo** — example resource; ownership model reference implementation (`authorId` scoping).
- **Role / Permission / Grant** — RBAC entities. A **grant** is a role↔user assignment; Admin grants are privileged (the admin-grant guard).
- **Audit entry** — append-only row in `audit_log`, written **in the same transaction** as the RBAC mutation it records (the append-only audit trail). Fields: actor, action, target, old→new, timestamp.
- **Idempotency key** — after the idempotency key model: composite PK `(authorId, key)`, length-capped, TTL-expired; applied to **all** mutating controllers (todos and RBAC alike).
- **Client IP** — the throttle key. Derived only from the trust chain below, never from raw client headers.
- **Persisted cache** — the TanStack Query IndexedDB snapshot. After the cache allowlist and sign-out purge: allowlisted (no `session`, no `rbac` roots), keyed per identity, `maxAge`-bounded, purged on sign-out.
- **Cookie jar (mobile)** — `PersistCookieJar` is the **single** cookie store; secure-storage duplication removed; purged on sign-out.

## Trust chains (the two spines most tickets touch)

**Client-IP chain (client-IP trust, shared Redis state):**

Local / dev — nginx sets the header, `TRUST_PROXY=1`:
```
client → nginx (proxy_set_header X-Forwarded-For $remote_addr;  ← set, not append)
       → Express (trust proxy configured for exactly one hop)
       → ThrottlerProxyGuard (rightmost-untrusted entry of req.ips)
       → Redis throttle store (shared across instances, shared Redis state)
```

Production — the load balancer appends, `TRUST_PROXY=1`:
```
client → load balancer (appends the address it saw onto X-Forwarded-For)
       → Express (one trusted hop, so the rightmost entry is the one the load balancer added)
       → ThrottlerProxyGuard (same rightmost-untrusted entry)
       → Redis throttle store (shared across instances, shared Redis state)
```

Staging is EC2 plus an Elastic IP. Host Nginx on the instance (80/443) is the one trusted hop and proxies to `127.0.0.1:3000` and `127.0.0.1:3001`; it appends the address it saw onto `X-Forwarded-For`, so `TRUST_PROXY=1` keeps that entry. The app ports are not opened in the security group, and the deploy checks health on the host over SSH. `BACKEND_BIND_ADDRESS` stays unset on staging.

The deployed backend port is `${BACKEND_BIND_ADDRESS:-0.0.0.0}:3000:3000`.
On production, the variable is the instance private IPv4, set outside this
repo. On EC2 the Elastic IP is translated 1:1 to the private IPv4, so binding
to the private address only limits the host-side publish to that one
interface. Direct access must be blocked by a security group that allows port 3000
only from the load balancer's security group, and that group is managed
outside this repo. The default `0.0.0.0` keeps the port published when the
variable is unset. The in-repo health check is `GET /api/v1/health`.

**Identity/cache chain (the cache allowlist and sign-out purge, paused-mutation identity, the single cookie store):**
```
sign-in  → persister keyed to user identity, allowlist excludes session/rbac roots
sign-out → queryClient.clear() → persister purge → (mobile) cookieJar.deleteAll()
           order matters: memory, then disk, then credentials
```

## Core tables touched

- `tickets` — + `authorId` (ownership scoping, additive migration).
- `idempotency_keys` — PK becomes `(authorId, key)`; + `expiresAt` + cleanup (the idempotency key model).
- `audit_log` — **new**, append-only, no UPDATE/DELETE path exposed (the append-only audit trail).
- `verifications` — + index on `expires_at`, scheduled cleanup (schema hygiene).
- **Cross-epic ownership risk:** `audit_log` is created by `authz` (the append-only audit trail) but will be written by future consumers (e.g., auth events). **Ownership rule:** `authz` owns the schema and the write-helper; other epics call the helper, never insert directly.

## Central state machine — privileged grant lifecycle

```
request grant/removal (caller holds users:manage)
   └─► BEGIN TX
        ├─ grant is Admin AND caller lacks Admin? ──► reject 403 + audit denial   (the Admin self-grant)
        ├─ removal leaves zero Admins? (COUNT inside TX) ─► reject 409 + audit    (last-Admin removal)
        ├─ apply grant/removal
        ├─ INSERT audit_log (actor, action, target, old→new)                      (the missing audit trail)
   └─► COMMIT  → invalidate RBAC cache entry (Redis, cluster-wide after shared Redis state)
```
Both guards live **inside the transaction** — concurrent removals are counted there, which is why this is a flow, not just an acceptance criterion.

## Fail-closed boot order

```
load env → validate (never skipped merely because CI=true; explicit SKIP_ENV_VALIDATION only, the validation gates)
        → BETTER_AUTH_SECRET: .min(32) + refuse known template default (the secret strength check)
        → SMTP_HOST unset in production? → refuse boot (fail closed, credential redaction)
seed.ts → NODE_ENV === "production"? → refuse (the production seed guard); password from env or randomBytes, printed only when generated
```
