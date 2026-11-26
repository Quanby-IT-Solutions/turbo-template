---
name: mobile-store-release
description: App Store and Google Play submission requirements for apps/mobile. Use when preparing a release, editing the iOS privacy manifest or Play Data Safety answers, adding an SDK that collects data, answering App Store Connect privacy questions, or diagnosing a store rejection. Triggers on tasks involving PrivacyInfo.xcprivacy, ITMS-91053, Data Safety, ATT, account deletion, store metadata, or release signing.
frameworks:
  - flutter
  - sentry
  - posthog
languages:
  - dart
  - swift
category: release
updated: 2026-11-25
---

# Mobile Store Release (`apps/mobile`)

Scope is narrow on purpose: the rules that actually bind *this* app, given
what it ships. For anything outside that, read the platform guideline rather
than generalising from this file.

## Quick Reference

| Concern                | Where it lives                                      | Status |
| ---------------------- | --------------------------------------------------- | ------ |
| iOS privacy manifest   | `ios/Runner/PrivacyInfo.xcprivacy`                  | Done   |
| Manifest wired to target | `ios/Runner.xcodeproj` → Runner → Resources       | Done   |
| Manifest regression guard | `test/privacy_manifest_test.dart`                  | Done   |
| Play Data Safety form  | Play Console (no repo artifact)                     | Answers below |
| Account deletion (iOS/Android) | `features/profile/.../delete_account_tile.dart` | Done   |
| Account deletion (web) | `apps/web` — **not built**                          | Gap    |
| Privacy policy page    | `apps/web/features/legal/privacy-policy.tsx`        | Needs fill-in |
| ATT prompt             | Not needed while `NSPrivacyTracking` is `false`     | N/A |
| Release pipeline       | No fastlane, no `deploy-mobile.yml`                 | Missing |

## What This App Collects

Everything below follows from four files. Read them before changing any
declaration, because the declarations are derived from them, not chosen:

- `lib/main.dart` — Sentry options (`sendDefaultPii = false`,
  `attachScreenshot = false`, `attachViewHierarchy = false`,
  `tracesSampleRate = 0.0`, `enableAutoSessionTracking = true`)
- `lib/services/analytics/analytics_service.dart` — PostHog config
  (`personProfiles = identifiedOnly`, `sessionReplay = false`, `surveys = false`)
- `lib/features/auth/presentation/providers/auth_provider.dart` — identity:
  `SentryUser(id:)` and `Posthog().identify(userId:)`
- `lib/features/auth/data/auth_repository.dart` — email, password, name to
  the app's own backend

| Data | Source | Linked to user? | Why |
| ---- | ------ | --------------- | --- |
| Email address, name | Better Auth sign-up/sign-in | Yes | Account creation |
| User ID | Both SDKs, post sign-in | Yes | Crash/event correlation |
| Crash, performance, other diagnostic | Sentry | Yes | Release health |
| Product interaction, other usage | PostHog | Yes | Analytics, feature flags |

**Both SDKs are opt-in at build time.** `SentryConstants.isEnabled` and
`PosthogConstants.isEnabled` are compile-time constants that are `false`
unless the build passes `--dart-define`. A build with no defines collects
none of the diagnostics or usage rows above.

That does *not* mean you may omit them from the manifest. One manifest ships
for every configuration, and the release builds that reach App Store Connect
do supply the defines. Declare the enabled case. Under-declaring is what
earns `ITMS-91053`; declaring a row a particular build does not exercise
costs nothing.

## The Linked Rule (the one SDK manifests get wrong for you)

Every third-party manifest in the dependency tree declares
`NSPrivacyCollectedDataTypeLinked = false`, because an SDK cannot know
whether its host app identifies users. This app identifies users — signing in
sets a Sentry user and a PostHog person to the backend's user id.

So `ios/Runner/PrivacyInfo.xcprivacy` declares `Linked = true` where
`posthog_flutter`'s own manifest declares `false`. That divergence is
deliberate. When an SDK manifest and the app manifest disagree, **the app
manifest is the one describing reality** and must be the stricter of the two.

Only the id is ever sent. Email and name are on `kRedactedFieldNames` and are
stripped by `_scrubEvent` and `scrubAnalyticsProperties`. But an id that
identifies an account is exactly what Apple means by "linked", so `true` is
the honest answer.

## Manifest Aggregation

The Podfile uses `use_frameworks!`, so pods are **dynamically** linked and
Apple aggregates each pod's bundled manifest automatically. Known contributors:

| Package | Ships a manifest? | Declares |
| ------- | ----------------- | -------- |
| `Sentry/HybridSDK` (pod, 8.58.4) | Yes | UserDefaults `CA92.1`, SystemBootTime `35F9.1`, FileTimestamp `C617.1` |
| `sentry_flutter` (pub) | **No** | — (the pod above carries it) |
| `posthog_flutter` | Yes | ProductInteraction, OtherUsageData, UserDefaults `CA92.1` |
| `shared_preferences_foundation` | Yes | UserDefaults `1C8F.1` (App Group only) |
| `flutter_secure_storage_darwin` | Yes | — (Keychain is not a required-reason API) |

Two consequences worth remembering:

1. The app's own `UserDefaults CA92.1` is **not** redundant with
   `shared_preferences_foundation`. That plugin declares `1C8F.1`, the App
   Group case, which does not cover defaults exclusive to this app.
2. Switching the Podfile to `:linkage => :static` stops the aggregation and
   makes the app manifest solely responsible. The app manifest already
   declares Sentry's three APIs for exactly this reason — it is the change
   nobody remembers to re-audit.

Verify the aggregate rather than trusting this table:

```bash
# Archive, then: Xcode → Organizer → right-click archive →
#   Generate Privacy Report
# Or inspect what a pod actually ships:
find ~/.pub-cache -name "*.xcprivacy"
find apps/mobile/ios/Pods -name "*.xcprivacy"
```

## When To Change The Manifest

| Change | Manifest edit required |
| ------ | ---------------------- |
| Raise `tracesSampleRate` above 0 | `PerformanceData` must stay declared |
| Enable `sessionReplay` or `attachScreenshot` | Screen content becomes collected — expect new data types and a privacy-policy update |
| Set `sendDefaultPii = true` | IP address becomes collected; add it and re-answer App Store Connect |
| Add any ad / attribution SDK | `NSPrivacyTracking` → `true`, list its domains in `NSPrivacyTrackingDomains`, add `DeviceID`, and present the ATT prompt |
| Read IDFA/IDFV | Same as above |
| Add an SDK that reads disk space or active keyboards | New `NSPrivacyAccessedAPITypes` entry with a code from Apple's closed list |
| Bump `Sentry/HybridSDK` | Re-check its manifest; the reason codes track the pod |

`NSPrivacyTrackingDomains` must stay empty while `NSPrivacyTracking` is
`false` — a non-empty list with tracking off is rejected as contradictory.
Sentry's and PostHog's ingest hosts are not tracking domains; they receive
the app's own diagnostics, not cross-app activity.

## Play Data Safety Answers

Play has no repo artifact — the form lives in Play Console and must match the
manifest. For this app as it stands:

- **Data collected:** Email address, Name, User IDs, Crash logs,
  Diagnostics, App interactions
- **Collected, not shared** — Sentry and PostHog are processors, not
  recipients that get to use the data for their own purposes
- **Linked to identity:** yes, for all of the above
- **Encrypted in transit:** yes — `android:usesCleartextTraffic="false"`
- **Deletion request route:** must exist; see the blocker below
- **Optional vs required:** diagnostics and analytics are *required* as the
  app is built today, because there is no in-app opt-out. Adding a consent
  toggle changes this answer to optional and is the better product choice.

## Account Deletion

Built, because App Store Review Guideline 5.1.1(v) requires an app offering
account creation to offer deletion from inside the app. The flow:

| Layer | What it does |
| ----- | ------------ |
| `@repo/auth` `config.ts` | `user.deleteUser.enabled: true` — the route 404s without it |
| `POST /api/v1/auth/delete-user` | Better Auth's own endpoint; no oRPC contract or controller needed |
| `@repo/db` `deleteOrphanedUserRows` | Runs in `afterDelete`, clears the two tables no FK reaches |
| `AuthRepository.deleteAccount` | Sends the password, classifies refusals, purges the device **on success only** |
| `AuthState.deleteAccount` | Clears the Sentry and PostHog identity, drops to signed out |
| `DeleteAccountTile` | Profile → Danger Zone, destructive dialog requiring the password |

Four decisions worth not reversing by accident:

- **`sendDeleteAccountVerification` is deliberately unset.** With it,
  `POST /delete-user` mails a link and answers "Verification email sent"
  *without deleting* — the user must leave the app to finish, which is the
  flow Apple rejects. Identity is proven in-band instead.
- **`session.freshAge` is pinned.** A Google-only account has no password to
  check, so Better Auth falls back to session freshness. Setting `freshAge: 0`
  would let any live session delete the account with no proof at all.
- **The device purge is not in a `finally`.** Sign-out purges unconditionally
  because it always succeeds locally; a *refused* delete must leave the user
  signed in to the account that still exists. `delete_account_test.dart`
  asserts the session cookie survives a wrong password.
- **The identity is cleared after the call, not before.** The inverse of
  sign-out, and for the same privacy reason in reverse: a mistyped password
  must not detach a still-signed-in user from their own crash reports.

Deletion writes no `audit_log` entry. `audit_log` has one enforcement point —
the backend's audit service — and `@repo/auth` cannot reach it without
duplicating the insert its append-only rule depends on.

**Remaining gap:** the web app has no deletion UI. Apple's requirement is
satisfied by the mobile flow, and the privacy policy currently routes web
users to email, but a client that can create an account and not delete it is
a weak answer under GDPR erasure. It needs the same dialog over
`authClient.deleteUser({ password })` on `app/(site)/(protected)/account`.

## Privacy Policy

Lives at `apps/web/features/legal/privacy-policy.tsx`, served from
`/privacy`, public and unauthenticated because store reviewers open it
straight from the listing metadata.

Its content is derived from the code, not from a template: the collected-data
table mirrors the privacy manifest, and the "what we deliberately do not do"
section states the things that are off by configuration (session replay,
screenshots, cross-app tracking, IP collection).

**It is not ready to publish.** Every `[BRACKETED]` value is a placeholder —
company name, hosting regions, retention windows, regulator, contact address —
and the result needs a read by whoever owns legal. The brackets are
conspicuous so the page cannot ship half-finished. Once filled in, paste the
URL into App Store Connect and the Play listing; a policy URL that 404s is a
rejection on its own.

Still worth closing before release, in rough order of review risk:

- `SentryConstants.appVersion` / `buildNumber` are hand-mirrored from
  `pubspec.yaml`. A version bump that misses them mislabels every release in
  Sentry. Check both on each bump.
- No signing config, no fastlane, no `deploy-mobile.yml`. Releases are
  manual today; builds must carry the `--dart-define` set or ship with
  telemetry silently off.
- `NotificationService.requestPermissionIfNeeded()` fires on first launch.
  Both stores prefer permission prompts tied to a user action with
  preceding context — an unexplained cold-start prompt draws review comments.

## Common Rejections Mapped To This Codebase

| Code / reason | Cause here | Fix |
| ------------- | ---------- | --- |
| `ITMS-91053` Missing API declaration | A new pod reads a required-reason API | Add the category + an approved code; regenerate the privacy report |
| `ITMS-91054` Invalid reason | Reason code not on Apple's closed list for that category | Use only documented codes — they are per-category, not interchangeable |
| Guideline 5.1.1(v) | In-app account deletion missing or mail-gated | Keep `sendDeleteAccountVerification` unset; see above |
| Guideline 5.1.1 | Privacy policy missing, unreachable, or still full of `[BRACKETS]` | Fill in `/privacy` and paste the URL into both listings |
| Guideline 5.1.2 | Manifest and App Store Connect answers disagree | Re-answer the questionnaire from the manifest, not from memory |
| Play Data Safety mismatch | Form says less than the app sends | Re-derive the form from the table above |
| Guideline 2.1 (incomplete) | Reviewer cannot sign in | Supply a demo account in App Review notes |

## Pre-Submission Commands

```bash
# Manifest is valid plist and says what you think it says
plutil -lint apps/mobile/ios/Runner/PrivacyInfo.xcprivacy
plutil -convert json -o - apps/mobile/ios/Runner/PrivacyInfo.xcprivacy

# Manifest is actually in the Runner target's Resources phase.
# A manifest in the repo but not in the build phase is invisible to Apple.
grep -c "PrivacyInfo.xcprivacy in Resources" \
  apps/mobile/ios/Runner.xcodeproj/project.pbxproj   # expect 2

# Deletion must stay wired end to end
grep -rn "deleteUser" packages/auth/src/config.ts        # expect enabled: true
grep -c "sendDeleteAccountVerification" packages/auth/src/config.ts  # expect 1 (the comment saying why not)
grep -rn "BRACKETED\|\[COMPANY LEGAL NAME\]" apps/web/features/legal/  # expect none before launch

pnpm --filter mobile test
pnpm --filter @repo/db test
cd apps/mobile && flutter analyze

# Release builds must pass the defines, or telemetry ships off
flutter build ipa --release \
  --dart-define=SENTRY_ENABLED=true \
  --dart-define=SENTRY_DSN=... \
  --dart-define=SENTRY_ENVIRONMENT=production \
  --dart-define=POSTHOG_ENABLED=true \
  --dart-define=POSTHOG_PROJECT_TOKEN=... \
  --dart-define=POSTHOG_HOST=https://eu.i.posthog.com
```

## See Also

- `observability-sentry` — how the dual-gate `SENTRY_ENABLED` + DSN rule works
  and where the shared redaction policy lives. That skill covers *how* telemetry
  is wired; this one covers *what you must declare* because of it.
- `test/privacy_manifest_test.dart` — the guard. It fails if the manifest leaves
  the Resources phase, if a `Linked` flag drifts, if a reason code is not on
  Apple's list, or if a privacy-relevant Sentry/PostHog option is flipped on
  without the manifest following.
- `test/auth_hardening_test.dart` — the Android release-signing and manifest
  hardening equivalents.
- `test/delete_account_test.dart` — what the delete request sends, how each
  refusal is classified, and that a refused delete leaves the session cookie
  on disk.
- `packages/db/src/orphaned-user-rows.spec.ts` — the two tables no foreign key
  reaches, and that each delete stays scoped to one user.
- `better-auth` skill — note it documents Better Auth 1.4.x; the installed
  version is 1.7.15, and `deleteUser` is a 1.7 surface.

## References

- [Describing use of required reason API](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api)
- [Describing data use in privacy manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests)
- [Apple third-party SDK requirements](https://developer.apple.com/support/third-party-SDK-requirements/) — neither Sentry nor PostHog is on this list, so neither needs a bundled signature
- [Sentry's Apple privacy manifest guidance](https://docs.sentry.io/platforms/apple/data-management/apple-privacy-manifest/)
- [Play Data safety](https://support.google.com/googleplay/android-developer/answer/10787469)
