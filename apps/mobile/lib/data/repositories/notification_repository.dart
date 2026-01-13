import 'package:mobile/core/services/http_service.dart';
import 'package:mobile/domain/entities/notification.dart';

/// Notification repository for backend integration
class NotificationRepository {
  /// Get notifications for current user
  Future<List<AppNotification>> getNotifications({
    bool? isRead,
    bool? isArchived,
    String? type,
    String? priority,
    int? limit,
    int? offset,
  }) async {
    try {
      final notificationsList = await HttpService.getNotifications(
        isRead: isRead,
        isArchived: isArchived,
        type: type,
        priority: priority,
        limit: limit,
        offset: offset,
      );
      // Backend returns {success: true, data: [...]} where data is a List
      return notificationsList
          .map((json) => AppNotification.fromMap(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw Exception('Failed to get notifications: ${e.toString()}');
    }
  }

  /// Mark notification as read
  Future<AppNotification> markAsRead(String notificationId) async {
    try {
      final response = await HttpService.markNotificationRead(notificationId);
      return AppNotification.fromMap(response);
    } catch (e) {
      throw Exception('Failed to mark notification as read: ${e.toString()}');
    }
  }

  /// Mark all notifications as read
  Future<bool> markAllAsRead() async {
    try {
      return await HttpService.markAllNotificationsRead();
    } catch (e) {
      throw Exception('Failed to mark all notifications as read: ${e.toString()}');
    }
  }

  /// Get unread notifications count
  Future<int> getUnreadCount() async {
    try {
      return await HttpService.getUnreadNotificationsCount();
    } catch (e) {
      throw Exception('Failed to get unread notifications count: ${e.toString()}');
    }
  }
}
