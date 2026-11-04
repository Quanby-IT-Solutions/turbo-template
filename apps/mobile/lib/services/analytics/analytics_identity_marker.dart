import 'package:shared_preferences/shared_preferences.dart';

/// Which user this device last identified as in PostHog, or `null` when it is
/// anonymous. The mobile twin of the web's `analytics-identified` marker.
///
/// PostHog keeps its own identity across launches; this is how the app knows
/// whether that identity belongs to a signed-in user. A reset mints a new
/// anonymous id, so it may only run on a device that was identified: resetting
/// on every signed-out outcome (a launch with no session, a failed sign-in)
/// split one anonymous visitor into several.
class AnalyticsIdentityMarker {
  AnalyticsIdentityMarker(this._prefs);

  final SharedPreferences _prefs;

  static const key = 'analytics-identified';

  String? get identifiedUserId => _prefs.getString(key);

  /// Makes PostHog's identity match [userId].
  ///
  /// Same rule as the web: a different user resets first, then identifies, so
  /// two users are never merged; a signed-out outcome resets once if this
  /// device was identified. Synchronous up to the PostHog calls, because
  /// sign-out must reset before the router records the next screen.
  void sync(
    String? userId, {
    required void Function() reset,
    required void Function(String userId) identify,
  }) {
    final identified = identifiedUserId;
    if (userId == identified) return;

    if (identified != null) reset();
    if (userId != null) identify(userId);

    // SharedPreferences updates its in-memory copy at once; the write to disk
    // finishes later, which no caller needs to wait for.
    if (userId == null) {
      _prefs.remove(key);
    } else {
      _prefs.setString(key, userId);
    }
  }
}
