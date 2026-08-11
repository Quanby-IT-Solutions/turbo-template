# PRD — Turbo Template Security Remediation

Source: *Turbo Template — Pre-Production Security Audit* (2026-08-11). Verdict: **NO-GO**; nine High, repository-remediable findings with code-supported attack paths.

## Problem
The template ships with a lowest-precondition PII breach (any registered user can read every support ticket, F-01), a functional signing secret in `.env.example` (F-03), rate limiting keyed on a client-controlled header (F-02), cross-user cache disclosure on shared browsers (F-04), unredacted credential logging on three paths (F-05), a known-credential Admin seed (F-06), and a CI/deploy pipeline with unpinned trust and secret-handling defects (F-07/08/09). 62 findings total (9 High, 19 Medium, 26 Low, 8 Info).

## Goal
Reach **Conditional GO** by closing all nine release blockers, then clear the audit's 30-day set, then work the hardening backlog in batched tickets. Every fix that touches ownership, idempotency, or cache isolation ships with a regression test (F-54).

## Primary users
- **Application users** — protected from PII disclosure, session forgery, cache bleed.
- **Operators/adopters of the template** — protected from footgun defaults (secrets, seeds, mock forms).
- **The engineering team** — small team, one branch per ticket, AI-assisted implementation.

## Non-goals
- No new product features; behavior changes only where security requires it.
- No cloud/IAM/WAF/DNS changes (out of audit scope); F-60 is verified operationally, not in code.
- No iOS work — `apps/mobile/ios/` is untracked and unassessable.
- No full dependency CVE sweep — audit derived npm data from lockfile `deprecated:` annotations only; a separate `pnpm audit` + Dart/OSV pass is future work.

## Key constraints
- Match the existing stack exactly: NestJS + oRPC + Better Auth (Express-mounted, global AuthGuard via `@thallesp/nestjs-better-auth`), Next.js PWA (TanStack Query + Serwist), Flutter (Dio + PersistCookieJar), Drizzle/Postgres, Nginx, pnpm/Turborepo, GitHub Actions.
- Permission keys follow the codebase's existing `resource:action` convention (`users:read`, `users:manage`) — see DOMAIN-MODEL.md.
- Fixes must be minimal and additive where possible; migrations additive; no behavior-visible refactors inside security tickets.
- Fail closed: boot-time validation rejects bad secrets; seed refuses production; SMTP misconfiguration must not silently fall back to console transport.

## Non-functional requirements
- **Security:** every gated route asserts a permission; denials audited. Redis (new dependency, approved) backs throttling and RBAC cache so limits and revocation are cluster-wide.
- **Reliability:** deploys remain gated on CI (`needs: ci`); production concurrency semantics unchanged.
- **Testing:** e2e path fixed; ownership, idempotency, and cache-isolation tests accompany their fixes.
- **Compatibility:** mobile app is shipped to users — mobile fixes sit in the 30-day wave, not backlog.

## Definition of Ready
A ticket may start when it has Given/When/Then acceptance criteria, its dependencies are identified, and any risky flow it touches (see TICKETS.md technical notes) has been read.

## Definition of Done
Code + tests merged · acceptance criteria pass · audit/permission checks verified · PR reviewed · docs updated.

## Decisions made

**Business-fact calls (asked, resolved to recommended defaults):**
1. **Ticket scope** — full tickets for the 9 blockers + entire 30-day set; hardening backlog batched into grouped full tickets. *Rationale: 62 individual tickets would drown a small team; batches keep ~1-day sizing.*
2. **Mobile is shipped** — Flutter findings ticketed in the 30-day wave. *Rationale: user-facing exposure (cleartext transport, cookie mishandling, debug signing).*
3. **Redis approved** as new infrastructure — F-38 promoted from backlog to Wave 2, sequenced immediately after F-02 per the audit's own note that F-02 currently masks it.
4. **Email verification required** for new accounts — F-58 promoted into the session-policy ticket (AC-3).

**Auto-resolved best-practice calls:**
- **F-01 gate uses existing `users:read` now** (the audit's 15-minute fix); a finer `tickets:read`-style split is deferred to AZ-5 (F-51). *Minimal blocking change first, refinement later.*
- **F-55 folded into AZ-1** — the audit says to decide it alongside F-01.
- **F-54 split**: minimal regression test baked into each Wave-1 fix's DoD; HY-1 builds the shared harness and fixes the broken e2e path.
- **Batching rule**: findings batched only when they share a file/subsystem and one PR reviews coherently (e.g., F-26/27/28 all in workflows; F-56/58/59/33 all in Better Auth config).
- **Epics by attack surface**, not by severity — severity drives *build order* (waves), surface drives *ownership*.
- **F-60 recorded as residual risk** (below), not a code ticket — the fix is a security-group confirmation outside the repo.

## Residual risks (accepted / tracked)
- F-60: backend binds `0.0.0.0:3000`; production safety depends on AWS security-group filtering — **ops must confirm** before GO.
- Operators can still supply weak-but-long secrets (F-03 residual); secret distribution is external.
- Dart dependency vulnerabilities unassessed (audit coverage gap).
- External reusable CI workflow contents remain unreadable until pinned (CI-3 mitigates by SHA-pinning).
