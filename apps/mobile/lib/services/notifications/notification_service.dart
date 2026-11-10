import 'package:awesome_notifications/awesome_notifications.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Singleton service wrapping [AwesomeNotifications] for local push
/// notification management.
///
/// Call [initialize] once in main.dart before `runApp`, then optionally
/// call [setListeners] after `runApp` so action callbacks have access to
/// the navigator / provider scope.
class NotificationService {
  NotificationService._();

  static final NotificationService instance = NotificationService._();

  // ── Initialisation ────────────────────────────────────────────────────────

  /// Registers the default notification channel. Asks for nothing: see
  /// [requestPermissionIfNeeded].
  Future<void> initialize() async {
    await AwesomeNotifications().initialize(
      null, // use default app icon
      [
        NotificationChannel(
          channelGroupKey: 'basic_channel_group',
          channelKey: 'basic_channel',
          channelName: 'Basic notifications',
          channelDescription: 'Default notification channel',
          defaultColor: const Color(0xFF9D50DD),
          ledColor: Colors.white,
          importance: NotificationImportance.High,
        ),
      ],
      channelGroups: [
        NotificationChannelGroup(
          channelGroupKey: 'basic_channel_group',
          channelGroupName: 'Basic group',
        ),
      ],
    );
  }

  /// Key of the "already asked" flag in [SharedPreferences].
  @visibleForTesting
  static const askedKey = 'notification_permission_asked';

  /// Whether the OS currently lets the app show notifications.
  Future<bool> isAllowed() => AwesomeNotifications().isNotificationAllowed();

  /// Opens the OS notification settings for this app (the page the user
  /// needs after a denial, when no system dialog can be shown any more).
  Future<void> openSystemSettings() =>
      AwesomeNotifications().showNotificationConfigPage();

  /// Asks for notification permission at most once per install.
  ///
  /// After a denial the plugin does not show a dialog again: it opens the OS
  /// Settings app (Android's notification page, iOS's root page). Asking on
  /// every launch therefore threw the user out of the app on every start. The
  /// "already asked" flag is stored before the request, so later launches
  /// never ask; the Settings tab links to the OS page instead.
  ///
  /// Call after `runApp`, without awaiting it. Awaited before `runApp`,
  /// dismissing the settings page left the app on a blank screen.
  Future<void> requestPermissionIfNeeded() async {
    if (await isAllowed()) return;
    final prefs = await SharedPreferences.getInstance();
    if (prefs.getBool(askedKey) ?? false) return;
    await prefs.setBool(askedKey, true);
    await AwesomeNotifications().requestPermissionToSendNotifications();
  }

  // ── Listeners ─────────────────────────────────────────────────────────────

  /// Sets the notification action listener.
  ///
  /// Must be called *after* `runApp` so the callback has access to the widget
  /// tree and the navigator.
  Future<void> setListeners({
    required Future<void> Function(ReceivedAction) onAction,
  }) async {
    await AwesomeNotifications().setListeners(onActionReceivedMethod: onAction);
  }

  // ── Show notification ─────────────────────────────────────────────────────

  /// Shows a simple local notification.
  Future<void> show({
    required String title,
    required String body,
    Map<String, String?>? payload,
  }) async {
    await AwesomeNotifications().createNotification(
      content: NotificationContent(
        id: DateTime.now().millisecondsSinceEpoch.remainder(100000),
        channelKey: 'basic_channel',
        title: title,
        body: body,
        payload: payload,
      ),
    );
  }

  // ── Dispose ───────────────────────────────────────────────────────────────

  Future<void> dispose() async {
    AwesomeNotifications().dispose();
  }
}
