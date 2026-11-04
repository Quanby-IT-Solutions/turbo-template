import 'package:flutter/foundation.dart';

/// PostHog configuration, resolved from build-time configuration.
///
/// Same rule as [SentryConstants] and ApiConstants: nothing arrives from a
/// bundled `.env` asset, because a Flutter asset ships inside the APK in
/// cleartext. Every value below is compiled in via `--dart-define`:
///
/// ```bash
/// flutter run \
///   --dart-define=POSTHOG_ENABLED=true \
///   --dart-define=POSTHOG_PROJECT_TOKEN=phc_<project token> \
///   --dart-define=POSTHOG_HOST=https://eu.i.posthog.com
/// ```
///
/// A build that supplies none of these is the app that existed before PostHog
/// was added: [isEnabled] is `false`, so the SDK is never set up, no observer
/// is added, no network call is made, and every feature flag reads as off.
/// The native SDK's own start-up from AndroidManifest is switched off
/// (`com.posthog.posthog.AUTO_INIT=false`), so this flag is the only switch.
class PosthogConstants {
  PosthogConstants._();

  /// Raw compile-time project token. Empty when the define was not supplied.
  static const String _projectToken = String.fromEnvironment(
    'POSTHOG_PROJECT_TOKEN',
  );

  /// Opt-in switch. Defaults to `false` so the absence of build flags means
  /// "off" rather than "half-configured".
  static const bool _enabledFlag = bool.fromEnvironment(
    'POSTHOG_ENABLED',
    defaultValue: false,
  );

  /// Ingestion host: `https://us.i.posthog.com` or `https://eu.i.posthog.com`,
  /// matching the region the PostHog project was created in.
  static const String host = String.fromEnvironment(
    'POSTHOG_HOST',
    defaultValue: 'https://us.i.posthog.com',
  );

  /// Both the flag **and** a non-empty token are required, for the same reason
  /// as [SentryConstants.isEnabled]: either one alone is a misconfiguration,
  /// and requiring both makes "enabled" a single deliberate decision.
  static bool get isEnabled =>
      resolveEnabled(flag: _enabledFlag, token: _projectToken);

  /// The rule behind [isEnabled], separated so it can be tested without
  /// `--dart-define` values.
  @visibleForTesting
  static bool resolveEnabled({required bool flag, required String token}) =>
      flag && token.isNotEmpty;

  /// The project token.
  ///
  /// PostHog designs this as a public, write-only ingestion key: it ships in
  /// every web page and app that uses PostHog, and it cannot read data back.
  /// It is still never logged or printed, so a build log never becomes the
  /// place someone copies it from.
  static String get projectToken => _projectToken;
}
