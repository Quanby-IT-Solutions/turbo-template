import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:mobile/core/constants/posthog_constants.dart';
import 'package:mobile/core/constants/sentry_constants.dart';
import 'package:mobile/features/auth/data/auth_repository.dart';
import 'package:mobile/features/auth/data/models/session_model.dart';
import 'package:mobile/features/auth/data/models/user_model.dart';
import 'package:posthog_flutter/posthog_flutter.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

part 'auth_provider.g.dart';

/// Receives the crash-reporting identity: a user id, or `null` to clear it.
typedef CrashReportingIdentitySink = void Function(String? userId);

/// The seam between [AuthState] and the crash reporter's user scope.
///
/// [SentryConstants.isEnabled] is a compile-time constant that is `false` under
/// `flutter test` (the defines are only passed to release builds), so calling
/// `Sentry.configureScope` straight from the notifier would leave the
/// privacy-critical half of this feature — set on authentication, *cleared* on
/// sign-out — with nothing a test could observe. Tests swap [apply] and restore
/// it with [reset].
class CrashReportingIdentity {
  CrashReportingIdentity._();

  /// The active sink. Production code never reassigns this; see [reset].
  static CrashReportingIdentitySink apply = sentrySink;

  /// Attaches the signed-in user's id to crash reports, or clears it.
  ///
  /// The id and nothing else. Email and username are never set — an id is a
  /// correlation key, an email is PII (and is on the shared redaction list).
  static void sentrySink(String? userId) {
    if (!SentryConstants.isEnabled) return;
    Sentry.configureScope(
      (scope) => scope.setUser(userId == null ? null : SentryUser(id: userId)),
    );
  }

  /// Restores [sentrySink]. Test teardown only.
  @visibleForTesting
  static void reset() => apply = sentrySink;
}

/// Receives the analytics identity: a user id, or `null` to reset it.
typedef AnalyticsIdentitySink = void Function(String? userId);

/// The seam between [AuthState] and PostHog's identity, shaped exactly like
/// [CrashReportingIdentity] and for the same reason: [PosthogConstants] is
/// compile-time disabled under `flutter test`, so tests swap [apply].
class AnalyticsIdentity {
  AnalyticsIdentity._();

  /// The active sink. Production code never reassigns this; see [reset].
  static AnalyticsIdentitySink apply = posthogSink;

  /// Identifies the signed-in user by id, or resets to a fresh anonymous id.
  ///
  /// The id and nothing else: no email or name goes to PostHog as a person
  /// property. Reset matters as much as identify. Without it, the next person
  /// to sign in on this device would be merged into the previous one.
  static void posthogSink(String? userId) {
    if (!PosthogConstants.isEnabled) return;
    if (userId == null) {
      Posthog().reset();
    } else {
      Posthog().identify(userId: userId);
    }
  }

  /// Restores [posthogSink]. Test teardown only.
  @visibleForTesting
  static void reset() => apply = posthogSink;
}

@Riverpod(keepAlive: true)
class AuthState extends _$AuthState {
  @override
  Future<SessionModel?> build() async {
    // A restored session is an authenticated state like any other. Syncing only
    // after signIn() left every already-signed-in user — the common case on a
    // warm launch — reporting crashes anonymously.
    try {
      final session = await ref.read(authRepositoryProvider).getSession();
      _syncIdentity(session);
      return session;
    } catch (_) {
      _syncIdentity(null);
      rethrow;
    }
  }

  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(authRepositoryProvider).signIn(
            email: email,
            password: password,
          ),
    );

    _syncIdentity(state.hasValue ? state.value : null);
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String name,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(authRepositoryProvider).signUp(
            email: email,
            password: password,
            name: name,
          ),
    );

    // Sign-up returns the same authenticated SessionModel as sign-in, so it is
    // the same identity transition.
    _syncIdentity(state.hasValue ? state.value : null);
  }

  Future<void> signOut() async {
    state = const AsyncLoading();
    try {
      await ref.read(authRepositoryProvider).signOut();
    } finally {
      // Always clear local session even if the backend call fails,
      // so the user is logged out on the device.
      state = const AsyncData(null);

      // Same reasoning as the cookie-jar purge: sign-out must leave no
      // trace of who was signed in. A stale identity here would attach the
      // previous user's id to whatever the *next* user crashes on.
      _syncIdentity(null);
    }
  }

  /// Mirrors the current authenticated state into the crash reporter and
  /// into analytics.
  ///
  /// Every transition routes through here — restore, sign-in, sign-up, sign-out
  /// and the failure paths of each — so an unauthenticated outcome clears the
  /// identity rather than leaving the previous user's id attached.
  void _syncIdentity(SessionModel? session) {
    final userId = session?.user.id;
    CrashReportingIdentity.apply(userId);
    AnalyticsIdentity.apply(userId);
  }
}

@riverpod
bool isAuthenticated(Ref ref) {
  final authState = ref.watch(authStateProvider);
  return authState.value != null;
}

@riverpod
UserModel? currentUser(Ref ref) {
  final authState = ref.watch(authStateProvider);
  return authState.value?.user;
}
