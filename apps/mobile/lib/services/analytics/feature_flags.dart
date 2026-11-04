import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/constants/posthog_constants.dart';
import 'package:posthog_flutter/posthog_flutter.dart';

/// Reads one boolean feature flag.
typedef FeatureFlagReader = Future<bool> Function(String key);

/// Feature flags, read from PostHog.
///
/// A flag is on only when PostHog positively says so. A build without the
/// PostHog defines, a flag PostHog has never heard of, no network, a slow
/// network, a thrown error: all of these read as off, so a flag can only ever
/// *add* behaviour and an outage can only ever take it away again.
///
/// Flags are fetched when the SDK starts (`preloadFeatureFlags` defaults to
/// on). Until that fetch answers, reads come from the SDK's cache; when it
/// answers, [notifyLoaded] makes every flag read again. So a change made in
/// the PostHog dashboard shows up on the next launch, as soon as the fresh
/// flags arrive.
class FeatureFlags {
  FeatureFlags._();

  /// How long a read may take before it counts as off.
  static const Duration timeout = Duration(seconds: 3);

  /// Bumped each time PostHog finishes loading flags.
  static final ValueNotifier<int> loads = ValueNotifier<int>(0);

  /// PostHog's `onFeatureFlags` callback: fresh flags are in.
  static void notifyLoaded() => loads.value++;

  /// The active reader. Production code never reassigns this; see [reset].
  static FeatureFlagReader read = posthogReader;

  static Future<bool> posthogReader(String key) async {
    if (!PosthogConstants.isEnabled) return false;
    try {
      final result = await Posthog().getFeatureFlagResult(key).timeout(timeout);
      return result?.enabled ?? false;
    } catch (_) {
      return false;
    }
  }

  /// Restores [posthogReader]. Test teardown only.
  @visibleForTesting
  static void reset() => read = posthogReader;
}

/// Whether the flag [key] is on for this user. Off on any failure.
///
/// Reads again whenever PostHog finishes loading flags. While it re-reads,
/// the previous value stays, so the screen does not flicker.
final featureFlagProvider = FutureProvider.family<bool, String>((
  ref,
  key,
) async {
  void reread() => ref.invalidateSelf();
  FeatureFlags.loads.addListener(reread);
  ref.onDispose(() => FeatureFlags.loads.removeListener(reread));

  try {
    return await FeatureFlags.read(key);
  } catch (_) {
    return false;
  }
});
