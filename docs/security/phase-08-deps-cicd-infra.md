> These records are summarised for a public repo. They keep what was found, what changed, and where, without internal finding ids or step-by-step misuse.

# Phase 8 — Areas 11 & 12: Dependencies, Supply Chain, CI/CD, Containers & Reverse Proxy

Status: Complete. Mode: READ-ONLY. No file created, modified, deleted, or formatted. No installs, updates, pub get, or autofix.

pnpm audit — NOT RUN. node_modules is absent from this workspace, so pnpm audit would first need to resolve the dependency graph. Even in read-only mode it can rewrite pnpm-lock.yaml when the lockfile and manifests disagree, and I cannot verify git status --porcelain before/after without shell access. I did not run it. Advisory analysis below is derived entirely from reading the checked-in pnpm-lock.yaml, which contains upstream deprecated: annotations. This is a stated limitation, not a claim of equivalence.

## Findings

### packages/contracts depends on the wrong orpc package, pulling in a 2018 Socket.IO stack
Severity: High · Confidence: High (resolves the stray package named orpc)

Affected: packages/contracts/package.json:26 "orpc": "^0.1.1"; pnpm-lock.yaml resolves to 0.1.1 with socket.io@2.5.1, socket.io-client@2.5.0, engine.io@3.6.2, debug@4.1.1 (deprecated ReDoS), uuid@3.4.0 (deprecated).

Evidence. Real oRPC packages are scoped @orpc/* and correctly declared in the catalog and used everywhere in source. Bare orpc is an unrelated abandoned 2018 package. No file in the repository imports it — zero from "orpc" / require("orpc") matches. Pure dead weight materialising a full Socket.IO 2.x tree.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Root cause. Typo/autocomplete installed orpc instead of @orpc/contract; correct scoped packages added alongside; stray dependency never removed.

Remediation. Delete the dependency line entirely. Refresh lockfile. Eliminates socket.io, socket.io-client, engine.io, debug@4.1.1, uuid@3.4.0 from the graph.

Verification. The lockfile has no socket.io entry, and build and typecheck still pass.

Residual risk. None once removed. Single highest-value fix in the entire audit relative to effort: one deleted line.

### Staging deploy does not pin the host key, and the deploy script can expand values on the runner
Severity: High · Confidence: High

Affected: `.github/workflows/deploy-staging.yml` (SSH step, deploy script, web image variable at line 140).

Three rules: (1) The host key must be pinned at the SSH step, so the deploy is bound to a known host. (2) The web image variable at line 140 must name the web repository, so the web service receives the web image. (3) The deploy script must pass values through literally, so the runner does not expand them.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Root cause. Staging pushes values to the instance instead of letting the instance pull them (the production pattern), and the host-key pin that would reject an unknown host is absent.

Remediation. Pin the host key; follow the production pull pattern; fix line 140 so the web image variable names the web repository; pass the deploy script through literally.

### CI delegates to an external reusable workflow pinned to @main with secrets: inherit
Severity: High · Confidence: Medium

ci.yml: uses: Quanby-IT-Solutions/.github/.github/workflows/quality-gate.yml@main; secrets: inherit. Both deploys gate on this workflow.

Evidence. `.github/workflows/ci.yml` calls the external quality gate on a mutable `@main` ref. `secrets: inherit` passes every repository secret into that workflow. The rule is a pinned commit SHA and an explicit secret map limited to what the gate requires.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Confidence Medium because external workflow contents cannot be read from this repository. Pinning and secret-scoping weakness is fully repository-remediable. Second-order: this audit cannot verify that CI runs lint, typecheck, or tests at all.

Remediation. Pin to commit SHA; replace secrets: inherit with explicit secrets: map listing only what the gate needs (likely none).

### All GitHub Actions pinned to mutable tags; no workflow declares job-level permissions
Severity: Medium · Confidence: High

| Workflow | permissions | Actions used | Pinning |
|----------|-------------|--------------|---------|
| ci.yml | none | reusable @main | ❌ mutable branch |
| deploy-production.yml | none | checkout@v6, configure-aws-credentials@v4, amazon-ecr-login@v2, setup-buildx@v3, cache@v5 | ❌ all tags |
| deploy-staging.yml | none | checkout@v4, configure-aws-credentials@v4, amazon-ecr-login@v2, setup-buildx@v3, cache@v4 | ❌ all tags |
| release-changelog.yml | ✅ contents: write, pull-requests: read | checkout@v4 | ❌ tag |
| auto-draft-pr.yml | ✅ contents: read | create-github-app-token@v3 | ❌ tag |

Zero actions SHA-pinned. Three most privileged workflows declare no permissions block. Positive contrast: auto-draft-pr and release-changelog do declare least-privilege — practice is understood, not applied to deploys.

Remediation. Pin every action to full commit SHA with version comment; add permissions: { contents: read } to CI and both deploys.

### Buildx cache is shared and restorable across refs, and deploys are gated on an unverifiable CI
Severity: Medium · Confidence: Medium

Broad restore-keys prefix. Cache written on a branch restorable by default branch. Neither deploy triggered by pull_request — both push to production/staging plus workflow_dispatch — so path requires branch-push access. Confidence Medium. Deploys are gated on CI (good) but gate contents unverifiable (CI delegates to an external reusable workflow pinned to @main with secrets: inherit).

### Nginx has no body limit, no timeouts, no security headers, and TLS is entirely commented out
Severity: Medium · Confidence: High (consolidates No request body size limit on any endpoint and Security headers absent at every layer proxy layer)

No client_max_body_size, no proxy timeouts, no add_header. The forwarded header is not set from the connection address (throttle-key finding). WebSocket upgrade headers on web location (not evidence of WebSockets — per brief). Entire TLS server block including HTTP→HTTPS 301 commented out. Upstreams point at host.docker.internal, contradicting compose service names.

Remediation. Set a body-size limit and explicit proxy timeouts; add security headers; set the forwarded header from the connection address; ship the TLS block or document load-balancer termination.

### Root postinstall executes a shell command that fetches and runs a remote package
Severity: Medium · Confidence: High

package.json postinstall shells out to pnpm lint:ws which runs pnpm dlx sherif@latest. @latest unpinned; try/catch swallows failures. Dockerfiles run pnpm install --frozen-lockfile which still triggers postinstall.

Remediation. Add sherif as pinned devDependency; invoke locally; or remove from postinstall and run as explicit CI step.

### Root Dockerfile is an unused, insecure variant that ships the full source tree and dev dependencies
Severity: Low · Confidence: High

No compose/workflow references it. Installs all deps, copies everything, no HEALTHCHECK, runs pnpm start. Latent risk for downstream adopters. .dockerignore does exclude .env and .git.

Remediation. Delete it, or clearly mark as unused example.

### drizzle-kit and drizzle-orm pinned to the same beta build
Severity: Low · Confidence: High

1.0.0-beta.9-e89174b exact pin — correct handling for a beta. Production runtime dependency. Operational risk to track, not a defect. Contrast: next 16.1.1 and react 19.2.3 are stable.

### Security-relevant test coverage is thin and concentrated
Severity: Low · Confidence: High

| Security control | Test coverage | Evidence |
|------------------|---------------|----------|
| RBAC guard | ✅ Strong — 12 cases | rbac.guard.spec.ts |
| Throttler | ✅ Good | throttler-proxy.guard.spec.ts |
| Request-ID / log correlation | ✅ Good | request-id.spec.ts |
| Auth docs gating | ✅ Good | auth.config.spec.ts |
| Ownership / IDOR | ❌ None | — |
| Idempotency interceptor | ❌ None | — |
| PWA cache isolation | ❌ None | — |
| Mobile session cleanup | ❌ None | widget_test only asserts app renders |
| throttle-key trust boundary | ❌ None | guard spec tests extraction, not the trust boundary |

Backend coverage thresholds low (25% lines, 20% branches); examples module excluded (where Todo update and delete are capability-gated but not ownership-scoped lives). e2e tests target /api/v1/examples/todos (plural) but actual path is /api/v1/example/todos — stale/unrun.

### Compose port bindings and documentation/architecture drift
Severity: Info · Confidence: High

Throttle-key exposure claim confirmed: docker-compose.production.yml and staging bind 0.0.0.0:3000/3001. No Nginx service in either file — reverse proxy not part of deployed topology; security groups are external residual risk. Development compose correctly binds 127.0.0.1. No database service in any compose — no exposed Postgres.

Drift: nginx.conf host.docker.internal vs compose service names; README points to out-of-scope turbo-infrastructure repo; production compose stored in SSM (checked-in is template); root Dockerfile unreferenced; e2e path wrong.

## Dependency & Advisory Table

Derived from pnpm-lock.yaml only. No advisory service queried.

| Package | Version | Path | Signal | Reachability | Upgrade path |
|---------|---------|------|--------|--------------|--------------|
| orpc | 0.1.1 | packages/contracts (direct) | Abandoned; wrong package | Unreachable — zero imports | Remove (packages/contracts depends on the wrong orpc package, pulling in a 2018 Socket.IO stack) |
| debug | 4.1.1 | via orpc → socket.io | Lockfile deprecated: ReDoS | Unreachable | Removed with packages/contracts depends on the wrong orpc package, pulling in a 2018 Socket.IO stack |
| uuid | 3.4.0 | via orpc | Lockfile deprecated | Unreachable | Removed with packages/contracts depends on the wrong orpc package, pulling in a 2018 Socket.IO stack |
| socket.io / -client / engine.io | 2.5.1 / 2.5.0 / 3.6.2 | via orpc | 2018-era unmaintained | Unreachable | Removed with packages/contracts depends on the wrong orpc package, pulling in a 2018 Socket.IO stack |
| multer | 2.0.2 | via @nestjs/platform-express | Legitimate transitive | Unreachable — no upload code | None needed |
| drizzle-orm / drizzle-kit | 1.0.0-beta.9-e89174b | catalog + packages/db | Pre-release | Reachable — production runtime | Track for 1.0 (drizzle-kit and drizzle-orm pinned to the same beta build) |
| next | 16.1.1 | catalog | Stable | Reachable | Current |
| react / react-dom | 19.2.3 | catalog | Stable | Reachable | Current |
| better-auth | 1.4.12 | catalog | Stable, exact-pinned | Reachable | Current |

Every deprecated package traces to the single orpc mistake. Removing one line clears the entire deprecated set.

## Flutter advisory limitation — explicit statement

No reliable first-party Flutter/Dart vulnerability database is available, and none was consulted. Dart has no npm audit equivalent. OSV.dev Pub feed has materially thinner coverage. apps/mobile/pubspec.lock was not parsed for versions without an advisory source. The 17 direct Flutter dependencies in pubspec.yaml:14-59 have not been assessed for known vulnerabilities. This is a genuine coverage gap, not an assurance of safety.

## Positive Assurance

--frozen-lockfile in both production Dockerfiles. Non-root container runtime all three Dockerfiles. Multi-stage boundaries with turbo prune --docker — only dist/.next/standalone reach runner. Build-context hygiene (.dockerignore excludes all .env* and .git). Secrets in image layers clean. Container health checks. Deploy gating on CI (structurally — contents unverifiable). Deployment concurrency correctly differentiated. Environment protection (environment: declared). Shell injection via GitHub context clean — checked specifically; auto-draft-pr correctly uses env: var. tickets-to-issues.mjs uses JSON.stringify on every interpolated value, not invoked by any workflow. ECR password masking. SSM parameter SecureString. onlyBuiltDependencies allowlist genuine supply-chain control. Workspace protocol consistency. Dependency-confusion via @repo/* N/A. prepare: husky clean. Turbo build gating (build depends on ^lint and ^typecheck). globalEnv: [] clean. No continue-on-error. Generated code provenance. Image tagging with github.sha.

## Unresolved Coverage

1. pnpm audit not run — stated at top.
2. Flutter advisories not assessed — explicit limitation.
3. quality-gate.yml@main unreadable (CI delegates to an external reusable workflow pinned to @main with secrets: inherit) — cannot confirm CI runs lint/typecheck/tests.
4. Docker base images use tags not digests (node:22-alpine).
5. docs/RELEASE-AND-CHANGELOG.md, QA-SETUP-CHANGES.md, CRITICAL-JOURNEYS.md not read.
6. vitest.config.ts and packages/e2e-web/** not read in full.
7. Deployed artifacts differ from repository — production compose in SSM; ALB/SG/launch template in external Terraform.

## Summary

Three High, four Medium, three Low, one Info. The three Highs are supply-chain or CI/CD trust-boundary issues with asymmetric fix cost:

- packages/contracts depends on the wrong orpc package, pulling in a 2018 Socket.IO stack is a one-line deletion removing an abandoned package and every deprecated transitive dependency.
- Staging deploy does not pin the host key, and the deploy script can expand values on the runner. The web image variable at line 140 does not name the web repository, so staging has not run the web image.
- CI delegates to an external reusable workflow pinned to @main with secrets: inherit routes the entire CI gate through a mutable external ref with every secret inherited.

Container layer is the strongest part of this area — pruned multi-stage builds, non-root users, no secrets in layers, correct .dockerignore, health checks. Weakness concentrated in the workflow layer (no permissions, no SHA pinning, secrets pushed over unverified SSH) and two pieces of dead-but-dangerous configuration (unused root Dockerfile, unused orpc dependency).

This completes all eight audit phases. Ready for Consolidation and Final Security Audit Report, which should merge: throttle keys could be influenced by request headers + Nginx has no body limit, no timeouts, no security headers, and TLS is entirely commented out (XFF), Security headers absent at every layer + Nginx has no body limit, no timeouts, no security headers, and TLS is entirely commented out (security headers), Mailer silently fails open to a console transport, printing reset and verification tokens + Session tokens and cookies written to device logs on every auth call + Pino redaction misses reset tokens, emails, and ticket content (unredacted credential logging), Sign-out invalidates only the session query, leaving other authenticated data cached + Authenticated data persists to IndexedDB under one shared key and is never cleared on sign-out (sign-out cleanup), .env bundled as a Flutter asset + Flutter .env bundled as an app asset (Flutter .env asset), and carry forward the two standing coverage limitations — no pnpm audit, no Flutter advisory database — into the Executive Summary.
