import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/constants/api_constants.dart';

/// MB-2 / F-24 + F-42 — mobile transport and bundled-config hardening.
///
/// The runtime half is asserted where it can be; the rest are source-level
/// guarantees, because the behaviour they protect (a release build refusing to
/// start, an APK containing no env file) only manifests in a release build,
/// which `flutter test` never produces.
void main() {
  group('API configuration', () {
    test('resolves a base URL in debug without extra flags', () {
      expect(ApiConstants.baseUrl, isNotEmpty);
      expect(ApiConstants.versionedUrl, contains(ApiConstants.apiVersion));
    });

    test('the debug fallback is the emulator host alias, not a real host', () {
      if (!kReleaseMode) {
        expect(ApiConstants.baseUrl, contains('10.0.2.2'));
      }
    });

    test('every endpoint derives from the single base URL', () {
      for (final url in <String>[
        ApiConstants.signIn,
        ApiConstants.signUp,
        ApiConstants.signOut,
        ApiConstants.getSession,
        ApiConstants.todos,
        ApiConstants.todoById(1),
      ]) {
        expect(url, startsWith(ApiConstants.versionedUrl));
      }
    });
  });

  group('source-level guarantees', () {
    String read(String path) => File(path).readAsStringSync();

    test('no dotenv usage remains in the app', () {
      expect(read('lib/main.dart'), isNot(contains('dotenv')));
      expect(
        read('lib/core/constants/api_constants.dart'),
        isNot(contains('dotenv')),
      );
    });

    test('release has no non-TLS fallback and fails closed without config', () {
      final constants = read('lib/core/constants/api_constants.dart');

      // Exactly one http:// literal in executable code: the debug-only
      // emulator alias. Comments explaining the history do not count.
      final code = constants
          .split(RegExp(r'\r?\n'))
          .where((String line) => !line.trimLeft().startsWith('//'))
          .join('\n');

      expect('http://'.allMatches(code).length, 1);
      expect(constants, contains('kReleaseMode'));
      expect(constants, contains('String.fromEnvironment'));
      // A release build with no API_BASE_URL must throw rather than default.
      expect(constants, contains('throw StateError'));
    });

    test('.env is not declared as a Flutter asset', () {
      expect(
        read('pubspec.yaml'),
        isNot(matches(RegExp(r'^\s*-\s*\.env\s*$', multiLine: true))),
      );
    });

    test('the mobile .env.example warns that it is not bundled', () {
      final example = read('.env.example');
      expect(example.toLowerCase(), contains('not bundled'));
      expect(example, contains('--dart-define'));
    });

    test('release manifest denies cleartext, debug allows it', () {
      expect(
        read('android/app/src/main/AndroidManifest.xml'),
        contains('android:usesCleartextTraffic="false"'),
      );
      expect(
        read('android/app/src/debug/AndroidManifest.xml'),
        contains('android:usesCleartextTraffic="true"'),
      );
    });
  });
}
