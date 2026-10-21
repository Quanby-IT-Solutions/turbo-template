> These records are summarised for a public repo. They keep what was found, what changed, and where, without internal finding ids or step-by-step misuse.

# Phase 7 — Areas 9 & 10: Data Protection, Logging, Database Integrity, Secrets & Environment

Status: Complete. Mode: READ-ONLY. No file created, modified, deleted, or formatted. No migrations, seeders, db:push, installs, or commits. No ignored local .env file was read — only the five tracked .env.example files. Working default BETTER_AUTH_SECRET shipped in .env.example with no strength validation not re-graded per instruction.

## Sensitive-Data-Store Inventory

| Store | Contents | Protection | Retention |
|-------|----------|------------|-----------|
| sessions.token | Session bearer token, plaintext text NOT NULL UNIQUE | expiresAt column; cascade on user delete | Better Auth default; no cleanup job in repo |
| accounts.password | Password hash (Better Auth scrypt) | Composite PK, cascade | Indefinite |
| accounts.access_token / refresh_token / id_token | OAuth tokens, plaintext text | Cascade on user delete | Indefinite — no rotation or purge |
| verifications.value | Reset/verification token material | Composite PK (identifier, value), expires_at | No cleanup — rows accumulate forever |
| tickets | name, email, subject, concern — reporter PII | FK SET NULL on user delete | No retention policy |
| idempotency_keys.response | Full handler response body, jsonb | authorId column | No TTL, no cleanup (Idempotency keys are globally unique, unbounded, never expired, and unvalidated) |
| users.email | PII | Unique constraint | Indefinite |

Per instruction, absence of application-level encryption is not claimed as a finding.

## Findings

### Seed script provisions an Admin account with a hardcoded password and prints it
Severity: High · Confidence: Medium (resolves Phase 3 deferral)

Affected: `packages/db/src/seed.ts` (fixed password, pre-verified Admin, credential printed, seed script runs a schema push first).

Evidence. The seed creates a pre-verified Admin and can reset that password on re-run. The Admin role short-circuits permission checks. The rule is: refuse a production seed unless explicitly allowed, and take the password from the environment or a random value.

Can the seed reach production? No workflow invokes it. Neither Dockerfile runs it. But no guard — only checks DATABASE_URL is set; no NODE_ENV check, no confirmation prompt. seed script silently runs pnpm push first (drizzle-kit push). Developer running pnpm db:seed with production DATABASE_URL performs schema push plus admin-credential reset against production.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Confidence Medium because reaching production requires operator action. Repository-remediable defect (unguarded destructive script with fixed credentials) is unambiguous.

Remediation. Refuse in production unless ALLOW_PRODUCTION_SEED=true; random/env password; decouple push from seed.

### Deployment workflow writes all secrets to a plaintext file on the runner
Severity: Medium · Confidence: High

`deploy-production.yml` can leave secret material on the runner, and cleanup is not guaranteed when the step fails. The workflow declares no permissions.

The parameter-store value is a SecureString, and the registry login masks its password.

Remediation. Pass secret material through the parameter store with no file on the runner. Fail the step on error. Declare least-privilege workflow permissions.

### Env validation is skipped whenever CI is set
Severity: Medium · Confidence: High (confirms validation skipped in CI)

All three validators: skipValidation: !!process.env.CI || npm_lifecycle_event === "lint". CI=true is automatic in GitHub Actions. Returns raw process.env with no schema checks and no defaults applied.

Consequences: CI cannot catch env misconfiguration; silent default loss (pino-logger works around this for LOG_LEVEL only). Docker builds inside CI inherit CI, so Next.js env validation that would catch bad NEXT_PUBLIC_API_BASE_URL is skipped.

Remediation. Explicit SKIP_ENV_VALIDATION=1 opt-out, never inferred from CI.

### No audit trail for role and permission changes
Severity: Medium · Confidence: High

No audit table in schema; no audit writes in rbac-admin.service. docs/TICKETS.md specifies audit_log table and writeAudit() helper — unimplemented.

Directly compounds users:manage permits self-escalation to Admin (privilege boundary collapse): users:manage holder can grant themselves Admin with no record. Post-incident no way to establish who escalated.

Remediation. Append-only audit_log (actor, action, target, timestamp, request id) written in same transaction as each RBAC mutation.

### Pino redaction misses reset tokens, emails, and ticket content
Severity: Medium · Confidence: Medium (consolidates credential-logging theme with Mailer silently fails open to a console transport, printing reset and verification tokens and Session tokens and cookies written to device logs on every auth call)

Redacts only authorization, cookie, set-cookie, body.password. Gaps: req.body.email/token/newPassword; req.url always logged (tokens in query strings reach logs — Reset and verification tokens travel in URL query strings/Reset and verification tokens are cacheable and referrer-exposed); ticket concern content in body logs.

Three independent logging paths: Pino (partially redacted), console.log in packages/auth (Mailer silently fails open to a console transport, printing reset and verification tokens unredacted), developer.log in Flutter (Session tokens and cookies written to device logs on every auth call unredacted). Consolidation should merge as single "unredacted credential logging" root cause.

### Verification records accumulate with no cleanup
Severity: Low · Confidence: High

verifications has expiresAt but no cleanup job/cron/DELETE. No index on expiresAt. Same pattern as idempotency_keys (Idempotency keys are globally unique, unbounded, never expired, and unvalidated).

### packages/db/.env.example presents a working credential pair without warning
Severity: Low · Confidence: High

`packages/db/.env.example` ships a working database credential with no warning. Same class as the shipped signing secret — a functional value rather than a placeholder. The rule is a placeholder plus a development-only comment.

### Flutter .env bundled as an app asset
Severity: Low · Confidence: High (single-point root-cause report, per handoff)

Canonical location for .env bundled as a Flutter asset. Currently no sensitive values; structural risk.

### Documentation contains realistic-looking credential examples
Severity: Info · Confidence: High

README shows truncated placeholders (BEGIN RSA PRIVATE KEY, wJal..., AKIA..., GOCSPX-...). Verified zero complete key material. Will trigger secret scanners. Positively, correctly instructs openssl rand -base64 32 for BETTER_AUTH_SECRET.

## Env-Var Drift Table (selected)

Notable: BETTER_AUTH_URL never consumed (Phase 2 open item confirmed absent). AUTH_RATE_LIMIT_* undocumented in READMEs. SMTP_* absent from root README. docker-compose.production.yml passes ~15 variables the production workflow's require_var block never validates, so SMTP could be unset in production without failing the deploy; the production workflow should require the SMTP variables. The e2e password comes from the environment with no default.

## Positive Assurance

No hardcoded secrets in source (targeted greps matched only README placeholders). process.env discipline enforced by lint rule. No secret in Docker layers. .dockerignore excludes all .env*. Non-root container runtime both images. GitHub Actions secrets via env: never interpolated into run: bodies. NEXT_PUBLIC_* only three URLs. Password hashing in seed is real scrypt. Foreign keys and cascades deliberate and correct. Uniqueness constraints clean. Schema ↔ migration consistency verified line-by-line across all three migrations. Indexes adequate. SQL injection clean (re-verified). Transaction boundaries partially clean (setRolePermissions transactional; assignRole/removeRole gaps graded No last-Admin protection on role removal). Seed idempotency clean. Encryption at rest not claimed as finding. Table naming clean.

## Unresolved Coverage

1. Local .env files not read — per instruction.
2. deploy-staging.yml, ci.yml, release-changelog.yml, auto-draft-pr.yml not read — Areas 11/12.
3. Pino body-logging behaviour for auth routes uncertain (stream vs parsed).
4. snapshot.json files not read — migrations verified against schema.ts directly.
5. Better Auth's own token storage (raw vs hashed in verifications.value) library-internal.
6. docs/QA-SETUP-CHANGES.md and CRITICAL-JOURNEYS.md not read.

## Summary

One High, four Medium, three Low, one Info. The High (Seed script provisions an Admin account with a hardcoded password and prints it) resolves Phase 3 deferral: seed provisions pre-verified Admin with publicly known password, prints it, resets on every run, no environment guard, wired to script that silently pushes schema first.

Two systemic themes: validation disabled exactly where it would help most (Env validation is skipped whenever CI is set); no accountability layer (No audit trail for role and permission changes) — RBAC mutations including self-escalation leave no record.

Database layer is the strongest part of this area: constraints, cascades, indexes, schema-migration consistency all correct; parameterization disciplined.

Ready for Areas 11 and 12 — Dependencies, Supply Chain, CI/CD, Containers and Reverse Proxy.
