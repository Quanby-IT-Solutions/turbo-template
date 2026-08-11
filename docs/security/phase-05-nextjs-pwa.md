# Phase 5 — Areas 6 & 7: Next.js Browser Security & PWA Offline Persistence

Status: Complete. Mode: READ-ONLY. No file created, modified, deleted, or formatted. No installs, builds, or commits. SameSite/CSRF left unresolved per instruction.

## Per-Route Gating Table

| Route | Server session check | Notes |
|-------|---------------------|-------|
| (site)/layout.tsx | ✅ getSession() → redirect("/login") | Gates the whole group |
| (site)/dashboard | ✅ Redundant own check | Defence in depth |
| (site)/todos | ⚠️ Inherits layout only; calls getAccess() | Backend enforces posts:* |
| (site)/account | ⚠️ Inherits layout only | Static placeholder |
| (site)/user-management | ⚠️ Inherits layout only — no permission gate | Backend enforces users:read/users:manage |
| (site)/submit-ticket | ❌ "use client" page — no server component | Inherits layout gate; form is a mock |
| (auth)/* | n/a — public by design | |
| (auth)/session | ❌ Renders session JSON, no gate | See A6-04 note in source |
| (home)/* | n/a — public | |
| ~offline | n/a — static shell | |

Layout-level gating is architecturally sound. user-management has no server-side permission check — only sidebar hides the link. Backend enforces every RBAC route, so this is UX control, not authorization boundary.

## Persisted-Query Inventory

shouldDehydrateQuery persists ALL queries. No allowlist, no key filtering.

| Query key | Contents | Persisted? |
|-----------|----------|------------|
| ["session"] | Full Better Auth session: user id, name, email, session metadata | Yes |
| ["todos"] | Todo rows incl. authorId | Yes |
| ["rbac","users"] | Every user's id, name, email | Yes |
| ["rbac","roles"] | Roles + permission assignments | Yes |
| ["rbac","permissions"] | Permission catalogue | Yes |

gcTime: 24h. Persister created with no maxAge, no buster, no key — single shared user-agnostic IndexedDB entry "REACT_QUERY_OFFLINE_CACHE".

## Findings

### A7-01 — Authenticated data persists to IndexedDB under one shared key and is never cleared on sign-out
Severity: High · Confidence: High (resolves A1-04 handoff)

Affected: provider.tsx:31-37 (persister no key/maxAge/buster); query-client.ts:27-32,58 (all queries, 24h gcTime); session.hooks.ts:52-57 (sign-out invalidates only ["session"]); rbac.hooks.ts user list with emails; cache clearing exists but is dev-only.

Evidence. No queryClient.clear(), no persister.removeClient(), no del() from idb-keyval in sign-out path. Only cache-clearing code is gated to non-production. PersistQueryClientProvider restores snapshot on mount before any session check.

Attack scenario. Preconditions: two users share a browser profile (shared workstation, kiosk, support desk). Attack: User A (admin) signs in, opens /user-management, populating ["rbac","users"] and ["session"]. A signs out — only ["session"] invalidated; IndexedDB untouched. User B opens app. PersistQueryClientProvider restores entire snapshot. Gain: B reads A's identity and full user directory. Server-side layout gate protects rendering, not client cache; networkMode: "offlineFirst" serves cached data first. Window is a full day.

Root cause. Persistence configured for offline capability without per-identity cache boundary or sign-out purge.

Remediation. Key by userId; exclude session/rbac from persistence; queryClient.clear() + persister.removeClient() on sign-out.

### A7-02 — Paused mutations replay under whichever session is active at reconnect
Severity: Medium · Confidence: Medium

shouldDehydrateMutation persists paused mutations; onSuccess calls resumePausedMutations() unconditionally. Idempotency-Key captured at queue time. credentials: "include" attaches current cookie. Backend authorId from current session — no privilege escalation, but unintended write under second user's identity (limited to example todos). Medium not High because backend owns authorId.

Remediation. Record queueing user id; abort on mismatch; or purge paused mutations on sign-out (A7-01 fix).

### A7-03 — Reset and verification tokens are cacheable and referrer-exposed
Severity: Medium · Confidence: Medium (consolidates A1-09 × A4-04)

Token in URL; Serwist defaultCache includes document/RSC navigations; /api NetworkOnly does not cover /reset-password; no Referrer-Policy; no force-dynamic or Cache-Control.

Remediation. Referrer-Policy: no-referrer for (auth) routes; NetworkOnly matcher for /reset-password and /verify-email.

### A7-04 — RBAC administration UI is framable (clickjacking)
Severity: Medium · Confidence: Medium (application of A4-04)

No X-Frame-Options/CSP frame-ancestors at any layer. user-management exposes role-assignment controls. A2-03 established users:manage can grant Admin. Severity capped at Medium pending SameSite determination (if Lax/Strict, framed page would not carry credentials).

Remediation. X-Frame-Options: DENY and CSP frame-ancestors 'none'.

### A7-05 — Offline fallback is served for authenticated routes without an authentication check
Severity: Low · Confidence: High

Fallback matcher is request.destination === "document" — every navigation including /dashboard. Fallback is static OfflineView with no PII. Combined with A7-01 matters; fixing A7-01 resolves combined exposure.

### A7-06 — Service worker takes over immediately with skipWaiting + clientsClaim
Severity: Low · Confidence: High

Availability/correctness rather than security. Deliberate trade-off documented.

### A7-07 — External connectivity probe leaks usage telemetry to a third party
Severity: Low · Confidence: High

PROBE_URL = "https://www.gstatic.com/generate_204" every 15s. Privacy/data-residency concern. Remediation: probe /api/v1/health.

### A7-08 — Service worker unregistration is dev-only, leaving no production recovery path
Severity: Low · Confidence: Medium

Unregister-and-clear returns early when NODE_ENV === "production".

### A7-09 — submit-ticket page is a non-functional mock
Severity: Info · Confidence: High

Builds payload, setTimeout 800ms, discards with void payload, reports success. Confirms A3-03 (no frontend anonymous ticket path).

## Positive Assurance

API responses excluded from Cache Storage (NetworkOnly /api/* before defaultCache, "Order matters" comment). Server-side session gating clean. Open redirect N/A. NEXT_PUBLIC_* only three non-sensitive URLs. Zero localStorage/sessionStorage. Zero Server Actions. Cookie forwarding inbound-only to configured API. SSR caching of auth pages uses cache: "no-store". getAccess fail-closed. Response validation with safeParse. XSS surface clean. PWA manifest clean (no share_target etc.). SW dev-gated. Auth-error replay handling clean (retryUnlessAuth refuses 401/403). Serializer parity. Mutation-default rehydration before resume. Connectivity probe well-engineered.

## Unresolved Coverage

1. typescript.ignoreBuildErrors already A4-05.
2. Serwist defaultCache contents not directly verifiable (node_modules absent) — Medium confidence on A7-03.
3. SameSite still unresolved — caps A7-04.
4. @tanstack/query-async-storage-persister default key not verified from source — conclusion unchanged (not user-scoped).
5. No source-map configuration found — defaults apply (client maps off in production).

## Summary

One High, three Medium, four Low, one Info. The High (A7-01) closes the A1-04 handoff: sign-out clears one query key while an entire day's authenticated data — including full user directory with emails — persists in a single user-agnostic IndexedDB entry restored for whoever opens the app next.

A7-01 and A7-02 share the same root cause (missing identity boundary on persistence). Consolidation should consider merging them.

Ready for Area 8 — Flutter Mobile Security.
