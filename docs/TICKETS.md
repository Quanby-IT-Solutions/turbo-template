# TICKETS — Turbo Template Security Remediation

> Every ticket is a vertical slice: schema/config → enforcement → UI/client where applicable → test. One ticket = one branch = one small PR. "DoD: as standard" = *Code + tests merged · acceptance criteria pass · audit/permission checks verified · PR reviewed · docs updated.* Topics cite the 2026-08-11 audit. The flows are defined in DOMAIN-MODEL.md: identity and cache purge, the client-IP trust chain, fail-closed boot, deploy secret handling, and the privileged-grant transaction.

---

## 1. Epic map

| Epic key | Label | Source findings | Note |
|---|---|---|---|
| `authz` | Authorization & Data Scoping | ungated ticket reads, the Admin self-grant, unowned todo updates, the missing audit trail, tickets without an author, last-Admin removal, full email-directory reads, a contract that marks session routes public | Permission gates, ownership, audit trail. |
| `auth-config` | Auth Secrets & Session Policy | the shipped signing secret, the fixed Admin seed password, distinguishable reset errors, untrimmed origin lists, an unvalidated cookie domain, the ungated API reference, the always-on Google provider, unpinned session lifetime, a non-boundary auth path match, verification not required, unpinned cookie attributes | Better Auth config, seeds, secrets. |
| `abuse` | Rate Limiting, Idempotency & Limits | client-controlled rate-limit keys, global idempotency keys, unbounded request bodies, process-local limits, RBAC writes without idempotency | The throttle/idempotency spine. |
| `webclient` | Web Client Cache & PWA | the shared browser cache, paused-mutation replay, cached token URLs, offline fallback on authenticated routes, mid-session service-worker claim, the third-party connectivity probe | TanStack persistence + Serwist. |
| `logging` | Log Redaction & Disclosure | credential logging, a verbose health response, verbatim request ids | Three log paths + response leaks. |
| `edge` | Security Headers, TLS & Nginx | missing security headers, the commented-out TLS block, a framable admin UI | The reverse-proxy layer. |
| `mobile` | Flutter Mobile Hardening | the duplicated mobile cookie, cleartext mobile traffic, the bundled mobile env file, a cookie jar kept after sign-out, debug signing on release, raw mobile error text, the mismatched password minimum, unused mobile permissions | Shipped app — 30-day wave. |
| `cicd` | Supply Chain & CI/CD | the unpinned staging host key, the stray dependency, the unpinned CI workflow, validation skipped in CI, ignored type errors, secrets written to disk on deploy, unpinned actions, a broad build-cache restore, the unpinned postinstall, the unused root Dockerfile | Pipeline trust. |
| `hygiene` | Tests & Repo Hygiene | the unbounded concern field, unpruned verification rows, the example database credential, the beta ORM in production, missing regression tests, credential-shaped placeholders, the mock ticket form | Harness + batched leftovers. |

---

## 2. Build order

**Wave 1 — release blockers (Conditional GO gate):**
1. **stray dependency removal** — Delete the stray `orpc` dependency (the stray dependency)
2. **permission-gated ticket reads** — Permission-gate ticket reads + align the contract (ungated ticket reads, a contract that marks session routes public)
3. **client-IP trust** — Trustworthy client IP for rate limiting (client-controlled rate-limit keys)
4. **the secret strength check** — Non-functional secret placeholder + strength validation (the shipped signing secret)
5. **the production seed guard** — Production seed guard + randomized seed credentials (the fixed Admin seed password)
6. **the cache allowlist and sign-out purge** — Cache persistence allowlist + sign-out purge (the shared browser cache)
7. **credential redaction** — Redact credentials across all three log paths (credential logging)
8. **staging host-key pinning** — Staging deploy: pinned host keys + ECR variable fix (the unpinned staging host key)
9. **the CI workflow pin** — Pin the external CI workflow + scope secrets (the unpinned CI workflow)

**Wave 2 — 30-day set:**
10. **shared Redis state** — Redis-backed throttler + RBAC cache (process-local limits)
11. **the admin-grant guard** — Admin-grant guard + last-Admin protection (the Admin self-grant, last-Admin removal)
12. **the append-only audit trail** — Append-only RBAC audit trail (the missing audit trail)
13. **ownership scoping** — Ownership scoping on todos + ticket authorship (unowned todo updates, tickets without an author)
14. **the idempotency key model** — Idempotency key model hardening + consistent application (global idempotency keys, RBAC writes without idempotency)
15. **request body limits** — Request body limits + proxy timeouts (unbounded request bodies)
16. **security headers** — Security headers at all three layers (missing security headers, a framable admin UI)
17. **TLS termination** — Ship TLS config + service-name upstreams (the commented-out TLS block)
18. **service-worker exclusions** — Service-worker token & auth-route exclusions (cached token URLs, offline fallback on authenticated routes)
19. **paused-mutation identity** — Bind paused mutations to the queueing identity (paused-mutation replay)
20. **the pinned session policy** — Pin session, cookie & verification policy (unpinned session lifetime, verification not required, unpinned cookie attributes, an unvalidated cookie domain)
21. **reset-error sanitising** — Sanitize the password-reset error path (distinguishable reset errors)
22. **the validation gates** — Re-enable validation gates: env + TypeScript (validation skipped in CI, ignored type errors)
23. **production deploy secret handling** — Production deploy secret handling (secrets written to disk on deploy)
24. **action pinning and workflow permissions** — Action pinning, workflow permissions, cache scoping, postinstall (unpinned actions, a broad build-cache restore, the unpinned postinstall)
25. **the single cookie store** — Single cookie source of truth + sign-out purge (the duplicated mobile cookie, a cookie jar kept after sign-out)
26. **mobile transport hardening** — Mobile transport & bundled-config hardening (cleartext mobile traffic, the bundled mobile env file)
27. **mobile release hardening** — Mobile release hardening batch (debug signing on release, raw mobile error text, the mismatched password minimum, unused mobile permissions)
28. **the regression test harness** — Security regression test harness (missing regression tests)

**Wave 3 — hardening backlog (batched):**
29. **auth config hygiene** — Auth config hygiene batch (untrimmed origin lists, the ungated API reference, the always-on Google provider, a non-boundary auth path match)
30. **health and request-id hygiene** — Health & request-id disclosure hygiene (a verbose health response, verbatim request ids)
31. **the PWA update flow** — PWA update flow & connectivity probe (mid-session service-worker claim, the third-party connectivity probe)
32. **the finer directory permission** — Finer-grained directory-PII permission (full email-directory reads)
33. **schema hygiene** — Repo & schema hygiene batch (the unbounded concern field, unpruned verification rows, the example database credential, the unused root Dockerfile, the beta ORM in production, credential-shaped placeholders, the mock ticket form)

---

## 3. Full tickets

### Epic: `cicd`

---

**Title:** [stray dependency removal] Delete the stray `orpc` dependency
**Epic:** `cicd`
**Problem / context:** the stray dependency (High). `packages/contracts/package.json:26` declares `"orpc": "^0.1.1"` — an abandoned 2018 package with a live caret range and dormant maintainer, pulling a deprecated Socket.IO stack (`socket.io@2.5.1`). No source file imports it. Best value-to-effort fix in the audit.
**User story:** As a release engineer *(persona — no runtime permission governs the dependency graph)*, I want the abandoned package removed so that the supply chain carries no deprecated, maintainer-dormant transitive stack.
**Acceptance criteria:**
- *Given* the dependency line is deleted, *when* `pnpm install` refreshes the lockfile, *then* `orpc@0.1.1` and every transitive it introduced (incl. `socket.io@2.5.1`) are absent from `pnpm-lock.yaml`.
- *Given* the refreshed lockfile, *when* the full build and typecheck run, *then* they pass — proving nothing imported the package.
- *Given* the repo post-merge, *when* grepping for `from "orpc"` / `require("orpc")`, *then* there are zero hits.
**In scope:** Delete line 26 of `packages/contracts/package.json`; refresh `pnpm-lock.yaml`; verify build.
**Out of scope:** Any other dependency change (the unpinned postinstall → action pinning and workflow permissions; the beta ORM in production → schema hygiene).
**Technical notes:** Verify no lockfile drift beyond the removal (the audit's read-only constraint flagged that `pnpm` can rewrite the lockfile when manifests disagree — commit only the intended delta). The legitimate oRPC packages (`@orpc/*`) are untouched.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [staging host-key pinning] Staging deploy — pinned host keys + ECR variable fix
**Epic:** `cicd`
**Problem / context:** the unpinned staging host key (High). In `.github/workflows/deploy-staging.yml` (SSH step and the deploy script at lines 138-152) the host key is not pinned, and the deploy script can expand values on the runner. Line 140 names the web image from the backend repository variable, so staging has not run the web image.
**User story:** As a release engineer *(persona — pipeline, no runtime permission)*, I want staging deploys to talk only to a verified host and deploy the correct images so that secrets can't be intercepted and staging actually mirrors production.
**Acceptance criteria:**
- *Given* the workflow, *when* it opens the SSH connection, *then* the target host key matches the pinned entry; otherwise the deploy fails.
- *Given* line 140 names the web image from the web repository, *when* a staging deploy runs, *then* the web image is pulled and started from that repository.
- *Given* a host-key mismatch, *when* the connection is attempted, *then* the deploy fails closed with a clear error rather than proceeding.
- *Given* the workflow file, *when* reviewed, *then* no secret value is echoed or written to disk on the runner (align with the production deploy secret handling pattern; full production-side rework is production deploy secret handling).
**In scope:** Pinned `known_hosts` (repo-stored public key or secret); the 2-minute ECR var fix; fail-closed connection.
**Out of scope:** Production deploy secret handling (production deploy secret handling); SHA-pinning actions (action pinning and workflow permissions).
**Technical notes:** Risky Flow **deploy secret handling**. Store the host public key as a repo file or Actions variable, install into `~/.ssh/known_hosts` before `ssh`/`scp`. Keep the deploy gated on `needs: ci` — unchanged.
**Definition of done:** as standard, plus one successful staging deploy run showing the web image live.
**Dependencies:** none.

---

**Title:** [the CI workflow pin] Pin the external CI workflow to a SHA and scope secrets
**Epic:** `cicd`
**Problem / context:** the unpinned CI workflow (High, Medium confidence). `.github/workflows/ci.yml:13-14` delegates the entire quality gate to an external reusable workflow referenced at `@main` with `secrets: inherit`. The audit could not read that workflow — the CI gate's contents are unverifiable, and a compromise of the external repo is handed every inherited secret.
**User story:** As a release engineer *(persona)*, I want the CI gate pinned to an immutable ref with an explicit secret allowlist so that an external repository change can neither alter our gate nor read our secrets.
**Acceptance criteria:**
- *Given* the reusable workflow reference, *when* CI runs, *then* it targets a full commit SHA (with a version comment), not a branch ref.
- *Given* `secrets: inherit` removed, *when* the workflow needs a secret, *then* only explicitly named secrets are passed and the run succeeds.
- *Given* the pinned SHA, *when* the team reviews it once, *then* the referenced workflow's contents at that SHA are confirmed to run lint, typecheck, and tests (closing the audit's "cannot confirm CI runs anything" gap) and the confirmation is noted in the PR.
**In scope:** SHA-pin the ref; enumerate passed secrets; one-time content review of the pinned workflow.
**Out of scope:** Pinning marketplace actions and adding `permissions:` blocks across all five workflows (action pinning and workflow permissions); replacing the external workflow with an in-repo one (future option, note in PR).
**Technical notes:** If the external workflow at the pinned SHA does *not* run lint/typecheck/test, escalate — deploys gate on this job (`needs: ci`) and the whole remediation's DoD depends on CI being real.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [the validation gates] Re-enable the validation gates — env validation in CI, TypeScript build errors
**Epic:** `cicd`
**Problem / context:** validation skipped in CI + ignored type errors (Medium). Env validation is skipped whenever `CI` is truthy (`env.config.ts:46`, `auth/config.ts:52`, `web/env.ts:62`) — disabled exactly where it would catch misconfiguration — and `next.config.ts:25` sets `typescript.ignoreBuildErrors: true`, so type errors in permission logic ship silently.
**User story:** As a release engineer *(persona)*, I want validation to fail the build when config or types are wrong so that misconfiguration is caught in CI, not production.
**Acceptance criteria:**
- *Given* the three validators, *when* run in CI, *then* validation executes; it is skipped only when `SKIP_ENV_VALIDATION` is explicitly set (documented escape hatch).
- *Given* `ignoreBuildErrors` deleted, *when* `next build` runs, *then* it fails on any TS error; all errors surfaced by the removal are fixed in this ticket.
- *Given* a deliberately invalid env var in a CI test run, *when* the pipeline runs, *then* it fails at validation with a readable message.
**In scope:** Replace `CI`-triggered skips with explicit `SKIP_ENV_VALIDATION` in all three files; delete the Next flag; fix surfaced type errors.
**Out of scope:** New validation rules beyond what exists (the secret strength check adds the secret rules separately).
**Technical notes:** Risky Flow **fail-closed boot** — this is the "validation never silently skipped" leg. Coordinate with the secret strength check: CI must provide valid-shaped dummy values or use the escape hatch *knowingly* in build-only jobs.
**Definition of done:** as standard.
**Dependencies:** the secret strength check (so CI sees the final validation rules once, not twice).

---

**Title:** [production deploy secret handling] Production deploy secret handling — no plaintext on disk
**Epic:** `cicd`
**Problem / context:** secrets written to disk on deploy (Medium). `deploy-production.yml` can leave secret material on the runner, cleanup is not guaranteed when the step fails, and the workflow declares no `permissions:`. The rule is: pass secret material through the parameter store with no file on the runner.
**User story:** As a release engineer *(persona)*, I want production secrets to transit without touching the runner's disk so that a failed or compromised job step cannot read them from a leftover file.
**Acceptance criteria:**
- *Given* the deploy step, *when* secrets are transferred, *then* no intermediate file is left on the runner.
- *Given* any step failure mid-script, *when* the job ends, *then* no secret material remains on the runner (`set -euo pipefail` + no file to leak).
- *Given* the workflow, *when* reviewed, *then* it declares a least-privilege `permissions:` block.
- *Given* a normal run post-change, *when* production deploys, *then* the rolling refresh completes and concurrency semantics (never cancel in-flight production) are unchanged.
**In scope:** Rework the secret-transfer step; `set -euo pipefail`; `permissions:` on this workflow.
**Out of scope:** SHA-pinning and permissions on the *other* workflows (action pinning and workflow permissions); staging equivalent (staging host-key pinning handles its transport).
**Technical notes:** Risky Flow **deploy secret handling**. The audit notes production Compose is already pulled from SSM at boot — extend that pattern for env rather than pushing files. Keep `${{ github.sha }}` image tagging (audit-praised, commit-traceable).
**Definition of done:** as standard.
**Dependencies:** staging host-key pinning (shared SSH pattern).

---

**Title:** [action pinning and workflow permissions] Supply-chain pinning batch — action SHAs, workflow permissions, cache scoping, postinstall
**Epic:** `cicd`
**Problem / context:** unpinned actions + a broad build-cache restore + the unpinned postinstall (Medium). No action is SHA-pinned and CI + both deploys declare no `permissions:`; buildx `restore-keys` are broad enough to restore caches across refs; `package.json:30-31` `postinstall` shells out to `pnpm dlx sherif@latest` — unpinned remote code execution on every install.
**User story:** As a release engineer *(persona)*, I want every executable pulled by the pipeline pinned and least-privileged so that a moved tag, a cache from another ref, or a package publish cannot change what the pipeline runs.
**Acceptance criteria:**
- *Given* all five workflows, *when* reviewed, *then* every `uses:` targets a full commit SHA with a version comment, and each workflow declares a least-privilege `permissions:` block (`contents: read` baseline).
- *Given* the buildx cache config, *when* a build runs on a different ref, *then* it cannot restore another ref's cache (content-hash keys, narrowed `restore-keys`).
- *Given* `postinstall` cleaned, *when* `pnpm install` runs, *then* no network-fetched code executes; `sherif` is a pinned devDependency invoked by an explicit script/CI step.
**In scope:** SHA-pin all `uses:` across the five workflows; `permissions:` blocks on all; cache-key narrowing in both deploy workflows; sherif pin + postinstall removal.
**Out of scope:** The external reusable CI workflow ref (already pinned in the CI workflow pin).
**Technical notes:** Do the CI workflow pin first so this batch doesn't touch the same line. Renovate/Dependabot comment-pinning convention (`# vX.Y.Z`) keeps updates reviewable.
**Definition of done:** as standard.
**Dependencies:** the CI workflow pin.

---

### Epic: `authz`

---

**Title:** [permission-gated ticket reads] Permission-gate the support-ticket read endpoints and align the contract
**Epic:** `authz`
**Problem / context:** ungated ticket reads (High — the audit's #1 risk) + a contract that marks session routes public (Info, "decide alongside ungated ticket reads"). Ticket read handlers carry no permission metadata, and the permission guard allows the request when that metadata is absent, so ticket reads are not permission-gated. The response includes reporter contact fields and the concern. The contract additionally declares `security: []`, misleading integrators. The rule is a permission gate or an owner scope.
**User story:** As a user with `users:read` permission, I want ticket reads gated on that permission so that reporter PII is visible only to authorized staff, never to any registrant.
**Acceptance criteria:**
- *Given* a user holding `users:read`, *when* they call `listTickets` or `getTicket`, *then* the request succeeds.
- *Given* an authenticated user **without** `users:read`, *when* they call either endpoint, *then* they receive 403 and the denial is auditable.
- *Given* the oRPC contract, *when* regenerated/reviewed, *then* `tickets.contract.ts` no longer declares `security: []` — the spec matches the runtime session + permission requirement (a contract that marks session routes public).
- *Given* the regression test (missing regression tests pairing), *when* CI runs, *then* an e2e/integration test asserts both the permitted and the 403 paths.
**In scope:** `@RequirePermissions("users:read")` on `tickets.controller.ts:14,21`; contract security alignment; permitted/denied test.
**Out of scope:** A finer-grained ticket permission (the finer directory permission / full email-directory reads); recording ticket authorship (ownership scoping / tickets without an author); the mock submit form (schema hygiene / the mock ticket form).
**Technical notes:** Permission key enforced: **`users:read`** (existing; see DOMAIN-MODEL.md for the deliberate coarse-now/fine-later call). Root cause to keep in review checklists: `RbacGuard` pass-through when metadata is absent — every non-anonymous PII read must carry explicit metadata.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [the admin-grant guard] Admin-grant guard + last-Admin protection in one transaction
**Epic:** `authz`
**Problem / context:** the Admin self-grant (Medium — privilege tier collapse: any `users:manage` holder can grant *themselves* Admin via `rbac.controller.ts:78-85`) + last-Admin removal (Low — no last-Admin protection on role removal, with a check-then-write race between concurrent requests in `rbac.service.ts:106-118`). Same service, same transaction — one slice.
**User story:** As a user with `users:manage` permission, I want privileged grants checked against my own privilege tier and the system's Admin count so that role management can neither self-escalate nor lock everyone out.
**Acceptance criteria:**
- *Given* a caller with `users:manage` but not Admin, *when* they attempt to grant the Admin role (to anyone, including themselves), *then* the grant is rejected with 403 and the attempt is audited.
- *Given* a caller who holds Admin, *when* they grant Admin, *then* it succeeds and is audited.
- *Given* a removal that would leave zero Admin holders, *when* attempted, *then* it is rejected with 409, with the count taken **inside the same transaction** as the removal.
- *Given* two concurrent removals of the last two Admins, *when* both run, *then* at most one succeeds.
- *Given* the regression tests, *when* CI runs, *then* self-escalation and last-Admin cases are covered.
**In scope:** Tier check on Admin grants; in-transaction Admin count guard; audited denials; concurrency test.
**Out of scope:** The audit-trail table itself (the append-only audit trail — this ticket calls its helper once it exists, or logs via Pino until then); idempotency on RBAC writes (the idempotency key model).
**Technical notes:** Risky Flow **the privileged-grant transaction** — the state machine in DOMAIN-MODEL.md is normative: both guards inside `BEGIN…COMMIT`, cache invalidation after commit. Permission key enforced: **`users:manage`** (with the Admin-tier refinement). Use `SELECT … FOR UPDATE`/serializable count for the last-Admin check.
**Definition of done:** as standard.
**Dependencies:** the append-only audit trail preferred first (write real audit entries); hard dependency: none.

---

**Title:** [ownership scoping] Ownership scoping on todo mutations + ticket authorship
**Epic:** `authz`
**Problem / context:** unowned todo updates (Medium — `todos.service.ts:44-63` filters update/delete on `id` only: any authenticated user can mutate any todo) + tickets without an author (Low — `ticket.submit` never records `authorId` despite requiring auth, so tickets are unattributable). Both are the "ownership thread" — the reference pattern later resources copy.
**User story:** As an authenticated user *(persona — ownership is identity-scoped, not permission-scoped: any signed-in user owns their own rows)*, I want my todos mutable only by me and my submitted tickets attributed to me so that identity, not mere authentication, bounds writes.
**Acceptance criteria:**
- *Given* a todo owned by user A, *when* user B attempts update or delete, *then* the query matches zero rows and the API returns 404/403 — data unchanged.
- *Given* a todo owned by A, *when* A updates or deletes it, *then* it succeeds.
- *Given* a ticket submission by an authenticated user, *when* it persists, *then* `authorId = session.user.id` is stored (additive migration).
- *Given* the ownership regression tests (missing regression tests pairing), *when* CI runs, *then* cross-user mutation attempts are covered for todos.
**In scope:** `eq(todos.authorId, session.user.id)` on update/delete; additive `tickets.authorId` migration + threading; tests.
**Out of scope:** Owner-scoped ticket *reads* for reporters (future feature — reads stay staff-gated per permission-gated ticket reads); todo idempotency (already applied; the idempotency key model hardens the model).
**Technical notes:** Migration is additive (nullable/backfill-later `authorId`). This ticket's Drizzle `where` pattern is the template's canonical ownership check — reference it from the regression test harness's test docs.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [the append-only audit trail] Append-only RBAC audit trail, written in-transaction
**Epic:** `authz`
**Problem / context:** the missing audit trail (Medium). RBAC mutations (`rbac-admin.service.ts:71-197`) leave no audit trail, though the template's own docs specify one. Grants and removals of privilege must be attributable and tamper-evident.
**User story:** As a user with `users:manage` permission, I want every role mutation recorded immutably with actor, target, and old→new state so that privilege changes are always attributable.
**Acceptance criteria:**
- *Given* any RBAC mutation (grant, removal, role create/update), *when* it commits, *then* an `audit_log` row (actor, action, target, old→new, timestamp) is written **in the same transaction** — a failed insert rolls back the mutation.
- *Given* a denied privileged attempt (e.g., the admin-grant guard's self-escalation), *when* rejected, *then* a denial entry is recorded.
- *Given* the `audit_log` table, *when* inspected, *then* the application exposes no UPDATE or DELETE path to it.
- *Given* an admin with `users:read`, *when* they view the audit list endpoint/screen, *then* entries are readable in reverse-chronological order.
**In scope:** `audit_log` schema (additive migration) + write-helper; hooks in all RBAC mutation paths; minimal read endpoint/list view; in-transaction test.
**Out of scope:** Auditing non-RBAC domains (future consumers call the helper — see DOMAIN-MODEL.md ownership rule); log shipping/SIEM.
**Technical notes:** Cross-epic ownership: `authz` owns schema + helper; **no other epic inserts directly**. Read endpoint carries `@RequirePermissions("users:read")`. Keep the helper signature generic (domain, action, target) so auth events can adopt it later without schema change.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [the finer directory permission] Finer-grained directory-PII permission
**Epic:** `authz`
**Problem / context:** full email-directory reads (Low). `users:read` yields the complete email directory (`rbac.schema.ts:63-68`); after permission-gated ticket reads it also gates ticket reads. Support staff who triage tickets shouldn't automatically hold the full directory.
**User story:** As a user with `users:read` permission, I want directory PII split from operational reads so that granting ticket triage no longer grants the full email directory.
**Acceptance criteria:**
- *Given* a new finer key (e.g., `users:read-directory`) in the permission catalog, *when* the directory endpoint is called without it, *then* the response omits emails or returns 403 (design call documented in the PR).
- *Given* existing Admin roles, *when* the seed/migration runs, *then* they receive the new key — no admin loses access.
- *Given* ticket triage via `users:read` alone, *when* exercised, *then* it still works (permission-gated ticket reads unaffected).
**In scope:** New permission key + seed grant; directory endpoint gating/field-level trim; contract update.
**Out of scope:** Re-keying ticket reads (they stay on `users:read`).
**Technical notes:** Permission keys enforced: **`users:read`**, **`users:read-directory`** (new — add to DOMAIN-MODEL.md table on merge). Coordinate with the cache allowlist and sign-out purge: the `["rbac","users"]` query shape may change; cache allowlist already excludes it.
**Definition of done:** as standard.
**Dependencies:** permission-gated ticket reads, the append-only audit trail (audit the new denials).

---

### Epic: `auth-config`

---

**Title:** [the secret strength check] Non-functional secret placeholder + strength validation
**Epic:** `auth-config`
**Problem / context:** the shipped signing secret (High — audit risk #2). `.env.example:21` ships a **working** `BETTER_AUTH_SECRET`; both validators (`auth/config.ts:26`, `env.config.ts:38`) check presence only. An operator who follows setup and misses one line enables untrustworthy sessions for any account, including Admin.
**User story:** As a platform operator *(persona — boot-time config, no runtime permission)*, I want the app to refuse to boot with a missing, short, or template-default secret so that untrustworthy sessions via a known secret is impossible by construction.
**Acceptance criteria:**
- *Given* the example value or any secret starting with the known default prefix, *when* the app boots, *then* it exits non-zero with a message pointing at `openssl rand -base64 32`.
- *Given* a secret shorter than 32 characters, *when* the app boots, *then* validation rejects it in **both** schemas (`packages/auth` and backend env config).
- *Given* a 32+ char random secret, *when* the app boots, *then* startup succeeds.
- *Given* `.env.example`, *when* read, *then* line 21 is a non-functional placeholder with the generation command in a comment.
**In scope:** `.min(32)` + known-default `.refine` in both validators; placeholder in `.env.example`; boot tests for both branches.
**Out of scope:** Secret rotation tooling; other example-file credentials (schema hygiene / the example database credential).
**Technical notes:** Risky Flow **fail-closed boot**. README already documents the generation command at :415 — link it in the error message. Keep both validators in lockstep (they guard different processes).
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [the production seed guard] Production seed guard + randomized seed credentials
**Epic:** `auth-config`
**Problem / context:** the fixed Admin seed password (High). `packages/db/src/seed.ts` provisions a pre-verified Admin with `a fixed password`, prints it, resets it on every re-run, and has no environment guard — a known-credential Admin one command away from any database, including production.
**User story:** As a platform operator *(persona)*, I want seeding to refuse production and never use a fixed password so that no environment can end up with a publicly known Admin credential.
**Acceptance criteria:**
- *Given* `NODE_ENV === "production"` (or a production-shaped `DATABASE_URL`), *when* the seed runs, *then* it refuses with a non-zero exit before any write.
- *Given* a non-production run, *when* the Admin is created, *then* its password comes from `SEED_ADMIN_PASSWORD` or `randomBytes`, printed **only** when generated.
- *Given* a re-run against a database where the Admin exists, *when* seeding, *then* the existing password is **not** reset unless an explicit `--force-password` flag is passed.
- *Given* the guard test, *when* CI runs, *then* the production-refusal branch is covered.
**In scope:** Env guard at top of `seed.ts`; env/random password sourcing; no-reset-by-default; test.
**Out of scope:** Seed data content changes; the `.env.example` DB credential (schema hygiene / the example database credential).
**Technical notes:** Risky Flow **fail-closed boot**. Audit confidence was Medium only because reaching production requires operator action — the guard removes that dependence on operator perfection.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [the pinned session policy] Pin session, cookie & verification policy explicitly
**Epic:** `auth-config`
**Problem / context:** unpinned session lifetime + verification not required + unpinned cookie attributes + an unvalidated cookie domain (Info/Low, all in `packages/auth/src/config.ts`). Session `expiresIn`/rotation/revocation ride unpinned library defaults; email verification is not required and account-linking is unconfigured; the SameSite/CSRF posture is unresolvable from tracked files (this gates a framable admin UI's true severity); and *any* value for `BETTER_AUTH_COOKIE_DOMAIN` silently enables cross-subdomain cookies. Business decision recorded in PRD: **verification required.**
**User story:** As a platform operator *(persona)*, I want every session and cookie attribute stated explicitly in config so that the security posture is readable from the repo and survives library upgrades.
**Acceptance criteria:**
- *Given* the Better Auth config, *when* reviewed, *then* `expiresIn`, rotation/refresh, SameSite, `Secure`, `HttpOnly`, and cookie `path` are explicitly set with a comment stating the chosen posture (resolving unpinned cookie attributes — answer this **first**, per the audit, since it gates a framable admin UI).
- *Given* a new registration, *when* the user has not verified their email, *then* sign-in is refused until verification completes; account-linking behavior is explicitly configured.
- *Given* `BETTER_AUTH_COOKIE_DOMAIN` set, *when* validated, *then* only a well-formed hostname is accepted; unset by default (no cross-subdomain scope unless deliberate).
- *Given* the pinned config, *when* the web and mobile clients sign in/out, *then* flows still pass e2e (mobile relies on cookies — coordinate with the single cookie store).
**In scope:** Explicit session/cookie config; require-verification + account-linking; cookie-domain validation; e2e smoke on both clients.
**Out of scope:** CSRF *middleware* additions if SameSite resolution shows a gap (file a follow-up if so); reset-path errors (reset-error sanitising).
**Technical notes:** Findings verification not required/unpinned cookie attributes held at Low confidence because library internals were unreadable — verify actual cookie attributes in an integration test (inspect `Set-Cookie`), don't trust config alone. security headers's `frame-ancestors` and this ticket's SameSite jointly close the a framable admin UI framing path.
**Definition of done:** as standard.
**Dependencies:** the secret strength check.

---

**Title:** [reset-error sanitising] Sanitize the password-reset error path
**Epic:** `auth-config`
**Problem / context:** distinguishable reset errors (Medium). The reset path (`config.ts:150-162`) lacks the try/catch + `APIError` sanitizing the verification path (`:127-144`) already has — raw SMTP errors disclose infrastructure detail and the differing responses show whether the account exists (`forgot-password.hooks.ts:26-28`).
**User story:** As a platform operator *(persona)*, I want the reset endpoint to return one uniform response regardless of account existence or mail failure so that it can't be used to enumerate accounts or probe SMTP.
**Acceptance criteria:**
- *Given* a reset request for an existing account, a non-existent account, or an SMTP failure, *when* the endpoint responds, *then* the status and body are identical in all three cases (generic "if the account exists…" response).
- *Given* an SMTP failure, *when* it occurs, *then* the real error is logged server-side through Pino (post-credential redaction) — never returned.
- *Given* the web hook, *when* it renders the outcome, *then* it shows only the generic message.
**In scope:** Mirror the verification path's try/catch + `APIError` onto reset; align the web hook; enumeration test asserting response equality.
**Out of scope:** SMTP fail-closed boot behavior (credential redaction); mail templates.
**Technical notes:** Test with a deliberately broken SMTP config to assert both the generic response and the server-side log.
**Definition of done:** as standard.
**Dependencies:** credential redaction (so the server-side log lands redacted).

---

**Title:** [auth config hygiene] Auth config hygiene batch
**Epic:** `auth-config`
**Problem / context:** the ungated API reference + the always-on Google provider + a non-boundary auth path match + untrimmed origin lists (Low), all in `packages/auth/src/config.ts` (+ `app.config.ts:29`). The openAPI `/reference` plugin registers unconditionally; the Google provider always registers with `as string` laundering `undefined`; the auth-path match matches on `startsWith` so any `/api/v1/auth*` path is swallowed; origin allowlists split without `.trim()/.filter(Boolean)`.
**User story:** As a platform operator *(persona)*, I want auth wiring to be conditional, boundary-exact, and whitespace-safe so that no debug surface or malformed config widens the auth perimeter.
**Acceptance criteria:**
- *Given* the docs flag unset, *when* the app boots, *then* `/reference` is not registered; set, it is.
- *Given* Google credentials with either var missing, *when* the app boots, *then* the provider is not registered and no `as string` cast remains.
- *Given* a request to `/api/v1/authx/...`, *when* the prefix match runs, *then* it does **not** match (prefix-boundary: `/api/v1/auth/` or exact).
- *Given* an origin list with spaces/empty entries, *when* parsed, *then* entries are trimmed and empties dropped in both files.
**In scope:** All four fixes + unit tests for the path-boundary and origin parsing.
**Out of scope:** Session policy (the pinned session policy, already merged by now).
**Technical notes:** One file dominates — one PR reviews coherently. The `startsWith` fix touches `auth.config.ts:25-35` in the backend.
**Definition of done:** as standard.
**Dependencies:** the pinned session policy.

---

### Epic: `abuse`

---

**Title:** [client-IP trust] Trustworthy client IP for rate limiting
**Epic:** `abuse`
**Problem / context:** client-controlled rate-limit keys (High — audit risk #3). In `throttler-proxy.guard.ts` and `nginx/nginx.conf`, the throttle key could be influenced by request headers. Fixed by setting the forwarded header from the connection address and `TRUST_PROXY` equal to the hop count. Rate limiting is the only abuse control on mutation endpoints and it amplifies four other findings.
**User story:** As a platform operator *(persona — infrastructure control; no user-facing permission)*, I want the throttle key derived only from the trusted proxy hop so that limits stay per client.
**Acceptance criteria:**
- *Given* Nginx config updated, *when* a request passes through, *then* the forwarded header is set from the connection address.
- *Given* the guard updated, *when* it derives the key, *then* the key comes from the trusted hop and `TRUST_PROXY` equals that hop count.
- *Given* repeated requests from one client, *when* rate limiting applies, *then* they exhaust one bucket.
- *Given* the regression test, *when* CI runs, *then* the trust boundary is covered.
**In scope:** Guard fix; Nginx directive at both locations; `trust proxy` alignment; trust-boundary test.
**Out of scope:** Shared throttle storage (shared Redis state — re-evaluate process-local limits immediately after this lands, per the audit); request limits (request body limits).
**Technical notes:** Risky Flow **the client-IP trust chain** — the trust chain in DOMAIN-MODEL.md is normative. Beware the deploy topology note (the open backend bind): if any environment fronts the backend without Nginx, `trust proxy` must match that topology; document the assumption in the config comment.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [shared Redis state] Redis-backed throttler and RBAC cache
**Epic:** `abuse`
**Problem / context:** process-local limits (Low on paper, promoted per PRD decision 3). `app.module.ts:40-41` and `rbac-cache.service.ts:14-18` keep the throttler and RBAC permission cache in process memory; in the ASG topology, limits multiply by instance count and permission revocation only takes effect per-instance. The audit says to re-evaluate immediately after client-controlled rate-limit keys — client-controlled rate-limit keys was masking it.
**User story:** As a platform operator *(persona)*, I want throttle counters and permission cache shared across instances so that rate limits hold cluster-wide and a revoked permission dies everywhere at once.
**Acceptance criteria:**
- *Given* Redis configured, *when* two app instances receive requests from one client, *then* they decrement a **single** shared throttle bucket.
- *Given* a role removed on instance A, *when* the affected user hits instance B, *then* the stale permission is not honored beyond the cache TTL / invalidation event.
- *Given* Redis unavailable, *when* requests arrive, *then* the app degrades along a documented, deliberate path (fail-closed for RBAC cache → recompute from DB; throttler behavior stated in config comment) rather than crashing.
- *Given* Compose/deploy config, *when* provisioned, *then* Redis is declared with auth and no public port binding.
**In scope:** Redis service in deploy config; `@nestjs/throttler` Redis storage; RBAC cache moved to Redis with invalidation on RBAC mutations (hook the admin-grant guard/the append-only audit trail paths); degradation tests.
**Out of scope:** Any other Redis use (sessions stay in Better Auth's store); idempotency persistence (the idempotency key model — stays in Postgres).
**Technical notes:** Risky Flow **the client-IP trust chain** tail. New approved infra dependency — update PRD/README setup docs. Invalidation call sits after the admin-grant guard transaction commit (see the privileged-grant transaction diagram).
**Definition of done:** as standard.
**Dependencies:** client-IP trust; the admin-grant guard (invalidation hook point).

---

**Title:** [the idempotency key model] Idempotency key model hardening + consistent application
**Epic:** `abuse`
**Problem / context:** global idempotency keys (Medium) + RBAC writes without idempotency (Low). Idempotency keys (`schema.ts`, `idempotency.interceptor.ts`) are not scoped to the caller, are unvalidated, are unbounded in length, and never expire. RBAC writes do not use the interceptor. The rule is a per-author key, a length cap, expiry, and the same interceptor on RBAC writes.
**User story:** As an authenticated user *(persona — idempotency is identity-scoped by design)*, I want my idempotency keys private to me, bounded, and expiring so that replays stay scoped to the caller.
**Acceptance criteria:**
- *Given* the migrated schema, *when* users A and B send the same key, *then* both succeed independently (composite `(authorId, key)` PK).
- *Given* a key longer than the cap (e.g., 128 chars) or malformed, *when* submitted, *then* the request is rejected with 400 before any write.
- *Given* a stored key past its TTL, *when* cleanup runs, *then* the row is removed; a replay after expiry executes fresh.
- *Given* RBAC mutation endpoints, *when* called with an idempotency key, *then* the interceptor applies exactly as on todo writes.
- *Given* the idempotency regression tests (missing regression tests pairing), *when* CI runs, *then* cross-user squatting and replay-after-expiry are covered.
**In scope:** Composite-PK migration; length/format validation; `expiresAt` + scheduled cleanup; interceptor on RBAC controllers; tests.
**Out of scope:** Paused-mutation replay on the web client (paused-mutation identity — the client-side sibling of this server-side model).
**Technical notes:** Migration must handle existing rows (backfill `authorId` where derivable, else truncate the table — it's a cache). Cleanup job can share the scheduler schema hygiene adds for `verifications` (unpruned verification rows).
**Definition of done:** as standard.
**Dependencies:** ownership scoping (establishes the `authorId` conventions this reuses).

---

**Title:** [request body limits] Request body limits and proxy timeouts
**Epic:** `abuse`
**Problem / context:** unbounded request bodies (Medium). No explicit body-size limit on either parser (`app.config.ts:15-16`) and no `client_max_body_size` or proxy timeouts in Nginx — memory-exhaustion and slow-request exposure on every mutation endpoint.
**User story:** As a platform operator *(persona)*, I want request size and duration bounded at both layers so that oversized or dawdling requests can't exhaust the backend.
**Acceptance criteria:**
- *Given* both parsers configured with `{ limit: "100kb" }`, *when* a larger JSON body arrives, *then* the app rejects it with 413.
- *Given* `client_max_body_size 1m;` in Nginx, *when* an oversized request arrives, *then* Nginx rejects it before it reaches the app.
- *Given* proxy read/send/connect timeouts set, *when* an upstream stalls, *then* Nginx terminates the request within the configured window.
- *Given* the largest legitimate payload in the app (audit as part of this ticket), *when* submitted, *then* it passes — limits don't break real flows.
**In scope:** Parser limits; Nginx size + timeout directives; a boundary test.
**Out of scope:** Per-field schema caps (the unbounded concern field → schema hygiene); TLS/upstreams (TLS termination).
**Technical notes:** Coordinate with TLS termination — same `nginx.conf`, land this first or rebase. Note the 100kb/1m gap is deliberate headroom for headers/multibyte.
**Definition of done:** as standard.
**Dependencies:** none.

---

### Epic: `webclient`

---

**Title:** [the cache allowlist and sign-out purge] Cache persistence allowlist + sign-out purge
**Epic:** `webclient`
**Problem / context:** the shared browser cache (High — audit risk #4). The client persister uses one shared key with no per-user boundary, and it persists session and administration data. Sign-out does not clear that store, so the next person on the browser profile can receive the previous account's data. The rule is a per-user key, sensitive queries excluded from persistence, and a full clear on sign-out.
**User story:** As an authenticated user *(persona — cache isolation protects every signed-in user; no single permission governs it)*, I want nothing sensitive persisted and everything purged at sign-out so that a shared browser never hands my data to the next person.
**Acceptance criteria:**
- *Given* the dehydration allowlist, *when* queries persist, *then* `session` and `rbac` roots are **never** written to IndexedDB (exclusion, the audit's stronger control).
- *Given* sign-out, *when* it completes, *then* `queryClient.clear()` runs **and** the persister entry is removed from IndexedDB (`removeClient()`/`del()`), in that order.
- *Given* the persister config, *when* constructed, *then* it has an explicit key incorporating the user identity, a `maxAge` well under 24h, and a cache `buster`.
- *Given* the audit's own verification script — sign in as admin, open `/user-management`, sign out — *when* IndexedDB is inspected, *then* no residual emails exist; this check is automated as the cache-isolation test (missing regression tests pairing).
- *Given* offline-first reads of *allowed* keys (e.g., todos), *when* the same user returns, *then* offline behavior still works — the PWA capability survives the fix.
**In scope:** `shouldDehydrateQuery` allowlist in `query-client.ts`; purge in `session.hooks.ts` sign-out; per-identity key + `maxAge` + buster in `provider.tsx`; automated isolation test.
**Out of scope:** Paused-mutation identity binding (paused-mutation identity); SW caching of token URLs (service-worker exclusions); the mobile analog (the single cookie store).
**Technical notes:** Risky Flow **the identity and cache purge** — order is memory → disk → done; a purge that throws must not leave the disk copy (wrap + retry). The only existing cache-clearing code is gated to non-production (`serwist-provider.tsx:20-22`) — do **not** reuse that path.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [service-worker exclusions] Service-worker token & authenticated-route exclusions
**Epic:** `webclient`
**Problem / context:** cached token URLs (Medium) + offline fallback on authenticated routes (Low), both in `app/sw.ts`. Reset/verification tokens travel in URLs that the service worker can cache (`:35,40-49`) and that leak via referrer; and the offline fallback is served for authenticated navigations, masking auth state.
**User story:** As an authenticated user *(persona)*, I want single-use token URLs never cached and authenticated pages never faked from cache so that tokens stay single-use and auth state stays honest.
**Acceptance criteria:**
- *Given* a navigation to `/reset-password?token=…` or a verification URL, *when* the SW routes it, *then* a NetworkOnly matcher applies — nothing enters any cache.
- *Given* an authenticated route while offline, *when* navigated, *then* the SW does not serve the generic offline fallback as if it were the page (excluded from the fallback matcher).
- *Given* the SW cache storage after a reset flow, *when* inspected in the test, *then* no URL containing a token parameter exists in any cache.
**In scope:** NetworkOnly matchers for token routes; fallback exclusion for authenticated route groups; cache-inspection test.
**Out of scope:** `Referrer-Policy` header (security headers closes the referrer half of cached token URLs); SW update lifecycle (the PWA update flow).
**Technical notes:** Enumerate token-bearing routes from the auth config (reset, verify email) so new ones get added in one place. security headers + this ticket jointly retire cached token URLs.
**Definition of done:** as standard.
**Dependencies:** security headers (for the referrer half — can land in either order, note in both PRs).

---

**Title:** [paused-mutation identity] Bind paused mutations to the queueing identity
**Epic:** `webclient`
**Problem / context:** paused-mutation replay (Medium). Offline-queued (paused) mutations (`provider.tsx:93-96`, `query-client.ts:34-36`, `todos.hooks.ts:207`) replay under **whichever session is active at reconnect** — user B can unknowingly fire user A's queued writes.
**User story:** As an authenticated user *(persona)*, I want my offline-queued writes to replay only under my own session so that a device handover can't execute my actions as someone else.
**Acceptance criteria:**
- *Given* a mutation queued while user A is signed in, *when* it is enqueued, *then* A's user id is recorded with it.
- *Given* reconnect with user B active, *when* replay begins, *then* A's mutations are aborted (not sent) and surfaced as discarded — never executed under B.
- *Given* reconnect with A still active, *when* replay runs, *then* the mutations execute normally.
- *Given* sign-out (the cache allowlist and sign-out purge), *when* it runs, *then* the paused-mutation queue is cleared with the rest of the client state.
**In scope:** Identity stamping at enqueue; identity check at replay; discard UX (toast/log); test simulating the user swap.
**Out of scope:** Server-side idempotency model (the idempotency key model — the server-side sibling); conflict resolution.
**Technical notes:** Risky Flow **the identity and cache purge**. TanStack's `onSuccess`/resume hooks in the provider are the interception point; the recorded id compares against the *current* `["session"]` before `resumePausedMutations()`.
**Definition of done:** as standard.
**Dependencies:** the cache allowlist and sign-out purge.

---

**Title:** [the PWA update flow] PWA update flow & connectivity probe hygiene
**Epic:** `webclient`
**Problem / context:** mid-session service-worker claim + the third-party connectivity probe (Low). `skipWaiting`+`clientsClaim` performs a mid-session service-worker claim with a dev-only unregister path — no production recovery from a bad SW; and the online-status hook probes `gstatic.com` every 15s, leaking IP + session duration to a third party.
**User story:** As an authenticated user *(persona)*, I want app updates to apply predictably and connectivity checks to stay first-party so that a bad deploy is recoverable and no third party observes my usage.
**Acceptance criteria:**
- *Given* a new SW version, *when* detected mid-session, *then* the user is prompted to reload (or update applies on next navigation) instead of applying the update with no prompt — documented choice in the PR.
- *Given* a broken SW in production, *when* the recovery path is triggered, *then* unregistration + cache reset works with `NODE_ENV === "production"` (the current path returns early there).
- *Given* the online-status hook, *when* it probes, *then* it targets `/api/v1/health` — zero third-party requests.
**In scope:** Prompted/deferred update strategy; production recovery path; probe retarget in `use-online-status.ts`.
**Out of scope:** Health endpoint response content (health and request-id hygiene / a verbose health response — merge order note below).
**Technical notes:** Probe lands **after** health and request-id hygiene genericizes the health response, or accept version disclosure to the probe in the interim (first-party, low risk). Health is `@AllowAnonymous` — probe works signed-out.
**Definition of done:** as standard.
**Dependencies:** service-worker exclusions; health and request-id hygiene (soft — see note).

---

### Epic: `logging`

---

**Title:** [credential redaction] Redact credentials across all three log paths
**Epic:** `logging`
**Problem / context:** credential logging (High — three independent paths). Mobile auth logging in `auth_repository.dart` writes response bodies with no debug-only gate, and release builds keep that log. Mail in `send-mail.ts` can write the full message, including reset links, when mail is not configured, and that path skips Pino. Pino redaction omits token, new-password, and email fields and logs the request URL. The rule is: release and production logs contain no credentials, production boot fails when mail is not configured, and redaction covers those fields and query values.
**User story:** As a platform operator *(persona — log sinks, no runtime permission)*, I want tokens, reset links, and PII unable to reach any log sink so that logs can be shipped and retained without becoming a credential store.
**Acceptance criteria:**
- *Given* the three mobile `developer.log` calls, *when* built in release mode, *then* they are gated on `kDebugMode` and no longer include `response.data` even in debug.
- *Given* `SMTP_HOST` unset in production, *when* the app boots, *then* it **refuses to start** (fail closed) — the silent `jsonTransport` fallback is removed; in development, the fallback is explicit and its output redacts the message body/links.
- *Given* Pino config, *when* requests log, *then* `body.token`, `body.newPassword`, `body.email` are redacted and `req.url` is sanitized of token-bearing query parameters.
- *Given* a full auth cycle (sign-up, sign-in, reset request) in a test, *when* captured logs are scanned, *then* no token, reset link, or password appears — automated as a log-scan test.
**In scope:** All three paths + the boot guard + log-scan test.
**Out of scope:** Mobile error-message mapping (mobile release hardening / raw mobile error text); health/request-id leaks (health and request-id hygiene).
**Technical notes:** Risky Flow **fail-closed boot** (the SMTP boot guard). The URL sanitizer must whitelist-strip (`token`, `code`, …) rather than blacklist paths. Mobile half touches `auth_repository.dart:52-57,81-86,115-120` — coordinate with the single cookie store (same file family) to avoid conflicts.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [health and request-id hygiene] Health & request-id disclosure hygiene
**Epic:** `logging`
**Problem / context:** a verbose health response + verbatim request ids (Low). The unauthenticated health endpoint returns environment, version, uptime, and raw database error text (`health.service.ts`); inbound `X-Request-Id` is accepted with no length or format check, then logged and reflected (`pino-logger.config.ts`). The rule is a generic external health error and a bounded request id.
**User story:** As a platform operator *(persona)*, I want the health surface generic and correlation ids validated so that an anonymous probe learns nothing and log lines can't be split by a header.
**Acceptance criteria:**
- *Given* a DB failure, *when* `/api/v1/health` responds, *then* the body says only "database check failed" and the real error goes to server logs.
- *Given* the health response, *when* unauthenticated, *then* env/version/uptime metadata is omitted (or gated behind a permissioned variant).
- *Given* an inbound `X-Request-Id`, *when* processed, *then* it is accepted only if it matches a UUID (or ≤64-char safe charset); otherwise a fresh id is generated.
- *Given* the PWA update flow's probe, *when* it polls health, *then* the generic response still satisfies it.
**In scope:** Health response genericizing; request-id validation; tests for both.
**Out of scope:** the open backend bind topology confirmation (PRD residual risk).
**Technical notes:** Health stays `@AllowAnonymous` (deploy healthchecks and the PWA update flow probe rely on it). Keep the response shape the Compose healthchecks expect.
**Definition of done:** as standard.
**Dependencies:** credential redaction.

---

### Epic: `edge`

---

**Title:** [security headers] Security headers at all three layers
**Epic:** `edge`
**Problem / context:** missing security headers (Medium) + a framable admin UI (Medium). No CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy` at Next.js, NestJS, or Nginx, so the RBAC admin UI can be framed. That matters because role assignment changes privilege. The rule is frame denial at each layer.
**User story:** As an authenticated user *(persona — headers protect all users; enforcement is infrastructural)*, I want browser-level defenses declared at every layer so that framing, sniffing, and referrer leakage are cut off regardless of which layer serves a response.
**Acceptance criteria:**
- *Given* any page from the web app, *when* headers are inspected, *then* CSP (including `frame-ancestors 'none'`), HSTS, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin` (or stricter) are present via `next.config.ts` `headers()`.
- *Given* any backend API response, *when* inspected, *then* helmet-applied headers are present from NestJS bootstrap.
- *Given* responses via Nginx, *when* inspected, *then* `add_header` directives apply the same set consistently (no conflicting duplicates between layers).
- *Given* `/user-management` loaded inside an iframe, *when* rendered, *then* the browser blocks it — verified by test (retires the framable admin UI case).
- *Given* the CSP, *when* the app runs its normal flows, *then* nothing legitimate is blocked (start with report-only in the PR if needed, ship enforcing).
**In scope:** `headers()` in Next config; `helmet()` in bootstrap; Nginx `add_header`; framing test; CSP tuning.
**Out of scope:** TLS termination and upstreams (TLS termination); SW token caching (service-worker exclusions — but this ticket's Referrer-Policy closes cached token URLs's referrer half).
**Technical notes:** Beware header duplication when Nginx fronts Next — decide one owner per header and comment it in `nginx.conf`. HSTS only once TLS (TLS termination) is live in the target env — gate with a config flag if TLS termination hasn't shipped.
**Definition of done:** as standard.
**Dependencies:** none hard; TLS termination for HSTS activation.

---

**Title:** [TLS termination] Ship the TLS config and fix upstream addressing
**Epic:** `edge`
**Problem / context:** the commented-out TLS block (Medium). The entire TLS block in `nginx.conf:51-86` is commented out, and upstreams point at `host.docker.internal` instead of Compose service names — the shipped proxy config neither terminates TLS nor works in the deployed topology as written.
**User story:** As a platform operator *(persona)*, I want the shipped Nginx config to be the working, TLS-terminating one so that an adopter deploying the template gets HTTPS and correct routing by default.
**Acceptance criteria:**
- *Given* the config, *when* deployed with certificates present, *then* TLS terminates at Nginx with a modern protocol/cipher baseline (TLS 1.2+, no legacy ciphers) and HTTP redirects to HTTPS.
- *Given* the upstream blocks, *when* running under Compose, *then* they resolve backend/web by **service name**, not `host.docker.internal`.
- *Given* certificate paths, *when* absent (local dev), *then* a documented dev override exists rather than commented-out production config.
- *Given* the deployed stack, *when* smoke-tested, *then* web and API routes both serve over HTTPS through the proxy.
**In scope:** Working TLS server block; upstream service names; dev/prod split; smoke test.
**Out of scope:** Certificate issuance automation (ops); security headers (security headers); body limits/timeouts (request body limits — rebase over it).
**Technical notes:** Coordinate the file with request body limits and security headers (same `nginx.conf`) — land request body limits → security headers → TLS termination or rebase carefully. After this, enable HSTS per security headers's flag.
**Definition of done:** as standard.
**Dependencies:** request body limits, security headers (file-ordering only).

---

### Epic: `mobile`

---

**Title:** [the single cookie store] Single cookie source of truth + sign-out purge
**Epic:** `mobile`
**Problem / context:** the duplicated mobile cookie (Medium) + a cookie jar kept after sign-out (Low). `api_client.dart:47-65` duplicates the session cookie into secure storage via a manual interceptor that re-serializes it malformed, unscoped, and overwriting `CookieManager`; and sign-out (`auth_repository.dart:98-105`) clears secure storage but the `PersistCookieJar` is unreachable from there and never purged — the session cookie survives sign-out on disk.
**User story:** As a mobile app user *(persona — client credential storage, no server permission involved)*, I want exactly one cookie store that is fully purged at sign-out so that my session can't linger on the device or be corrupted by duplication.
**Acceptance criteria:**
- *Given* the manual cookie interceptor deleted, *when* authenticated requests run, *then* `CookieManager` + `PersistCookieJar` alone handle cookies and auth flows still pass.
- *Given* the cookie jar exposed via a provider, *when* sign-out runs, *then* `cookieJar.deleteAll()` executes alongside the secure-storage clear.
- *Given* the device storage after sign-out, *when* inspected in an integration test, *then* no session cookie remains in the jar's persistence directory.
- *Given* a fresh sign-in after purge, *when* performed, *then* the session works normally.
**In scope:** Delete the interceptor; provider-expose the jar; purge on sign-out; storage-inspection test.
**Out of scope:** Log redaction in the same files (credential redaction — merge that first); cookie attributes server-side (the pinned session policy).
**Technical notes:** Risky Flow **the identity and cache purge** (mobile leg). Depends on the pinned session policy's pinned cookie attributes being compatible with Dio's jar — verify in the integration test. Same file family as credential redaction's mobile half: sequence credential redaction → the single cookie store.
**Definition of done:** as standard.
**Dependencies:** credential redaction, the pinned session policy.

---

**Title:** [mobile transport hardening] Mobile transport & bundled-config hardening
**Epic:** `mobile`
**Problem / context:** cleartext mobile traffic (Medium) + the bundled mobile env file (Low). `usesCleartextTraffic="true"` sits in the **release** manifest and `api_constants.dart:7` carries a non-TLS fallback URL — production traffic can go plaintext; and `.env` is bundled as a Flutter asset (`pubspec.yaml:78-79`), shipping config cleartext inside every APK.
**User story:** As a mobile app user *(persona)*, I want release builds to refuse cleartext transport and carry no bundled env file so that my traffic is always TLS and no packaged secret rides in the APK.
**Acceptance criteria:**
- *Given* the manifests, *when* built, *then* `usesCleartextTraffic="true"` exists only in `src/debug/AndroidManifest.xml`; the release manifest denies cleartext.
- *Given* the API base URL, *when* unset at build time, *then* the release build **fails** (no non-TLS fallback constant); config arrives via `--dart-define`.
- *Given* `.env` removed from Flutter assets, *when* the APK is unpacked in a test, *then* no env file exists inside it; `.env.example` for mobile carries a warning comment.
- *Given* a debug build, *when* run against a local HTTP backend, *then* development still works (cleartext allowed in debug only).
**In scope:** Manifest split; `--dart-define` config path; fallback removal; APK-inspection check.
**Out of scope:** Release signing (mobile release hardening); certificate pinning (future hardening).
**Technical notes:** Update mobile README build instructions (`flutter build apk --dart-define=API_BASE_URL=…`). CI builds (if any) must pass the define.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [mobile release hardening] Mobile release hardening batch
**Epic:** `mobile`
**Problem / context:** debug signing on release + raw mobile error text + the mismatched password minimum + unused mobile permissions (Low). Release builds are signed with the **debug keystore** under `com.example.mobile`; non-Dio exceptions render `error.toString()` and Dio messages embed host/port; the login screen enforces a 6-char password minimum vs the server's 8; the manifest requests unused `SCHEDULE_EXACT_ALARM`/`RECEIVE_BOOT_COMPLETED` permissions and leaves `allowBackup` defaulting to true.
**User story:** As a mobile app user *(persona)*, I want the released app properly signed, minimally permissioned, and honest in its errors so that it is updatable, cannot be replaced by a build signed with someone else's key, and leaks nothing through messages or backups.
**Acceptance criteria:**
- *Given* `build.gradle.kts`, *when* a release is built, *then* it uses a real signing config (keys via env/local properties, never committed) and a unique application id — with a documented note that the id **cannot change after first store publish**.
- *Given* an error on the login screen, *when* rendered, *then* the user sees a mapped, fixed string — never `toString()` output or host/port detail.
- *Given* the login form, *when* validating, *then* the password minimum matches the server schema (8), sourced from a shared constant where feasible.
- *Given* the manifest, *when* reviewed, *then* the two unused permissions are gone and `android:allowBackup="false"` is set.
**In scope:** Signing config scaffold + docs; error mapping; validation alignment; manifest cleanup.
**Out of scope:** iOS (untracked — PRD non-goal); Play Store publishing.
**Technical notes:** Keystore material must never enter the repo — `key.properties` pattern, gitignored, documented. the mismatched password minimum's server minimum lives in `register.schema.ts:6`.
**Definition of done:** as standard.
**Dependencies:** mobile transport hardening.

---

### Epic: `hygiene`

---

**Title:** [the regression test harness] Security regression test harness
**Epic:** `hygiene`
**Problem / context:** missing regression tests (Low, flagged by the audit for early attention). There are **no** ownership, idempotency, or cache-isolation tests, and the e2e spec targets a non-existent path (`app.e2e-spec.ts:32`) — every Wave-1/2 fix would ship without regression protection. Wave-1 tickets each carried a minimal paired test; this ticket builds the shared harness and fills the gaps.
**User story:** As a developer on the team *(persona — CI infrastructure)*, I want a working security test suite in CI so that the fixes for ungated ticket reads, the shared browser cache, unowned todo updates, and global idempotency keys cannot silently regress.
**Acceptance criteria:**
- *Given* the e2e config, *when* tests run, *then* the broken path is fixed and the suite executes in CI (via the CI workflow pin).
- *Given* the harness, *when* CI runs, *then* it includes at minimum: permission-gate tests (permission-gated ticket reads paths), ownership tests (ownership scoping), idempotency tests incl. cross-user keys (the idempotency key model), and the cache-isolation check (the cache allowlist and sign-out purge).
- *Given* shared fixtures, *when* a new security test is written, *then* multi-user session setup (user A / user B / admin) is a one-line helper.
- *Given* any of the four covered fixes reverted locally, *when* the suite runs, *then* at least one test fails (mutation check on the suite itself, spot-verified in the PR).
**In scope:** e2e path fix; multi-user fixtures; consolidation of Wave-1 paired tests into one suite; CI wiring.
**Out of scope:** Full coverage targets; load/perf tests.
**Technical notes:** Backend tests via the Nest testing module with a real Postgres (Compose service in CI); the web cache-isolation check via Playwright + IndexedDB inspection. Reference ownership scoping's ownership pattern as the canonical example in the test README.
**Definition of done:** as standard.
**Dependencies:** permission-gated ticket reads, ownership scoping, the idempotency key model, the cache allowlist and sign-out purge, the CI workflow pin.

---

**Title:** [schema hygiene] Repo & schema hygiene batch
**Epic:** `hygiene`
**Problem / context:** the unbounded concern field, unpruned verification rows, the example database credential, the unused root Dockerfile, the beta ORM in production, credential-shaped placeholders, the mock ticket form (Low/Info). The only unbounded string in the schema set (`concern`, no `.max()`); `verifications` rows never cleaned and unindexed on `expires_at`; a working database credential in `packages/db/.env.example`; an unused root Dockerfile shipping full source + dev deps; drizzle beta in production runtime (track only); credential-shaped README placeholders that will trip secret scanners; and a submit-ticket form that discards input and reports success — a functional trap for adopters.
**User story:** As a developer adopting the template *(persona)*, I want the repo free of footguns, dead weight, and false signals so that nothing checked in misleads a scanner, an operator, or a user.
**Acceptance criteria:**
- *Given* `tickets.schema.ts:15`, *when* a `concern` over 5000 chars is submitted, *then* validation rejects it (`.max(5000)`).
- *Given* the scheduled cleanup, *when* it runs, *then* expired `verifications` rows are deleted; an index on `expires_at` exists (additive migration).
- *Given* `packages/db/.env.example:6` and the README examples at :335,405,411,414, *when* scanned, *then* only `<angle-bracket>` placeholders appear, with dev-only comments where relevant.
- *Given* the root Dockerfile, *when* the repo is reviewed, *then* it is deleted (or explicitly header-marked as an unused example — decide in PR, prefer delete).
- *Given* `submit-ticket/page.tsx:62-65`, *when* the form is submitted, *then* it calls the real ticket endpoint (per ownership scoping, recording `authorId`) — the silent-success mock is gone.
- *Given* `drizzle-orm`/`drizzle-kit` beta pinning, *when* reviewed, *then* a tracking issue for the 1.0 upgrade is filed and linked (no code change here).
**In scope:** All six code/docs fixes + the tracking issue; cleanup job shares the idempotency key model's scheduler.
**Out of scope:** the open backend bind (ops confirmation — PRD residual risk); new ticket features beyond wiring the existing form.
**Technical notes:** The form wire-up is the one user-visible change — smoke-test the submit flow end to end (it exercises permission-gated ticket reads's gate from the anonymous-submit side: submission stays open, reads stay gated).
**Definition of done:** as standard.
**Dependencies:** ownership scoping (authorId), the idempotency key model (scheduler).

---

*End of ticket set. 33 tickets · 9 epics · 3 waves. Wave 1 clears the audit's Conditional-GO gate; Wave 2 clears the 30-day list (with process-local limits, missing regression tests, verification not required promoted per PRD decisions); Wave 3 closes the batched backlog. the open backend bind remains an ops confirmation tracked in PRD.md.*
