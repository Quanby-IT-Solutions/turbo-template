/// Sentry configuration, resolved from build-time configuration.
///
/// Follows the same rule as [ApiConstants]: nothing arrives from a bundled
/// `.env` asset, because a Flutter asset ships inside the APK in cleartext and
/// is readable by unzipping it. Every value below is compiled in via
/// `--dart-define`:
///
/// ```bash
/// flutter build apk --release \
///   --dart-define=SENTRY_ENABLED=true \
///   --dart-define=SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project> \
///   --dart-define=SENTRY_ENVIRONMENT=production
/// ```
///
/// A build that supplies none of these is byte-for-byte the app that existed
/// before Sentry was added: [isEnabled] is `false`, so the SDK is never
/// initialised and no observer, integration, or network call is added.
class SentryConstants {
  SentryConstants._();

  /// Raw compile-time DSN. Empty when the define was not supplied.
  static const String _dsn = String.fromEnvironment('SENTRY_DSN');

  /// Opt-in switch. Defaults to `false` so the absence of build flags means
  /// "off" rather than "half-configured".
  static const bool _enabledFlag =
      bool.fromEnvironment('SENTRY_ENABLED', defaultValue: false);

  /// Deployment environment tag attached to every event.
  static const String environment =
      String.fromEnvironment('SENTRY_ENVIRONMENT', defaultValue: 'development');

  /// App version, mirrored from `pubspec.yaml`'s `version:` field.
  ///
  /// The app deliberately carries no `package_info_plus` dependency, and Dart
  /// cannot read `pubspec.yaml` at runtime, so this is a manually mirrored
  /// constant. **Keep these two values in sync with `pubspec.yaml` whenever the
  /// version is bumped** — a stale value only mislabels a release tag, it does
  /// not break anything, which is exactly why it is easy to forget.
  static const String appVersion = '1.0.0';

  /// Build number, mirrored from the `+N` suffix of `pubspec.yaml`'s `version:`.
  static const String buildNumber = '1';

  /// Both the flag **and** a non-empty DSN are required.
  ///
  /// Either one alone is a misconfiguration: a flag with no DSN would have the
  /// SDK initialise into a void, and a DSN with no flag would start reporting
  /// from a build that never asked to. Requiring both makes "enabled" a single
  /// deliberate decision.
  static bool get isEnabled => _enabledFlag && _dsn.isNotEmpty;

  /// The ingest DSN.
  ///
  /// This value must never be logged, printed, or interpolated into a message.
  /// It is a write credential for the project's event stream.
  static String get dsn => _dsn;

  /// Release identifier events are grouped under, e.g. `mobile@1.0.0+1`.
  static String get release => 'mobile@$appVersion+$buildNumber';
}
