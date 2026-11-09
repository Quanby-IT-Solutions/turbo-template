import 'package:awesome_notifications/awesome_notifications_method_channel.dart';
import 'package:awesome_notifications/awesome_notifications_platform_interface.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/home/presentation/widgets/notification_settings_tile.dart';
import 'package:mobile/services/notifications/notification_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// "Ask once, link in settings."
///
/// The plugin opens the OS Settings app whenever it is asked for a permission
/// that was denied before, so asking on every launch threw the user out of the
/// app on every start. The app asks at most once per install; afterwards the
/// only way to Settings is the tile on the Settings tab.
///
/// The plugin's platform channel is replaced by a recorder.
void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  const channel = MethodChannel('awesome_notifications');
  late List<String> calls;
  late bool allowed;

  setUp(() {
    // On a desktop test host the plugin picks its no-op platform; force the
    // method-channel one the phones use.
    AwesomeNotificationsPlatform.instance = MethodChannelAwesomeNotifications();
    calls = [];
    allowed = false;
    SharedPreferences.setMockInitialValues({});
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, (call) async {
          calls.add(call.method);
          if (call.method == 'isNotificationAllowed') return allowed;
          if (call.method == 'requestNotifications') return <Object?>['Alert'];
          return null;
        });
  });

  tearDown(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(channel, null);
  });

  int requests() => calls.where((c) => c != 'isNotificationAllowed').length;

  test('asks on the first launch when permission is off', () async {
    await NotificationService.instance.requestPermissionIfNeeded();

    expect(requests(), 1);
  });

  test('never asks again on later launches after a denial', () async {
    await NotificationService.instance.requestPermissionIfNeeded();
    calls.clear();

    await NotificationService.instance.requestPermissionIfNeeded();
    await NotificationService.instance.requestPermissionIfNeeded();

    expect(requests(), 0);
  });

  test('does not ask when permission is already on', () async {
    allowed = true;

    await NotificationService.instance.requestPermissionIfNeeded();

    expect(requests(), 0);
  });

  Future<void> pumpTile(WidgetTester tester) => tester.pumpWidget(
    const MaterialApp(home: Scaffold(body: NotificationSettingsTile())),
  );

  testWidgets('tile shows "Turn on notifications" while permission is off', (
    tester,
  ) async {
    await pumpTile(tester);
    await tester.pumpAndSettle();

    expect(find.text('Turn on notifications'), findsOneWidget);
  });

  testWidgets('tile is hidden while permission is on', (tester) async {
    allowed = true;

    await pumpTile(tester);
    await tester.pumpAndSettle();

    expect(find.text('Turn on notifications'), findsNothing);
  });

  testWidgets('tapping the tile opens the OS notification settings', (
    tester,
  ) async {
    await pumpTile(tester);
    await tester.pumpAndSettle();

    await tester.tap(find.text('Turn on notifications'));
    await tester.pumpAndSettle();

    expect(calls, contains('showNotificationPage'));
    expect(calls, isNot(contains('requestNotifications')));
  });
}
