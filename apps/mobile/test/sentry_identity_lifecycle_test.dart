import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/data/auth_repository.dart';
import 'package:mobile/features/auth/data/models/session_model.dart';
import 'package:mobile/features/auth/data/models/user_model.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';

/// MB-2 — the crash-reporting identity lifecycle.
///
/// The companion to `cookie_jar_purge_test.dart`: that one proves sign-out
/// leaves no session bytes on disk, this one proves it leaves no *attribution*
/// behind either. Both guard the same rule — after sign-out nothing on the
/// device says who was signed in.
///
/// The notifier is driven through a fake repository, and
/// [CrashReportingIdentity.apply] is swapped for a recorder. `SentryConstants`
/// is compile-time disabled under `flutter test`, so the real sink is a no-op
/// and asserting on Sentry's own scope is not possible here.
SessionModel _session(String userId) => SessionModel(
      session: const SessionData(token: 'session-token'),
      user: UserModel(id: userId, name: 'Test User', email: 'test@example.com'),
    );

class _FakeAuthRepository implements AuthRepository {
  _FakeAuthRepository({this.session});

  /// What `getSession`, `signIn` and `signUp` return. `null` models both "no
  /// stored session" and "bad credentials".
  SessionModel? session;

  /// When set, `signOut` throws it — the backend-unreachable path.
  Object? signOutError;

  int signOutCalls = 0;

  @override
  Future<SessionModel?> getSession() async => session;

  @override
  Future<SessionModel?> signIn({
    required String email,
    required String password,
  }) async =>
      session;

  @override
  Future<SessionModel?> signUp({
    required String email,
    required String password,
    required String name,
  }) async =>
      session;

  @override
  Future<void> signOut() async {
    signOutCalls++;
    final error = signOutError;
    if (error != null) throw error;
  }
}

void main() {
  /// Every id handed to the crash reporter, in order. `null` is a clear.
  final applied = <String?>[];

  setUp(() {
    applied.clear();
    CrashReportingIdentity.apply = applied.add;
  });

  tearDown(CrashReportingIdentity.reset);

  ProviderContainer containerFor(_FakeAuthRepository repository) =>
      ProviderContainer.test(
        overrides: [authRepositoryProvider.overrideWithValue(repository)],
      );

  group('authenticated states attach the user id', () {
    test('a restored session identifies the user on launch', () async {
      final repository = _FakeAuthRepository(session: _session('user-restored'));
      final container = containerFor(repository);

      await container.read(authStateProvider.future);

      // The regression this closes: identity used to be set only by signIn(),
      // so a warm launch reported crashes anonymously.
      expect(applied, ['user-restored']);
    });

    test('sign-up identifies the user, same as sign-in', () async {
      final repository = _FakeAuthRepository();
      final container = containerFor(repository);
      await container.read(authStateProvider.future);
      applied.clear();

      repository.session = _session('user-signed-up');
      await container.read(authStateProvider.notifier).signUp(
            email: 'test@example.com',
            password: 'password123',
            name: 'Test User',
          );

      expect(applied, ['user-signed-up']);
    });

    test('sign-in identifies the user', () async {
      final repository = _FakeAuthRepository();
      final container = containerFor(repository);
      await container.read(authStateProvider.future);
      applied.clear();

      repository.session = _session('user-signed-in');
      await container.read(authStateProvider.notifier).signIn(
            email: 'test@example.com',
            password: 'password123',
          );

      expect(applied, ['user-signed-in']);
    });

    test('no stored session leaves nobody identified', () async {
      final container = containerFor(_FakeAuthRepository());

      await container.read(authStateProvider.future);

      expect(applied, [null]);
    });
  });

  group('unauthenticated states clear the user', () {
    test('sign-out clears the identity', () async {
      final repository = _FakeAuthRepository(session: _session('user-1'));
      final container = containerFor(repository);
      await container.read(authStateProvider.future);
      applied.clear();

      await container.read(authStateProvider.notifier).signOut();

      expect(applied, [null]);
    });

    test('sign-out clears the identity even when the backend call throws',
        () async {
      final repository = _FakeAuthRepository(session: _session('user-1'));
      repository.signOutError = StateError('backend unreachable');
      final container = containerFor(repository);
      await container.read(authStateProvider.future);
      applied.clear();

      await expectLater(
        container.read(authStateProvider.notifier).signOut(),
        throwsStateError,
      );

      // The `finally` path: the device is signed out regardless, so the
      // identity has to go with it or the next user inherits it.
      expect(repository.signOutCalls, 1);
      expect(applied, [null]);
    });

    test('a rejected sign-in does not leave the previous user attached',
        () async {
      final repository = _FakeAuthRepository(session: _session('user-1'));
      final container = containerFor(repository);
      await container.read(authStateProvider.future);
      applied.clear();

      repository.session = null; // bad credentials
      await container.read(authStateProvider.notifier).signIn(
            email: 'test@example.com',
            password: 'wrong-password',
          );

      expect(applied, [null]);
    });
  });

  group('only the id is ever sent', () {
    // The sink's signature is `void Function(String?)`, so it structurally
    // cannot carry an email or a username. This guards the one place that
    // signature is turned back into a Sentry user, which a test cannot observe
    // because the SDK is compile-time disabled here.
    final source = File(
      'lib/features/auth/presentation/providers/auth_provider.dart',
    ).readAsStringSync();

    test('the SentryUser is constructed with an id and nothing else', () {
      expect(source, contains('SentryUser(id: userId)'));
      for (final field in const ['email:', 'username:', 'ipAddress:', 'name:']) {
        expect(
          RegExp('SentryUser\\([^)]*$field').hasMatch(source),
          isFalse,
          reason: 'SentryUser must carry the correlation id only, not "$field"',
        );
      }
    });

    test('the scope is cleared with a null user, not a blank one', () {
      expect(source, contains('scope.setUser(userId == null ? null'));
    });
  });
}
