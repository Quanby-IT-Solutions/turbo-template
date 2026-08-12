import 'package:flutter/foundation.dart';

/// Backend endpoints, resolved from build-time configuration.
///
/// MB-2 / F-24 + F-42: `API_BASE_URL` used to come from a bundled `.env` asset
/// with a hard-coded `http://10.0.2.2:3000/api` fallback. Two problems: the
/// `.env` shipped inside every APK in cleartext, and a release built without
/// configuration silently pointed at a non-TLS address instead of failing.
///
/// Configuration now arrives via `--dart-define`, which is compiled in rather
/// than bundled as a readable asset:
///
/// ```bash
/// flutter build apk --release \
///   --dart-define=API_BASE_URL=https://api.example.com/api \
///   --dart-define=API_VERSION=v1
/// ```
class ApiConstants {
  ApiConstants._();

  /// Raw compile-time value. Empty when the define was not supplied.
  static const String _baseUrl = String.fromEnvironment('API_BASE_URL');

  static const String apiVersion =
      String.fromEnvironment('API_VERSION', defaultValue: 'v1');

  /// Base URL for the backend.
  ///
  /// Throws in release when unset. There is deliberately no fallback: a
  /// silent default is how a production build ends up talking plaintext to
  /// somebody's laptop address. Debug builds fall back to the Android
  /// emulator's host alias so local work needs no extra flags.
  static String get baseUrl {
    if (_baseUrl.isNotEmpty) {
      // A real check, not an `assert`: asserts are stripped from release
      // builds, so an assert here would be absent from the only mode it
      // claims to guard. The release manifest denies cleartext anyway, but
      // failing loudly at startup beats every request dying obscurely later.
      if (kReleaseMode && !_baseUrl.startsWith('https://')) {
        throw StateError(
          'API_BASE_URL must be https:// in release builds — got "$_baseUrl". '
          'Release builds deny cleartext traffic, so a plain-http endpoint '
          'cannot work.',
        );
      }
      return _baseUrl;
    }

    if (kReleaseMode) {
      throw StateError(
        'API_BASE_URL was not provided at build time. Rebuild with '
        '--dart-define=API_BASE_URL=https://<your-api-host>/api',
      );
    }

    // Debug/profile only: the Android emulator's alias for the host machine.
    return 'http://10.0.2.2:3000/api';
  }

  static String get versionedUrl => '$baseUrl/$apiVersion';

  // Auth endpoints (Better Auth - no envelope)
  static String get signIn => '$versionedUrl/auth/sign-in/email';
  static String get signUp => '$versionedUrl/auth/sign-up/email';
  static String get signOut => '$versionedUrl/auth/sign-out';
  static String get getSession => '$versionedUrl/auth/get-session';

  // Todo endpoints (NestJS - oRPC)
  static String get todos => '$versionedUrl/example/todos';
  static String todoById(int id) => '$versionedUrl/example/todos/$id';
}
