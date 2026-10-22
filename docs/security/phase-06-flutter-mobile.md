> These records are summarised for a public repo. They keep what was found, what changed, and where, without internal finding ids or step-by-step misuse.

# Phase 6 — Area 8: Flutter Mobile Security

Status: Complete. Mode: READ-ONLY. No file created, modified, deleted, or formatted. No pub get, builds, or code generation. Certificate pinning not required per instruction.

## Findings

### Session tokens and cookies written to device logs on every auth call
Severity: High · Confidence: High

Affected: auth_repository.dart signIn/signUp/getSession all log data=${response.data}; raw body logged when undecoded string; debugPrint of notification payload.

Evidence. Sign-in, sign-up, and session reads in `auth_repository.dart` write the full response body, including the session credential and account fields, with no debug-only gate. That log is not removed from release builds. The rule is: release logs contain status only, never the response body.

Consequence. The evidence and impact above record what was found and where. This public summary does not repeat a step-by-step path.

Root cause. Debug instrumentation left in shared template with no release-build gate.

Remediation. if (kDebugMode) { developer.log(... status only ...); } — never response.data. Consider lint rule or redacting wrapper.

Verification. A release build's device log contains no token or email.

### Session cookie duplicated into secure storage, then re-injected across every request
Severity: Medium · Confidence: Medium

Three parallel copies: PersistCookieJar on disk, auth_cookie in secure storage, session_token in secure storage. Custom interceptor redundant with CookieManager. Two defects: (1) malformed re-serialisation — joins full Set-Cookie headers including attributes into Cookie request header; (2) no domain/path scoping — attached to every request the Dio instance makes.

Impact. Defence-in-depth erosion. PersistCookieJar is inside app sandbox; allowBackup defaults true so cookie jar and SharedPreferences are backup-eligible, whereas flutter_secure_storage is not.

Remediation. Delete the manual cookie interceptor; rely on CookieManager.

### Cleartext HTTP is enabled app-wide and the default base URL is non-TLS
Severity: Medium · Confidence: High (confirms the cleartext mobile default URL)

android:usesCleartextTraffic="true" on <application> in release manifest (src/main/), not debug-only. No network_security_config.xml. Fallback 'http://10.0.2.2:3000/api' when API_BASE_URL unset. .env.example also http.

Impact. A release build permits plaintext to any host, so a session cookie can travel without TLS when the base URL is not HTTPS. Medium because it applies only when a deployment is configured with a non-TLS URL.

Remediation. Remove usesCleartextTraffic from src/main/; add to src/debug/ only or network_security_config with 10.0.2.2 exception. Fail loudly rather than defaulting to cleartext.

### .env bundled as a Flutter asset
Severity: Low · Confidence: High (shared root cause with Secrets phase)

pubspec.yaml assets: - .env. Flutter assets packaged into APK/IPA in cleartext, extractable with unzip. Currently benign (only API_BASE_URL, API_VERSION). Structural risk for downstream developers adding API keys. apps/mobile/.gitignore does not list .env (root does).

Remediation. Warning comment in .env.example; prefer --dart-define.

### Sign-out clears secure storage but not the persistent cookie jar
Severity: Low · Confidence: High (answers Sign-out invalidates only the session query, leaving other authenticated data cached → Authenticated data persists to IndexedDB under one shared key and is never cleared on sign-out handoff)

deleteSessionToken() + deleteCookie() only. PersistCookieJar is local unexposed variable. clearAll() exists but never called. On-disk cookies at ${appDocDir}/.cookies/ left intact.

Comparison with web gap: Mobile sign-out is meaningfully better than web — clears both secure-storage keys and resets Riverpod state; residual is invalidated cookie files only (vs web's 24h of PII incl. all user emails). Backend has invalidated the session server-side.

Remediation. Expose CookieJar via Riverpod provider; cookieJar.deleteAll() in signOut().

### Release builds are signed with the debug keystore
Severity: Low · Confidence: High

release { signingConfig = signingConfigs.getByName("debug") } with TODO. applicationId = "com.example.mobile" remains scaffold default.

Remediation. Real signing config from CI secrets; unique application ID.

### Raw backend error bodies surfaced directly in the UI
Severity: Low · Confidence: Medium

Non-Dio exceptions render error.toString(); Dio connection failures embed full request URL including host/port. Cross-ref Health endpoint leaks environment, version, uptime, and raw database errors (backend filter is controlled for most cases).

Remediation. Map exceptions to fixed user-facing strings.

### Password minimum is weaker on mobile than on web
Severity: Low · Confidence: High

Mobile ≥ 6 chars; web ≥ 8. Client-side only — Better Auth server minimum governs — but inconsistent contracts.

Remediation. Align both clients on server-side minimum.

### Exact-alarm and boot-completed permissions requested but unused
Severity: Info · Confidence: High

SCHEDULE_EXACT_ALARM and RECEIVE_BOOT_COMPLETED declared; notification service only creates notifications, no scheduling. SCHEDULE_EXACT_ALARM triggers Play Store policy review. Recommend removing until implemented.

### No FLAG_SECURE; notification payloads are non-sensitive
Severity: Info · Confidence: High

No FLAG_SECURE — screenshots/app-switcher can capture authenticated screens. Per audit rules not elevated. Notification content is developer-supplied; no user data/tokens in notifications — lock-screen privacy clean.

## Positive Assurance

TLS certificate validation intact (zero badCertificateCallback/HttpOverrides). Certificate pinning N/A. No Dio LogInterceptor. Only one debugPrint (non-sensitive). Session token storage uses correct primitive (flutter_secure_storage). SharedPreferences hygiene (theme/onboarding only). Deep links/OAuth callback N/A (only MAIN/LAUNCHER). Exported components clean (only MainActivity). Redirect handling clean. Network timeouts explicit 10s. CSRF Origin header well-reasoned interoperability fix. Auth-state fail-closed. Sign-out resilience (local deletion in finally). Generated-code provenance clean. Serialization/server-owned fields clean (read-only DTOs, explicit request maps). Response parsing safety. Backup observation: allowBackup defaults true. iOS N/A — untracked.

## Flutter Vulnerability-Database Statement

No reliable Flutter/Dart vulnerability database was consulted in this phase. Package-version advisory analysis against pubspec.lock is scoped to Areas 11/12. Dart has no first-party npm audit equivalent; OSV.dev Pub feed has thinner coverage. Dependencies phase should state this limitation explicitly.

## Unresolved Coverage

1. No iOS project tracked — ATS, Keychain accessibility N/A.
2. flutter_secure_storage v10 Android defaults not verifiable.
3. awesome_notifications manifest merging not verifiable.
4. dart:developer log() release behaviour asserted as not stripped (documented Dart behaviour).
5. app.dart, todos_repository.dart, remaining screens sampled via grep — residual risk low but non-zero.
6. analyze.txt / analyze_output.txt tracked tool output — flagged for Areas 11/12.

## Summary

One High, two Medium, five Low, two Info. The High (Session tokens and cookies written to device logs on every auth call) is unambiguous and cheaply fixed: three call sites log the full authentication response — session token, email, user id — with no release-build gate, defeating otherwise-correct use of flutter_secure_storage.

Recurring theme: template scaffolding left in place (debug logging, usesCleartextTraffic in release, debug-keystore signing, com.example.mobile, unused alarm permissions). Mobile sign-out is better than web, not worse — does not exhibit the cross-user data-retention problem of Authenticated data persists to IndexedDB under one shared key and is never cleared on sign-out.

Ready for Areas 9 and 10 — Data Protection, Logging, Database Integrity, Secrets and Environment.
