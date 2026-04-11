import 'package:freezed_annotation/freezed_annotation.dart';
import 'package:mobile/features/auth/data/models/user_model.dart';

part 'session_model.freezed.dart';
part 'session_model.g.dart';

/// Represents the session data returned by Better Auth's
/// `get-session` endpoint (nested under the `"session"` key).
@freezed
abstract class SessionData with _$SessionData {
  const factory SessionData({
    String? id,
    required String token,
    String? userId,
    DateTime? expiresAt,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) = _SessionData;

  factory SessionData.fromJson(Map<String, dynamic> json) =>
      _$SessionDataFromJson(json);
}

/// Unified model for Better Auth responses.
///
/// **Sign-in / Sign-up** returns:
/// ```json
/// { "token": "...", "redirect": false, "user": { ... } }
/// ```
///
/// **Get-session** returns:
/// ```json
/// { "session": { "token": "...", ... }, "user": { ... } }
/// ```
///
/// We normalize both shapes into a single [SessionModel] via a custom
/// factory so the rest of the app always sees `session.token` and `user`.
@freezed
abstract class SessionModel with _$SessionModel {
  const factory SessionModel({
    required SessionData session,
    required UserModel user,
  }) = _SessionModel;

  /// Parses both Better Auth response shapes into one model.
  factory SessionModel.fromAuthResponse(Map<String, dynamic> json) {
    final user = UserModel.fromJson(json['user'] as Map<String, dynamic>);

    // get-session format: { "session": { ... }, "user": { ... } }
    if (json['session'] is Map<String, dynamic>) {
      final session =
          SessionData.fromJson(json['session'] as Map<String, dynamic>);
      return SessionModel(session: session, user: user);
    }

    // sign-in / sign-up format: { "token": "...", "user": { ... } }
    final token = json['token'] as String;
    return SessionModel(
      session: SessionData(token: token),
      user: user,
    );
  }

  factory SessionModel.fromJson(Map<String, dynamic> json) =>
      _$SessionModelFromJson(json);
}
