import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/data/repositories/notification_repository.dart';
import 'package:mobile/domain/entities/notification.dart';

// ==================
// Repository Provider
// ==================

/// Notification repository provider
final notificationRepositoryProvider = Provider<NotificationRepository>((ref) {
  return NotificationRepository();
});

// ==================
// Notifications List Provider
// ==================

/// Notifier for managing notifications list
class NotificationsListNotifier extends AsyncNotifier<List<AppNotification>> {
  NotificationRepository get _repository =>
      ref.read(notificationRepositoryProvider);

  @override
  Future<List<AppNotification>> build() async {
    return _fetchNotifications();
  }

  /// Fetch notifications with optional filters
  Future<List<AppNotification>> _fetchNotifications({
    bool? isRead,
    bool? isArchived,
    String? type,
    String? priority,
    int? limit,
    int? offset,
  }) async {
    try {
      return await _repository.getNotifications(
        isRead: isRead,
        isArchived: isArchived,
        type: type,
        priority: priority,
        limit: limit,
        offset: offset,
      );
    } catch (e) {
      throw Exception('Failed to load notifications: ${e.toString()}');
    }
  }

  /// Refresh notifications list
  Future<void> refresh({
    bool? isRead,
    bool? isArchived,
    String? type,
    String? priority,
    int? limit,
    int? offset,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      return _fetchNotifications(
        isRead: isRead,
        isArchived: isArchived,
        type: type,
        priority: priority,
        limit: limit,
        offset: offset,
      );
    });
  }

  /// Filter notifications by read status
  Future<void> filterByReadStatus(bool? isRead) async {
    await refresh(isRead: isRead);
  }

  /// Mark notification as read
  Future<void> markAsRead(String notificationId) async {
    try {
      await _repository.markAsRead(notificationId);
      // Update the notification in the list
      state.whenData((notifications) {
        final updatedNotifications = notifications.map((n) {
          if (n.id == notificationId) {
            return AppNotification(
              id: n.id,
              userId: n.userId,
              title: n.title,
              message: n.message,
              type: n.type,
              isRead: true,
              isArchived: n.isArchived,
              priority: n.priority,
              metadata: n.metadata,
              relatedId: n.relatedId,
              relatedType: n.relatedType,
              actionUrl: n.actionUrl,
              createdAt: n.createdAt,
              updatedAt: n.updatedAt,
              readAt: DateTime.now(),
              expiresAt: n.expiresAt,
            );
          }
          return n;
        }).toList();
        state = AsyncData(updatedNotifications);
      });
    } catch (e) {
      throw Exception('Failed to mark notification as read: ${e.toString()}');
    }
  }

  /// Mark all notifications as read
  Future<void> markAllAsRead() async {
    try {
      await _repository.markAllAsRead();
      // Update all notifications in the list
      state.whenData((notifications) {
        final updatedNotifications = notifications.map((n) {
          return AppNotification(
            id: n.id,
            userId: n.userId,
            title: n.title,
            message: n.message,
            type: n.type,
            isRead: true,
            isArchived: n.isArchived,
            priority: n.priority,
            metadata: n.metadata,
            relatedId: n.relatedId,
            relatedType: n.relatedType,
            actionUrl: n.actionUrl,
            createdAt: n.createdAt,
            updatedAt: n.updatedAt,
            readAt: n.readAt ?? DateTime.now(),
            expiresAt: n.expiresAt,
          );
        }).toList();
        state = AsyncData(updatedNotifications);
      });
    } catch (e) {
      throw Exception('Failed to mark all notifications as read: ${e.toString()}');
    }
  }
}

/// Notifications list provider
final notificationsListProvider =
    AsyncNotifierProvider<NotificationsListNotifier, List<AppNotification>>(
  () => NotificationsListNotifier(),
);

// ==================
// Unread Count Provider
// ==================

/// Unread notifications count provider
final unreadNotificationsCountProvider = FutureProvider<int>((ref) async {
  final repository = ref.watch(notificationRepositoryProvider);
  return await repository.getUnreadCount();
});
