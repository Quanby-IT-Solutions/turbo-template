# TICKETS — Turbo Template Security Remediation

> Every ticket is a vertical slice: schema/config → enforcement → UI/client where applicable → test. One ticket = one branch = one small PR. "DoD: as standard" = *Code + tests merged · acceptance criteria pass · audit/permission checks verified · PR reviewed · docs updated.* Finding IDs (F-xx) cite the 2026-08-11 audit. Risky flows referenced by number are defined in DOMAIN-MODEL.md / the hand-off notes: **RF1** identity/cache purge · **RF2** client-IP trust chain · **RF3** fail-closed boot · **RF4** deploy secret handling · **RF5** privileged-grant transaction.

---

## 1. Epic map

| Epic key | Label | Source findings | Note |
|---|---|---|---|
| `authz` | Authorization & Data Scoping | F-01, 10, 11, 17, 30, 31, 51, 55 | Permission gates, ownership, audit trail. |
| `auth-config` | Auth Secrets & Session Policy | F-03, 06, 18, 32, 33, 34, 35, 56, 57, 58, 59 | Better Auth config, seeds, secrets. |
| `abuse` | Rate Limiting, Idempotency & Limits | F-02, 13, 14, 38, 39 | The throttle/idempotency spine. |
| `webclient` | Web Client Cache & PWA | F-04, 19, 20, 48, 49, 50 | TanStack persistence + Serwist. |
| `logging` | Log Redaction & Disclosure | F-05, 36, 37 | Three log paths + response leaks. |
| `edge` | Security Headers, TLS & Nginx | F-12, 15, 21 | The reverse-proxy layer. |
| `mobile` | Flutter Mobile Hardening | F-23, 24, 42, 43, 44, 45, 46, 47 | Shipped app — 30-day wave. |
| `cicd` | Supply Chain & CI/CD | F-07, 08, 09, 16, 22, 25, 26, 27, 28, 52 | Pipeline trust. |
| `hygiene` | Tests & Repo Hygiene | F-29, 40, 41, 53, 54, 61, 62 | Harness + batched leftovers. |

---

## 2. Build order

**Wave 1 — release blockers (Conditional GO gate):**
1. **CI-1** — Delete the stray `orpc` dependency (F-08)
2. **AZ-1** — Permission-gate ticket reads + align the contract (F-01, F-55)
3. **AB-1** — Trustworthy client IP for rate limiting (F-02)
4. **AC-1** — Non-functional secret placeholder + strength validation (F-03)
5. **AC-2** — Production seed guard + randomized seed credentials (F-06)
6. **WC-1** — Cache persistence allowlist + sign-out purge (F-04)
7. **LG-1** — Redact credentials across all three log paths (F-05)
8. **CI-2** — Staging deploy: pinned host keys + ECR variable fix (F-07)
9. **CI-3** — Pin the external CI workflow + scope secrets (F-09)

**Wave 2 — 30-day set:**
10. **AB-2** — Redis-backed throttler + RBAC cache (F-38)
11. **AZ-2** — Admin-grant guard + last-Admin protection (F-10, F-31)
12. **AZ-4** — Append-only RBAC audit trail (F-17)
13. **AZ-3** — Ownership scoping on todos + ticket authorship (F-11, F-30)
14. **AB-3** — Idempotency key model hardening + consistent application (F-13, F-39)
15. **AB-4** — Request body limits + proxy timeouts (F-14)
16. **ED-1** — Security headers at all three layers (F-12, F-21)
17. **ED-2** — Ship TLS config + service-name upstreams (F-15)
18. **WC-2** — Service-worker token & auth-route exclusions (F-20, F-48)
19. **WC-3** — Bind paused mutations to the queueing identity (F-19)
20. **AC-3** — Pin session, cookie & verification policy (F-56, F-58, F-59, F-33)
21. **AC-4** — Sanitize the password-reset error path (F-18)
22. **CI-4** — Re-enable validation gates: env + TypeScript (F-16, F-22)
23. **CI-5** — Production deploy secret handling (F-25)
24. **CI-6** — Action pinning, workflow permissions, cache scoping, postinstall (F-26, F-27, F-28)
25. **MB-1** — Single cookie source of truth + sign-out purge (F-23, F-43)
26. **MB-2** — Mobile transport & bundled-config hardening (F-24, F-42)
27. **MB-3** — Mobile release hardening batch (F-44, F-45, F-46, F-47)
28. **HY-1** — Security regression test harness (F-54)

**Wave 3 — hardening backlog (batched):**
29. **AC-5** — Auth config hygiene batch (F-32, F-34, F-35, F-57)
30. **LG-2** — Health & request-id disclosure hygiene (F-36, F-37)
31. **WC-4** — PWA update flow & connectivity probe (F-49, F-50)
32. **AZ-5** — Finer-grained directory-PII permission (F-51)
33. **HY-2** — Repo & schema hygiene batch (F-29, F-40, F-41, F-52, F-53, F-61, F-62)

---

## 3. Full tickets

### Epic: `cicd`

---

**Title:** [CI-1] Delete the stray `orpc` dependency
**Epic:** `cicd`
**Problem / context:** F-08 (High). `packages/contracts/package.json:26` declares `"orpc": "^0.1.1"` — an abandoned 2018 package with a live caret range and dormant maintainer, pulling a deprecated Socket.IO stack (`socket.io@2.5.1`). No source file imports it. Best value-to-effort fix in the audit.
**User story:** As a release engineer *(persona — no runtime permission governs the dependency graph)*, I want the abandoned package removed so that the supply chain carries no deprecated, maintainer-dormant transitive stack.
**Acceptance criteria:**
- *Given* the dependency line is deleted, *when* `pnpm install` refreshes the lockfile, *then* `orpc@0.1.1` and every transitive it introduced (incl. `socket.io@2.5.1`) are absent from `pnpm-lock.yaml`.
- *Given* the refreshed lockfile, *when* the full build and typecheck run, *then* they pass — proving nothing imported the package.
- *Given* the repo post-merge, *when* grepping for `from "orpc"` / `require("orpc")`, *then* there are zero hits.
**In scope:** Delete line 26 of `packages/contracts/package.json`; refresh `pnpm-lock.yaml`; verify build.
**Out of scope:** Any other dependency change (F-28 postinstall → CI-6; F-53 drizzle beta → HY-2).
**Technical notes:** Verify no lockfile drift beyond the removal (the audit's read-only constraint flagged that `pnpm` can rewrite the lockfile when manifests disagree — commit only the intended delta). The legitimate oRPC packages (`@orpc/*`) are untouched.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [CI-2] Staging deploy — pinned host keys + ECR variable fix
**Epic:** `cicd`
**Problem / context:** F-07 (High). `deploy-staging.yml:130,138-152` expands secrets on the runner and streams them over SSH with `StrictHostKeyChecking=no` (MITM-able), and line 140 has a variable swap so staging has never actually run the web image.
**User story:** As a release engineer *(persona — pipeline, no runtime permission)*, I want staging deploys to talk only to a verified host and deploy the correct images so that secrets can't be intercepted and staging actually mirrors production.
**Acceptance criteria:**
- *Given* the workflow, *when* it opens the SSH connection, *then* the target's host key is verified against a pinned `known_hosts` entry (no `StrictHostKeyChecking=no`, no `accept-new`).
- *Given* line 140 fixed to `ECR_REPOSITORY_WEB=$ECR_REPOSITORY_WEB`, *when* a staging deploy runs, *then* the web image is pulled and started from the correct repository.
- *Given* a host-key mismatch, *when* the connection is attempted, *then* the deploy fails closed with a clear error rather than proceeding.
- *Given* the workflow file, *when* reviewed, *then* no secret value is echoed or written to disk on the runner (align with the CI-5 pattern; full production-side rework is CI-5).
**In scope:** Pinned `known_hosts` (repo-stored public key or secret); the 2-minute ECR var fix; fail-closed connection.
**Out of scope:** Production deploy secret handling (CI-5); SHA-pinning actions (CI-6).
**Technical notes:** Risky Flow **RF4**. Store the host public key as a repo file or Actions variable, install into `~/.ssh/known_hosts` before `ssh`/`scp`. Keep the deploy gated on `needs: ci` — unchanged.
**Definition of done:** as standard, plus one successful staging deploy run showing the web image live.
**Dependencies:** none.

---

**Title:** [CI-3] Pin the external CI workflow to a SHA and scope secrets
**Epic:** `cicd`
**Problem / context:** F-09 (High, Medium confidence). `.github/workflows/ci.yml:13-14` delegates the entire quality gate to an external reusable workflow referenced at `@main` with `secrets: inherit`. The audit could not read that workflow — the CI gate's contents are unverifiable, and a compromise of the external repo exfiltrates every inherited secret.
**User story:** As a release engineer *(persona)*, I want the CI gate pinned to an immutable ref with an explicit secret allowlist so that an external repository change can neither alter our gate nor read our secrets.
**Acceptance criteria:**
- *Given* the reusable workflow reference, *when* CI runs, *then* it targets a full commit SHA (with a version comment), not a branch ref.
- *Given* `secrets: inherit` removed, *when* the workflow needs a secret, *then* only explicitly named secrets are passed and the run succeeds.
- *Given* the pinned SHA, *when* the team reviews it once, *then* the referenced workflow's contents at that SHA are confirmed to run lint, typecheck, and tests (closing the audit's "cannot confirm CI runs anything" gap) and the confirmation is noted in the PR.
**In scope:** SHA-pin the ref; enumerate passed secrets; one-time content review of the pinned workflow.
**Out of scope:** Pinning marketplace actions and adding `permissions:` blocks across all five workflows (CI-6); replacing the external workflow with an in-repo one (future option, note in PR).
**Technical notes:** If the external workflow at the pinned SHA does *not* run lint/typecheck/test, escalate — deploys gate on this job (`needs: ci`) and the whole remediation's DoD depends on CI being real.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [CI-4] Re-enable the validation gates — env validation in CI, TypeScript build errors
**Epic:** `cicd`
**Problem / context:** F-16 + F-22 (Medium). Env validation is skipped whenever `CI` is truthy (`env.config.ts:46`, `auth/config.ts:52`, `web/env.ts:62`) — disabled exactly where it would catch misconfiguration — and `next.config.ts:25` sets `typescript.ignoreBuildErrors: true`, so type errors in permission logic ship silently.
**User story:** As a release engineer *(persona)*, I want validation to fail the build when config or types are wrong so that misconfiguration is caught in CI, not production.
**Acceptance criteria:**
- *Given* the three validators, *when* run in CI, *then* validation executes; it is skipped only when `SKIP_ENV_VALIDATION` is explicitly set (documented escape hatch).
- *Given* `ignoreBuildErrors` deleted, *when* `next build` runs, *then* it fails on any TS error; all errors surfaced by the removal are fixed in this ticket.
- *Given* a deliberately invalid env var in a CI test run, *when* the pipeline runs, *then* it fails at validation with a readable message.
**In scope:** Replace `CI`-triggered skips with explicit `SKIP_ENV_VALIDATION` in all three files; delete the Next flag; fix surfaced type errors.
**Out of scope:** New validation rules beyond what exists (AC-1 adds the secret rules separately).
**Technical notes:** Risky Flow **RF3** — this is the "validation never silently skipped" leg. Coordinate with AC-1: CI must provide valid-shaped dummy values or use the escape hatch *knowingly* in build-only jobs.
**Definition of done:** as standard.
**Dependencies:** AC-1 (so CI sees the final validation rules once, not twice).

---

**Title:** [CI-5] Production deploy secret handling — no plaintext on disk
**Epic:** `cicd`
**Problem / context:** F-25 (Medium). `deploy-production.yml:196-220` writes all secrets plaintext to `/tmp/deploy.env` on the runner; the `rm` is not guaranteed to run on failure; the workflow declares no `permissions:`.
**User story:** As a release engineer *(persona)*, I want production secrets to transit without touching the runner's disk so that a failed or compromised job step cannot read them from a leftover file.
**Acceptance criteria:**
- *Given* the deploy step, *when* secrets are transferred, *then* they are piped (e.g., base64 over the SSH stdin/SSM pattern) with no intermediate file on the runner.
- *Given* any step failure mid-script, *when* the job ends, *then* no secret material remains on the runner (`set -euo pipefail` + no file to leak).
- *Given* the workflow, *when* reviewed, *then* it declares a least-privilege `permissions:` block.
- *Given* a normal run post-change, *when* production deploys, *then* the rolling refresh completes and concurrency semantics (never cancel in-flight production) are unchanged.
**In scope:** Rework the secret-transfer step; `set -euo pipefail`; `permissions:` on this workflow.
**Out of scope:** SHA-pinning and permissions on the *other* workflows (CI-6); staging equivalent (CI-2 handles its transport).
**Technical notes:** Risky Flow **RF4**. The audit notes production Compose is already pulled from SSM at boot — extend that pattern for env rather than pushing files. Keep `${{ github.sha }}` image tagging (audit-praised, commit-traceable).
**Definition of done:** as standard.
**Dependencies:** CI-2 (shared SSH pattern).

---

**Title:** [CI-6] Supply-chain pinning batch — action SHAs, workflow permissions, cache scoping, postinstall
**Epic:** `cicd`
**Problem / context:** F-26 + F-27 + F-28 (Medium). No action is SHA-pinned and CI + both deploys declare no `permissions:`; buildx `restore-keys` are broad enough to restore caches across refs; `package.json:30-31` `postinstall` shells out to `pnpm dlx sherif@latest` — unpinned remote code execution on every install.
**User story:** As a release engineer *(persona)*, I want every executable pulled by the pipeline pinned and least-privileged so that neither a tag hijack, a poisoned cache, nor a package publish can inject code.
**Acceptance criteria:**
- *Given* all five workflows, *when* reviewed, *then* every `uses:` targets a full commit SHA with a version comment, and each workflow declares a least-privilege `permissions:` block (`contents: read` baseline).
- *Given* the buildx cache config, *when* a build runs on a different ref, *then* it cannot restore another ref's cache (content-hash keys, narrowed `restore-keys`).
- *Given* `postinstall` cleaned, *when* `pnpm install` runs, *then* no network-fetched code executes; `sherif` is a pinned devDependency invoked by an explicit script/CI step.
**In scope:** SHA-pin all `uses:` across the five workflows; `permissions:` blocks on all; cache-key narrowing in both deploy workflows; sherif pin + postinstall removal.
**Out of scope:** The external reusable CI workflow ref (already pinned in CI-3).
**Technical notes:** Do CI-3 first so this batch doesn't touch the same line. Renovate/Dependabot comment-pinning convention (`# vX.Y.Z`) keeps updates reviewable.
**Definition of done:** as standard.
**Dependencies:** CI-3.

---

### Epic: `authz`

---

**Title:** [AZ-1] Permission-gate the support-ticket read endpoints and align the contract
**Epic:** `authz`
**Problem / context:** F-01 (High — the audit's #1 risk) + F-55 (Info, "decide alongside F-01"). Both ticket read handlers carry only `@Implement`; `RbacGuard` passes when no permission metadata is present, so any self-registered user can `GET /api/v1/tickets` and read every reporter's name, email, subject, and concern. The contract additionally declares `security: []`, misleading integrators.
**User story:** As a user with `users:read` permission, I want ticket reads gated on that permission so that reporter PII is visible only to authorized staff, never to any registrant.
**Acceptance criteria:**
- *Given* a user holding `users:read`, *when* they call `listTickets` or `getTicket`, *then* the request succeeds.
- *Given* an authenticated user **without** `users:read`, *when* they call either endpoint, *then* they receive 403 and the denial is auditable.
- *Given* the oRPC contract, *when* regenerated/reviewed, *then* `tickets.contract.ts` no longer declares `security: []` — the spec matches the runtime session + permission requirement (F-55).
- *Given* the regression test (F-54 pairing), *when* CI runs, *then* an e2e/integration test asserts both the permitted and the 403 paths.
**In scope:** `@RequirePermissions("users:read")` on `tickets.controller.ts:14,21`; contract security alignment; permitted/denied test.
**Out of scope:** A finer-grained ticket permission (AZ-5 / F-51); recording ticket authorship (AZ-3 / F-30); the mock submit form (HY-2 / F-62).
**Technical notes:** Permission key enforced: **`users:read`** (existing; see DOMAIN-MODEL.md for the deliberate coarse-now/fine-later call). Root cause to keep in review checklists: `RbacGuard` pass-through when metadata is absent — every non-anonymous PII read must carry explicit metadata.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [AZ-2] Admin-grant guard + last-Admin protection in one transaction
**Epic:** `authz`
**Problem / context:** F-10 (Medium — privilege tier collapse: any `users:manage` holder can grant *themselves* Admin via `rbac.controller.ts:78-85`) + F-31 (Low — no last-Admin protection on role removal, with a TOCTOU on concurrent removals in `rbac.service.ts:106-118`). Same service, same transaction — one slice.
**User story:** As a user with `users:manage` permission, I want privileged grants checked against my own privilege tier and the system's Admin count so that role management can neither self-escalate nor lock everyone out.
**Acceptance criteria:**
- *Given* a caller with `users:manage` but not Admin, *when* they attempt to grant the Admin role (to anyone, including themselves), *then* the grant is rejected with 403 and the attempt is audited.
- *Given* a caller who holds Admin, *when* they grant Admin, *then* it succeeds and is audited.
- *Given* a removal that would leave zero Admin holders, *when* attempted, *then* it is rejected with 409, with the count taken **inside the same transaction** as the removal.
- *Given* two concurrent removals of the last two Admins, *when* both run, *then* at most one succeeds (TOCTOU closed).
- *Given* the regression tests, *when* CI runs, *then* self-escalation and last-Admin cases are covered.
**In scope:** Tier check on Admin grants; in-transaction Admin count guard; audited denials; concurrency test.
**Out of scope:** The audit-trail table itself (AZ-4 — this ticket calls its helper once it exists, or logs via Pino until then); idempotency on RBAC writes (AB-3).
**Technical notes:** Risky Flow **RF5** — the state machine in DOMAIN-MODEL.md is normative: both guards inside `BEGIN…COMMIT`, cache invalidation after commit. Permission key enforced: **`users:manage`** (with the Admin-tier refinement). Use `SELECT … FOR UPDATE`/serializable count for the last-Admin check.
**Definition of done:** as standard.
**Dependencies:** AZ-4 preferred first (write real audit entries); hard dependency: none.

---

**Title:** [AZ-3] Ownership scoping on todo mutations + ticket authorship
**Epic:** `authz`
**Problem / context:** F-11 (Medium — `todos.service.ts:44-63` filters update/delete on `id` only: any authenticated user can mutate any todo) + F-30 (Low — `ticket.submit` never records `authorId` despite requiring auth, so tickets are unattributable). Both are the "ownership thread" — the reference pattern later resources copy.
**User story:** As an authenticated user *(persona — ownership is identity-scoped, not permission-scoped: any signed-in user owns their own rows)*, I want my todos mutable only by me and my submitted tickets attributed to me so that identity, not mere authentication, bounds writes.
**Acceptance criteria:**
- *Given* a todo owned by user A, *when* user B attempts update or delete, *then* the query matches zero rows and the API returns 404/403 — data unchanged.
- *Given* a todo owned by A, *when* A updates or deletes it, *then* it succeeds.
- *Given* a ticket submission by an authenticated user, *when* it persists, *then* `authorId = session.user.id` is stored (additive migration).
- *Given* the ownership regression tests (F-54 pairing), *when* CI runs, *then* cross-user mutation attempts are covered for todos.
**In scope:** `eq(todos.authorId, session.user.id)` on update/delete; additive `tickets.authorId` migration + threading; tests.
**Out of scope:** Owner-scoped ticket *reads* for reporters (future feature — reads stay staff-gated per AZ-1); todo idempotency (already applied; AB-3 hardens the model).
**Technical notes:** Migration is additive (nullable/backfill-later `authorId`). This ticket's Drizzle `where` pattern is the template's canonical ownership check — reference it from HY-1's test docs.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [AZ-4] Append-only RBAC audit trail, written in-transaction
**Epic:** `authz`
**Problem / context:** F-17 (Medium). RBAC mutations (`rbac-admin.service.ts:71-197`) leave no audit trail, though the template's own docs specify one. Grants and removals of privilege must be attributable and tamper-evident.
**User story:** As a user with `users:manage` permission, I want every role mutation recorded immutably with actor, target, and old→new state so that privilege changes are always attributable.
**Acceptance criteria:**
- *Given* any RBAC mutation (grant, removal, role create/update), *when* it commits, *then* an `audit_log` row (actor, action, target, old→new, timestamp) is written **in the same transaction** — a failed insert rolls back the mutation.
- *Given* a denied privileged attempt (e.g., AZ-2's self-escalation), *when* rejected, *then* a denial entry is recorded.
- *Given* the `audit_log` table, *when* inspected, *then* the application exposes no UPDATE or DELETE path to it.
- *Given* an admin with `users:read`, *when* they view the audit list endpoint/screen, *then* entries are readable in reverse-chronological order.
**In scope:** `audit_log` schema (additive migration) + write-helper; hooks in all RBAC mutation paths; minimal read endpoint/list view; in-transaction test.
**Out of scope:** Auditing non-RBAC domains (future consumers call the helper — see DOMAIN-MODEL.md ownership rule); log shipping/SIEM.
**Technical notes:** Cross-epic ownership: `authz` owns schema + helper; **no other epic inserts directly**. Read endpoint carries `@RequirePermissions("users:read")`. Keep the helper signature generic (domain, action, target) so auth events can adopt it later without schema change.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [AZ-5] Finer-grained directory-PII permission
**Epic:** `authz`
**Problem / context:** F-51 (Low). `users:read` yields the complete email directory (`rbac.schema.ts:63-68`); after AZ-1 it also gates ticket reads. Support staff who triage tickets shouldn't automatically hold the full directory.
**User story:** As a user with `users:read` permission, I want directory PII split from operational reads so that granting ticket triage no longer grants the full email directory.
**Acceptance criteria:**
- *Given* a new finer key (e.g., `users:read-directory`) in the permission catalog, *when* the directory endpoint is called without it, *then* the response omits emails or returns 403 (design call documented in the PR).
- *Given* existing Admin roles, *when* the seed/migration runs, *then* they receive the new key — no admin loses access.
- *Given* ticket triage via `users:read` alone, *when* exercised, *then* it still works (AZ-1 unaffected).
**In scope:** New permission key + seed grant; directory endpoint gating/field-level trim; contract update.
**Out of scope:** Re-keying ticket reads (they stay on `users:read`).
**Technical notes:** Permission keys enforced: **`users:read`**, **`users:read-directory`** (new — add to DOMAIN-MODEL.md table on merge). Coordinate with WC-1: the `["rbac","users"]` query shape may change; cache allowlist already excludes it.
**Definition of done:** as standard.
**Dependencies:** AZ-1, AZ-4 (audit the new denials).

---

### Epic: `auth-config`

---

**Title:** [AC-1] Non-functional secret placeholder + strength validation
**Epic:** `auth-config`
**Problem / context:** F-03 (High — audit risk #2). `.env.example:21` ships a **working** `BETTER_AUTH_SECRET`; both validators (`auth/config.ts:26`, `env.config.ts:38`) check presence only. An operator who follows setup and misses one line enables session forgery for any account, including Admin.
**User story:** As a platform operator *(persona — boot-time config, no runtime permission)*, I want the app to refuse to boot with a missing, short, or template-default secret so that session forgery via a known secret is impossible by construction.
**Acceptance criteria:**
- *Given* the example value or any secret starting with the known default prefix, *when* the app boots, *then* it exits non-zero with a message pointing at `openssl rand -base64 32`.
- *Given* a secret shorter than 32 characters, *when* the app boots, *then* validation rejects it in **both** schemas (`packages/auth` and backend env config).
- *Given* a 32+ char random secret, *when* the app boots, *then* startup succeeds.
- *Given* `.env.example`, *when* read, *then* line 21 is a non-functional placeholder with the generation command in a comment.
**In scope:** `.min(32)` + known-default `.refine` in both validators; placeholder in `.env.example`; boot tests for both branches.
**Out of scope:** Secret rotation tooling; other example-file credentials (HY-2 / F-41).
**Technical notes:** Risky Flow **RF3**. README already documents the generation command at :415 — link it in the error message. Keep both validators in lockstep (they guard different processes).
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [AC-2] Production seed guard + randomized seed credentials
**Epic:** `auth-config`
**Problem / context:** F-06 (High). `packages/db/src/seed.ts` provisions a pre-verified Admin with `password123`, prints it, resets it on every re-run, and has no environment guard — a known-credential Admin one command away from any database, including production.
**User story:** As a platform operator *(persona)*, I want seeding to refuse production and never use a fixed password so that no environment can end up with a publicly known Admin credential.
**Acceptance criteria:**
- *Given* `NODE_ENV === "production"` (or a production-shaped `DATABASE_URL`), *when* the seed runs, *then* it refuses with a non-zero exit before any write.
- *Given* a non-production run, *when* the Admin is created, *then* its password comes from `SEED_ADMIN_PASSWORD` or `randomBytes`, printed **only** when generated.
- *Given* a re-run against a database where the Admin exists, *when* seeding, *then* the existing password is **not** reset unless an explicit `--force-password` flag is passed.
- *Given* the guard test, *when* CI runs, *then* the production-refusal branch is covered.
**In scope:** Env guard at top of `seed.ts`; env/random password sourcing; no-reset-by-default; test.
**Out of scope:** Seed data content changes; the `.env.example` DB credential (HY-2 / F-41).
**Technical notes:** Risky Flow **RF3**. Audit confidence was Medium only because reaching production requires operator action — the guard removes that dependence on operator perfection.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [AC-3] Pin session, cookie & verification policy explicitly
**Epic:** `auth-config`
**Problem / context:** F-56 + F-58 + F-59 + F-33 (Info/Low, all in `packages/auth/src/config.ts`). Session `expiresIn`/rotation/revocation ride unpinned library defaults; email verification is not required and account-linking is unconfigured; the SameSite/CSRF posture is unresolvable from tracked files (this gates F-21's true severity); and *any* value for `BETTER_AUTH_COOKIE_DOMAIN` silently enables cross-subdomain cookies. Business decision recorded in PRD: **verification required.**
**User story:** As a platform operator *(persona)*, I want every session and cookie attribute stated explicitly in config so that the security posture is readable from the repo and survives library upgrades.
**Acceptance criteria:**
- *Given* the Better Auth config, *when* reviewed, *then* `expiresIn`, rotation/refresh, SameSite, `Secure`, `HttpOnly`, and cookie `path` are explicitly set with a comment stating the chosen posture (resolving F-59 — answer this **first**, per the audit, since it gates F-21).
- *Given* a new registration, *when* the user has not verified their email, *then* sign-in is refused until verification completes; account-linking behavior is explicitly configured.
- *Given* `BETTER_AUTH_COOKIE_DOMAIN` set, *when* validated, *then* only a well-formed hostname is accepted; unset by default (no cross-subdomain scope unless deliberate).
- *Given* the pinned config, *when* the web and mobile clients sign in/out, *then* flows still pass e2e (mobile relies on cookies — coordinate with MB-1).
**In scope:** Explicit session/cookie config; require-verification + account-linking; cookie-domain validation; e2e smoke on both clients.
**Out of scope:** CSRF *middleware* additions if SameSite resolution shows a gap (file a follow-up if so); reset-path errors (AC-4).
**Technical notes:** Findings F-58/F-59 held at Low confidence because library internals were unreadable — verify actual cookie attributes in an integration test (inspect `Set-Cookie`), don't trust config alone. ED-1's `frame-ancestors` and this ticket's SameSite jointly close the F-21 clickjacking path.
**Definition of done:** as standard.
**Dependencies:** AC-1.

---

**Title:** [AC-4] Sanitize the password-reset error path
**Epic:** `auth-config`
**Problem / context:** F-18 (Medium). The reset path (`config.ts:150-162`) lacks the try/catch + `APIError` sanitizing the verification path (`:127-144`) already has — raw SMTP errors disclose infrastructure detail and the differing responses form an account-enumeration oracle (`forgot-password.hooks.ts:26-28`).
**User story:** As a platform operator *(persona)*, I want the reset endpoint to return one uniform response regardless of account existence or mail failure so that it can't be used to enumerate accounts or probe SMTP.
**Acceptance criteria:**
- *Given* a reset request for an existing account, a non-existent account, or an SMTP failure, *when* the endpoint responds, *then* the status and body are identical in all three cases (generic "if the account exists…" response).
- *Given* an SMTP failure, *when* it occurs, *then* the real error is logged server-side through Pino (post-LG-1 redaction) — never returned.
- *Given* the web hook, *when* it renders the outcome, *then* it shows only the generic message.
**In scope:** Mirror the verification path's try/catch + `APIError` onto reset; align the web hook; enumeration test asserting response equality.
**Out of scope:** SMTP fail-closed boot behavior (LG-1); mail templates.
**Technical notes:** Test with a deliberately broken SMTP config to assert both the generic response and the server-side log.
**Definition of done:** as standard.
**Dependencies:** LG-1 (so the server-side log lands redacted).

---

**Title:** [AC-5] Auth config hygiene batch
**Epic:** `auth-config`
**Problem / context:** F-34 + F-35 + F-57 + F-32 (Low), all in `packages/auth/src/config.ts` (+ `app.config.ts:29`). The openAPI `/reference` plugin registers unconditionally; the Google provider always registers with `as string` laundering `undefined`; the auth-path bypass matches on `startsWith` so any `/api/v1/auth*` path is swallowed; origin allowlists split without `.trim()/.filter(Boolean)`.
**User story:** As a platform operator *(persona)*, I want auth wiring to be conditional, boundary-exact, and whitespace-safe so that no debug surface or malformed config widens the auth perimeter.
**Acceptance criteria:**
- *Given* the docs flag unset, *when* the app boots, *then* `/reference` is not registered; set, it is.
- *Given* Google credentials with either var missing, *when* the app boots, *then* the provider is not registered and no `as string` cast remains.
- *Given* a request to `/api/v1/authx/...`, *when* the bypass match runs, *then* it does **not** match (prefix-boundary: `/api/v1/auth/` or exact).
- *Given* an origin list with spaces/empty entries, *when* parsed, *then* entries are trimmed and empties dropped in both files.
**In scope:** All four fixes + unit tests for the path-boundary and origin parsing.
**Out of scope:** Session policy (AC-3, already merged by now).
**Technical notes:** One file dominates — one PR reviews coherently. The `startsWith` fix touches `auth.config.ts:25-35` in the backend.
**Definition of done:** as standard.
**Dependencies:** AC-3.

---

### Epic: `abuse`

---

**Title:** [AB-1] Trustworthy client IP for rate limiting
**Epic:** `abuse`
**Problem / context:** F-02 (High — audit risk #3). `throttler-proxy.guard.ts:15` keys the throttler on the **leftmost** `X-Forwarded-For` entry — fully client-controlled — and `nginx.conf:28,39` *appends* to XFF rather than overwriting. One header defeats the only abuse control on mutation endpoints, amplifying four other findings.
**User story:** As a platform operator *(persona — infrastructure control; no user-facing permission)*, I want the throttle key derived only from the trusted proxy hop so that a client cannot mint fresh rate-limit buckets per request.
**Acceptance criteria:**
- *Given* Nginx config updated, *when* a request passes through, *then* `X-Forwarded-For` is **set** to `$remote_addr` (overwrite), not appended.
- *Given* the guard updated, *when* it derives the key, *then* it uses the rightmost-untrusted entry of `req.ips` under an Express `trust proxy` setting matching exactly one hop.
- *Given* a request with a forged `X-Forwarded-For: 1.2.3.4, 5.6.7.8`, *when* rate limiting applies, *then* the key is the real peer address — repeated forged requests exhaust **one** bucket.
- *Given* the regression test, *when* CI runs, *then* the forged-header case is covered.
**In scope:** Guard fix; Nginx directive at both locations; `trust proxy` alignment; forged-header test.
**Out of scope:** Shared throttle storage (AB-2 — re-evaluate F-38 immediately after this lands, per the audit); request limits (AB-4).
**Technical notes:** Risky Flow **RF2** — the trust chain in DOMAIN-MODEL.md is normative. Beware the deploy topology note (F-60): if any environment fronts the backend without Nginx, `trust proxy` must match that topology; document the assumption in the config comment.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [AB-2] Redis-backed throttler and RBAC cache
**Epic:** `abuse`
**Problem / context:** F-38 (Low on paper, promoted per PRD decision 3). `app.module.ts:40-41` and `rbac-cache.service.ts:14-18` keep the throttler and RBAC permission cache in process memory; in the ASG topology, limits multiply by instance count and permission revocation only takes effect per-instance. The audit says to re-evaluate immediately after F-02 — F-02 was masking it.
**User story:** As a platform operator *(persona)*, I want throttle counters and permission cache shared across instances so that rate limits hold cluster-wide and a revoked permission dies everywhere at once.
**Acceptance criteria:**
- *Given* Redis configured, *when* two app instances receive requests from one client, *then* they decrement a **single** shared throttle bucket.
- *Given* a role removed on instance A, *when* the affected user hits instance B, *then* the stale permission is not honored beyond the cache TTL / invalidation event.
- *Given* Redis unavailable, *when* requests arrive, *then* the app degrades along a documented, deliberate path (fail-closed for RBAC cache → recompute from DB; throttler behavior stated in config comment) rather than crashing.
- *Given* Compose/deploy config, *when* provisioned, *then* Redis is declared with auth and no public port binding.
**In scope:** Redis service in deploy config; `@nestjs/throttler` Redis storage; RBAC cache moved to Redis with invalidation on RBAC mutations (hook AZ-2/AZ-4 paths); degradation tests.
**Out of scope:** Any other Redis use (sessions stay in Better Auth's store); idempotency persistence (AB-3 — stays in Postgres).
**Technical notes:** Risky Flow **RF2** tail. New approved infra dependency — update PRD/README setup docs. Invalidation call sits after the AZ-2 transaction commit (see RF5 diagram).
**Definition of done:** as standard.
**Dependencies:** AB-1; AZ-2 (invalidation hook point).

---

**Title:** [AB-3] Idempotency key model hardening + consistent application
**Epic:** `abuse`
**Problem / context:** F-13 (Medium) + F-39 (Low). Idempotency keys (`schema.ts:122-127`, `idempotency.interceptor.ts`) are **globally** unique — user A can squat user B's key — plus unvalidated, unbounded in length, and never expired. And RBAC writes don't apply the interceptor at all, unlike every todo write.
**User story:** As an authenticated user *(persona — idempotency is identity-scoped by design)*, I want my idempotency keys private to me, bounded, and expiring so that replays are safe and no one can poison my keyspace.
**Acceptance criteria:**
- *Given* the migrated schema, *when* users A and B send the same key, *then* both succeed independently (composite `(authorId, key)` PK).
- *Given* a key longer than the cap (e.g., 128 chars) or malformed, *when* submitted, *then* the request is rejected with 400 before any write.
- *Given* a stored key past its TTL, *when* cleanup runs, *then* the row is removed; a replay after expiry executes fresh.
- *Given* RBAC mutation endpoints, *when* called with an idempotency key, *then* the interceptor applies exactly as on todo writes.
- *Given* the idempotency regression tests (F-54 pairing), *when* CI runs, *then* cross-user squatting and replay-after-expiry are covered.
**In scope:** Composite-PK migration; length/format validation; `expiresAt` + scheduled cleanup; interceptor on RBAC controllers; tests.
**Out of scope:** Paused-mutation replay on the web client (WC-3 — the client-side sibling of this server-side model).
**Technical notes:** Migration must handle existing rows (backfill `authorId` where derivable, else truncate the table — it's a cache). Cleanup job can share the scheduler HY-2 adds for `verifications` (F-40).
**Definition of done:** as standard.
**Dependencies:** AZ-3 (establishes the `authorId` conventions this reuses).

---

**Title:** [AB-4] Request body limits and proxy timeouts
**Epic:** `abuse`
**Problem / context:** F-14 (Medium). No explicit body-size limit on either parser (`app.config.ts:15-16`) and no `client_max_body_size` or proxy timeouts in Nginx — memory-exhaustion and slow-request exposure on every mutation endpoint.
**User story:** As a platform operator *(persona)*, I want request size and duration bounded at both layers so that oversized or dawdling requests can't exhaust the backend.
**Acceptance criteria:**
- *Given* both parsers configured with `{ limit: "100kb" }`, *when* a larger JSON body arrives, *then* the app rejects it with 413.
- *Given* `client_max_body_size 1m;` in Nginx, *when* an oversized request arrives, *then* Nginx rejects it before it reaches the app.
- *Given* proxy read/send/connect timeouts set, *when* an upstream stalls, *then* Nginx terminates the request within the configured window.
- *Given* the largest legitimate payload in the app (audit as part of this ticket), *when* submitted, *then* it passes — limits don't break real flows.
**In scope:** Parser limits; Nginx size + timeout directives; a boundary test.
**Out of scope:** Per-field schema caps (F-29 → HY-2); TLS/upstreams (ED-2).
**Technical notes:** Coordinate with ED-2 — same `nginx.conf`, land this first or rebase. Note the 100kb/1m gap is deliberate headroom for headers/multibyte.
**Definition of done:** as standard.
**Dependencies:** none.

---

### Epic: `webclient`

---

**Title:** [WC-1] Cache persistence allowlist + sign-out purge
**Epic:** `webclient`
**Problem / context:** F-04 (High — audit risk #4). The TanStack persister uses one shared, user-agnostic IndexedDB key with no `maxAge`/buster; `shouldDehydrateQuery` persists **everything** — session identity, the full `["rbac","users"]` email directory, todos — for 24h. Sign-out invalidates only `["session"]`; the next person on the browser profile gets the previous user's data restored at mount, readable even without authenticating via DevTools.
**User story:** As an authenticated user *(persona — cache isolation protects every signed-in user; no single permission governs it)*, I want nothing sensitive persisted and everything purged at sign-out so that a shared browser never hands my data to the next person.
**Acceptance criteria:**
- *Given* the dehydration allowlist, *when* queries persist, *then* `session` and `rbac` roots are **never** written to IndexedDB (exclusion, the audit's stronger control).
- *Given* sign-out, *when* it completes, *then* `queryClient.clear()` runs **and** the persister entry is removed from IndexedDB (`removeClient()`/`del()`), in that order.
- *Given* the persister config, *when* constructed, *then* it has an explicit key incorporating the user identity, a `maxAge` well under 24h, and a cache `buster`.
- *Given* the audit's own verification script — sign in as admin, open `/user-management`, sign out — *when* IndexedDB is inspected, *then* no residual emails exist; this check is automated as the cache-isolation test (F-54 pairing).
- *Given* offline-first reads of *allowed* keys (e.g., todos), *when* the same user returns, *then* offline behavior still works — the PWA capability survives the fix.
**In scope:** `shouldDehydrateQuery` allowlist in `query-client.ts`; purge in `session.hooks.ts` sign-out; per-identity key + `maxAge` + buster in `provider.tsx`; automated isolation test.
**Out of scope:** Paused-mutation identity binding (WC-3); SW caching of token URLs (WC-2); the mobile analog (MB-1).
**Technical notes:** Risky Flow **RF1** — order is memory → disk → done; a purge that throws must not leave the disk copy (wrap + retry). The only existing cache-clearing code is gated to non-production (`serwist-provider.tsx:20-22`) — do **not** reuse that path.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [WC-2] Service-worker token & authenticated-route exclusions
**Epic:** `webclient`
**Problem / context:** F-20 (Medium) + F-48 (Low), both in `app/sw.ts`. Reset/verification tokens travel in URLs that the service worker can cache (`:35,40-49`) and that leak via referrer; and the offline fallback is served for authenticated navigations, masking auth state.
**User story:** As an authenticated user *(persona)*, I want single-use token URLs never cached and authenticated pages never faked from cache so that tokens stay single-use and auth state stays honest.
**Acceptance criteria:**
- *Given* a navigation to `/reset-password?token=…` or a verification URL, *when* the SW routes it, *then* a NetworkOnly matcher applies — nothing enters any cache.
- *Given* an authenticated route while offline, *when* navigated, *then* the SW does not serve the generic offline fallback as if it were the page (excluded from the fallback matcher).
- *Given* the SW cache storage after a reset flow, *when* inspected in the test, *then* no URL containing a token parameter exists in any cache.
**In scope:** NetworkOnly matchers for token routes; fallback exclusion for authenticated route groups; cache-inspection test.
**Out of scope:** `Referrer-Policy` header (ED-1 closes the referrer half of F-20); SW update lifecycle (WC-4).
**Technical notes:** Enumerate token-bearing routes from the auth config (reset, verify email) so new ones get added in one place. ED-1 + this ticket jointly retire F-20.
**Definition of done:** as standard.
**Dependencies:** ED-1 (for the referrer half — can land in either order, note in both PRs).

---

**Title:** [WC-3] Bind paused mutations to the queueing identity
**Epic:** `webclient`
**Problem / context:** F-19 (Medium). Offline-queued (paused) mutations (`provider.tsx:93-96`, `query-client.ts:34-36`, `todos.hooks.ts:207`) replay under **whichever session is active at reconnect** — user B can unknowingly fire user A's queued writes.
**User story:** As an authenticated user *(persona)*, I want my offline-queued writes to replay only under my own session so that a device handover can't execute my actions as someone else.
**Acceptance criteria:**
- *Given* a mutation queued while user A is signed in, *when* it is enqueued, *then* A's user id is recorded with it.
- *Given* reconnect with user B active, *when* replay begins, *then* A's mutations are aborted (not sent) and surfaced as discarded — never executed under B.
- *Given* reconnect with A still active, *when* replay runs, *then* the mutations execute normally.
- *Given* sign-out (WC-1 purge), *when* it runs, *then* the paused-mutation queue is cleared with the rest of the client state.
**In scope:** Identity stamping at enqueue; identity check at replay; discard UX (toast/log); test simulating the user swap.
**Out of scope:** Server-side idempotency model (AB-3 — the server-side sibling); conflict resolution.
**Technical notes:** Risky Flow **RF1**. TanStack's `onSuccess`/resume hooks in the provider are the interception point; the recorded id compares against the *current* `["session"]` before `resumePausedMutations()`.
**Definition of done:** as standard.
**Dependencies:** WC-1.

---

**Title:** [WC-4] PWA update flow & connectivity probe hygiene
**Epic:** `webclient`
**Problem / context:** F-49 + F-50 (Low). `skipWaiting`+`clientsClaim` performs a mid-session SW takeover with a dev-only unregister path — no production recovery from a bad SW; and the online-status hook probes `gstatic.com` every 15s, leaking IP + session duration to a third party.
**User story:** As an authenticated user *(persona)*, I want app updates to apply predictably and connectivity checks to stay first-party so that a bad deploy is recoverable and no third party observes my usage.
**Acceptance criteria:**
- *Given* a new SW version, *when* detected mid-session, *then* the user is prompted to reload (or update applies on next navigation) instead of silent takeover — documented choice in the PR.
- *Given* a broken SW in production, *when* the recovery path is triggered, *then* unregistration + cache reset works with `NODE_ENV === "production"` (the current path returns early there).
- *Given* the online-status hook, *when* it probes, *then* it targets `/api/v1/health` — zero third-party requests.
**In scope:** Prompted/deferred update strategy; production recovery path; probe retarget in `use-online-status.ts`.
**Out of scope:** Health endpoint response content (LG-2 / F-36 — merge order note below).
**Technical notes:** Probe lands **after** LG-2 genericizes the health response, or accept version disclosure to the probe in the interim (first-party, low risk). Health is `@AllowAnonymous` — probe works signed-out.
**Definition of done:** as standard.
**Dependencies:** WC-2; LG-2 (soft — see note).

---

### Epic: `logging`

---

**Title:** [LG-1] Redact credentials across all three log paths
**Epic:** `logging`
**Problem / context:** F-05 (High — three independent paths). **Mobile:** `auth_repository.dart` interpolates full response bodies — including session tokens — into `developer.log` with no `kDebugMode` guard, and `dart:developer` log() isn't stripped from release builds. **SMTP:** `SMTP_HOST` unset silently falls back to `jsonTransport`, and `send-mail.ts:34` writes the whole message — including reset links — to stdout via `console.log`, bypassing Pino redaction. **Pino:** redaction misses `body.token`, `body.newPassword`, `body.email`, and logs `req.url`, carrying query-string tokens into logs.
**User story:** As a platform operator *(persona — log sinks, no runtime permission)*, I want tokens, reset links, and PII unable to reach any log sink so that logs can be shipped and retained without becoming a credential store.
**Acceptance criteria:**
- *Given* the three mobile `developer.log` calls, *when* built in release mode, *then* they are gated on `kDebugMode` and no longer include `response.data` even in debug.
- *Given* `SMTP_HOST` unset in production, *when* the app boots, *then* it **refuses to start** (fail closed) — the silent `jsonTransport` fallback is removed; in development, the fallback is explicit and its output redacts the message body/links.
- *Given* Pino config, *when* requests log, *then* `body.token`, `body.newPassword`, `body.email` are redacted and `req.url` is sanitized of token-bearing query parameters.
- *Given* a full auth cycle (sign-up, sign-in, reset request) in a test, *when* captured logs are scanned, *then* no token, reset link, or password appears — automated as a log-scan test.
**In scope:** All three paths + the boot guard + log-scan test.
**Out of scope:** Mobile error-message mapping (MB-3 / F-45); health/request-id leaks (LG-2).
**Technical notes:** Risky Flow **RF3** (the SMTP boot guard). The URL sanitizer must whitelist-strip (`token`, `code`, …) rather than blacklist paths. Mobile half touches `auth_repository.dart:52-57,81-86,115-120` — coordinate with MB-1 (same file family) to avoid conflicts.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [LG-2] Health & request-id disclosure hygiene
**Epic:** `logging`
**Problem / context:** F-36 + F-37 (Low). The unauthenticated health endpoint leaks env, version, uptime, and **raw DB error text** (`health.service.ts:16-17,43`); inbound `X-Request-Id` is accepted verbatim — unbounded, logged, and reflected (`pino-logger.config.ts:53-63`), a log-injection and cache-poisoning vector.
**User story:** As a platform operator *(persona)*, I want the health surface generic and correlation ids validated so that an anonymous probe learns nothing and log lines can't be forged via headers.
**Acceptance criteria:**
- *Given* a DB failure, *when* `/api/v1/health` responds, *then* the body says only "database check failed" and the real error goes to server logs.
- *Given* the health response, *when* unauthenticated, *then* env/version/uptime metadata is omitted (or gated behind a permissioned variant).
- *Given* an inbound `X-Request-Id`, *when* processed, *then* it is accepted only if it matches a UUID (or ≤64-char safe charset); otherwise a fresh id is generated.
- *Given* WC-4's probe, *when* it polls health, *then* the generic response still satisfies it.
**In scope:** Health response genericizing; request-id validation; tests for both.
**Out of scope:** F-60 topology confirmation (PRD residual risk).
**Technical notes:** Health stays `@AllowAnonymous` (deploy healthchecks and the WC-4 probe rely on it). Keep the response shape the Compose healthchecks expect.
**Definition of done:** as standard.
**Dependencies:** LG-1.

---

### Epic: `edge`

---

**Title:** [ED-1] Security headers at all three layers
**Epic:** `edge`
**Problem / context:** F-12 (Medium) + F-21 (Medium). No CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, or `Referrer-Policy` at Next.js, NestJS, or Nginx; consequently the RBAC admin UI is framable and framed clicks reach role assignment (clickjacking onto F-10's surface).
**User story:** As an authenticated user *(persona — headers protect all users; enforcement is infrastructural)*, I want browser-level defenses declared at every layer so that framing, sniffing, and referrer leakage are cut off regardless of which layer serves a response.
**Acceptance criteria:**
- *Given* any page from the web app, *when* headers are inspected, *then* CSP (including `frame-ancestors 'none'`), HSTS, `X-Content-Type-Options: nosniff`, and `Referrer-Policy: strict-origin-when-cross-origin` (or stricter) are present via `next.config.ts` `headers()`.
- *Given* any backend API response, *when* inspected, *then* helmet-applied headers are present from NestJS bootstrap.
- *Given* responses via Nginx, *when* inspected, *then* `add_header` directives apply the same set consistently (no conflicting duplicates between layers).
- *Given* `/user-management` loaded inside an iframe, *when* rendered, *then* the browser blocks it — verified by test (retires the F-21 attack path).
- *Given* the CSP, *when* the app runs its normal flows, *then* nothing legitimate is blocked (start with report-only in the PR if needed, ship enforcing).
**In scope:** `headers()` in Next config; `helmet()` in bootstrap; Nginx `add_header`; framing test; CSP tuning.
**Out of scope:** TLS termination and upstreams (ED-2); SW token caching (WC-2 — but this ticket's Referrer-Policy closes F-20's referrer half).
**Technical notes:** Beware header duplication when Nginx fronts Next — decide one owner per header and comment it in `nginx.conf`. HSTS only once TLS (ED-2) is live in the target env — gate with a config flag if ED-2 hasn't shipped.
**Definition of done:** as standard.
**Dependencies:** none hard; ED-2 for HSTS activation.

---

**Title:** [ED-2] Ship the TLS config and fix upstream addressing
**Epic:** `edge`
**Problem / context:** F-15 (Medium). The entire TLS block in `nginx.conf:51-86` is commented out, and upstreams point at `host.docker.internal` instead of Compose service names — the shipped proxy config neither terminates TLS nor works in the deployed topology as written.
**User story:** As a platform operator *(persona)*, I want the shipped Nginx config to be the working, TLS-terminating one so that an adopter deploying the template gets HTTPS and correct routing by default.
**Acceptance criteria:**
- *Given* the config, *when* deployed with certificates present, *then* TLS terminates at Nginx with a modern protocol/cipher baseline (TLS 1.2+, no legacy ciphers) and HTTP redirects to HTTPS.
- *Given* the upstream blocks, *when* running under Compose, *then* they resolve backend/web by **service name**, not `host.docker.internal`.
- *Given* certificate paths, *when* absent (local dev), *then* a documented dev override exists rather than commented-out production config.
- *Given* the deployed stack, *when* smoke-tested, *then* web and API routes both serve over HTTPS through the proxy.
**In scope:** Working TLS server block; upstream service names; dev/prod split; smoke test.
**Out of scope:** Certificate issuance automation (ops); security headers (ED-1); body limits/timeouts (AB-4 — rebase over it).
**Technical notes:** Coordinate the file with AB-4 and ED-1 (same `nginx.conf`) — land AB-4 → ED-1 → ED-2 or rebase carefully. After this, enable HSTS per ED-1's flag.
**Definition of done:** as standard.
**Dependencies:** AB-4, ED-1 (file-ordering only).

---

### Epic: `mobile`

---

**Title:** [MB-1] Single cookie source of truth + sign-out purge
**Epic:** `mobile`
**Problem / context:** F-23 (Medium) + F-43 (Low). `api_client.dart:47-65` duplicates the session cookie into secure storage via a manual interceptor that re-serializes it malformed, unscoped, and overwriting `CookieManager`; and sign-out (`auth_repository.dart:98-105`) clears secure storage but the `PersistCookieJar` is unreachable from there and never purged — the session cookie survives sign-out on disk.
**User story:** As a mobile app user *(persona — client credential storage, no server permission involved)*, I want exactly one cookie store that is fully purged at sign-out so that my session can't linger on the device or be corrupted by duplication.
**Acceptance criteria:**
- *Given* the manual cookie interceptor deleted, *when* authenticated requests run, *then* `CookieManager` + `PersistCookieJar` alone handle cookies and auth flows still pass.
- *Given* the cookie jar exposed via a provider, *when* sign-out runs, *then* `cookieJar.deleteAll()` executes alongside the secure-storage clear.
- *Given* the device storage after sign-out, *when* inspected in an integration test, *then* no session cookie remains in the jar's persistence directory.
- *Given* a fresh sign-in after purge, *when* performed, *then* the session works normally.
**In scope:** Delete the interceptor; provider-expose the jar; purge on sign-out; storage-inspection test.
**Out of scope:** Log redaction in the same files (LG-1 — merge that first); cookie attributes server-side (AC-3).
**Technical notes:** Risky Flow **RF1** (mobile leg). Depends on AC-3's pinned cookie attributes being compatible with Dio's jar — verify in the integration test. Same file family as LG-1's mobile half: sequence LG-1 → MB-1.
**Definition of done:** as standard.
**Dependencies:** LG-1, AC-3.

---

**Title:** [MB-2] Mobile transport & bundled-config hardening
**Epic:** `mobile`
**Problem / context:** F-24 (Medium) + F-42 (Low). `usesCleartextTraffic="true"` sits in the **release** manifest and `api_constants.dart:7` carries a non-TLS fallback URL — production traffic can go plaintext; and `.env` is bundled as a Flutter asset (`pubspec.yaml:78-79`), shipping config cleartext inside every APK.
**User story:** As a mobile app user *(persona)*, I want release builds to refuse cleartext transport and carry no bundled env file so that my traffic is always TLS and no packaged secret rides in the APK.
**Acceptance criteria:**
- *Given* the manifests, *when* built, *then* `usesCleartextTraffic="true"` exists only in `src/debug/AndroidManifest.xml`; the release manifest denies cleartext.
- *Given* the API base URL, *when* unset at build time, *then* the release build **fails** (no non-TLS fallback constant); config arrives via `--dart-define`.
- *Given* `.env` removed from Flutter assets, *when* the APK is unpacked in a test, *then* no env file exists inside it; `.env.example` for mobile carries a warning comment.
- *Given* a debug build, *when* run against a local HTTP backend, *then* development still works (cleartext allowed in debug only).
**In scope:** Manifest split; `--dart-define` config path; fallback removal; APK-inspection check.
**Out of scope:** Release signing (MB-3); certificate pinning (future hardening).
**Technical notes:** Update mobile README build instructions (`flutter build apk --dart-define=API_BASE_URL=…`). CI builds (if any) must pass the define.
**Definition of done:** as standard.
**Dependencies:** none.

---

**Title:** [MB-3] Mobile release hardening batch
**Epic:** `mobile`
**Problem / context:** F-44 + F-45 + F-46 + F-47 (Low). Release builds are signed with the **debug keystore** under `com.example.mobile`; non-Dio exceptions render `error.toString()` and Dio messages embed host/port; the login screen enforces a 6-char password minimum vs the server's 8; the manifest requests unused `SCHEDULE_EXACT_ALARM`/`RECEIVE_BOOT_COMPLETED` permissions and leaves `allowBackup` defaulting to true.
**User story:** As a mobile app user *(persona)*, I want the released app properly signed, minimally permissioned, and honest in its errors so that it is updatable, un-impersonatable, and leaks nothing through messages or backups.
**Acceptance criteria:**
- *Given* `build.gradle.kts`, *when* a release is built, *then* it uses a real signing config (keys via env/local properties, never committed) and a unique application id — with a documented note that the id **cannot change after first store publish**.
- *Given* an error on the login screen, *when* rendered, *then* the user sees a mapped, fixed string — never `toString()` output or host/port detail.
- *Given* the login form, *when* validating, *then* the password minimum matches the server schema (8), sourced from a shared constant where feasible.
- *Given* the manifest, *when* reviewed, *then* the two unused permissions are gone and `android:allowBackup="false"` is set.
**In scope:** Signing config scaffold + docs; error mapping; validation alignment; manifest cleanup.
**Out of scope:** iOS (untracked — PRD non-goal); Play Store publishing.
**Technical notes:** Keystore material must never enter the repo — `key.properties` pattern, gitignored, documented. F-46's server minimum lives in `register.schema.ts:6`.
**Definition of done:** as standard.
**Dependencies:** MB-2.

---

### Epic: `hygiene`

---

**Title:** [HY-1] Security regression test harness
**Epic:** `hygiene`
**Problem / context:** F-54 (Low, flagged by the audit for early attention). There are **no** ownership, idempotency, or cache-isolation tests, and the e2e spec targets a non-existent path (`app.e2e-spec.ts:32`) — every Wave-1/2 fix would ship without regression protection. Wave-1 tickets each carried a minimal paired test; this ticket builds the shared harness and fills the gaps.
**User story:** As a developer on the team *(persona — CI infrastructure)*, I want a working security test suite in CI so that the fixes for F-01, F-04, F-11, and F-13 cannot silently regress.
**Acceptance criteria:**
- *Given* the e2e config, *when* tests run, *then* the broken path is fixed and the suite executes in CI (via the CI-3-pinned gate).
- *Given* the harness, *when* CI runs, *then* it includes at minimum: permission-gate tests (AZ-1 paths), ownership tests (AZ-3), idempotency tests incl. cross-user keys (AB-3), and the cache-isolation check (WC-1's IndexedDB scan).
- *Given* shared fixtures, *when* a new security test is written, *then* multi-user session setup (user A / user B / admin) is a one-line helper.
- *Given* any of the four covered fixes reverted locally, *when* the suite runs, *then* at least one test fails (mutation check on the suite itself, spot-verified in the PR).
**In scope:** e2e path fix; multi-user fixtures; consolidation of Wave-1 paired tests into one suite; CI wiring.
**Out of scope:** Full coverage targets; load/perf tests.
**Technical notes:** Backend tests via the Nest testing module with a real Postgres (Compose service in CI); the web cache-isolation check via Playwright + IndexedDB inspection. Reference AZ-3's ownership pattern as the canonical example in the test README.
**Definition of done:** as standard.
**Dependencies:** AZ-1, AZ-3, AB-3, WC-1, CI-3.

---

**Title:** [HY-2] Repo & schema hygiene batch
**Epic:** `hygiene`
**Problem / context:** F-29, F-40, F-41, F-52, F-53, F-61, F-62 (Low/Info). The only unbounded string in the schema set (`concern`, no `.max()`); `verifications` rows never cleaned and unindexed on `expires_at`; a working `postgres:password` credential in `packages/db/.env.example`; an unused root Dockerfile shipping full source + dev deps; drizzle beta in production runtime (track only); credential-shaped README placeholders that will trip secret scanners; and a submit-ticket form that discards input and reports success — a functional trap for adopters.
**User story:** As a developer adopting the template *(persona)*, I want the repo free of footguns, dead weight, and false signals so that nothing checked in misleads a scanner, an operator, or a user.
**Acceptance criteria:**
- *Given* `tickets.schema.ts:15`, *when* a `concern` over 5000 chars is submitted, *then* validation rejects it (`.max(5000)`).
- *Given* the scheduled cleanup, *when* it runs, *then* expired `verifications` rows are deleted; an index on `expires_at` exists (additive migration).
- *Given* `packages/db/.env.example:6` and the README examples at :335,405,411,414, *when* scanned, *then* only `<angle-bracket>` placeholders appear, with dev-only comments where relevant.
- *Given* the root Dockerfile, *when* the repo is reviewed, *then* it is deleted (or explicitly header-marked as an unused example — decide in PR, prefer delete).
- *Given* `submit-ticket/page.tsx:62-65`, *when* the form is submitted, *then* it calls the real ticket endpoint (per AZ-3, recording `authorId`) — the silent-success mock is gone.
- *Given* `drizzle-orm`/`drizzle-kit` beta pinning, *when* reviewed, *then* a tracking issue for the 1.0 upgrade is filed and linked (no code change here).
**In scope:** All six code/docs fixes + the tracking issue; cleanup job shares AB-3's scheduler.
**Out of scope:** F-60 (ops confirmation — PRD residual risk); new ticket features beyond wiring the existing form.
**Technical notes:** The form wire-up is the one user-visible change — smoke-test the submit flow end to end (it exercises AZ-1's gate from the anonymous-submit side: submission stays open, reads stay gated).
**Definition of done:** as standard.
**Dependencies:** AZ-3 (authorId), AB-3 (scheduler).

---

*End of ticket set. 33 tickets · 9 epics · 3 waves. Wave 1 clears the audit's Conditional-GO gate; Wave 2 clears the 30-day list (with F-38, F-54, F-58 promoted per PRD decisions); Wave 3 closes the batched backlog. F-60 remains an ops confirmation tracked in PRD.md.*
