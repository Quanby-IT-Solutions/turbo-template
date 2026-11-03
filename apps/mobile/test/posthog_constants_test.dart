import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/constants/posthog_constants.dart';

/// PostHog stays off unless a build asks for it with both defines.
///
/// `flutter test` passes no `--dart-define`, so [PosthogConstants.isEnabled]
/// is the default-off case; the "both required" rule is checked through
/// [PosthogConstants.resolveEnabled], which [PosthogConstants.isEnabled]
/// delegates to.
void main() {
  test('isEnabled is false without defines', () {
    expect(PosthogConstants.isEnabled, isFalse);
  });

  test('isEnabled needs both defines', () {
    expect(PosthogConstants.resolveEnabled(flag: true, token: ''), isFalse);
    expect(PosthogConstants.resolveEnabled(flag: false, token: 'phc_x'), isFalse);
    expect(PosthogConstants.resolveEnabled(flag: true, token: 'phc_x'), isTrue);
  });

  test('host defaults to the US cloud', () {
    expect(PosthogConstants.host, 'https://us.i.posthog.com');
  });
}
