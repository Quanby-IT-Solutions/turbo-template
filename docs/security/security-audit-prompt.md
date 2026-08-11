# Turbo Template Read-Only Security Audit Prompt

This is a **READ-ONLY security audit** of the current Turbo Template monorepo.

Do **NOT** edit, create, delete, rename, format, generate, or apply patches to any file.
Do **NOT** run migrations, seeders, dependency installation/update commands, autofix commands, or other commands that mutate the working tree.
Do **NOT** commit, push, or modify external systems.

Security remediation recommendations and minimal illustrative code snippets are allowed in the report, but they must not be applied to the repository.

Audit only the current Git-tracked repository tree. Use `git ls-files` as the source-of-truth scope. Exclude `node_modules`, `.next`, `dist`, `build`, `coverage`, generated caches, local ignored `.env` files, and other untracked runtime artifacts.

Read-only inspection commands are allowed. `pnpm audit` may be run if it does not modify the lockfile or working tree. Do not run `pnpm install`.

## Phases Mode

If using Phases mode:

1. First propose a logical grouping of the 12 audit areas below.
2. Wait for my approval before beginning.
3. Treat every phase as a complete mini-audit, including findings, positive assurances, and unresolved coverage.
4. Consolidate and deduplicate all phase results into the exact final output format.

## Role and Objective

You are a senior application security engineer performing a pre-production security audit of a reusable Turborepo starter.

The checked-in stack includes:

- Next.js 16 and React 19 frontend under `apps/web`
- Tailwind CSS and shadcn/ui
- Serwist service worker and PWA/offline support
- TanStack Query, including IndexedDB persistence and paused-mutation restoration
- NestJS 11 backend under `apps/backend`
- oRPC contracts with Zod schemas under `packages/contracts`
- Better Auth under `packages/auth`
- Email/password authentication, verification email, password reset, SMTP, and Google OAuth
- Drizzle ORM with PostgreSQL under `packages/db`
- Custom roles and permissions
- NestJS throttling, Pino logging, and database-backed idempotency support
- Flutter mobile client using Dio, CookieJar, secure storage, SharedPreferences, and notifications
- Jest, Vitest, Playwright, and Flutter tests
- Dockerfiles, Docker Compose, Nginx, and GitHub Actions deployment workflows

The current application features are primarily authentication, user permissions, RBAC administration, todos, support tickets, health checks, PWA/offline behavior, and mobile authentication.

Do not assume that this repository implements payments, wallets, KYC, notarization, file uploads, S3, LiveKit, Socket.IO application events, webhooks, AI services, or third-party business integrations. If repository-wide searches confirm that a capability is absent, mark it **N/A** with search evidence. Do not report the absence of an optional product feature as a vulnerability.

Treat account information, authentication credentials, session tokens, OAuth tokens, authorization data, and support-ticket content as sensitive.

## Strict Scope

Only report findings that:

1. Exist in Git-tracked source code, configuration, manifests, lockfiles, migrations, Dockerfiles, Compose files, Nginx configuration, tests, or GitHub Actions workflows in this repository.
2. Are supported by exact file and line evidence.
3. Can be remediated by changing files in this repository.
4. Have a concrete security impact or materially weaken the template's secure-by-default behavior.

The following are out of scope unless represented by checked-in files:

- Cloud account configuration and live IAM policies
- Security groups, WAF rules, DNS, certificates, and load balancer configuration managed elsewhere
- Runtime secrets and environment values injected outside the repository
- PostgreSQL server configuration
- SMTP, Google, GitHub, AWS, or other third-party implementation defects
- Infrastructure repositories referenced by documentation but not present here
- Deployed runtime state
- Git history, unless explicitly requested

If a concern depends on external configuration, label it **external dependency / residual risk**. Do not assign it a release-blocking severity.

## Audit Method

- Begin with an attack-surface inventory based on actual files.
- Enumerate every oRPC contract route and map it to its controller and service.
- Record whether each endpoint is public, authenticated, permission-protected, and object-owner scoped.
- Inspect Better Auth routes and the versioned auth middleware separately from NestJS controller routes.
- Include browser, backend, database, PWA, and mobile trust boundaries.
- Search repository-wide before concluding that a capability is absent.
- Consolidate duplicate root causes into one finding with all affected locations.
- Distinguish exploitable vulnerabilities from defense-in-depth recommendations.
- Do not elevate a finding solely because a best-practice control is absent.
- Critical and High findings require a plausible, code-supported attack path.
- State the security checks performed and positive evidence for every area that is clean.
- If evidence is incomplete, lower confidence instead of speculating.
- Report versions and advisory results as of the audit date.

## Audit Areas

### 1. Authentication, Sessions, and Account Lifecycle

Inspect Better Auth configuration and its NestJS integration:

- Cookie behavior: Secure, HttpOnly, SameSite, domain, path, cross-subdomain settings, and environment-dependent behavior
- Session creation, expiry, rotation, revocation, concurrent sessions, password-change invalidation, and sign-out completeness
- Browser and Flutter session handling consistency
- Email/password hashing behavior and Better Auth configuration overrides
- Email verification requirements and bypass paths
- Password-reset token expiry, reuse, leakage, and account-enumeration behavior
- Authentication and email-send rate limiting
- CSRF and origin validation
- Trusted-origin parsing and validation
- Google OAuth state, callback, redirect, account-linking, and open-redirect risks
- Versioned authentication-path rewriting
- SMTP error handling and token leakage through development mail transports or logs
- Configuration behavior when optional Google or SMTP variables are only partially supplied
- Secret minimum-strength validation
- Whether authentication OpenAPI/reference endpoints can be exposed in production

Do not report missing MFA as a vulnerability unless the repository claims to provide MFA.

### 2. Authorization, RBAC, and IDOR

Enumerate all backend endpoints, including:

- Todos
- Tickets
- Current-user permissions
- Roles
- Permissions
- User-role assignment
- Health
- Better Auth endpoints where applicable

For every endpoint verify:

- Authentication requirements
- Permission-guard requirements
- Resource ownership checks
- User ID derivation from the verified session rather than request data
- Read, update, and delete scoping
- Whether changing a route ID exposes or mutates another user's data
- Whether ticket PII is accessible to unauthorized users
- Default-role and bootstrap behavior
- Role creation, update, deletion, and permission assignment constraints
- Protection of reserved/system roles
- Self-escalation and administrator lockout paths
- User-role assignment and removal authorization
- RBAC cache invalidation and stale-permission behavior
- Database and frontend authorization consistency
- Whether frontend route guards are relied upon without equivalent backend enforcement

Treat frontend visibility checks as UX controls, not authorization boundaries.

### 3. Contracts, Input Validation, and Injection

Inspect every Zod/oRPC schema and corresponding service:

- Missing minimum or maximum lengths
- Unbounded ticket content, names, emails, role names, and descriptions
- Coercion edge cases
- Unknown-key handling
- Defaults that allow clients to set server-owned values
- Mass assignment of IDs, author IDs, permissions, roles, status, timestamps, or completion state
- Contract/controller/service mismatches
- Response serialization and unintended data exposure
- Raw SQL templates and parameterization
- Dynamic identifiers or fragments in SQL
- XSS sinks, including `dangerouslySetInnerHTML`
- Rendering of support-ticket or other user-controlled content
- URL validation, open redirects, and SSRF-capable fetches
- Command execution and `child_process` usage
- File paths derived from requests
- Template or email HTML injection
- Prototype pollution or unsafe object merging
- Regular-expression denial-of-service where applicable

Differentiate static build-time command execution from request-controlled command injection.

### 4. Rate Limiting, Abuse Prevention, and Idempotency

Inspect:

- Global NestJS throttler configuration
- Strict per-route throttling and decorator coverage
- Better Auth's own rate limiter
- Login, sign-up, password reset, verification resend, and OAuth endpoints
- Anonymous ticket submission
- Email-spam and account-enumeration paths
- Expensive list and RBAC administration endpoints
- Request-body size limits
- URL-encoded body limits
- Trust-proxy configuration and `X-Forwarded-For` handling
- Client-IP spoofing possibilities
- In-memory throttling behavior in multi-instance deployment
- Rate-limit header behavior
- Idempotency-key validation, length limits, expiry, storage growth, ownership, replay behavior, and concurrency guarantees
- Whether write endpoints consistently use idempotency where the template expects it
- Denial-of-service risks from database advisory locks or attacker-chosen keys

Recommend endpoint-specific limits only where the existing code presents an abuse path.

### 5. API, Transport, Error Handling, and Documentation

Inspect:

- CORS allowlisting, credentials, empty entries, wildcard-like configuration, and parsing
- CSRF protections on cookie-authenticated requests
- Security headers in Next.js, NestJS, and Nginx
- CSP, HSTS, frame restrictions, MIME sniffing prevention, referrer policy, and permissions policy
- Production HTTP-to-HTTPS expectations expressed in checked-in configuration
- Error filters and serialization failures
- Stack traces, SQL errors, internal messages, request bodies, and secrets in responses
- Pino request/response logging and redaction
- Authentication middleware ordering relative to CORS, logging, and body parsing
- API documentation and specification exposure in production
- Better Auth reference endpoint exposure
- Health-check output, version leakage, database detail leakage, and readiness/liveness behavior
- Request IDs and acceptance of attacker-controlled correlation IDs
- Proxy header handling and host-header trust
- HTTP timeout, keepalive, and payload-limit configuration

### 6. Next.js and Browser Security

Inspect:

- App Router layouts and pages that require authentication
- Server components and server-side session retrieval
- Route handlers and Server Actions, including future-facing placeholder modules
- Authorization decisions performed only in client components
- Cookie forwarding from server-side requests
- Cross-origin credential handling
- Auth callback and post-login navigation
- Open redirects from query parameters
- Sensitive values exposed through `NEXT_PUBLIC_*` variables
- Client-side token or session storage
- Caching of authenticated SSR responses
- Browser history or URL leakage of password-reset and verification tokens
- XSS and unsafe HTML or style construction
- Clickjacking and CSP coverage
- Next.js production-build safety settings
- Whether TypeScript or build errors are ignored
- Source maps and production error disclosure
- Logout cleanup across application state and browser caches

### 7. PWA, Service Worker, and Offline Persistence

Inspect:

- Service-worker scope and routing
- Whether API and authentication responses can enter Cache Storage
- Navigation fallback behavior for authenticated pages
- IndexedDB persistence of authenticated TanStack Query data
- Whether sensitive queries are excluded from persistence
- Cache clearing on sign-out
- Cache isolation when users switch accounts on the same browser profile
- Persistence expiry and invalidation
- Paused mutation persistence and replay after reconnect
- Replay under a different authenticated user
- Interaction between offline mutations and backend idempotency
- Service-worker update and takeover behavior
- Offline exposure of previously viewed user or administrative data
- PWA manifest settings that have security relevance

### 8. Flutter Mobile Security

Inspect the Flutter source, `pubspec.yaml`, and checked-in Android/iOS configuration:

- Cookie-based Better Auth integration
- Persistent CookieJar storage location and protection
- Duplication of session cookies or tokens between CookieJar and secure storage
- Sign-out cleanup of every cookie and token store
- Full response or session-token logging
- Cleartext HTTP configuration
- Production endpoint validation
- TLS behavior and insecure certificate overrides
- Environment files bundled as Flutter assets
- Secrets mistakenly treated as mobile environment variables
- Android exported components
- Android backup, cleartext, screenshot, notification, alarm, and storage configuration
- iOS transport and entitlement configuration where present
- Deep-link or OAuth callback validation where present
- SharedPreferences use for sensitive data
- Notification payload privacy
- Dio interceptors leaking credentials across hosts or redirects
- Error messages that expose sensitive response bodies
- Generated serialization accepting server-owned fields
- Release-build logging behavior

Do not require certificate pinning without a repository-specific threat or existing requirement; treat it as optional hardening unless evidence shows otherwise.

### 9. Data Protection, Privacy, Logging, and Database Integrity

Inspect:

- Stored session, OAuth access, refresh, and ID tokens
- Password and verification records
- Support-ticket PII
- Idempotency response storage
- Database cascades and orphan cleanup
- Retention or deletion behavior expressed in code
- Whether deleted or revoked records remain queryable
- Logging of emails, tokens, cookies, passwords, response bodies, or ticket content
- Pino redaction paths
- Flutter developer logs
- Development SMTP output
- Auditability of role and permission changes
- Transaction boundaries for multi-step RBAC changes
- Race conditions in role deletion, assignment, and permission updates
- Database uniqueness and foreign-key constraints
- Seed data containing default credentials or excessive privileges
- Cross-user query scoping
- Schema and migration consistency
- Indexes whose absence creates a realistic denial-of-service risk

Do not claim database encryption at rest is absent unless application-level encryption is explicitly required or relevant code exists.

### 10. Secrets and Environment Configuration

Scan the current tracked tree for:

- Hardcoded secrets, passwords, tokens, private keys, API credentials, database URLs, and real host credentials
- Non-placeholder values in `.env.example` files
- GitHub Actions secret exposure
- Secrets written to command lines, logs, generated environment files, or Docker layers
- Direct `process.env` access that bypasses validated configuration
- Weak validation of secrets, URLs, origins, cookie domains, and SMTP settings
- CI-specific validation bypasses that can hide production misconfiguration
- `NEXT_PUBLIC_*` exposure
- Flutter `.env` asset exposure
- Docker `ARG` versus runtime secret handling
- Documentation examples that look like live credentials
- Differences between documented and actually consumed environment variables

Do not inspect or report values from ignored local `.env` files.

### 11. Dependencies and Supply Chain

Inspect:

- Root and workspace `package.json` files
- `pnpm-lock.yaml`
- `apps/mobile/pubspec.yaml` and `pubspec.lock`
- GitHub Actions dependencies
- Docker base images
- pnpm `onlyBuiltDependencies`
- Postinstall, prepare, code-generation, and build scripts
- `child_process` or shell commands executed by build/runtime code
- Beta, prerelease, abandoned, or unusually old production dependencies
- Drizzle beta usage
- Lockfile integrity and frozen-lockfile enforcement in CI
- Workspace protocol and catalog consistency
- Unexpected package-name collisions or dependency-confusion risks
- Install scripts from native dependencies
- GitHub Actions pinned only to mutable tags rather than commit SHAs
- Generated Dart/TypeScript code provenance
- Whether development-only tooling is included in production images

Run `pnpm audit` read-only if possible and report only applicable vulnerabilities with package path, installed version, affected range, exploit relevance, and upgrade path. Do not list every advisory without assessing reachability.

For Flutter, use the checked-in lockfile and any available read-only advisory mechanism. Clearly state if no reliable vulnerability database was available.

### 12. CI/CD, Containers, Reverse Proxy, and Security Guardrails

Inspect:

- Root and application Dockerfiles
- Runtime user and root execution
- Multi-stage build boundaries
- Secrets copied into image layers
- Build-context breadth
- Development dependencies in runtime images
- Image tags and digest pinning
- Health checks and signal handling
- Docker Compose port binding, networks, volumes, restart behavior, and privilege settings
- Staging deployment workflow
- Production EC2/ALB/ASG workflow
- AWS credential handling
- GitHub job and token permissions
- Environment protection and deployment concurrency expressed in workflows
- Shell injection through GitHub context values or repository variables
- Artifact and cache trust boundaries
- Whether deployments are gated by CI
- Nginx request-body limits, timeouts, proxy headers, TLS examples, headers, WebSocket upgrade behavior, and upstream routing
- Documentation/configuration drift, including deployment architecture
- Security-relevant tests for authentication, authorization, ownership, throttling, idempotency, PWA cache isolation, and mobile session cleanup
- Whether insecure example features or seed defaults can unintentionally ship as production defaults
- Build settings that allow type errors or failed security checks to pass

Do not treat generic Nginx WebSocket proxy headers as evidence that the application implements WebSockets.

## Severity

### Critical

Direct, practical compromise of authentication, administrator privileges, arbitrary code execution, broad sensitive-data disclosure, or equivalent impact.

### High

Practical cross-user access, privilege escalation, session compromise, credential disclosure, or a highly exploitable deployment weakness.

### Medium

Meaningful security weakness requiring additional conditions or producing limited impact.

### Low

Limited-impact hardening gap with a concrete repository-specific consequence.

### Info

Positive assurance, external dependency/residual risk, configuration observation, or defense-in-depth recommendation without a demonstrated vulnerability.

Critical and High findings must include:

- A code-supported attack scenario
- Required attacker access or preconditions
- What the attacker gains
- Why existing controls do not stop the attack

Do not use Critical or High for theoretical best-practice gaps.

## Exact Output Format

### 1. Executive Summary

Include:

- Production **GO / CONDITIONAL GO / NO-GO** assessment
- Assessment based only on repository-remediable findings
- Top five risks
- Scope and coverage summary
- Areas marked N/A because the capability is absent
- Dependency-audit limitations, if any

### 2. Findings Table

Use exactly these columns:

| ID | Severity | Area | File:Line | Issue | Fix | Confidence (High/Medium/Low) |
| --- | --- | --- | --- | --- | --- | --- |

Sort by severity, then exploitability.

### 3. Detailed Findings

For each finding include:

- ID and title
- Severity and confidence
- Affected files and exact lines
- Evidence
- Security impact
- Attack scenario for every Critical and High
- Root cause
- Concrete remediation
- Minimal illustrative code/config snippet where useful
- How the team should verify the remediation
- Any residual risk

Do not produce a patch or modify files.

After the findings, include **Positive assurance by audit area**. For every area without findings, state what was checked and cite evidence of the correct implementation.

### 4. Prioritized Remediation Roadmap

Group findings into:

- **Block release**
- **Fix within 30 days**
- **Hardening backlog**

Only Critical or High repository-remediable findings with a practical attack path should normally block release. Explain any exception.

### 5. Quick Wins

Provide a checklist of repository changes realistically implementable in under one engineering day. Every quick win must map to a finding ID. Do not introduce unrelated features or generic checklist items.
