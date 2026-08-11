# Phase 2 — Area 1: Authentication, Sessions & Account Lifecycle

Status: Complete. Mode: READ-ONLY. No file created, modified, deleted, or formatted. No installs, migrations, seeders, autofix, or commits. Routes reused from the Phase 1 matrix; not re-enumerated.

## Priority Item — Unresolved Coverage #2 RESOLVED

Question: Does @thallesp/nestjs-better-auth v2.2.0 register a global AuthGuard?

Answer: YES. The library registers AuthGuard globally by default. All routes are authenticated unless opted out with @AllowAnonymous() (or @OptionalAuth()). The opt-out flag is disableGlobalAuthGuard: true — a separate option from disableControllers.

app.module.ts:58 passes only { auth: getAuth(), disableControllers: true }. disableGlobalAuthGuard is absent, so the global guard is active.

Corroborating in-repo evidence:
- todos.controller.ts:17, 25 and health.controller.ts:14 apply @AllowAnonymous(). That decorator is meaningless unless a global guard exists.
- todos.controller.spec.ts:39-42 mocks AllowAnonymous as a real import from the library.
- No @UseGuards(AuthGuard) appears anywhere in apps/backend/src, confirming reliance on the global default rather than per-route application.

### Consequences for the three dependent items

| Item | Resolution |
|------|------------|
| Endpoint matrix "Presumed yes" | Confirmed. ticket.list, ticket.get, ticket.submit all require an authenticated session. Every route except health.check, todo.list, todo.get is authenticated. |
| PF-02 | Confirmed as a real mismatch. tickets.contract.ts:18, 48 declare security: [] (public) for ticket.list and ticket.submit, but runtime requires a session. Published OpenAPI advertises anonymous ticket submission that returns 401. This also means the "anonymous ticket submission" abuse path assumed in the audit brief does not exist — Area 4 must not model it. Carried to the Contracts phase. |
| PF-03 | Confirmed and now precisely scoped. Ticket PII is not anonymous-readable, but tickets.controller.ts:14, 21 carry no @RequirePermissions, so any authenticated user — including a freshly self-registered one — can GET /api/v1/tickets and read every ticket's name, email, subject, and concern (tickets.service.ts:14-17). Cross-user PII disclosure by any account holder. Carried to the Authorization phase for severity. |

## Findings

### A1-01 — Working default BETTER_AUTH_SECRET shipped in .env.example with no strength validation
Severity: High · Confidence: Medium

Affected lines:
- apps/backend/.env.example:21 — BETTER_AUTH_SECRET=default-secret-for-testing-change-in-production
- packages/auth/src/config.ts:26 — BETTER_AUTH_SECRET: z.string()
- apps/backend/src/config/env.config.ts:38 — BETTER_AUTH_SECRET: z.string()
- packages/auth/src/config.ts:88 — secret: authEnv.BETTER_AUTH_SECRET
- packages/auth/src/config.ts:52 / env.config.ts:46 — skipValidation: !!process.env.CI

Evidence. The example file contains a syntactically valid, immediately usable secret rather than a placeholder. Both Zod validators accept any string — no .min(), no entropy floor, no rejection of known defaults. Contrast with sibling variables in the same file that use obvious placeholders (GOOGLE_CLIENT_ID=your-google-client-id..., line 26).

Attack scenario. Preconditions: an operator copies .env.example to .env — the documented onboarding step — and ships without rotating this one line. Nothing in the codebase warns or fails. Attack: this is a public reusable template, so the string is world-readable. Better Auth derives session-cookie signing material from secret. An attacker who recognizes the deployment as this template forges a validly signed session cookie for any known or guessed userId. rbac.guard.ts:65-67 resolves the session via getAuth().api.getSession(), which validates the signature against the same known secret and returns a session. Gain: full authentication bypass; with a forged admin userId, complete RBAC administration access via /api/v1/rbac/*. Why existing controls don't stop it: the RBAC guard trusts any signature-valid session; no secret-strength gate exists at boot; and skipValidation on CI means no pipeline check surfaces the weak value.

Root cause. A usable default is checked in, and secret validation is presence-only.

Remediation (illustrative — not applied).
```
// packages/auth/src/config.ts + apps/backend/src/config/env.config.ts
BETTER_AUTH_SECRET: z.string().min(32, "BETTER_AUTH_SECRET must be >= 32 chars")
  .refine(v => !v.startsWith("default-secret"), "Replace the template default secret"),
```
Replace line 21 of .env.example with a non-functional placeholder and document openssl rand -base64 32.

Verification. Boot the backend with the example value and confirm non-zero exit; boot with a 32-char random value and confirm success.

Residual risk. Operators can still supply a weak-but-long secret. Secret distribution is external dependency / residual risk; the checked-in default and the missing validator are fully repository-remediable, which is why this is graded rather than deferred.

### A1-02 — Mailer silently fails open to a console transport, printing reset and verification tokens
Severity: Medium · Confidence: High (code) / Medium (impact)

Affected lines:
- packages/auth/src/mailer/transport-factory.ts:24, 40-44 — no smtpHost → console.warn + jsonTransport
- packages/auth/src/mailer/send-mail.ts:34 — console.log("[mailer-dev]", info.message)
- packages/auth/src/config.ts — SMTP_HOST: z.string().optional()
- packages/auth/src/config.ts:151 — token embedded in the emailed URL
- apps/backend/src/config/pino-logger.config.ts:35-44 — redaction paths

Evidence. SMTP_HOST is optional with no environment-aware guard. When unset the factory returns jsonTransport, which never performs a network call and never throws. sendMail then writes the fully serialized message — including ${appWebUrl}/reset-password?token=${token} and /verify-email?token=${token} — to stdout via console.log.

Security impact. In a production deployment missing SMTP_HOST, the application appears healthy: signup and password reset return success, no error is raised, and every single-use reset and verification token is emitted to the container log stream. Anyone with log access (aggregator, CloudWatch, docker logs) can complete a password reset for any account. Because this is console.log and not the Pino logger, the redaction block at pino-logger.config.ts:35-44 does not apply — that config only redacts req.headers.cookie, authorization, set-cookie, and req.body.password.

Root cause. A development convenience fails open in production instead of closed, and it bypasses the structured logger's redaction.

Remediation (illustrative).
```
if (!opts.smtpHost) {
  if (process.env.NODE_ENV === "production")
    throw new Error("SMTP_HOST is required in production")
  // dev-only console transport
}
```
Additionally gate the send-mail.ts:33-35 echo on NODE_ENV !== "production".

Verification. Start with NODE_ENV=production and no SMTP_HOST; confirm boot failure. Trigger a reset in development and confirm the token still prints.

Residual risk. Log retention and access control remain external.

### A1-03 — Asymmetric reset-email error handling leaks SMTP internals and creates an enumeration oracle
Severity: Medium · Confidence: Medium

Affected lines:
- packages/auth/src/config.ts:156-161 — sendResetPassword calls sendMail with no try/catch
- packages/auth/src/config.ts:127-144 — the verification path does wrap and sanitize
- apps/web/features/auth/hooks/forgot-password.hooks.ts:26-28 — client surfaces any status >= 500

Evidence. The verification sender deliberately catches transport failures and re-throws a sanitized APIError with the comment "surface a sanitized error to clients so SMTP internals never leak" (lines 131-136). The reset sender at lines 156-161 performs the identical sendMail call with no equivalent protection, so a raw nodemailer error — typically embedding SMTP host, port, and response code — propagates into the HTTP response.

Security impact. Two effects. First, SMTP infrastructure disclosure in an unauthenticated response. Second, an account-enumeration oracle: Better Auth only invokes sendResetPassword when the account exists. If SMTP is degraded, a registered email yields 500 while an unregistered email yields the neutral 200. The frontend amplifies this — forgot-password.hooks.ts:26-28 re-throws on status >= 500 while deliberately swallowing everything else, so the two cases render as visibly different UI states. This defeats the anti-enumeration design the surrounding comment (lines 13-15) claims to implement.

Root cause. Inconsistent error handling between two adjacent mail-sending callbacks.

Remediation. Mirror the verification path's try/catch + sanitized APIError in sendResetPassword.

Verification. Point SMTP_HOST at a closed port; confirm a known and an unknown email return identical status and body.

Residual risk. Timing differences may remain a weaker oracle.

### A1-04 — Sign-out invalidates only the session query, leaving other authenticated data cached
Severity: Medium · Confidence: Medium

Affected lines:
- apps/web/features/auth/api/session.hooks.ts:52-57 — invalidateQueries({ queryKey: sessionKeys.all })
- apps/web/features/auth/api/session.hooks.ts — sessionKeys.all = ["session"]

Evidence. onSuccess invalidates only the ["session"] key. There is no queryClient.clear() and no persister purge. Queries under other keys — todos, me/permissions, and the RBAC administration queries in rbac.hooks.ts (which include the full user list with email addresses) — remain in the in-memory cache. invalidateQueries also marks data stale rather than removing it, so cached values stay readable until refetch.

Security impact. On a shared or kiosk browser, a second user reaching the app after sign-out can observe the previous user's cached data, including administrative user listings, before any refetch completes. Server-side revocation is unaffected — this is client-state hygiene.

Remediation (illustrative).
```
onSuccess: () => {
  queryClient.clear()          // drop all cached authenticated data
  router.push("/"); router.refresh()
}
```

Verification. Sign in as user A, visit user-management, sign out, and inspect the query cache and IndexedDB for residual entries.

Residual risk / handoff. Whether this data also survives in IndexedDB depends on the TanStack persister configuration, which is Area 7's scope. If persistence is enabled without a per-user key or sign-out purge, severity rises. Flagged for merge at consolidation.

### A1-05 — Better Auth OpenAPI /reference plugin registered with no environment gate
Severity: Low · Confidence: High (confirms PF-06)

Affected lines:
- packages/auth/src/config.ts:180-184 — plugins: [openAPI({ path: "/reference" })], unconditional
- apps/backend/src/config/auth.config.ts:64 — the separate /open-api route is gated by enableApiDocs
- apps/backend/src/config/auth.config.ts:25-35 — catch-all forwards all /api/v1/auth/* to the handler

Evidence. The repository is demonstrably careful about docs exposure: bootstrap.ts:61 computes apiDocsEnabled, and auth.config.spec.ts:120-130 proves /api/v1/auth/open-api is unreachable when the flag is false. The Better Auth openAPI plugin bypasses that control entirely — it is mounted inside the auth instance, so GET /api/v1/auth/reference is served in production regardless of ENABLE_API_DOCS.

Security impact. Discloses the complete authentication API surface — every endpoint, parameter, and schema — aiding reconnaissance. No user data is exposed.

Remediation. Make plugin registration conditional, e.g. plugins: [...(docsEnabled ? [openAPI({ path: "/reference" })] : [])], threading the flag through createAuth().

Verification. With ENABLE_API_DOCS=false, confirm GET /api/v1/auth/reference returns 404.

### A1-06 — Google provider registered unconditionally with credentials cast from undefined
Severity: Low · Confidence: High (confirms PF-05)

Affected lines — packages/auth/src/config.ts:31-32 (both .optional()), :164-170 (clientId: authEnv.GOOGLE_CLIENT_ID as string)

Evidence. The as string assertion launders string | undefined into string, defeating the optional typing. The provider is always registered, so /api/v1/auth/sign-in/social?provider=google exists even with no credentials configured. The UI reinforces this: social-login-buttons renders an always-enabled Google button.

Security impact. Availability and error-surface, not compromise: an unconfigured deployment produces a runtime OAuth failure whose message may expose provider-negotiation details. It silently degrades rather than failing closed — the exact "partially supplied optional config" case in the brief.

Remediation. Register the provider only when both variables are present, and cross-validate that they are supplied together.

### A1-07 — trustedOrigins parsed without trimming or empty-entry filtering
Severity: Low · Confidence: High (confirms PF-08)

Affected lines — packages/auth/src/config.ts:171; compare app.config.ts:29 (CORS, which trims but does not filter empties)

Evidence. authEnv.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? [] performs a bare split. A conventionally formatted value with spaces after commas yields entries like " http://localhost:3001"; a trailing comma yields "".

Security impact. Fails in the safe direction — a mistyped origin is not trusted, breaking CSRF-protected auth flows rather than weakening them. The concrete consequence is a hard-to-diagnose outage and the temptation to over-broaden the value. The adjacent CORS parser trims but does not drop empty strings, producing an empty-string entry in a credentials: true allowlist.

Remediation. .split(",").map(s => s.trim()).filter(Boolean) in both locations, plus URL-shape validation in the Zod schema. Cross-reference to the Transport phase for the CORS half; report the root cause once at consolidation.

### A1-08 — Cross-subdomain cookies enabled by mere presence of an unvalidated domain variable
Severity: Low · Confidence: Medium

Affected lines — packages/auth/src/config.ts:28 (.optional(), no format validation), :172-179; apps/backend/.env.example (BETTER_AUTH_COOKIE_DOMAIN=localhost)

Evidence. Setting any value flips crossSubDomainCookies.enabled = true and passes the string straight through as the cookie Domain. There is no validation that it is a hostname, no leading-dot normalization, and no check that it is not overly broad. The example ships a populated value, so the cross-subdomain path is the default-followed configuration.

Security impact. An operator who sets a broad apex domain (e.g. .example.com) scopes session cookies to every subdomain. Any subdomain takeover or XSS on an unrelated subdomain then reaches the session cookie. Better Auth also adjusts SameSite when cross-subdomain cookies are enabled, which interacts with CSRF posture.

Confidence note. The exact SameSite/Secure values Better Auth emits under crossSubDomainCookies were not verifiable from tracked files (node_modules absent). Confidence is Medium and the finding is scoped to the unvalidated widening, not a specific cookie-attribute claim.

Remediation. Validate the domain shape, leave the variable unset by default in .env.example, and document the subdomain trust implication.

### A1-09 — Reset and verification tokens travel in URL query strings
Severity: Low · Confidence: High

Affected lines — packages/auth/src/config.ts and :151; reset-password and verify-email pages

Evidence. Both flows build ?token=... URLs. The pages are server components that read searchParams and pass the token as a prop into a client component, so the token is also embedded in the RSC payload and initial HTML.

Security impact. Tokens land in browser history, may leak via Referer on any outbound link from those pages, and are candidates for service-worker or shared-cache storage. Bounded because these are single-use and short-lived by Better Auth default.

Note. This is the conventional pattern for emailed links and is not itself a defect. Recorded for the Area 6/7 caching and referrer-policy analysis rather than as an independent flaw.

### A1-10 — No explicit session lifetime, rotation, or password-change revocation configuration
Severity: Info · Confidence: Medium

packages/auth/src/config.ts contains no session block — no expiresIn, updateAge, or freshAge — and emailAndPassword (lines 147-163) sets no session-revocation-on-reset option. All behavior falls to Better Auth library defaults, which the repository does not pin. Per the audit rules this is not elevated — absence of an explicit setting is not a vulnerability. Recommended as defense-in-depth: pin these values so a library upgrade cannot silently change session lifetime.

### A1-11 — Auth middleware prefix-matches and swallows every /api/v1/auth* path
Severity: Info · Confidence: High

auth.config.ts:25-35 uses url.startsWith(path) and returns the handler without calling next(). A URL such as /api/v1/authfoo matches and is rewritten to /foo. No unintended handler is reached (Better Auth 404s), and auth.config.spec.ts:108-118 proves the /open-api route is registered before the catch-all, so ordering is correct. Recorded as an observation: any future NestJS controller mounted under a path beginning with auth would be silently unreachable. Recommend matching on path + "/" or exact prefix boundaries.

### A1-12 — Verification not required by default; account-linking behavior unpinned
Severity: Low · Confidence: Low

apps/backend/.env.example:63 sets EMAIL_VERIFICATION_REQUIRED=false, and packages/auth/src/config.ts defaults it to false, so requireEmailVerification (line 149) is off in the default posture — users sign in with unverified addresses. Separately, no account.accountLinking configuration exists, so linking behavior is the library default.

The classic risk is pre-verified-email takeover: registering with a victim's address, then the victim signing in with Google and being auto-linked. Whether this repository is exposed depends on Better Auth's default accountLinking.enabled and trustedProviders, which could not be confirmed from tracked files. Per the audit rules I am lowering confidence rather than speculating. Recommend explicitly configuring accountLinking and shipping EMAIL_VERIFICATION_REQUIRED=true in the example.

## Positive Assurance

| Check | Result | Evidence |
|-------|--------|----------|
| Boolean env parsing | Clean — notably strong. A custom parser rejects "yes", "on", "" and correctly maps "false"/"0" → false, explicitly avoiding the z.coerce.boolean() trap where "false" becomes true. Directly protects the verification-gating flags. | bool-schema.ts:17-20 + rationale at 3-15 |
| Anti-enumeration on forgot-password | Clean. Non-500 errors deliberately resolve into a neutral confirmation. | forgot-password.hooks.ts:13-28 |
| Anti-enumeration on resend-verification | Clean. "Already verified" and "unknown email" both resolve neutrally. | verify-email.hooks.ts:28-38 |
| Post-login redirect / open redirect | Clean. All navigation targets are hardcoded literals — router.push("/") after login and register, router.push("/login") after reset. No redirect/next/callbackURL query parameter is read anywhere in the auth feature. | login.hooks.ts:56, register.hooks.ts:33, reset-password.hooks.ts:24 |
| Auth docs route gating | Clean and tested. Four unit tests prove /open-api is served only when enabled and that registration order beats the catch-all. | auth.config.spec.ts:96-140 |
| Password hashing | Clean. No override of Better Auth's hashing; emailAndPassword sets no custom password.hash/verify. Library scrypt default retained. | config.ts:147-163 |
| Password length | Clean. Client enforces ≥ 8 (register.schema.ts:6); server retains Better Auth's default minimum since no override exists. Login uses min(1) for presence only — correct, not a strength check. | register.schema.ts:6, login.schema.ts:5 |
| Auth rate limiting present | Clean. Better Auth's own limiter is explicitly enabled (60s / 10 req) — necessary because auth routes short-circuit before the NestJS throttler. | config.ts:101-105; cross-ref Area 4 for shared-store analysis |
| Server-side session retrieval | Clean. cache: "no-store", forwards only the inbound cookie header, returns null on any failure. | auth-server.ts:16-36, cookie-utils.ts:8-11 |
| Client-side token storage | Clean. No localStorage/sessionStorage use in any auth module; the Better Auth client relies entirely on HttpOnly cookies. | auth-client.ts:11-13 |
| Middleware ordering | Clean and deliberately documented. trust-proxy → CORS → pino → Better Auth → body parser, each with an in-code rationale explaining why reordering breaks security or function. | bootstrap.ts:36-65 |
| Verification-email failure handling | Clean. Wraps transport errors and returns a sanitized message. (Its counterpart in the reset path is A1-03.) | config.ts:127-144 |
| Pino redaction of auth material | Clean for HTTP. Redacts authorization, cookie, set-cookie, and password body fields with remove: true. Gap is the console.log bypass in A1-02. | pino-logger.config.ts:35-44 |
| MFA | Not assessed — per instruction, absence is not reported. | — |

## Unresolved Coverage

1. node_modules is absent, so @thallesp/nestjs-better-auth and better-auth sources could not be read. The global-guard question was settled from authoritative upstream documentation plus in-repo corroboration (High confidence). Three items remain library-default-dependent and are held at reduced confidence: exact SameSite/Secure emission under crossSubDomainCookies (A1-08), default accountLinking semantics (A1-12), and default session expiresIn/rotation/reset-revocation (A1-10).

2. BETTER_AUTH_URL is not declared in either env validator or any .env.example, yet Better Auth typically derives cookie Secure behavior and OAuth callback URLs from a base URL. Whether it is inferred per-request or defaults could not be confirmed. Flagged for the Secrets & Environment phase as possible documented-vs-consumed drift.

3. Google OAuth callback/state handling is entirely library-internal — signIn.social({ provider: "google" }) at social-login-buttons.tsx:25-27 passes no callbackURL. No repository code influences state generation or callback validation, so no repository-remediable OAuth state finding exists. Open-redirect risk via callbackURL is N/A — the parameter is never supplied.

4. Apple and Meta social buttons are rendered but non-functional (social-login-buttons.tsx:32-58: onAppleClick/onMetaClick are undefined props with no fallback, and no corresponding provider is configured). Dead UI, not a security issue — noted so later phases do not mistake it for an unconfigured provider.

5. Login EMAIL_NOT_VERIFIED branch (login.hooks.ts:26-34) may constitute a verification-status oracle depending on whether Better Auth performs that check before or after password validation. Unverifiable without library source; recorded at Low confidence, not raised as a finding.

## Summary

One High, three Medium, five Low, two Info. No Critical. The single High (A1-01) is the checked-in working auth secret combined with presence-only validation. The strongest theme across the Mediums is mailer fail-open behavior — A1-02 and A1-03 share the pattern of email infrastructure degrading silently instead of failing closed, and together they undermine both token confidentiality and the anti-enumeration design the code explicitly claims to implement.

The area also shows genuinely careful engineering worth crediting: the custom boolean env parser, the tested docs-gating logic, the documented middleware ordering, and the deliberate anti-enumeration client handling.

Ready for Areas 2 and 3 — Authorization, RBAC, IDOR, Contracts, Validation and Injection, which inherits confirmed PF-02 and PF-03 plus the now-settled global-guard baseline.
