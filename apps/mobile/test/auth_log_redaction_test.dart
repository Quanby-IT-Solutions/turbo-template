import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// LG-1 / F-05 — mobile log redaction.
///
/// `AuthRepository` used to interpolate whole response bodies — session tokens
/// included — into `dart:developer`'s `log()`. That call is **not** stripped
/// from release builds, so every signed-in user's token was readable from the
/// device with `adb logcat`.
///
/// This is a source-level guard rather than a behavioural one on purpose:
/// `kDebugMode` is a compile-time constant that is always `true` under
/// `flutter test`, so no runtime assertion can prove what a release build
/// omits. What can be proven, and what actually regressed here, is that the
/// forbidden pattern is absent and the guard is present.
void main() {
  final source = File('lib/features/auth/data/auth_repository.dart');

  late String contents;

  setUpAll(() {
    expect(source.existsSync(), isTrue,
        reason: 'auth_repository.dart moved — update this guard');
    contents = source.readAsStringSync();
  });

  group('AuthRepository logging', () {
    test('never interpolates a response body into a log', () {
      expect(contents, isNot(contains(r'data=${response.data}')),
          reason: 'response.data carries the session token');
      expect(contents, isNot(contains(r'$data')),
          reason: 'an undecoded body is a token carrier too');
    });

    test('routes every log through the kDebugMode-guarded helper', () {
      // Exactly one raw `developer.log` call may exist: the one inside the
      // helper. Anything else is an ungated path back into release builds.
      final rawLogCalls = 'developer.log('.allMatches(contents).length;
      expect(rawLogCalls, 1,
          reason: 'log() must only be reached through _logDebug');

      expect(contents, contains('if (kDebugMode)'));
      expect(contents, contains("import 'package:flutter/foundation.dart';"));
    });

    test('still logs status and shape, so failures remain diagnosable', () {
      expect(contents, contains(r'status=${response.statusCode}'));
      expect(contents, contains(r'type=${response.data.runtimeType}'));
    });

    test('logs no credential field by name', () {
      for (final forbidden in [
        r'$password',
        r'${password}',
        'session.token}',
      ]) {
        expect(contents, isNot(contains(forbidden)),
            reason: '$forbidden would put a credential in the log');
      }
    });
  });
}
