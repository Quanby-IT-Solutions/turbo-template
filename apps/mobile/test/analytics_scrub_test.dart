import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/services/analytics/analytics_service.dart';

/// The property scrub every PostHog event passes through before it is sent.
///
/// Uses the same deny-list as Sentry and the backend logger
/// (`kRedactedFieldNames`), at the same depth as the backend's `req.body.*`
/// rule: the top level and one level down.
void main() {
  test('drops deny-listed keys', () {
    expect(scrubAnalyticsProperties({'email': 'a@b.c', 'screen': 'home'}), {
      'screen': 'home',
    });
  });

  test('matches case-insensitively', () {
    expect(scrubAnalyticsProperties({'Authorization': 'x'}), isEmpty);
  });

  test('drops nested deny-listed keys', () {
    expect(
      scrubAnalyticsProperties({
        'form': {'email': 'a', 'step': 2},
      }),
      {
        'form': {'step': 2},
      },
    );
  });

  test('drops nested deny-listed keys whatever the map is typed as', () {
    // Maps decoded from JSON or built by plugins are Map<String, dynamic>,
    // which is not a Map<String, Object>; the scrub must not skip them.
    final Map<String, dynamic> form = {'password': 'x', 'step': 2};
    expect(scrubAnalyticsProperties({'form': form}), {
      'form': {'step': 2},
    });
  });

  test('leaves deeper levels alone', () {
    final deep = {
      'a': {
        'b': {'email': 'x'},
      },
    };
    expect(scrubAnalyticsProperties(deep), deep);
  });

  test('keeps the user id', () {
    expect(scrubAnalyticsProperties({'distinct_id': 'u1'}), {
      'distinct_id': 'u1',
    });
  });
}
