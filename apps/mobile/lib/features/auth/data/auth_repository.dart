import 'dart:developer' as developer;

import 'package:dio/dio.dart';
import 'package:mobile/core/constants/api_constants.dart';
import 'package:mobile/features/auth/data/models/session_model.dart';
import 'package:mobile/services/api/api_client.dart';
import 'package:mobile/services/storage/secure_storage_service.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'auth_repository.g.dart';

/// Repository that communicates with the Better Auth backend endpoints.
///
/// Better Auth uses cookie-based sessions. The Dio cookie interceptor
/// (in api_client.dart) automatically persists `set-cookie` headers.
/// We also store the session token in secure storage as a fallback.
class AuthRepository {
  AuthRepository(this._dio, this._storage);

  final Dio _dio;
  final SecureStorageService _storage;

  /// Safely extracts a JSON map from a Dio response.
  /// Returns null if the data cannot be parsed as `Map<String, dynamic>`.
  Map<String, dynamic>? _parseJsonBody(Response<dynamic> response) {
    final data = response.data;
    if (data is Map<String, dynamic>) return data;
    if (data is String && data.isNotEmpty) {
      // Dio didn't auto-decode — shouldn't happen with default settings
      // but guard against it.
      developer.log('Auth response was a String, not decoded JSON: $data',
          name: 'AuthRepository');
    }
    return null;
  }

  /// Signs in with email and password.
  ///
  /// Better Auth `/sign-in/email` returns:
  /// ```json
  /// { "session": { "id": "...", "token": "...", ... }, "user": { ... } }
  /// ```
  Future<SessionModel?> signIn({
    required String email,
    required String password,
  }) async {
    final response = await _dio.post(
      ApiConstants.signIn,
      data: {'email': email, 'password': password},
    );

    developer.log(
      'signIn status=${response.statusCode} '
      'type=${response.data.runtimeType} '
      'data=${response.data}',
      name: 'AuthRepository',
    );

    final body = _parseJsonBody(response);
    if (response.statusCode == 200 && body != null) {
      final session = SessionModel.fromAuthResponse(body);
      await _storage.setSessionToken(session.session.token);
      return session;
    }
    return null;
  }

  /// Signs up with email, password, and name.
  ///
  /// Better Auth `/sign-up/email` returns the same shape as sign-in.
  Future<SessionModel?> signUp({
    required String email,
    required String password,
    required String name,
  }) async {
    final response = await _dio.post(
      ApiConstants.signUp,
      data: {'email': email, 'password': password, 'name': name},
    );

    developer.log(
      'signUp status=${response.statusCode} '
      'type=${response.data.runtimeType} '
      'data=${response.data}',
      name: 'AuthRepository',
    );

    final body = _parseJsonBody(response);
    if (response.statusCode == 200 && body != null) {
      final session = SessionModel.fromAuthResponse(body);
      await _storage.setSessionToken(session.session.token);
      return session;
    }
    return null;
  }

  /// Signs out and clears stored credentials.
  Future<void> signOut() async {
    try {
      await _dio.post(ApiConstants.signOut);
    } finally {
      await _storage.deleteSessionToken();
      await _storage.deleteCookie();
    }
  }

  /// Fetches the current session from the backend.
  ///
  /// Better Auth `/get-session` returns the same shape as sign-in
  /// if the session cookie is valid.
  Future<SessionModel?> getSession() async {
    try {
      final response = await _dio.get(ApiConstants.getSession);

      developer.log(
        'getSession status=${response.statusCode} '
        'type=${response.data.runtimeType} '
        'data=${response.data}',
        name: 'AuthRepository',
      );

      final body = _parseJsonBody(response);
      if (response.statusCode == 200 && body != null) {
        return SessionModel.fromAuthResponse(body);
      }
      return null;
    } on DioException {
      return null;
    }
  }
}

@Riverpod(keepAlive: true)
AuthRepository authRepository(Ref ref) {
  final dio = ref.watch(dioProvider);
  final storage = ref.watch(secureStorageProvider);
  return AuthRepository(dio, storage);
}
