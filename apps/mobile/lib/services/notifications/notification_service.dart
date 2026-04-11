import 'package:awesome_notifications/awesome_notifications.dart';
import 'package:flutter/material.dart';

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

  /// Registers the default notification channel and requests permission.
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

    // Request permission if not already granted
    final isAllowed = await AwesomeNotifications().isNotificationAllowed();
    if (!isAllowed) {
      await AwesomeNotifications().requestPermissionToSendNotifications();
    }
  }

  // ── Listeners ─────────────────────────────────────────────────────────────

  /// Sets the notification action listener.
  ///
  /// Must be called *after* `runApp` so the callback has access to the widget
  /// tree and the navigator.
  Future<void> setListeners({
    required Future<void> Function(ReceivedAction) onAction,
  }) async {
    await AwesomeNotifications().setListeners(
      onActionReceivedMethod: onAction,
    );
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
