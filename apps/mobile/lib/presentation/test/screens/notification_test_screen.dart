import 'package:flutter/material.dart';
import 'package:mobile/core/services/notification_service.dart';
import 'package:mobile/core/controllers/notification_controller.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:awesome_notifications/awesome_notifications.dart';

class NotificationTestScreen extends StatefulWidget {
  const NotificationTestScreen({super.key});

  @override
  State<NotificationTestScreen> createState() => _NotificationTestScreenState();
}

class _NotificationTestScreenState extends State<NotificationTestScreen> {
  bool _permissionsGranted = false;
  String _statusMessage = 'Ready to test notifications';

  @override
  void initState() {
    super.initState();
    _checkPermissions();
  }

  Future<void> _checkPermissions() async {
    final isAllowed = await AwesomeNotifications().isNotificationAllowed();
    setState(() {
      _permissionsGranted = isAllowed;
      _statusMessage = isAllowed 
        ? 'Notifications enabled ✅'
        : 'Notifications disabled ❌';
    });
  }

  Future<void> _requestPermissions() async {
    if (!mounted) return;
    final granted = await NotificationController.requestNotificationPermissions(context);
    await _checkPermissions();
    if (granted) {
      _showStatusMessage('Permissions granted successfully!', Colors.green);
    } else {
      _showStatusMessage('Permissions denied. Some features may not work.', Colors.orange);
    }
  }

  void _showStatusMessage(String message, Color color) {
    setState(() {
      _statusMessage = message;
    });
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: color,
        duration: const Duration(seconds: 2),
      ),
    );
  }

  Future<void> _testBasicNotification() async {
    try {
      await NotificationService.showBasicNotification(
        id: 1001,
        title: 'Test Basic Notification',
        body: 'This is a basic notification test from Q-Health',
        summary: 'Basic test',
        payload: {'test_type': 'basic'},
      );
      _showStatusMessage('Basic notification sent!', Colors.blue);
    } catch (e) {
      _showStatusMessage('Error: $e', Colors.red);
    }
  }

  Future<void> _testAppointmentNotification() async {
    try {
      await NotificationService.showAppointmentNotification(
        id: 1002,
        title: 'Test Appointment Reminder',
        body: 'You have an appointment with Dr. Test in 30 minutes',
        doctorName: 'Dr. Test Smith',
        appointmentTime: DateTime.now().add(const Duration(minutes: 30)),
        appointmentId: 'test_apt_001',
        payload: {'test_type': 'appointment'},
      );
      _showStatusMessage('Appointment notification sent!', Colors.green);
    } catch (e) {
      _showStatusMessage('Error: $e', Colors.red);
    }
  }

  Future<void> _testMedicationReminder() async {
    try {
      await NotificationService.showMedicationReminder(
        id: 1003,
        medicationName: 'Test Medication',
        dosage: '100mg',
        instructions: 'Take with food - This is a test',
        payload: {'test_type': 'medication'},
      );
      _showStatusMessage('Medication reminder sent!', Colors.purple);
    } catch (e) {
      _showStatusMessage('Error: $e', Colors.red);
    }
  }

  Future<void> _testIncomingCall() async {
    try {
      await NotificationService.showIncomingCallNotification(
        id: 1004,
        callerName: 'Dr. Test Johnson',
        callerType: 'doctor',
        callId: 'test_call_001',
        payload: {'test_type': 'call'},
      );
      _showStatusMessage('Incoming call notification sent!', Colors.orange);
    } catch (e) {
      _showStatusMessage('Error: $e', Colors.red);
    }
  }

  Future<void> _testEmergencyAlert() async {
    try {
      await NotificationService.showEmergencyAlert(
        id: 1005,
        title: 'TEST Emergency Alert',
        body: 'This is a test emergency notification - Not a real emergency',
        alertType: 'test_alert',
        payload: {'test_type': 'emergency'},
      );
      _showStatusMessage('Emergency alert sent!', Colors.red);
    } catch (e) {
      _showStatusMessage('Error: $e', Colors.red);
    }
  }

  Future<void> _testScheduledNotification() async {
    try {
      final scheduledTime = DateTime.now().add(const Duration(seconds: 10));
      await NotificationService.scheduleNotification(
        id: 1006,
        channelKey: 'basic_channel',
        title: 'Scheduled Test Notification',
        body: 'This notification was scheduled 10 seconds ago',
        scheduledDate: scheduledTime,
        payload: {'test_type': 'scheduled'},
      );
      _showStatusMessage('Notification scheduled for 10 seconds!', Colors.indigo);
    } catch (e) {
      _showStatusMessage('Error: $e', Colors.red);
    }
  }

  Future<void> _cancelAllNotifications() async {
    try {
      await NotificationService.cancelAllNotifications();
      _showStatusMessage('All notifications cancelled!', Colors.grey);
    } catch (e) {
      _showStatusMessage('Error: $e', Colors.red);
    }
  }

  Future<void> _getActiveNotifications() async {
    try {
      final notifications = await NotificationService.getActiveNotifications();
      _showStatusMessage('Active notifications: ${notifications.length}', Colors.cyan);
    } catch (e) {
      _showStatusMessage('Error: $e', Colors.red);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification Test'),
        backgroundColor: AppTheme.primaryMedical,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Card
            Card(
              color: _permissionsGranted ? Colors.green.shade50 : Colors.red.shade50,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    Icon(
                      _permissionsGranted ? Icons.check_circle : Icons.warning,
                      size: 32,
                      color: _permissionsGranted ? Colors.green : Colors.red,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _statusMessage,
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    if (!_permissionsGranted) ...[
                      const SizedBox(height: 12),
                      ElevatedButton(
                        onPressed: _requestPermissions,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primaryMedical,
                          foregroundColor: Colors.white,
                        ),
                        child: const Text('Request Permissions'),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Test Buttons
            Text(
              'Test Notification Types',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryMedical,
              ),
            ),
            
            const SizedBox(height: 16),
            
            _buildTestButton(
              icon: Icons.notifications,
              title: 'Basic Notification',
              description: 'Simple notification with title and body',
              onPressed: _testBasicNotification,
              color: Colors.blue,
            ),
            
            _buildTestButton(
              icon: Icons.event,
              title: 'Appointment Reminder',
              description: 'Medical appointment notification',
              onPressed: _testAppointmentNotification,
              color: Colors.green,
            ),
            
            _buildTestButton(
              icon: Icons.medical_services,
              title: 'Medication Reminder',
              description: 'Medicine dosage notification',
              onPressed: _testMedicationReminder,
              color: Colors.purple,
            ),
            
            _buildTestButton(
              icon: Icons.phone,
              title: 'Incoming Call',
              description: 'Video call notification',
              onPressed: _testIncomingCall,
              color: Colors.orange,
            ),
            
            _buildTestButton(
              icon: Icons.warning,
              title: 'Emergency Alert',
              description: 'Critical health alert',
              onPressed: _testEmergencyAlert,
              color: Colors.red,
            ),
            
            _buildTestButton(
              icon: Icons.schedule,
              title: 'Scheduled Notification',
              description: 'Notification in 10 seconds',
              onPressed: _testScheduledNotification,
              color: Colors.indigo,
            ),
            
            const SizedBox(height: 24),
            
            // Control Buttons
            Text(
              'Notification Controls',
              style: theme.textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.bold,
                color: AppTheme.primaryMedical,
              ),
            ),
            
            const SizedBox(height: 16),
            
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _getActiveNotifications,
                    icon: const Icon(Icons.list),
                    label: const Text('Count Active'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.cyan,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _cancelAllNotifications,
                    icon: const Icon(Icons.clear_all),
                    label: const Text('Cancel All'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.grey,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 24),
            
            // Instructions
            Card(
              color: Colors.blue.shade50,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Testing Instructions:',
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.blue.shade800,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text('1. Ensure permissions are granted\n'
                        '2. Test different notification types\n'
                        '3. Check notification panel after sending\n'
                        '4. Tap notifications to test actions\n'
                        '5. Use "Count Active" to see pending notifications'),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTestButton({
    required IconData icon,
    required String title,
    required String description,
    required VoidCallback onPressed,
    required Color color,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: ElevatedButton(
        onPressed: _permissionsGranted ? onPressed : null,
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          padding: const EdgeInsets.all(16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
        ),
        child: Row(
          children: [
            Icon(icon, size: 24),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.white.withValues(alpha: 0.8),
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios, size: 16),
          ],
        ),
      ),
    );
  }
}