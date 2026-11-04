import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/features/auth/data/auth_repository.dart';
import 'package:mobile/features/auth/data/models/session_model.dart';
import 'package:mobile/features/auth/data/models/user_model.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';

/// The analytics identity lifecycle, the PostHog twin of
/// `sentry_identity_lifecycle_test.dart`.
///
/// Every authenticated state identifies the user by id; every unauthenticated
/// state resets, so the next person to sign in on this device is never merged
/// into the previous one. [AnalyticsIdentity.apply] is swapped for a recorder
/// because `PosthogConstants` is compile-time disabled under `flutter test`.
SessionModel _session(String userId) => SessionModel(
  session: const SessionData(token: 'session-token'),
  user: UserModel(id: userId, name: 'Test User', email: 'test@example.com'),
);

class _FakeAuthRepository implements AuthRepository {
  _FakeAuthRepository({this.session});

  /// What `getSession`, `signIn` and `signUp` return. `null` models both "no
  /// stored session" and "bad credentials".
  SessionModel? session;

  @override
  Future<SessionModel?> getSession() async => session;

  @override
  Future<SessionModel?> signIn({
    required String email,
    required String password,
  }) async => session;

  @override
  Future<SessionModel?> signUp({
    required String email,
    required String password,
    required String name,
  }) async => session;

  @override
  Future<void> signOut() async {}
}

void main() {
  /// Every id handed to analytics, in order. `null` is a reset.
  final analytics = <String?>[];

  /// The crash reporter's sequence, to prove both sinks see the same thing.
  final crash = <String?>[];

  setUp(() {
    analytics.clear();
    crash.clear();
    AnalyticsIdentity.apply = analytics.add;
    CrashReportingIdentity.apply = crash.add;
  });

  tearDown(() {
    AnalyticsIdentity.reset();
    CrashReportingIdentity.reset();
  });

  ProviderContainer containerFor(_FakeAuthRepository repository) =>
      ProviderContainer.test(
        overrides: [authRepositoryProvider.overrideWithValue(repository)],
      );

  Future<void> signIn(ProviderContainer container) => container
      .read(authStateProvider.notifier)
      .signIn(email: 'test@example.com', password: 'password123');

  test('restore identifies', () async {
    final container = containerFor(
      _FakeAuthRepository(session: _session('u1')),
    );

    await container.read(authStateProvider.future);

    expect(analytics, ['u1']);
  });

  test('sign-in identifies', () async {
    final repository = _FakeAuthRepository();
    final container = containerFor(repository);
    await container.read(authStateProvider.future);
    analytics.clear();

    repository.session = _session('u2');
    await signIn(container);

    expect(analytics, ['u2']);
  });

  test('sign-out resets', () async {
    final repository = _FakeAuthRepository(session: _session('u1'));
    final container = containerFor(repository);
    await container.read(authStateProvider.future);

    await container.read(authStateProvider.notifier).signOut();

    expect(analytics.last, isNull);
  });

  test('sign-out resets before listeners see any state change', () async {
    // The router listens to authStateProvider and treats the loading state as
    // signed out, so it redirects to /login on the first change sign-out
    // makes, and the PostHog observer captures that screen. If the reset came
    // after that change, the /login view would be recorded under the old user.
    final repository = _FakeAuthRepository(session: _session('u1'));
    final container = containerFor(repository);
    await container.read(authStateProvider.future);

    final identityAtEachChange = <String?>[];
    container.listen(authStateProvider, (_, _) {
      identityAtEachChange.add(analytics.last);
    });

    await container.read(authStateProvider.notifier).signOut();

    expect(identityAtEachChange, isNotEmpty);
    expect(identityAtEachChange, everyElement(isNull));
  });

  test('failed sign-in after sign-out resets', () async {
    final repository = _FakeAuthRepository(session: _session('u1'));
    final container = containerFor(repository);
    await container.read(authStateProvider.future);
    await container.read(authStateProvider.notifier).signOut();
    analytics.clear();

    repository.session = null; // bad credentials
    await signIn(container);

    expect(analytics, [null]);
  });

  test('crash identity still applied', () async {
    final repository = _FakeAuthRepository(session: _session('u1'));
    final container = containerFor(repository);
    await container.read(authStateProvider.future);
    await container.read(authStateProvider.notifier).signOut();

    expect(crash, analytics);
    expect(crash, ['u1', null]);
  });

  test('identify carries the id and nothing else', () {
    // The sink takes a String?, so it cannot carry an email or a name. This
    // guards the one place it is turned into a PostHog call.
    final source = File(
      'lib/features/auth/presentation/providers/auth_provider.dart',
    ).readAsStringSync();

    expect(source, contains('Posthog().identify(userId: id)'));
    expect(source, isNot(contains('userProperties')));
  });
}
