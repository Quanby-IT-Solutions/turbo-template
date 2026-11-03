import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/home/presentation/widgets/preview_features_tile.dart';
import 'package:mobile/services/analytics/feature_flags.dart';

/// Feature flags read as off unless PostHog positively says on.
///
/// `PosthogConstants` is compile-time disabled under `flutter test`, so the
/// real reader exercises the disabled path; the failure path swaps
/// [FeatureFlags.read].
void main() {
  tearDown(FeatureFlags.reset);

  test('disabled build reads every flag as off', () async {
    expect(await FeatureFlags.posthogReader('mobile-preview'), isFalse);
  });

  test('flag read failure reads as off', () async {
    FeatureFlags.read = (_) async => throw StateError('offline');
    final container = ProviderContainer.test();

    expect(
      await container.read(featureFlagProvider('mobile-preview').future),
      isFalse,
    );
  });

  Future<void> pumpTile(WidgetTester tester, {required bool enabled}) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          featureFlagProvider(
            'mobile-preview',
          ).overrideWith((ref) async => enabled),
        ],
        child: const MaterialApp(home: Scaffold(body: PreviewFeaturesTile())),
      ),
    );
    await tester.pumpAndSettle();
  }

  // Two tests, not one with two pumps: a second pumpWidget reuses the same
  // ProviderScope, which keeps the first override.
  testWidgets('Settings shows Preview features when the flag is on', (
    tester,
  ) async {
    await pumpTile(tester, enabled: true);
    expect(find.text('Preview features'), findsOneWidget);
  });

  testWidgets('Settings hides Preview features when the flag is off', (
    tester,
  ) async {
    await pumpTile(tester, enabled: false);
    expect(find.text('Preview features'), findsNothing);
  });
}
