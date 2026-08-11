# DOMAIN-MODEL — Turbo Template Security Remediation

One page of shared vocabulary. Every ticket uses these names; every permission string in TICKETS.md is one of the keys below.

## Permission-key convention

The codebase already uses **`resource:action`** (colon-separated, e.g. `users:read`, `users:manage`) — tickets keep that convention rather than introducing a new one.

| Key | Grants | Status |
|---|---|---|
| `users:read` | Read user directory; **after AZ-1** also gates support-ticket reads | Existing |
| `users:manage` | RBAC mutations (assign/remove roles) — **after AZ-2** cannot self-grant Admin | Existing |
| *(future, AZ-5 / F-51)* finer split, e.g. `users:read-directory` vs `tickets:read` | Separates ticket triage from full email-directory access | Wave 3 |

Enforcement chain: `@thallesp/nestjs-better-auth` global `AuthGuard` (session required everywhere unless `@AllowAnonymous()`) → `RbacGuard` reads `@RequirePermissions(...)` metadata → **no metadata = pass-through** (root cause of F-01). Rule going forward: **every non-anonymous read of user-supplied or PII data carries explicit `@RequirePermissions`.**

## Glossary (ubiquitous language)

- **Session** — Better Auth cookie session. Policy (expiry, rotation, SameSite, cookie domain, verification requirement) is **pinned explicitly** after AC-3, never left to library defaults.
- **Ticket** — a support request (name, email, subject, concern). PII. Gains `authorId` in AZ-3.
- **Todo** — example resource; ownership model reference implementation (`authorId` scoping, AZ-3).
- **Role / Permission / Grant** — RBAC entities. A **grant** is a role↔user assignment; Admin grants are privileged (AZ-2).
- **Audit entry** — append-only row in `audit_log`, written **in the same transaction** as the RBAC mutation it records (AZ-4). Fields: actor, action, target, old→new, timestamp.
- **Idempotency key** — after AB-3: composite PK `(authorId, key)`, length-capped, TTL-expired; applied to **all** mutating controllers (todos and RBAC alike).
- **Client IP** — the throttle key. Derived only from the trust chain below, never from raw client headers.
- **Persisted cache** — the TanStack Query IndexedDB snapshot. After WC-1: allowlisted (no `session`, no `rbac` roots), keyed per identity, `maxAge`-bounded, purged on sign-out.
- **Cookie jar (mobile)** — `PersistCookieJar` is the **single** cookie store after MB-1; secure-storage duplication removed; purged on sign-out.

## Trust chains (the two spines most tickets touch)

**Client-IP chain (AB-1, AB-2 — Risky Flow 2):**
```
client → Nginx (proxy_set_header X-Forwarded-For $remote_addr;  ← overwrite, not append)
       → Express (trust proxy configured for exactly one hop)
       → ThrottlerProxyGuard (rightmost-untrusted entry of req.ips)
       → Redis throttle store (shared across ASG instances, AB-2)
```

**Identity/cache chain (WC-1, WC-3, MB-1 — Risky Flow 1):**
```
sign-in  → persister keyed to user identity, allowlist excludes session/rbac roots
sign-out → queryClient.clear() → persister purge → (mobile) cookieJar.deleteAll()
           order matters: memory, then disk, then credentials
```

## Core tables touched

- `tickets` — + `authorId` (AZ-3, additive migration).
- `idempotency_keys` — PK becomes `(authorId, key)`; + `expiresAt` + cleanup (AB-3).
- `audit_log` — **new**, append-only, no UPDATE/DELETE path exposed (AZ-4).
- `verifications` — + index on `expires_at`, scheduled cleanup (HY-2).
- **Cross-epic ownership risk:** `audit_log` is created by `authz` (AZ-4) but will be written by future consumers (e.g., auth events). **Ownership rule:** `authz` owns the schema and the write-helper; other epics call the helper, never insert directly.

## Central state machine — privileged grant lifecycle (Risky Flow 5)

```
request grant/removal (caller holds users:manage)
   └─► BEGIN TX
        ├─ grant is Admin AND caller lacks Admin? ──► reject 403 + audit denial   (F-10)
        ├─ removal leaves zero Admins? (COUNT inside TX) ─► reject 409 + audit    (F-31)
        ├─ apply grant/removal
        ├─ INSERT audit_log (actor, action, target, old→new)                      (F-17)
   └─► COMMIT  → invalidate RBAC cache entry (Redis, cluster-wide after AB-2)
```
Both guards live **inside the transaction** — the TOCTOU on concurrent removals is the reason this is a flow, not just an AC.

## Fail-closed boot order (Risky Flow 3)

```
load env → validate (never skipped merely because CI=true; explicit SKIP_ENV_VALIDATION only, CI-4)
        → BETTER_AUTH_SECRET: .min(32) + refuse known template default (AC-1)
        → SMTP_HOST unset in production? → refuse boot (fail closed, LG-1)
seed.ts → NODE_ENV === "production"? → refuse (AC-2); password from env or randomBytes, printed only when generated
```
