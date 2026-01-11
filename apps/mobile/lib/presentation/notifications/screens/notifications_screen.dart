import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/domain/entities/notification.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<AppNotification> _allNotifications = [];
  List<AppNotification> _unreadNotifications = [];
  List<AppNotification> _readNotifications = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadNotifications();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadNotifications() {
    final now = DateTime.now();

    _allNotifications = [
      AppNotification(
        id: '1',
        userId: 'user_123',
        title: 'Appointment Reminder',
        message:
            'You have an appointment with Dr. Sarah Johnson tomorrow at 2:00 PM',
        type: 'appointment',
        isRead: false,
        data: {
          'appointmentId': 'apt_123',
          'doctorName': 'Dr. Sarah Johnson',
          'scheduledAt': DateTime.now()
              .add(const Duration(days: 1))
              .toIso8601String(),
        },
        createdAt: now.subtract(const Duration(hours: 2)),
      ),
      AppNotification(
        id: '2',
        userId: 'user_123',
        title: 'New Prescription Available',
        message:
            'Dr. Michael Chen has prescribed Amoxicillin 500mg. View details to download.',
        type: 'prescription',
        isRead: false,
        data: {
          'prescriptionId': 'rx_456',
          'medicationName': 'Amoxicillin 500mg',
          'doctorName': 'Dr. Michael Chen',
        },
        createdAt: now.subtract(const Duration(hours: 4)),
      ),
      AppNotification(
        id: '3',
        userId: 'user_123',
        title: 'Lab Results Ready',
        message:
            'Your blood test results from City Medical Lab are now available.',
        type: 'system',
        isRead: false,
        data: {'labId': 'lab_789', 'testType': 'Complete Blood Count'},
        createdAt: now.subtract(const Duration(hours: 6)),
      ),
      AppNotification(
        id: '4',
        userId: 'user_123',
        title: 'Video Call Started',
        message: 'Dr. James Wilson is waiting for you in the video call.',
        type: 'appointment',
        isRead: true,
        data: {
          'appointmentId': 'apt_987',
          'doctorName': 'Dr. James Wilson',
          'callId': 'call_123',
        },
        createdAt: now.subtract(const Duration(days: 1)),
        readAt: now.subtract(const Duration(days: 1)),
      ),
      AppNotification(
        id: '5',
        userId: 'user_123',
        title: 'Health Reminder',
        message:
            "Don't forget to take your evening medication (Lisinopril 10mg)",
        type: 'system',
        isRead: true,
        data: {'medicationName': 'Lisinopril 10mg', 'dosageTime': 'evening'},
        createdAt: now.subtract(const Duration(days: 1)),
        readAt: now.subtract(const Duration(hours: 12)),
      ),
      AppNotification(
        id: '6',
        userId: 'user_123',
        title: 'Appointment Confirmed',
        message:
            'Your appointment with Dr. Lisa Anderson has been confirmed for Dec 15, 2024.',
        type: 'appointment',
        isRead: true,
        data: {
          'appointmentId': 'apt_555',
          'doctorName': 'Dr. Lisa Anderson',
          'status': 'confirmed',
        },
        createdAt: now.subtract(const Duration(days: 2)),
        readAt: now.subtract(const Duration(days: 1)),
      ),
      AppNotification(
        id: '7',
        userId: 'user_123',
        title: 'New Message',
        message:
            'Dr. Emily Davis sent you a message about your treatment plan.',
        type: 'message',
        isRead: true,
        data: {'messageId': 'msg_333', 'doctorName': 'Dr. Emily Davis'},
        createdAt: now.subtract(const Duration(days: 3)),
        readAt: now.subtract(const Duration(days: 2)),
      ),
      AppNotification(
        id: '8',
        userId: 'user_123',
        title: 'Vitals Check Reminder',
        message:
            'Time for your weekly vitals check. Tap to start self-assessment.',
        type: 'system',
        isRead: true,
        data: {'reminderType': 'vitals_check'},
        createdAt: now.subtract(const Duration(days: 4)),
        readAt: now.subtract(const Duration(days: 3)),
      ),
    ];

    _unreadNotifications = _allNotifications.where((n) => !n.isRead).toList();
    _readNotifications = _allNotifications.where((n) => n.isRead).toList();

    setState(() {});
  }

  void _markAsRead(AppNotification notification) {
    setState(() {
      final index = _allNotifications.indexWhere(
        (n) => n.id == notification.id,
      );
      if (index != -1) {
        _allNotifications[index] = AppNotification(
          id: notification.id,
          userId: notification.userId,
          title: notification.title,
          message: notification.message,
          type: notification.type,
          isRead: true,
          data: notification.data,
          createdAt: notification.createdAt,
          readAt: DateTime.now(),
        );
      }

      _unreadNotifications.removeWhere((n) => n.id == notification.id);
      _readNotifications = _allNotifications.where((n) => n.isRead).toList();
    });
  }

  void _markAllAsRead() {
    setState(() {
      _allNotifications = _allNotifications
          .map(
            (n) => AppNotification(
              id: n.id,
              userId: n.userId,
              title: n.title,
              message: n.message,
              type: n.type,
              isRead: true,
              data: n.data,
              createdAt: n.createdAt,
              readAt: n.readAt ?? DateTime.now(),
            ),
          )
          .toList();

      _unreadNotifications.clear();
      _readNotifications = List.from(_allNotifications);
    });

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text(
          'All notifications marked as read',
          style: TextStyle(fontWeight: FontWeight.w600),
        ),
        backgroundColor: Theme.of(context).colorScheme.secondary,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        margin: const EdgeInsets.all(16),
      ),
    );
  }

  void _handleNotificationTap(AppNotification notification) {
    if (!notification.isRead) {
      _markAsRead(notification);
    }

    // Handle navigation based on notification type
    switch (notification.type) {
      case 'appointment':
        ToastService.showInfo(
          context: context,
          title: 'Opening Appointment',
          description: 'Loading appointment details...',
        );
        break;
      case 'prescription':
        ToastService.showInfo(
          context: context,
          title: 'Opening Prescription',
          description: 'Loading prescription details...',
        );
        break;
      case 'message':
        ToastService.showInfo(
          context: context,
          title: 'Opening Messages',
          description: 'Loading your messages...',
        );
        break;
      case 'system':
        ToastService.showInfo(
          context: context,
          title: 'System Notification',
          description: 'Processing...',
        );
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final isDoctor = ref.watch(isDoctorProvider);

    return AnimatedNavWrapper(
      child: Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        appBar: AppBar(
          backgroundColor: colorScheme.surfaceContainerLow,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          automaticallyImplyLeading: false,
          title: Text(
            'Notifications',
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
          actions: [
            if (_unreadNotifications.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(right: 16),
                child: TextButton(
                  onPressed: _markAllAsRead,
                  style: TextButton.styleFrom(
                    backgroundColor: colorScheme.primary.withValues(alpha: 0.1),
                    foregroundColor: colorScheme.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text(
                    'Mark all read',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(96),
            child: Container(
              margin: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: colorScheme.outline.withValues(alpha: 0.1),
                  width: 1,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(6),
                child: TabBar(
                  controller: _tabController,
                  indicator: BoxDecoration(
                    color: colorScheme.primary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  dividerColor: Colors.transparent,
                  labelColor: Colors.white,
                  unselectedLabelColor: colorScheme.onSurface.withValues(
                    alpha: 0.6,
                  ),
                  labelStyle: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                  unselectedLabelStyle: const TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 12,
                  ),
                  tabs: [
                    Tab(
                      text: 'All (${_allNotifications.length})',
                      icon: const Icon(Icons.notifications_rounded, size: 18),
                    ),
                    Tab(
                      text: 'Unread (${_unreadNotifications.length})',
                      icon: const Icon(
                        Icons.notifications_active_rounded,
                        size: 18,
                      ),
                    ),
                    Tab(
                      text: 'Read (${_readNotifications.length})',
                      icon: const Icon(
                        Icons.notifications_none_rounded,
                        size: 18,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        body: Column(
          children: [
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildNotificationsList(_allNotifications, 'all'),
                  _buildNotificationsList(_unreadNotifications, 'unread'),
                  _buildNotificationsList(_readNotifications, 'read'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationsList(
    List<AppNotification> notifications,
    String type,
  ) {
    final colorScheme = Theme.of(context).colorScheme;

    if (notifications.isEmpty) {
      String emptyMessage;
      IconData emptyIcon;
      Color emptyColor;

      switch (type) {
        case 'unread':
          emptyMessage = "You're all caught up!\nNo unread notifications.";
          emptyIcon = Icons.notifications_none_rounded;
          emptyColor = colorScheme.secondary;
          break;
        case 'read':
          emptyMessage = "No read notifications yet.";
          emptyIcon = Icons.inbox_rounded;
          emptyColor = colorScheme.tertiary;
          break;
        default:
          emptyMessage =
              "No notifications yet.\nWe'll notify you of important updates.";
          emptyIcon = Icons.notifications_off_rounded;
          emptyColor = colorScheme.outline;
      }

      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: emptyColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(32),
                border: Border.all(
                  color: emptyColor.withValues(alpha: 0.2),
                  width: 2,
                ),
              ),
              child: Icon(emptyIcon, size: 64, color: emptyColor),
            ),
            const SizedBox(height: 24),
            Text(
              emptyMessage,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: colorScheme.onSurface.withValues(alpha: 0.6),
                height: 1.4,
              ),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
      itemCount: notifications.length,
      itemBuilder: (context, index) {
        final notification = notifications[index];
        return _buildNotificationCard(notification);
      },
    );
  }

  Widget _buildNotificationCard(AppNotification notification) {
    final colorScheme = Theme.of(context).colorScheme;
    final notificationColor = _getNotificationColor(
      notification.type,
      colorScheme,
    );

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: notification.isRead
            ? colorScheme.surfaceContainerLow
            : colorScheme.primary.withValues(alpha: 0.03),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: notification.isRead
              ? colorScheme.outline.withValues(alpha: 0.1)
              : colorScheme.primary.withValues(alpha: 0.15),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.06),
            offset: const Offset(0, 4),
            blurRadius: 12,
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _handleNotificationTap(notification),
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: notificationColor,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: notificationColor.withValues(alpha: 0.25),
                        offset: const Offset(0, 2),
                        blurRadius: 8,
                      ),
                    ],
                  ),
                  child: Icon(
                    _getNotificationIcon(notification.type),
                    color: Colors.white,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              notification.title,
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: notification.isRead
                                    ? FontWeight.w600
                                    : FontWeight.w700,
                                color: colorScheme.onSurface,
                                letterSpacing: -0.2,
                              ),
                            ),
                          ),
                          if (!notification.isRead)
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: colorScheme.primary,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: colorScheme.primary.withValues(
                                      alpha: 0.4,
                                    ),
                                    blurRadius: 4,
                                    spreadRadius: 1,
                                  ),
                                ],
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(
                        notification.message,
                        style: TextStyle(
                          fontSize: 14,
                          color: colorScheme.onSurface.withValues(alpha: 0.7),
                          height: 1.4,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Icon(
                            Icons.access_time_rounded,
                            size: 14,
                            color: colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                          const SizedBox(width: 6),
                          Text(
                            _formatTime(notification.createdAt),
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.5,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: notificationColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: notificationColor.withValues(alpha: 0.2),
                                width: 1,
                              ),
                            ),
                            child: Text(
                              notification.type.toUpperCase(),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: notificationColor,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Icon(
                  Icons.arrow_forward_ios_rounded,
                  size: 14,
                  color: colorScheme.onSurface.withValues(alpha: 0.3),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Color _getNotificationColor(String type, ColorScheme colorScheme) {
    switch (type) {
      case 'appointment':
        return colorScheme.primary;
      case 'prescription':
        return colorScheme.secondary;
      case 'message':
        return colorScheme.tertiary;
      case 'system':
        return colorScheme.outline;
      default:
        return colorScheme.onSurface.withValues(alpha: 0.6);
    }
  }

  IconData _getNotificationIcon(String type) {
    switch (type) {
      case 'appointment':
        return Icons.calendar_today_rounded;
      case 'prescription':
        return Icons.medication_rounded;
      case 'message':
        return Icons.message_rounded;
      case 'system':
        return Icons.info_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    }
  }
}
