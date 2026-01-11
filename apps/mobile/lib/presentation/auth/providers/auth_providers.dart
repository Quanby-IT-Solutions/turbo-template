import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/data/repositories/auth_repository.dart';
import 'package:mobile/domain/entities/two_factor_challenge.dart';
import 'package:mobile/domain/entities/user.dart';
import 'package:mobile/core/utils/app_router.dart';

// Repository provider - using real backend with Better Auth
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return AuthRepository();
});

class TwoFactorChallengeNotifier extends Notifier<TwoFactorChallenge?> {
  @override
  TwoFactorChallenge? build() => null;

  void setChallenge(TwoFactorChallenge? challenge) => state = challenge;

  void clear() => state = null;
}

final twoFactorChallengeProvider =
    NotifierProvider<TwoFactorChallengeNotifier, TwoFactorChallenge?>(
      TwoFactorChallengeNotifier.new,
    );

// Auth state notifier
class AuthNotifier extends AsyncNotifier<User?> {
  AuthRepository get _authRepository => ref.read(authRepositoryProvider);

  @override
  Future<User?> build() async {
    final cachedUser = await _authRepository.getStoredUser();

    if (cachedUser != null) {
      // Trigger async revalidation but allow cached user to render immediately.
      unawaited(_revalidateSession());
      return cachedUser;
    }

    return _revalidateSession();
  }

  Future<User?> _revalidateSession() async {
    try {
      final user = await _authRepository.refreshSession();
      if (user != null) {
        ref.read(twoFactorChallengeProvider.notifier).clear();
        // Update router with user role for role-based navigation guards
        updateRouterUserRole(user.role);
      } else {
        // Clear role if no user
        updateRouterUserRole(null);
      }
      state = AsyncData(user);
      return user;
    } catch (error, stack) {
      state = AsyncError(error, stack);
      return null;
    }
  }

  Future<void> login(String email, String password) async {
    state = const AsyncLoading();
    try {
      final user = await _authRepository.login(email, password);
      ref.read(twoFactorChallengeProvider.notifier).clear();
      // Update router with user role for role-based navigation guards
      updateRouterUserRole(user.role);
      state = AsyncData(user);
    } on TwoFactorRequiredException catch (challenge) {
      ref
          .read(twoFactorChallengeProvider.notifier)
          .setChallenge(challenge.challenge);
      state = const AsyncData(null);
    } catch (error, stack) {
      ref.read(twoFactorChallengeProvider.notifier).clear();
      state = AsyncError(error, stack);
    }
  }

  Future<void> signup({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    required String role,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() async {
      final user = await _authRepository.signup(
        email: email,
        password: password,
        firstName: firstName,
        lastName: lastName,
        role: role,
      );
      ref.read(twoFactorChallengeProvider.notifier).clear();
      // Update router with user role for role-based navigation guards
      updateRouterUserRole(user.role);
      return user;
    });
  }

  Future<void> logout() async {
    await _authRepository.logout();
    // Clear user role from router
    updateRouterUserRole(null);
    state = const AsyncData(null);
    ref.read(twoFactorChallengeProvider.notifier).clear();
  }

  Future<void> refreshUser() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(_revalidateSession);
  }

  void setAuthenticatedUser(User user) {
    ref.read(twoFactorChallengeProvider.notifier).clear();
    // Update router with user role for role-based navigation guards
    updateRouterUserRole(user.role);
    state = AsyncData(user);
  }

  void clearTwoFactorChallenge() {
    ref.read(twoFactorChallengeProvider.notifier).clear();
  }

  Future<void> enableTwoFactor(String password) async {
    try {
      await _authRepository.enableTwoFactor(password);
      ref.read(twoFactorChallengeProvider.notifier).clear();
      final updatedUser = await _authRepository.getStoredUser();
      state = AsyncData(updatedUser);
    } catch (error, stack) {
      state = AsyncError(error, stack);
      rethrow;
    }
  }

  Future<void> disableTwoFactor(String password) async {
    try {
      await _authRepository.disableTwoFactor(password);
      ref.read(twoFactorChallengeProvider.notifier).clear();
      final updatedUser = await _authRepository.getStoredUser();
      state = AsyncData(updatedUser);
    } catch (error, stack) {
      state = AsyncError(error, stack);
      rethrow;
    }
  }

  Future<void> requestTwoFactorOtp({bool trustDevice = false}) async {
    try {
      await _authRepository.sendTwoFactorOtp(trustDevice: trustDevice);
    } catch (error, stack) {
      Error.throwWithStackTrace(error, stack);
    }
  }

  Future<User> verifyTwoFactorOtp(
    String code, {
    bool trustDevice = false,
  }) async {
    try {
      final user = await _authRepository.verifyTwoFactorOtp(
        code,
        trustDevice: trustDevice,
      );
      ref.read(twoFactorChallengeProvider.notifier).clear();
      state = AsyncData(user);
      return user;
    } catch (error, stack) {
      state = AsyncError(error, stack);
      rethrow;
    }
  }
}

// Auth provider
final authProvider = AsyncNotifierProvider<AuthNotifier, User?>(
  AuthNotifier.new,
);

// Current user provider
final currentUserProvider = Provider<User?>((ref) {
  final authState = ref.watch(authProvider);
  return authState.value;
});

// Is authenticated provider
final isAuthenticatedProvider = Provider<bool>((ref) {
  final user = ref.watch(currentUserProvider);
  return user != null;
});

// User role provider
final userRoleProvider = Provider<String?>((ref) {
  final user = ref.watch(currentUserProvider);
  return user?.role;
});

// Track whether the authenticated user is a doctor
final isDoctorProvider = Provider<bool>((ref) {
  final user = ref.watch(currentUserProvider);
  return user?.isDoctor ?? false;
});

// Track whether the authenticated user is a patient
final isPatientProvider = Provider<bool>((ref) {
  final user = ref.watch(currentUserProvider);
  return user?.isPatient ?? false;
});

final authErrorProvider = Provider<String?>((ref) {
  final authState = ref.watch(authProvider);
  return authState.when(
    data: (_) => null,
    loading: () => null,
    error: (error, _) => _mapError(error),
  );
});

String? _mapError(Object error) {
  final message = error.toString();
  if (message.contains('401')) {
    return 'Invalid email or password. Please try again.';
  }
  if (message.contains('Network')) {
    return 'Network error. Check your connection and retry.';
  }
  return message.replaceFirst('Exception: ', '');
}
