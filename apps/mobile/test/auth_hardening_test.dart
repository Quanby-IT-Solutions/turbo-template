import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/presentation/utils/auth_error_message.dart';
import 'package:mobile/features/auth/presentation/utils/auth_validation.dart';

/// MB-3 / F-44..F-47 — release hardening.
void main() {
  group('error messages never leak infrastructure (F-45)', () {
    final host = 'http://internal-api.corp.local:8443/api/v1/auth/sign-in/email';

    DioException dio(DioExceptionType type, {int? status}) => DioException(
          requestOptions: RequestOptions(path: host),
          type: type,
          message: 'Connection refused to $host',
          response: status == null
              ? null
              : Response(requestOptions: RequestOptions(path: host), statusCode: status),
        );

    test('a connection failure names no host or port', () {
      final message = authErrorMessage(dio(DioExceptionType.connectionError));
      expect(message, isNot(contains('internal-api')));
      expect(message, isNot(contains('8443')));
      expect(message, isNot(contains('http')));
    });

    test('an arbitrary exception never reaches the user verbatim', () {
      final message = authErrorMessage(StateError('secret internal detail 0xDEADBEEF'));
      expect(message, isNot(contains('0xDEADBEEF')));
      expect(message, isNot(contains('secret internal detail')));
    });

    test('401 and 403 are indistinguishable', () {
      // A distinct message per case is an account-enumeration oracle, the same
      // reasoning as AC-4's reset path.
      expect(
        authErrorMessage(dio(DioExceptionType.badResponse, status: 401)),
        authErrorMessage(dio(DioExceptionType.badResponse, status: 403)),
      );
    });

    test('every mapped message is a fixed, human sentence', () {
      for (final type in DioExceptionType.values) {
        final message = authErrorMessage(dio(type));
        expect(message, isNotEmpty);
        expect(message, isNot(contains('Exception')));
        expect(message, isNot(contains('DioException')));
        expect(message.endsWith('.'), isTrue, reason: '"$message" should read as a sentence');
      }
    });

    test('rate limiting is distinguishable, since the user can act on it', () {
      expect(authErrorMessage(dio(DioExceptionType.badResponse, status: 429)), contains('Too many'));
    });
  });

  group('password rules match the server (F-46)', () {
    test('minimum is 8, matching register.schema.ts', () {
      expect(AuthValidation.passwordMinLength, 8);
    });

    test('rejects a 7-character password the server would refuse', () {
      expect(AuthValidation.password('1234567'), isNotNull);
    });

    test('accepts 8 characters', () {
      expect(AuthValidation.password('12345678'), isNull);
    });

    test('requires a value', () {
      expect(AuthValidation.password(''), isNotNull);
      expect(AuthValidation.password(null), isNotNull);
    });
  });

  group('release hardening (F-44, F-47)', () {
    String read(String p) => File(p).readAsStringSync();

    test('manifest drops the unused permissions and denies backup', () {
      final manifest = read('android/app/src/main/AndroidManifest.xml');
      expect(manifest, isNot(contains('SCHEDULE_EXACT_ALARM')));
      expect(manifest, isNot(contains('RECEIVE_BOOT_COMPLETED')));
      expect(manifest, contains('android:allowBackup="false"'));
    });

    test('release is not signed with debug keys, and the id is not the sample', () {
      final gradle = read('android/app/build.gradle.kts');
      expect(gradle, isNot(matches(RegExp(r"""(namespace|applicationId) = "com.example.mobile"""))));
      expect(gradle, isNot(contains('signingConfigs.getByName("debug")')));
      expect(gradle, contains('signingConfigs.getByName("release")'));
      // Fails the build rather than emitting an unsigned release.
      expect(gradle, contains('Release signing is not configured'));
    });

    test('the application-id warning is recorded where it is set', () {
      expect(read('android/app/build.gradle.kts'), contains('CANNOT be changed'));
    });

    test('keystore material is gitignored and only an example is committed', () {
      expect(read('.gitignore'), contains('key.properties'));
      expect(File('android/key.properties.example').existsSync(), isTrue);
      expect(File('android/key.properties').existsSync(), isFalse);
    });
  });
}
