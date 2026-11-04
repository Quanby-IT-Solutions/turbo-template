import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// The notification permission request must never hold back the first frame.
///
/// When the permission was denied before, awesome_notifications opens Android's
/// settings page instead of a dialog. With the request awaited before
/// `runApp`, dismissing that page left the app on a blank screen. Channels
/// still register before `runApp`; only the request moves after it.
///
/// The plugin is a platform channel, so this reads the startup source, the
/// same way `auth_hardening_test.dart` checks build files.
void main() {
  final service = File(
    'lib/services/notifications/notification_service.dart',
  ).readAsStringSync();
  final main = File('lib/main.dart').readAsStringSync();

  String body(String source, String signature) {
    final start = source.indexOf(signature);
    expect(start, isNot(-1), reason: '$signature not found');
    final next = source.indexOf('\n  Future<', start + signature.length);
    return source.substring(start, next == -1 ? source.length : next);
  }

  test('initialize() registers channels and asks for nothing', () {
    final initialize = body(service, 'Future<void> initialize()');

    expect(initialize, contains('AwesomeNotifications().initialize('));
    expect(initialize, isNot(contains('requestPermissionToSendNotifications')));
  });

  test('the permission request runs after runApp and is not awaited', () {
    final runApp = main.indexOf('runApp(');
    final request = main.indexOf('requestPermissionIfNeeded()');

    expect(request, greaterThan(runApp));
    expect(
      main,
      contains(
        'unawaited(NotificationService.instance.requestPermissionIfNeeded())',
      ),
    );
  });
}
