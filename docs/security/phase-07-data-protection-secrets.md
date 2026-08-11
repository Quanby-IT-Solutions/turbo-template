# Phase 7 — Areas 9 & 10: Data Protection, Logging, Database Integrity, Secrets & Environment

Status: Complete. Mode: READ-ONLY. No file created, modified, deleted, or formatted. No migrations, seeders, db:push, installs, or commits. No ignored local .env file was read — only the five tracked .env.example files. A1-01 not re-graded per instruction.

## Sensitive-Data-Store Inventory

| Store | Contents | Protection | Retention |
|-------|----------|------------|-----------|
| sessions.token | Session bearer token, plaintext text NOT NULL UNIQUE | expiresAt column; cascade on user delete | Better Auth default; no cleanup job in repo |
| accounts.password | Password hash (Better Auth scrypt) | Composite PK, cascade | Indefinite |
| accounts.access_token / refresh_token / id_token | OAuth tokens, plaintext text | Cascade on user delete | Indefinite — no rotation or purge |
| verifications.value | Reset/verification token material | Composite PK (identifier, value), expires_at | No cleanup — rows accumulate forever |
| tickets | name, email, subject, concern — reporter PII | FK SET NULL on user delete | No retention policy |
| idempotency_keys.response | Full handler response body, jsonb | authorId column | No TTL, no cleanup (A4-03) |
| users.email | PII | Unique constraint | Indefinite |

Per instruction, absence of application-level encryption is not claimed as a finding.

## Findings

### A9-01 — Seed script provisions an Admin account with a hardcoded password and prints it
Severity: High · Confidence: Medium (resolves Phase 3 deferral)

Affected: seed.ts:50 const seedPassword = "password123"; hand-rolled scrypt; seed-user-admin emailVerified: true; Admin role assignment; credential account rows; password printed to stdout; "seed" script runs pnpm push then seed; db:seed wiring.

Evidence. Seed creates fully functional pre-verified Admin: admin@turbo-template.local / password123. ADMIN_ROLE short-circuits every permission check. onConflictDoUpdate means re-running seed resets the password even if operator changed it.

Can the seed reach production? No workflow invokes it. Neither Dockerfile runs it. But no guard — only checks DATABASE_URL is set; no NODE_ENV check, no confirmation prompt. seed script silently runs pnpm push first (drizzle-kit push). Developer running pnpm db:seed with production DATABASE_URL performs schema push plus admin-credential reset against production.

Attack scenario. Operator runs pnpm db:seed against production/staging DATABASE_URL, or staging seeded this way is internet-reachable. Sign in with publicly known template credentials. Gain: Admin role, unconditional access to every RBAC endpoint and — via A2-01 — all ticket PII. Account is emailVerified: true, bypassing verification.

Confidence Medium because reaching production requires operator action. Repository-remediable defect (unguarded destructive script with fixed credentials) is unambiguous.

Remediation. Refuse in production unless ALLOW_PRODUCTION_SEED=true; random/env password; decouple push from seed.

### A9-02 — Deployment workflow writes all secrets to a plaintext file on the runner
Severity: Medium · Confidence: High

deploy-production.yml heredoc to /tmp/deploy.env; base64 -w0; put-parameter; rm -f. DATABASE_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_SECRET, CORS_ORIGINS written unencrypted.

Three weaknesses: plaintext transit through filesystem (rm not guaranteed without set -e); base64 is encoding not encryption (masking guarantee lost); no permissions: block so GITHUB_TOKEN gets default scope.

Credit: SSM parameter correctly SecureString; ECR login mask-password: true.

Remediation. Pipe heredoc directly into base64 without disk; set -euo pipefail; permissions: { contents: read }.

### A9-03 — Env validation is skipped whenever CI is set
Severity: Medium · Confidence: High (confirms PF-09)

All three validators: skipValidation: !!process.env.CI || npm_lifecycle_event === "lint". CI=true is automatic in GitHub Actions. Returns raw process.env with no schema checks and no defaults applied.

Consequences: CI cannot catch env misconfiguration; silent default loss (pino-logger works around this for LOG_LEVEL only). Docker builds inside CI inherit CI, so Next.js env validation that would catch bad NEXT_PUBLIC_API_BASE_URL is bypassed.

Remediation. Explicit SKIP_ENV_VALIDATION=1 opt-out, never inferred from CI.

### A9-04 — No audit trail for role and permission changes
Severity: Medium · Confidence: High

No audit table in schema; no audit writes in rbac-admin.service. docs/TICKETS.md specifies audit_log table and writeAudit() helper — unimplemented.

Directly compounds A2-03: users:manage holder can grant themselves Admin with no record. Post-incident no way to establish who escalated.

Remediation. Append-only audit_log (actor, action, target, timestamp, request id) written in same transaction as each RBAC mutation.

### A9-05 — Pino redaction misses reset tokens, emails, and ticket content
Severity: Medium · Confidence: Medium (consolidates credential-logging theme with A1-02 and A8-01)

Redacts only authorization, cookie, set-cookie, body.password. Gaps: req.body.email/token/newPassword; req.url always logged (tokens in query strings reach logs — A1-09/A7-03); ticket concern content in body logs.

Three independent logging paths: Pino (partially redacted), console.log in packages/auth (A1-02 unredacted), developer.log in Flutter (A8-01 unredacted). Consolidation should merge as single "unredacted credential logging" root cause.

### A9-06 — Verification records accumulate with no cleanup
Severity: Low · Confidence: High

verifications has expiresAt but no cleanup job/cron/DELETE. No index on expiresAt. Same pattern as idempotency_keys (A4-03).

### A9-07 — packages/db/.env.example presents a working credential pair without warning
Severity: Low · Confidence: High

DATABASE_URL="postgres://postgres:password@localhost:5432/turbo-template". Same class as A1-01 — functional value rather than placeholder.

### A9-08 — Flutter .env bundled as an app asset
Severity: Low · Confidence: High (single-point root-cause report, per handoff)

Canonical location for A8-04. Currently no sensitive values; structural risk.

### A9-09 — Documentation contains realistic-looking credential examples
Severity: Info · Confidence: High

README shows truncated placeholders (BEGIN RSA PRIVATE KEY, wJal..., AKIA..., GOCSPX-...). Verified zero complete key material. Will trigger secret scanners. Positively, correctly instructs openssl rand -base64 32 for BETTER_AUTH_SECRET.

## Env-Var Drift Table (selected)

Notable: BETTER_AUTH_URL never consumed (Phase 2 open item confirmed absent). AUTH_RATE_LIMIT_* undocumented in READMEs. SMTP_* absent from root README. docker-compose.production.yml passes ~15 variables the production workflow's require_var block never validates — so SMTP could be silently unset in production, triggering A1-02's fail-open console transport. E2E_TEST_PASSWORD defaults to Password123.

## Positive Assurance

No hardcoded secrets in source (targeted greps matched only README placeholders). process.env discipline enforced by lint rule. No secret in Docker layers. .dockerignore excludes all .env*. Non-root container runtime both images. GitHub Actions secrets via env: never interpolated into run: bodies. NEXT_PUBLIC_* only three URLs. Password hashing in seed is real scrypt. Foreign keys and cascades deliberate and correct. Uniqueness constraints clean. Schema ↔ migration consistency verified line-by-line across all three migrations. Indexes adequate. SQL injection clean (re-verified). Transaction boundaries partially clean (setRolePermissions transactional; assignRole/removeRole gaps graded A2-04). Seed idempotency clean. Encryption at rest not claimed as finding. Table naming clean.

## Unresolved Coverage

1. Local .env files not read — per instruction.
2. deploy-staging.yml, ci.yml, release-changelog.yml, auto-draft-pr.yml not read — Areas 11/12.
3. Pino body-logging behaviour for auth routes uncertain (stream vs parsed).
4. snapshot.json files not read — migrations verified against schema.ts directly.
5. Better Auth's own token storage (raw vs hashed in verifications.value) library-internal.
6. docs/QA-SETUP-CHANGES.md and CRITICAL-JOURNEYS.md not read.

## Summary

One High, four Medium, three Low, one Info. The High (A9-01) resolves Phase 3 deferral: seed provisions pre-verified Admin with publicly known password, prints it, resets on every run, no environment guard, wired to script that silently pushes schema first.

Two systemic themes: validation disabled exactly where it would help most (A9-03); no accountability layer (A9-04) — RBAC mutations including self-escalation leave no record.

Database layer is the strongest part of this area: constraints, cascades, indexes, schema-migration consistency all correct; parameterization disciplined.

Ready for Areas 11 and 12 — Dependencies, Supply Chain, CI/CD, Containers and Reverse Proxy.
