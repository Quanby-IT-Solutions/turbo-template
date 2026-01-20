import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/domain/entities/notification.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/presentation/notifications/providers/notification_providers.dart';

class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  String _currentFilter = 'all'; // all, unread, read

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(_handleTabChange);
  }

  @override
  void dispose() {
    _tabController.removeListener(_handleTabChange);
    _tabController.dispose();
    super.dispose();
  }

  void _handleTabChange() {
    if (!_tabController.indexIsChanging) {
      setState(() {
        switch (_tabController.index) {
          case 0:
            _currentFilter = 'all';
            break;
          case 1:
            _currentFilter = 'unread';
            break;
          case 2:
            _currentFilter = 'read';
            break;
        }
        ref.read(notificationsListProvider.notifier).refresh(
              isRead: _currentFilter == 'all'
                  ? null
                  : _currentFilter == 'unread'
                      ? false
                      : true,
            );
      });
    }
  }

  Future<void> _markAsRead(AppNotification notification) async {
    try {
      await ref
          .read(notificationsListProvider.notifier)
          .markAsRead(notification.id);
      if (mounted) {
        ToastService.showSuccess(
          context: context,
          title: 'Success',
          description: 'Notification marked as read',
        );
      }
    } catch (e) {
      if (mounted) {
        ToastService.showError(
          context: context,
          title: 'Error',
          description: 'Failed to mark notification as read',
        );
      }
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      await ref.read(notificationsListProvider.notifier).markAllAsRead();
      if (mounted) {
        ToastService.showSuccess(
          context: context,
          title: 'Success',
          description: 'All notifications marked as read',
        );
      }
    } catch (e) {
      if (mounted) {
        ToastService.showError(
          context: context,
          title: 'Error',
          description: 'Failed to mark all notifications as read',
        );
      }
    }
  }

  void _handleNotificationTap(AppNotification notification) {
    if (!notification.isRead) {
      _markAsRead(notification);
    }

    // Handle navigation based on notification type or actionUrl
    if (notification.actionUrl != null && notification.actionUrl!.isNotEmpty) {
      // TODO: Navigate to actionUrl
      ToastService.showInfo(
        context: context,
        title: 'Opening',
        description: 'Loading...',
      );
    } else {
      // Handle navigation based on notification type
      switch (notification.type) {
        case 'APPOINTMENT_CREATED':
        case 'APPOINTMENT_CONFIRMED':
        case 'APPOINTMENT_REMINDER':
        case 'APPOINTMENT_RESCHEDULED':
          ToastService.showInfo(
            context: context,
            title: 'Opening Appointment',
            description: 'Loading appointment details...',
          );
          break;
        case 'PRESCRIPTION_ISSUED':
          ToastService.showInfo(
            context: context,
            title: 'Opening Prescription',
            description: 'Loading prescription details...',
          );
          break;
        case 'LAB_RESULTS_AVAILABLE':
          ToastService.showInfo(
            context: context,
            title: 'Opening Lab Results',
            description: 'Loading lab results...',
          );
          break;
        default:
          // No action for other types
          break;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final notificationsAsync = ref.watch(notificationsListProvider);

    // Calculate counts from notifications
    final allNotifications = notificationsAsync.value ?? [];
    final unreadNotifications = allNotifications.where((n) => !n.isRead).toList();
    final readNotifications = allNotifications.where((n) => n.isRead).toList();

    return AnimatedNavWrapper(
      child: Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        appBar: AppBar(
          title: Padding(
            padding: const EdgeInsets.only(left: 8.0),
            child: Text(
              'Notifications',
              style: TextStyle(
                color: colorScheme.onSurface,
                fontSize: 24,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.5,
              ),
            ),
          ),
          centerTitle: false,
          elevation: 0,
          backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
              automaticallyImplyLeading: false,
          actions: [
            if (unreadNotifications.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(right: 16),
                child: TextButton(
                  onPressed: _markAllAsRead,
                  style: TextButton.styleFrom(
                    backgroundColor: colorScheme.primary.withValues(alpha: 0.1),
                    foregroundColor: colorScheme.primary,
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                  ),
                  child: const Text(
                    'Mark all read',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      fontSize: 13,
                    ),
                  ),
                ),
              ),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(60),
            child: Container(
              margin: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: Row(
                children: [
                  Expanded(
                    child: _buildFilterChip(
                      label: 'All',
                      count: allNotifications.length,
                      icon: Icons.notifications_rounded,
                      isSelected: _tabController.index == 0,
                      onTap: () {
                        _tabController.animateTo(0);
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildFilterChip(
                      label: 'Unread',
                      count: unreadNotifications.length,
                      icon: Icons.notifications_active_rounded,
                      isSelected: _tabController.index == 1,
                      onTap: () {
                        _tabController.animateTo(1);
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildFilterChip(
                      label: 'Read',
                      count: readNotifications.length,
                      icon: Icons.notifications_none_rounded,
                      isSelected: _tabController.index == 2,
                      onTap: () {
                        _tabController.animateTo(2);
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        body: TabBarView(
          controller: _tabController,
          children: [
            _buildNotificationsList(notificationsAsync, 'all'),
            _buildNotificationsList(notificationsAsync, 'unread'),
            _buildNotificationsList(notificationsAsync, 'read'),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required int count,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    final colorScheme = Theme.of(context).colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
          decoration: BoxDecoration(
            color: isSelected
                ? colorScheme.primary
                : colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected
                  ? colorScheme.primary
                  : colorScheme.outline.withValues(alpha: 0.1),
              width: 1,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                size: 18,
                color: isSelected
                    ? Colors.white
                    : colorScheme.onSurface.withValues(alpha: 0.7),
              ),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  '$label ($count)',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                    color: isSelected
                        ? Colors.white
                        : colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNotificationsList(
    AsyncValue<List<AppNotification>> notificationsAsync,
    String type,
  ) {
    final colorScheme = Theme.of(context).colorScheme;

    return notificationsAsync.when(
      data: (notifications) {
        // Filter notifications based on type
        List<AppNotification> filteredNotifications;
        switch (type) {
          case 'unread':
            filteredNotifications = notifications.where((n) => !n.isRead).toList();
            break;
          case 'read':
            filteredNotifications = notifications.where((n) => n.isRead).toList();
            break;
          default:
            filteredNotifications = notifications;
        }

        if (filteredNotifications.isEmpty) {
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

        return RefreshIndicator(
          onRefresh: () async {
            await ref.read(notificationsListProvider.notifier).refresh(
                  isRead: type == 'all'
                      ? null
                      : type == 'unread'
                          ? false
                          : true,
                );
          },
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
            itemCount: filteredNotifications.length,
            itemBuilder: (context, index) {
              final notification = filteredNotifications[index];
              return _buildNotificationCard(notification);
            },
          ),
        );
      },
      loading: () => Center(
        child: CircularProgressIndicator(
          color: colorScheme.primary,
        ),
      ),
      error: (error, stack) => Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.error_outline_rounded,
              size: 64,
              color: colorScheme.error,
            ),
            const SizedBox(height: 16),
            Text(
              'Failed to load notifications',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w500,
                color: colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 8),
            TextButton(
              onPressed: () {
                ref.invalidate(notificationsListProvider);
              },
              child: const Text('Retry'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNotificationCard(AppNotification notification) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.1),
        ),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: () => _handleNotificationTap(notification),
          borderRadius: BorderRadius.circular(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // CardHeader equivalent
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            notification.title,
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                              color: colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _formatTimeAgo(notification.createdAt),
                            style: TextStyle(
                              fontSize: 12,
                              color: colorScheme.onSurface.withValues(alpha: 0.6),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 12),
                    // Badge
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: notification.isRead
                            ? colorScheme.surfaceContainerHighest
                            : Colors.red.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: notification.isRead
                              ? colorScheme.outline.withValues(alpha: 0.2)
                              : Colors.red.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Text(
                        notification.isRead ? 'Read' : 'New',
                        style: TextStyle(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: notification.isRead
                              ? colorScheme.onSurface.withValues(alpha: 0.7)
                              : Colors.red,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // CardContent equivalent
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Text(
                  notification.message,
                  style: TextStyle(
                    fontSize: 14,
                    color: colorScheme.onSurface.withValues(alpha: 0.8),
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inMinutes < 60) {
      final minutes = difference.inMinutes;
      return minutes == 1 ? '1 minute ago' : '$minutes minutes ago';
    } else if (difference.inHours < 24) {
      final hours = difference.inHours;
      return hours == 1 ? '1 hour ago' : '$hours hours ago';
    } else if (difference.inDays < 7) {
      final days = difference.inDays;
      return days == 1 ? '1 day ago' : '$days days ago';
    } else if (difference.inDays < 30) {
      final weeks = (difference.inDays / 7).floor();
      return weeks == 1 ? '1 week ago' : '$weeks weeks ago';
    } else {
      return '${dateTime.day}/${dateTime.month}/${dateTime.year}';
    }
  }
}
