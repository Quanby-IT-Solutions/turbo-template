import 'package:flutter/foundation.dart';
import 'package:mobile/core/constants/posthog_constants.dart';
import 'package:mobile/core/constants/redacted_fields.dart';
import 'package:posthog_flutter/posthog_flutter.dart';

final Set<String> _deniedKeys =
    kRedactedFieldNames.map((name) => name.toLowerCase()).toSet();

bool _isDenied(String key) => _deniedKeys.contains(key.trim().toLowerCase());

/// Drops every deny-listed key from an event's properties, at the top level
/// and one level down.
///
/// Same list as Sentry's `_scrubEvent` and the backend logger
/// ([kRedactedFieldNames], kept in parity with `@repo/observability`), and the
/// same depth as the backend's `req.body.*` rule. Nothing the app captures
/// today should carry one of these keys, which is why it is cheap to run on
/// every event: it is the guard for whatever gets captured later.
Map<String, Object> scrubAnalyticsProperties(Map<String, Object> properties) {
  final result = <String, Object>{};
  for (final entry in properties.entries) {
    if (_isDenied(entry.key)) continue;
    final value = entry.value;
    if (value is Map<String, Object>) {
      result[entry.key] = <String, Object>{
        for (final inner in value.entries)
          if (!_isDenied(inner.key)) inner.key: inner.value,
      };
    } else {
      result[entry.key] = value;
    }
  }
  return result;
}

/// PostHog start-up, called from `_bootstrap()` only when
/// [PosthogConstants.isEnabled].
class AnalyticsService {
  AnalyticsService._();

  static Future<void> setup() async {
    final config = PostHogConfig(PosthogConstants.projectToken)
      ..host = PosthogConstants.host
      // A person profile only once someone signs in (AnalyticsIdentity), so
      // anonymous use stays anonymous.
      ..personProfiles = PostHogPersonProfiles.identifiedOnly
      // Deliberately off, for the same reason Sentry's screenshots are: a
      // replay records whatever was on screen, sessions and form fields
      // included.
      ..sessionReplay = false
      // Surveys render UI that is defined in the PostHog dashboard. A
      // template should not show server-driven screens nobody chose to ship.
      ..surveys = false
      // The app's notifications are local (awesome_notifications); nothing
      // here registers a push token with PostHog or reports notification taps.
      ..capturePushNotificationSubscriptions = false
      ..capturePushNotificationOpened = false
      ..debug = kDebugMode;

    config.beforeSend.add((event) {
      final properties = event.properties;
      if (properties != null) {
        event.properties = scrubAnalyticsProperties(properties);
      }
      return event;
    });

    await Posthog().setup(config);
  }
}
