import 'package:equatable/equatable.dart';

class AppNotification extends Equatable {
  final String id;
  final String userId;
  final String title;
  final String message;
  final String type; // appointment, prescription, system, message
  final bool isRead;
  final Map<String, dynamic>? data;
  final DateTime createdAt;
  final DateTime? readAt;

  const AppNotification({
    required this.id,
    required this.userId,
    required this.title,
    required this.message,
    required this.type,
    required this.isRead,
    this.data,
    required this.createdAt,
    this.readAt,
  });

  @override
  List<Object?> get props => [
        id,
        userId,
        title,
        message,
        type,
        isRead,
        data,
        createdAt,
        readAt,
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
