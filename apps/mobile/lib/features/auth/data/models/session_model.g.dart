// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'session_model.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_SessionData _$SessionDataFromJson(Map<String, dynamic> json) => _SessionData(
  id: json['id'] as String?,
  token: json['token'] as String,
  userId: json['userId'] as String?,
  expiresAt: json['expiresAt'] == null
      ? null
      : DateTime.parse(json['expiresAt'] as String),
  createdAt: json['createdAt'] == null
      ? null
      : DateTime.parse(json['createdAt'] as String),
  updatedAt: json['updatedAt'] == null
      ? null
      : DateTime.parse(json['updatedAt'] as String),
);

Map<String, dynamic> _$SessionDataToJson(_SessionData instance) =>
    <String, dynamic>{
      'id': instance.id,
      'token': instance.token,
      'userId': instance.userId,
      'expiresAt': instance.expiresAt?.toIso8601String(),
      'createdAt': instance.createdAt?.toIso8601String(),
      'updatedAt': instance.updatedAt?.toIso8601String(),
    };

_SessionModel _$SessionModelFromJson(Map<String, dynamic> json) =>
    _SessionModel(
      session: SessionData.fromJson(json['session'] as Map<String, dynamic>),
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$SessionModelToJson(_SessionModel instance) =>
    <String, dynamic>{'session': instance.session, 'user': instance.user};
