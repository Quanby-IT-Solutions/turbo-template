> These records are summarised for a public repo. They keep what was found, what changed, and where, without internal finding ids or step-by-step misuse.

# Phase 3 — Areas 2 & 3: Authorization, RBAC, IDOR, Contracts, Validation & Injection

Status: Complete. Mode: READ-ONLY. No file created, modified, deleted, or formatted. No installs, migrations, seeders, autofix, or commits. Every route walked contract → controller → service using the Phase 1 matrix.

## Per-Endpoint Authorization Verdict

Global AuthGuard confirmed active (Phase 2). RbacGuard is inert without @RequirePermissions (rbac.guard.ts:34-36).

| Route | Auth | Permission | Ownership | User ID source | Verdict |
|-------|------|------------|-----------|----------------|---------|
| health.check | Anonymous | — | n/a | n/a | OK — intentional |
| todo.list | Anonymous | — | none | n/a | OK — example feature, no PII |
| todo.get | Anonymous | — | none | n/a | OK — same |
| todo.create | Yes | posts:create | sets authorId from session | session (todos.controller.ts:42) | OK |
| todo.update | Yes | posts:edit | NONE | not consumed | Todo update and delete are capability-gated but not ownership-scoped |
| todo.delete | Yes | posts:delete | NONE | not consumed | Todo update and delete are capability-gated but not ownership-scoped |
| me.permissions | Yes + explicit 401 | — | self | session (me.controller.ts:16) | OK |
| rbac.roles.list | Yes | users:read | n/a | n/a | OK |
| rbac.roles.create | Yes | users:manage | n/a | n/a | OK |
| rbac.roles.update | Yes | users:manage | n/a | n/a | OK — Admin rename blocked |
| rbac.roles.setPermissions | Yes | users:manage | n/a | n/a | users:manage permits self-escalation to Admin (privilege boundary collapse) (self-escalation) |
| rbac.roles.delete | Yes | users:manage | n/a | n/a | OK — Admin delete blocked |
| rbac.permissions.list | Yes | users:read | n/a | n/a | OK |
| rbac.users.list | Yes | users:read | n/a | n/a | OK |
| rbac.users.assignRole | Yes | users:manage | request userId | request | users:manage permits self-escalation to Admin (privilege boundary collapse) (self-grant Admin) |
| rbac.users.removeRole | Yes | users:manage | request userId | request | No last-Admin protection on role removal (admin lockout) |
| ticket.list | Yes | NONE | NONE | n/a | All support-ticket PII readable by any authenticated user |
| ticket.get | Yes | NONE | NONE | n/a | All support-ticket PII readable by any authenticated user |
| ticket.submit | Yes | — | never sets authorId | none | ticket.submit never records the authenticated author, Unbounded concern field on ticket submission |

## Findings

### All support-ticket PII readable by any authenticated user
Severity: High · Confidence: High (resolves ungated ticket reads)

Affected: tickets.controller.ts:14,21 (no @RequirePermissions); tickets.service.ts:14-24 (unfiltered select / id-only findOne); response includes name, email, subject, concern.

Evidence. Ticket reads in `tickets.controller.ts` carry no permission metadata, and `tickets.service.ts` does not scope list or get to the caller. `rbac.guard.ts` allows the request when no permission metadata is present. Sibling handlers in `RbacController` require a permission. The rule is a permission gate or an owner scope on ticket reads.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Root cause. The tickets module was written without RBAC decorators while every neighbouring admin module received them.

Remediation. Add a permission requirement (or scope by the session author). Outcome: a session without the ticket permission receives 403 on ticket reads.

### Todo update and delete are capability-gated but not ownership-scoped
Severity: Medium · Confidence: High (confirms unowned todo updates)

Affected: todos.service.ts:44-63 — where(eq(todos.id, id)) only; handlers take no @Session().

Evidence. create correctly threads session.user.id into authorId. update and delete take no session parameter. Any holder of posts:edit/posts:delete can rewrite/destroy any user's todo by ID. Seeded Manager role holds posts:* which expands via wildcard matcher.

Not elevated to High because this is the examples/ module — a demonstration feature carrying no PII. Real risk is as a copied pattern for downstream projects.

Remediation. Add @Session() and filter with and(eq(todos.id, id), eq(todos.authorId, session.user.id)).

### users:manage permits self-escalation to Admin (privilege boundary collapse)
Severity: Medium · Confidence: High

Affected: rbac.controller assignRole requires only users:manage; assignRole accepts arbitrary userId including caller's own and arbitrary roleName including "Admin". ADMIN_ROLE short-circuits all permission checks.

Evidence. Admin is protected from renaming and deletion, and assigning Admin is not limited to callers who already hold it, including assignment to the caller and permission edits on a role the caller holds. The rule is: reject Admin grants unless the caller holds Admin, and reject permission edits on a role the caller holds.

Impact. users:manage is de facto equivalent to Admin. Seeded Manager holds only users:read, so no seeded non-Admin role currently has users:manage; this is a latent boundary failure.

Remediation. Reject assignment of ADMIN_ROLE unless the caller already holds it; reject setRolePermissions on a role the caller currently holds.

### No last-Admin protection on role removal
Severity: Low · Confidence: High

removeRole deletes the userRoles row with no check on whether this is the final Admin assignment. Also a TOCTOU race on concurrent removals.

Remediation. Inside a transaction, count remaining Admin assignments before deleting and reject if the count would reach zero.

### ticket.submit never records the authenticated author
Severity: Low · Confidence: High

authorId column exists and is nullable; submit handler takes no @Session() and service never sets it. Every ticket created through the API is orphaned with authorId = null. Attacker-controlled name and email are the only identity recorded.

Remediation. Thread session.user.id into the insert, exactly as todos.controller.ts:42 does.

### Unbounded concern field on ticket submission
Severity: Low · Confidence: High (confirms the unbounded concern field)

concern: z.string().min(1) with no .max(); every sibling string field is bounded. Stored as unbounded text.

Remediation. .max(5000) or similar.

### UserWithRolesSchema exposes all user emails to users:read
Severity: Low · Confidence: Medium

listUsers returns every user's id, name, and email. Arguably by design for user-management; recorded as permission-granularity observation, not elevated.

### Contract/runtime security mismatch on ticket endpoints
Severity: Info · Confidence: High (resolves the contract and runtime disagreeing on ticket auth)

tickets.contract declares security: [] for ticket.list and ticket.submit; runtime requires a session. Important: the "anonymous ticket submission" abuse path does not exist — Area 4 must not model it.

### RBAC permission cache holds a 60-second stale-permission window
Severity: Info · Confidence: High

LRU max: 1000, ttl: 60_000. Invalidation is well handled on mutations; residual gaps: updateRole does not clear (correct today); cache is per-process so multi-instance leaves other replicas serving stale permissions up to 60s. Cross-ref in-memory throttler storage (in-memory throttler).

## Injection & Input-Validation Sweep

| Check | Result | Evidence |
|-------|--------|----------|
| SQL injection | Clean | Every query uses Drizzle parameterized builder. Only two raw fragments: static count(*)::int and bound pg_advisory_xact_lock parameter |
| Dynamic SQL identifiers | Clean — none | Table/column refs are static schema objects |
| dangerouslySetInnerHTML | One occurrence, safe | chart.tsx injects CSS from hardcoded THEMES |
| User-content rendering | Clean | Todo titles as JSX text nodes; no ticket-rendering component in frontend |
| Command injection | N/A — build-time only | Single execSync of static "git rev-parse HEAD" (the static build-time git command confirmed) |
| eval / new Function | N/A — absent | Zero matches |
| Prototype pollution | N/A — absent | No __proto__ access, no recursive merge |
| SSRF | Clean | All fetch targets from validated env |
| Open redirect | Clean | Confirmed Phase 2 — all navigation targets are literals |
| ReDoS | Clean | Only linear regexes on env values |
| Email template injection | Low-risk, noted | userEmail interpolated into HTML unescaped; bounded to validated existing account |
| Path traversal | N/A — absent | Only readFileSync joins hardcoded source list |
| Mass assignment | Clean | CreateTodoSchema/CreateTicketSchema/CreateRoleSchema pick only intended fields; Zod strips unknown keys |
| Coercion | Clean | z.coerce.number().int().positive() on all path IDs |
| Permission-name validation | Clean and fail-closed | Closed enum + DB re-validation |

## Positive Assurance

Unknown permissions fail closed (rbac.service.ts:49-50). Guard fails closed without session (rbac.guard.ts:76-78, tested). Guard resolves session defensively. Production error hygiene correct. Reserved-role protection (Admin cannot be renamed/deleted). Role-name uniqueness at service + DB. setRolePermissions atomicity via transaction. Cache invalidation on mutation. Idempotent role assignment via onConflictDoNothing. Referential integrity with appropriate cascades. Frontend guards are UX-only; backend enforces independently. Frontend/backend permission logic parity. Response schemas omit secrets. Deterministic permission ordering.

## Unresolved Coverage

1. seed.ts default credentials deferred to Areas 9/10 — a fixed password for Admin, printed to stdout.
2. Body-size limits not assessed — express.json() with no limit (Area 4).
3. packages/contracts utils and common contracts not read — low risk.
4. oRPC input-binding semantics unverified without library source.
5. AssignRoleRequestSchema shape mismatch with frontend (path vs body userId).

## Summary

One High, three Medium, three Low, two Info. The High (All support-ticket PII readable by any authenticated user) is concrete cross-user PII disclosure reachable by any self-registered account. Most architecturally significant: users:manage permits self-escalation to Admin (privilege boundary collapse) — Admin protected against rename/delete but not against being granted, so users:manage collapses into full Admin.

Ready for Areas 4 and 5 — Rate Limiting, Idempotency, Transport, Error Handling and Docs.
