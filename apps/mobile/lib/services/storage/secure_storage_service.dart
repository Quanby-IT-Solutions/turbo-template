import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'secure_storage_service.g.dart';

/// Wrapper around [FlutterSecureStorage] for secure key-value storage.
///
/// Used for storing authentication tokens, sensitive user data, and session
/// cookies that must not be accessible to other apps.
class SecureStorageService {
  SecureStorageService([FlutterSecureStorage? storage])
      : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  // ── Keys ──────────────────────────────────────────────────────────────────

  static const _sessionTokenKey = 'session_token';
  static const _cookieKey = 'auth_cookie';

  // ── Token operations ──────────────────────────────────────────────────────

  Future<String?> getSessionToken() => _storage.read(key: _sessionTokenKey);

  Future<void> setSessionToken(String token) =>
      _storage.write(key: _sessionTokenKey, value: token);

  Future<void> deleteSessionToken() => _storage.delete(key: _sessionTokenKey);

  // ── Cookie operations ─────────────────────────────────────────────────────

  Future<String?> getCookie() => _storage.read(key: _cookieKey);

  Future<void> setCookie(String cookie) =>
      _storage.write(key: _cookieKey, value: cookie);

  Future<void> deleteCookie() => _storage.delete(key: _cookieKey);

  // ── Bulk operations ───────────────────────────────────────────────────────

  Future<void> clearAll() => _storage.deleteAll();
}

/// Provider for [SecureStorageService].
///
/// Overridden in main.dart with an eagerly created instance so the service
/// is available synchronously via `ref.read`.
@Riverpod(keepAlive: true)
SecureStorageService secureStorage(Ref ref) {
  return SecureStorageService();
}
