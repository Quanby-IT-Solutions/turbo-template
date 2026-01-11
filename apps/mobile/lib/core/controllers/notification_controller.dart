import 'package:awesome_notifications/awesome_notifications.dart';
import 'package:flutter/material.dart';
import 'package:mobile/core/services/notification_service.dart';
import 'package:mobile/core/utils/app_router.dart';

/// Controller for handling notification actions and events
class NotificationController {
  /// Handle when a notification is created
  @pragma("vm:entry-point")
  static Future<void> onNotificationCreated(ReceivedNotification receivedNotification) async {
    debugPrint('Notification created: ${receivedNotification.toMap()}');
    
    // Update badge count
    final badgeCount = await NotificationService.getBadgeCount();
    await NotificationService.setBadgeCount(badgeCount + 1);
  }

  /// Handle when a notification is displayed
  @pragma("vm:entry-point")
  static Future<void> onNotificationDisplayed(ReceivedNotification receivedNotification) async {
    debugPrint('Notification displayed: ${receivedNotification.toMap()}');
    
    // Log analytics or track notification display
    // You can add analytics tracking here
  }

  /// Handle when a notification is dismissed
  @pragma("vm:entry-point")
  static Future<void> onDismissActionReceived(ReceivedAction receivedAction) async {
    debugPrint('Notification dismissed: ${receivedAction.toMap()}');
    
    // Update badge count
    final badgeCount = await NotificationService.getBadgeCount();
    if (badgeCount > 0) {
      await NotificationService.setBadgeCount(badgeCount - 1);
    }
  }

  /// Handle notification actions (taps, button presses)
  @pragma("vm:entry-point")
  static Future<void> onActionReceived(ReceivedAction receivedAction) async {
    debugPrint('Notification action received: ${receivedAction.toMap()}');

    final actionKey = receivedAction.buttonKeyPressed;
    final notificationType = receivedAction.payload?['type'];

    // Update badge count when notification is acted upon
    final badgeCount = await NotificationService.getBadgeCount();
    if (badgeCount > 0) {
      await NotificationService.setBadgeCount(badgeCount - 1);
    }

    // Handle different notification types and actions
    switch (notificationType) {
      case 'appointment':
        await _handleAppointmentAction(receivedAction, actionKey);
        break;
      
      case 'medication_reminder':
        await _handleMedicationAction(receivedAction, actionKey);
        break;
      
      case 'incoming_call':
        await _handleCallAction(receivedAction, actionKey);
        break;
      
      case 'emergency_alert':
        await _handleEmergencyAction(receivedAction, actionKey);
        break;
      
      default:
        await _handleDefaultAction(receivedAction, actionKey);
        break;
    }
  }

  /// Handle appointment notification actions
  static Future<void> _handleAppointmentAction(
    ReceivedAction receivedAction,
    String? actionKey,
  ) async {
    final appointmentId = receivedAction.payload?['appointment_id'];
    final doctorName = receivedAction.payload?['doctor_name'];

    switch (actionKey) {
      case 'view_appointment':
        // Navigate to appointment details
        if (appointmentId != null) {
          appRouter.push('/appointment-booking', extra: {'appointmentId': appointmentId});
        } else {
          appRouter.push('/scheduling');
        }
        break;
      
      case 'reschedule':
        // Navigate to reschedule appointment
        if (appointmentId != null) {
          appRouter.push('/appointment-booking', extra: {
            'appointmentId': appointmentId,
            'action': 'reschedule'
          });
        } else {
          appRouter.push('/doctor-search');
        }
        break;
      
      default:
        // Default action - view appointment details
        appRouter.push('/scheduling');
        break;
    }

    debugPrint('Opening appointment with $doctorName');
  }

  /// Handle medication reminder actions
  static Future<void> _handleMedicationAction(
    ReceivedAction receivedAction,
    String? actionKey,
  ) async {
    final medicationName = receivedAction.payload?['medication_name'];

    switch (actionKey) {
      case 'mark_taken':
        // Mark medication as taken
        await _markMedicationAsTaken(receivedAction);
        debugPrint('Marked $medicationName as taken');
        // Don't navigate, just show confirmation
        break;
      
      case 'snooze':
        // Snooze reminder for 30 minutes
        await _snoozeMedicationReminder(receivedAction);
        debugPrint('Reminder snoozed for 30 minutes');
        break;
      
      case 'view_details':
        // Navigate to medication details
        appRouter.push('/prescriptions');
        break;
      
      default:
        // Default action - view prescriptions
        appRouter.push('/prescriptions');
        break;
    }
  }

  /// Handle incoming call actions
  static Future<void> _handleCallAction(
    ReceivedAction receivedAction,
    String? actionKey,
  ) async {
    final callId = receivedAction.payload?['call_id'];
    final callerName = receivedAction.payload?['caller_name'];

    switch (actionKey) {
      case 'answer_call':
        // Navigate to video call screen
        if (callId != null) {
          appRouter.push('/video-call', extra: {'callId': callId});
        } else {
          appRouter.push('/video-call');
        }
        debugPrint('Joining call with $callerName');
        break;
      
      case 'decline_call':
        // Decline the call
        await _declineCall(callId);
        debugPrint('Call declined');
        // Don't navigate, just dismiss
        break;
      
      default:
        // Default action - answer call
        if (callId != null) {
          appRouter.push('/video-call', extra: {'callId': callId});
        } else {
          appRouter.push('/video-call');
        }
        break;
    }
  }

  /// Handle emergency alert actions
  static Future<void> _handleEmergencyAction(
    ReceivedAction receivedAction,
    String? actionKey,
  ) async {
    final alertType = receivedAction.payload?['alert_type'];

    switch (actionKey) {
      case 'emergency_action':
        // Navigate to emergency screen or take appropriate action
        appRouter.push('/emergency', extra: {'alertType': alertType});
        break;
      
      case 'emergency_dismiss':
        // Acknowledge the emergency alert
        await _acknowledgeEmergencyAlert(receivedAction);
        debugPrint('Emergency alert acknowledged');
        break;
      
      default:
        // Default action - go to emergency screen
        appRouter.push('/emergency');
        break;
    }
  }

  /// Handle default notification actions
  static Future<void> _handleDefaultAction(
    ReceivedAction receivedAction,
    String? actionKey,
  ) async {
    // Default navigation based on notification content
    appRouter.push('/notifications');
  }

  /// Mark medication as taken (this would integrate with your backend)
  static Future<void> _markMedicationAsTaken(ReceivedAction receivedAction) async {
    final medicationName = receivedAction.payload?['medication_name'];
    final scheduledHour = receivedAction.payload?['scheduled_hour'];
    
    debugPrint('Marking medication as taken: $medicationName at hour $scheduledHour');
    
    // TODO: Integrate with your backend API to mark medication as taken
    // Example:
    // await MedicationService.markAsTaken(medicationName, DateTime.now());
    
    // Cancel the specific notification
    await NotificationService.cancelNotification(receivedAction.id!);
  }

  /// Snooze medication reminder
  static Future<void> _snoozeMedicationReminder(ReceivedAction receivedAction) async {
    final medicationName = receivedAction.payload?['medication_name'];
    final dosage = receivedAction.payload?['dosage'];
    
    // Schedule a new notification 30 minutes later
    final snoozeTime = DateTime.now().add(const Duration(minutes: 30));
    
    await NotificationService.scheduleNotification(
      id: receivedAction.id! + 10000, // Different ID to avoid conflicts
      channelKey: 'reminder_channel',
      title: 'Medication Reminder (Snoozed)',
      body: 'Time to take $medicationName ($dosage)',
      scheduledDate: snoozeTime,
      category: NotificationCategory.Reminder,
      payload: receivedAction.payload?.cast<String, String>(),
    );
    
    // Cancel the original notification
    await NotificationService.cancelNotification(receivedAction.id!);
  }

  /// Decline incoming call
  static Future<void> _declineCall(String? callId) async {
    debugPrint('Declining call: $callId');
    
    // TODO: Integrate with your video call service to decline the call
    // Example:
    // await VideoCallService.declineCall(callId);
  }

  /// Acknowledge emergency alert
  static Future<void> _acknowledgeEmergencyAlert(ReceivedAction receivedAction) async {
    final alertType = receivedAction.payload?['alert_type'];
    
    debugPrint('Acknowledging emergency alert: $alertType');
    
    // TODO: Integrate with your backend to acknowledge emergency alert
    // Example:
    // await EmergencyService.acknowledgeAlert(alertType, DateTime.now());
    
    // Cancel the emergency notification
    await NotificationService.cancelNotification(receivedAction.id!);
  }

  /// Request notification permissions with user-friendly dialog
  static Future<bool> requestNotificationPermissions(BuildContext context) async {
    final isAllowed = await NotificationService.isNotificationAllowed();
    if (isAllowed) return true;

    // Show explanation dialog first
    final shouldRequest = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Enable Notifications'),
        content: const Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Q-Health would like to send you notifications for:'),
            SizedBox(height: 16),
            Text('• Appointment reminders'),
            Text('• Medication alerts'),
            Text('• Incoming video calls'),
            Text('• Important health updates'),
            SizedBox(height: 16),
            Text('You can manage these preferences anytime in Settings.'),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Not Now'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Enable'),
          ),
        ],
      ),
    );

    if (shouldRequest == true) {
      return await NotificationService.requestPermissions();
    }

    return false;
  }

  /// Initialize notification listeners
  static Future<void> initializeListeners() async {
    await NotificationService.setListeners(
      onActionReceived: onActionReceived,
      onNotificationCreated: onNotificationCreated,
      onNotificationDisplayed: onNotificationDisplayed,
      onDismissActionReceived: onDismissActionReceived,
    );
  }

  /// Check for initial notification action (when app is opened from notification)
  static Future<ReceivedAction?> getInitialNotificationAction() async {
    return await AwesomeNotifications().getInitialNotificationAction(
      removeFromActionEvents: false,
    );
  }
}