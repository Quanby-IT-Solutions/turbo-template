import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/analytics/analytics_identity_marker.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// When PostHog's identity is reset or set, the mobile twin of the web's
/// `syncAnalyticsIdentity`.
///
/// The auth provider reports every signed-out outcome (a launch with no
/// session, a failed sign-in, sign-out) as `null`. A PostHog reset mints a new
/// anonymous id, so resetting on each of them split one anonymous visitor into
/// several. The marker remembers which user this device last identified as,
/// so only a device that was identified is reset.
void main() {
  /// PostHog calls in order: `reset`, or `identify:<id>`.
  final calls = <String>[];

  Future<AnalyticsIdentityMarker> markerWith(Map<String, Object> stored) async {
    SharedPreferences.setMockInitialValues(stored);
    return AnalyticsIdentityMarker(await SharedPreferences.getInstance());
  }

  void sync(AnalyticsIdentityMarker marker, String? userId) => marker.sync(
    userId,
    reset: () => calls.add('reset'),
    identify: (id) => calls.add('identify:$id'),
  );

  setUp(calls.clear);

  test(
    'a signed-out launch on an anonymous device leaves the id alone',
    () async {
      final marker = await markerWith({});

      sync(marker, null);

      expect(calls, isEmpty);
    },
  );

  test(
    'repeated signed-out outcomes never reset an anonymous device',
    () async {
      // Launch with no session, then two failed sign-ins.
      final marker = await markerWith({});

      sync(marker, null);
      sync(marker, null);
      sync(marker, null);

      expect(calls, isEmpty);
    },
  );

  test('sign-in identifies and remembers the user', () async {
    final marker = await markerWith({});

    sync(marker, 'u1');

    expect(calls, ['identify:u1']);
    expect(marker.identifiedUserId, 'u1');
  });

  test('a restored session for the same user does nothing', () async {
    final marker = await markerWith({AnalyticsIdentityMarker.key: 'u1'});

    sync(marker, 'u1');

    expect(calls, isEmpty);
  });

  test('sign-out resets once and forgets the user', () async {
    final marker = await markerWith({AnalyticsIdentityMarker.key: 'u1'});

    sync(marker, null);
    sync(marker, null); // a failed sign-in afterwards

    expect(calls, ['reset']);
    expect(marker.identifiedUserId, isNull);
  });

  test('a launch with an expired session resets the previous user', () async {
    // The marker survived the restart; the session did not.
    final marker = await markerWith({AnalyticsIdentityMarker.key: 'u1'});

    sync(marker, null);

    expect(calls, ['reset']);
  });

  test('a different user resets first, so the two are never merged', () async {
    final marker = await markerWith({AnalyticsIdentityMarker.key: 'u1'});

    sync(marker, 'u2');

    expect(calls, ['reset', 'identify:u2']);
    expect(marker.identifiedUserId, 'u2');
  });

  test('the PostHog sink goes through the marker', () {
    // PosthogConstants is compile-time disabled under `flutter test`, so the
    // sink's PostHog calls cannot run here; this guards the wiring.
    final source = File(
      'lib/features/auth/presentation/providers/auth_provider.dart',
    ).readAsStringSync();

    expect(source, contains('marker.sync('));
  });
}
