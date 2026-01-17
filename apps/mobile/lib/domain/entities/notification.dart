import 'package:equatable/equatable.dart';

class AppNotification extends Equatable {
  final String id;
  final String userId;
  final String title;
  final String message;
  final String type; // appointment, prescription, system, message
  final bool isRead;
  final bool isArchived;
  final String? priority; // LOW, NORMAL, HIGH, URGENT
  final Map<String, dynamic>? metadata;
  final String? relatedId;
  final String? relatedType;
  final String? actionUrl;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final DateTime? readAt;
  final DateTime? expiresAt;

  const AppNotification({
    required this.id,
    required this.userId,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    this.isArchived = false,
    this.priority,
    this.metadata,
    this.relatedId,
    this.relatedType,
    this.actionUrl,
    required this.createdAt,
    this.updatedAt,
    this.readAt,
    this.expiresAt,
  });

  factory AppNotification.fromMap(Map<String, dynamic> map) {
    return AppNotification(
      id: map['id'] as String,
      userId: map['userId'] as String,
      title: map['title'] as String,
      message: map['message'] as String,
      type: map['type'] as String,
      isRead: map['isRead'] as bool? ?? false,
      isArchived: map['isArchived'] as bool? ?? false,
      priority: map['priority'] as String?,
      metadata: map['metadata'] as Map<String, dynamic>?,
      relatedId: map['relatedId'] as String?,
      relatedType: map['relatedType'] as String?,
      actionUrl: map['actionUrl'] as String?,
      createdAt: DateTime.parse(map['createdAt'] as String),
      updatedAt: map['updatedAt'] != null
          ? DateTime.parse(map['updatedAt'] as String)
          : null,
      readAt: map['readAt'] != null
          ? DateTime.parse(map['readAt'] as String)
          : null,
      expiresAt: map['expiresAt'] != null
          ? DateTime.parse(map['expiresAt'] as String)
          : null,
    );
  }

  @override
  List<Object?> get props => [
        id,
        userId,
        title,
        message,
        type,
        isRead,
        isArchived,
        priority,
        metadata,
        relatedId,
        relatedType,
        actionUrl,
        createdAt,
        updatedAt,
        readAt,
        expiresAt,
      ];
}

class Message extends Equatable {
  final String id;
  final String senderId;
  final String receiverId;
  final String senderName;
  final String content;
  final String type; // text, image, file
  final bool isRead;
  final DateTime sentAt;
  final DateTime? readAt;

  const Message({
    required this.id,
    required this.senderId,
    required this.receiverId,
    required this.senderName,
    required this.content,
    required this.type,
    required this.isRead,
    required this.sentAt,
    this.readAt,
  });

  @override
  List<Object?> get props => [
        id,
        senderId,
        receiverId,
        senderName,
        content,
        type,
        isRead,
        sentAt,
        readAt,
      ];
}
