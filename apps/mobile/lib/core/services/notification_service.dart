import 'package:awesome_notifications/awesome_notifications.dart';
import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_theme.dart';

/// Notification service for managing local and push notifications
/// Uses awesome_notifications package for comprehensive notification support
class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  static NotificationService get instance => _instance;
  NotificationService._internal();

  /// Initialize the notification service
  /// Should be called in main() before runApp()
  static Future<void> initialize() async {
    await AwesomeNotifications().initialize(
      // Use notification icon from drawable resources
      'resource://drawable/ic_notification',
      
      // Notification channels
      [
        // Basic notifications channel
        NotificationChannel(
          channelGroupKey: 'basic_group',
          channelKey: 'basic_channel',
          channelName: 'Basic Notifications',
          channelDescription: 'General notifications for Q-Health app',
          defaultColor: AppTheme.primaryMedical,
          ledColor: Colors.white,
          importance: NotificationImportance.Default,
          channelShowBadge: true,
          onlyAlertOnce: false,
          playSound: true,
          criticalAlerts: false,
        ),

        // Medical appointment notifications
        NotificationChannel(
          channelGroupKey: 'medical_group',
          channelKey: 'appointment_channel',
          channelName: 'Appointment Notifications',
          channelDescription: 'Notifications for medical appointments and reminders',
          defaultColor: AppTheme.primaryMedical,
          ledColor: AppTheme.primaryMedical,
          importance: NotificationImportance.High,
          channelShowBadge: true,
          onlyAlertOnce: false,
          playSound: true,
          enableVibration: true,
          criticalAlerts: false,
        ),

        // Medical reminders (medications, vitals, etc.)
        NotificationChannel(
          channelGroupKey: 'medical_group',
          channelKey: 'reminder_channel',
          channelName: 'Medical Reminders',
          channelDescription: 'Medication reminders and health check alerts',
          defaultColor: AppTheme.warningColor,
          ledColor: AppTheme.warningColor,
          importance: NotificationImportance.High,
          channelShowBadge: true,
          onlyAlertOnce: false,
          playSound: true,
          enableVibration: true,
          criticalAlerts: false,
        ),

        // Emergency and critical health alerts
        NotificationChannel(
          channelGroupKey: 'medical_group',
          channelKey: 'emergency_channel',
          channelName: 'Emergency Alerts',
          channelDescription: 'Critical health alerts and emergency notifications',
          defaultColor: AppTheme.emergencyColor,
          ledColor: AppTheme.emergencyColor,
          importance: NotificationImportance.Max,
          channelShowBadge: true,
          onlyAlertOnce: false,
          playSound: true,
          enableVibration: true,
          criticalAlerts: true,
        ),

        // Messages and communications
        NotificationChannel(
          channelGroupKey: 'communication_group',
          channelKey: 'message_channel',
          channelName: 'Messages',
          channelDescription: 'Messages from healthcare providers and system notifications',
          defaultColor: AppTheme.infoColor,
          ledColor: AppTheme.infoColor,
          importance: NotificationImportance.Default,
          channelShowBadge: true,
          onlyAlertOnce: false,
          playSound: true,
          enableVibration: true,
        ),

        // Video call notifications
        NotificationChannel(
          channelGroupKey: 'communication_group',
          channelKey: 'call_channel',
          channelName: 'Video Calls',
          channelDescription: 'Incoming video calls and consultation notifications',
          defaultColor: AppTheme.primaryMedical,
          ledColor: AppTheme.primaryMedical,
          importance: NotificationImportance.Max,
          channelShowBadge: true,
          onlyAlertOnce: false,
          playSound: true,
          enableVibration: true,
          enableLights: true,
          criticalAlerts: false,
        ),

        // Background services and progress
        NotificationChannel(
          channelGroupKey: 'system_group',
          channelKey: 'service_channel',
          channelName: 'Background Services',
          channelDescription: 'Background sync and service notifications',
          defaultColor: Colors.grey,
          ledColor: Colors.grey,
          importance: NotificationImportance.Low,
          channelShowBadge: false,
          onlyAlertOnce: true,
          playSound: false,
          enableVibration: false,
        ),
      ],

      // Channel groups for organization
      channelGroups: [
        NotificationChannelGroup(
          channelGroupKey: 'basic_group',
          channelGroupName: 'General Notifications',
        ),
        NotificationChannelGroup(
          channelGroupKey: 'medical_group',
          channelGroupName: 'Medical & Health',
        ),
        NotificationChannelGroup(
          channelGroupKey: 'communication_group',
          channelGroupName: 'Communications',
        ),
        NotificationChannelGroup(
          channelGroupKey: 'system_group',
          channelGroupName: 'System & Services',
        ),
      ],

      debug: true, // Set to false in production
    );
  }

  /// Set notification listeners
  /// Should be called after the app is initialized
  static Future<void> setListeners({
    required Future<void> Function(ReceivedAction) onActionReceived,
    Future<void> Function(ReceivedNotification)? onNotificationCreated,
    Future<void> Function(ReceivedNotification)? onNotificationDisplayed,
    Future<void> Function(ReceivedAction)? onDismissActionReceived,
  }) async {
    await AwesomeNotifications().setListeners(
      onActionReceivedMethod: onActionReceived,
      onNotificationCreatedMethod: onNotificationCreated,
      onNotificationDisplayedMethod: onNotificationDisplayed,
      onDismissActionReceivedMethod: onDismissActionReceived,
    );
  }

  /// Check if notifications are allowed
  static Future<bool> isNotificationAllowed() async {
    return await AwesomeNotifications().isNotificationAllowed();
  }

  /// Request notification permissions
  static Future<bool> requestPermissions({
    List<NotificationPermission>? permissions,
  }) async {
    final isAllowed = await AwesomeNotifications().isNotificationAllowed();
    if (isAllowed) return true;

    return await AwesomeNotifications().requestPermissionToSendNotifications(
      permissions: permissions ?? [
        NotificationPermission.Alert,
        NotificationPermission.Sound,
        NotificationPermission.Badge,
        NotificationPermission.Vibration,
        NotificationPermission.Light,
      ],
    );
  }

  /// Request critical alert permissions (for emergency notifications)
  static Future<bool> requestCriticalPermissions() async {
    return await AwesomeNotifications().requestPermissionToSendNotifications(
      permissions: [
        NotificationPermission.Alert,
        NotificationPermission.Sound,
        NotificationPermission.Badge,
        NotificationPermission.Vibration,
        NotificationPermission.Light,
        NotificationPermission.CriticalAlert,
        NotificationPermission.OverrideDnD,
      ],
    );
  }

  /// Show a basic notification
  static Future<void> showBasicNotification({
    required int id,
    required String title,
    required String body,
    String? summary,
    Map<String, String>? payload,
    List<NotificationActionButton>? actionButtons,
  }) async {
    await AwesomeNotifications().createNotification(
      content: NotificationContent(
        id: id,
        channelKey: 'basic_channel',
        title: title,
        body: body,
        summary: summary,
        category: NotificationCategory.Message,
        payload: payload,
        notificationLayout: NotificationLayout.Default,
        wakeUpScreen: false,
        criticalAlert: false,
        icon: 'asset://assets/images/logo.png',
        largeIcon: 'asset://assets/images/logo.png',
      ),
      actionButtons: actionButtons,
    );
  }

  /// Show appointment notification
  static Future<void> showAppointmentNotification({
    required int id,
    required String title,
    required String body,
    required String doctorName,
    required DateTime appointmentTime,
    String? appointmentId,
    Map<String, String>? payload,
  }) async {
    final enhancedPayload = {
      'type': 'appointment',
      'doctor_name': doctorName,
      'appointment_time': appointmentTime.toIso8601String(),
      if (appointmentId != null) 'appointment_id': appointmentId,
      ...?payload,
    };

    await AwesomeNotifications().createNotification(
      content: NotificationContent(
        id: id,
        channelKey: 'appointment_channel',
        title: title,
        body: body,
        summary: 'Appointment with $doctorName',
        category: NotificationCategory.Event,
        payload: enhancedPayload,
        notificationLayout: NotificationLayout.Default,
        wakeUpScreen: true,
        criticalAlert: false,
        icon: 'asset://assets/images/logo.png',
        largeIcon: 'asset://assets/images/logo.png',
      ),
      actionButtons: [
        NotificationActionButton(
          key: 'view_appointment',
          label: 'View Details',
          actionType: ActionType.Default,
          autoDismissible: true,
        ),
        NotificationActionButton(
          key: 'reschedule',
          label: 'Reschedule',
          actionType: ActionType.Default,
          autoDismissible: true,
        ),
      ],
    );
  }

  /// Show medication reminder
  static Future<void> showMedicationReminder({
    required int id,
    required String medicationName,
    required String dosage,
    required String instructions,
    Map<String, String>? payload,
  }) async {
    final enhancedPayload = {
      'type': 'medication_reminder',
      'medication_name': medicationName,
      'dosage': dosage,
      'instructions': instructions,
      ...?payload,
    };

    await AwesomeNotifications().createNotification(
      content: NotificationContent(
        id: id,
        channelKey: 'reminder_channel',
        title: 'Medication Reminder',
        body: 'Time to take $medicationName ($dosage)',
        summary: 'Medication: $medicationName',
        category: NotificationCategory.Reminder,
        payload: enhancedPayload,
        notificationLayout: NotificationLayout.Default,
        wakeUpScreen: true,
        criticalAlert: false,
        icon: 'asset://assets/images/logo.png',
        largeIcon: 'asset://assets/images/logo.png',
      ),
      actionButtons: [
        NotificationActionButton(
          key: 'mark_taken',
          label: 'Mark as Taken',
          actionType: ActionType.SilentAction,
          autoDismissible: true,
        ),
        NotificationActionButton(
          key: 'snooze',
          label: 'Remind Later',
          actionType: ActionType.SilentAction,
          autoDismissible: true,
        ),
        NotificationActionButton(
          key: 'view_details',
          label: 'View Details',
          actionType: ActionType.Default,
          autoDismissible: true,
        ),
      ],
    );
  }

  /// Show incoming video call notification
  static Future<void> showIncomingCallNotification({
    required int id,
    required String callerName,
    required String callerType, // 'doctor', 'patient', etc.
    required String callId,
    String? callerImage,
    Map<String, String>? payload,
  }) async {
    final enhancedPayload = {
      'type': 'incoming_call',
      'caller_name': callerName,
      'caller_type': callerType,
      'call_id': callId,
      ...?payload,
    };

    await AwesomeNotifications().createNotification(
      content: NotificationContent(
        id: id,
        channelKey: 'call_channel',
        title: 'Incoming Video Call',
        body: '$callerName is calling you',
        summary: 'Video call from $callerName',
        category: NotificationCategory.Call,
        payload: enhancedPayload,
        notificationLayout: NotificationLayout.BigPicture,
        bigPicture: callerImage ?? 'resource://drawable/res_call_bg',
        icon: 'asset://assets/images/logo.png',
        largeIcon: callerImage ?? 'asset://assets/images/logo.png',
        wakeUpScreen: true,
        fullScreenIntent: true,
        criticalAlert: false,
        autoDismissible: false,
        locked: true,
      ),
      actionButtons: [
        NotificationActionButton(
          key: 'answer_call',
          label: 'Answer',
          actionType: ActionType.Default,
          autoDismissible: true,
          color: AppTheme.successColor,
        ),
        NotificationActionButton(
          key: 'decline_call',
          label: 'Decline',
          actionType: ActionType.SilentAction,
          autoDismissible: true,
          isDangerousOption: true,
        ),
      ],
    );
  }

  /// Show emergency alert
  static Future<void> showEmergencyAlert({
    required int id,
    required String title,
    required String body,
    required String alertType,
    Map<String, String>? payload,
  }) async {
    final enhancedPayload = {
      'type': 'emergency_alert',
      'alert_type': alertType,
      ...?payload,
    };

    await AwesomeNotifications().createNotification(
      content: NotificationContent(
        id: id,
        channelKey: 'emergency_channel',
        title: title,
        body: body,
        summary: 'Emergency Alert',
        category: NotificationCategory.Alarm,
        payload: enhancedPayload,
        notificationLayout: NotificationLayout.Default,
        wakeUpScreen: true,
        fullScreenIntent: true,
        criticalAlert: true,
        icon: 'asset://assets/images/logo.png',
        autoDismissible: false,
        locked: true,
        largeIcon: 'asset://assets/images/logo.png',
      ),
      actionButtons: [
        NotificationActionButton(
          key: 'emergency_action',
          label: 'Take Action',
          actionType: ActionType.Default,
          autoDismissible: false,
        ),
        NotificationActionButton(
          key: 'emergency_dismiss',
          label: 'Acknowledge',
          actionType: ActionType.SilentAction,
          autoDismissible: true,
        ),
      ],
    );
  }

  /// Schedule a notification
  static Future<void> scheduleNotification({
    required int id,
    required String channelKey,
    required String title,
    required String body,
    required DateTime scheduledDate,
    String? summary,
    NotificationCategory? category,
    Map<String, String>? payload,
    List<NotificationActionButton>? actionButtons,
    bool repeats = false,
    bool preciseAlarm = false,
  }) async {
    await AwesomeNotifications().createNotification(
      content: NotificationContent(
        id: id,
        channelKey: channelKey,
        title: title,
        body: body,
        summary: summary,
        category: category ?? NotificationCategory.Reminder,
        payload: payload,
        wakeUpScreen: true,
        icon: 'asset://assets/images/logo.png',
        largeIcon: 'asset://assets/images/logo.png',
      ),
      actionButtons: actionButtons,
      schedule: NotificationCalendar.fromDate(
        date: scheduledDate,
        preciseAlarm: preciseAlarm,
        repeats: repeats,
      ),
    );
  }

  /// Schedule recurring medication reminder
  static Future<void> scheduleRecurringMedicationReminder({
    required int id,
    required String medicationName,
    required String dosage,
    required List<int> hours, // Hours of the day to remind (0-23)
    Map<String, String>? payload,
  }) async {
    for (int i = 0; i < hours.length; i++) {
      final hour = hours[i];
      final notificationId = id + i; // Unique ID for each scheduled notification
      
      await AwesomeNotifications().createNotification(
        content: NotificationContent(
          id: notificationId,
          channelKey: 'reminder_channel',
          title: 'Medication Reminder',
          body: 'Time to take $medicationName ($dosage)',
          summary: 'Medication: $medicationName',
          category: NotificationCategory.Reminder,
          payload: {
            'type': 'medication_reminder',
            'medication_name': medicationName,
            'dosage': dosage,
            'scheduled_hour': hour.toString(),
            ...?payload,
          },
          wakeUpScreen: true,
          icon: 'asset://assets/images/logo.png',
          largeIcon: 'asset://assets/images/logo.png',
        ),
        actionButtons: [
          NotificationActionButton(
            key: 'mark_taken',
            label: 'Mark as Taken',
            actionType: ActionType.SilentAction,
            autoDismissible: true,
          ),
          NotificationActionButton(
            key: 'snooze',
            label: 'Remind Later',
            actionType: ActionType.SilentAction,
            autoDismissible: true,
          ),
        ],
        schedule: NotificationCalendar(
          hour: hour,
          minute: 0,
          second: 0,
          repeats: true,
          preciseAlarm: true,
        ),
      );
    }
  }

  /// Cancel a notification by ID
  static Future<void> cancelNotification(int id) async {
    await AwesomeNotifications().cancel(id);
  }

  /// Cancel all notifications
  static Future<void> cancelAllNotifications() async {
    await AwesomeNotifications().cancelAll();
  }

  /// Cancel notifications by channel key
  static Future<void> cancelNotificationsByChannel(String channelKey) async {
    await AwesomeNotifications().cancelNotificationsByChannelKey(channelKey);
  }

  /// Get list of active notifications
  static Future<List<NotificationModel>> getActiveNotifications() async {
    return await AwesomeNotifications().listScheduledNotifications();
  }

  /// Dismiss a notification by ID
  static Future<void> dismissNotification(int id) async {
    await AwesomeNotifications().dismiss(id);
  }

  /// Get badge count
  static Future<int> getBadgeCount() async {
    return await AwesomeNotifications().getGlobalBadgeCounter();
  }

  /// Set badge count
  static Future<void> setBadgeCount(int count) async {
    await AwesomeNotifications().setGlobalBadgeCounter(count);
  }

  /// Reset badge count
  static Future<void> resetBadgeCount() async {
    await AwesomeNotifications().resetGlobalBadge();
  }
}