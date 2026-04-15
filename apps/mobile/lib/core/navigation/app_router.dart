import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:mobile/features/auth/presentation/screens/register_screen.dart';
import 'package:mobile/features/home/presentation/screens/home_screen.dart';
import 'package:mobile/features/onboarding/presentation/providers/onboarding_provider.dart';
import 'package:mobile/features/onboarding/presentation/screens/onboarding_screen.dart';

part 'app_router.g.dart';

/// Named route paths used across the app.
class AppRoutes {
  AppRoutes._();

  static const onboarding = '/onboarding';
  static const login = '/login';
  static const register = '/register';
  static const home = '/';
}

/// Provides the [GoRouter] instance configured with redirect logic
/// based on onboarding and authentication state.
///
/// Uses [refreshListenable] so the **same** GoRouter instance re-evaluates
/// its redirect whenever auth or onboarding state changes, instead of
/// recreating the router (which would not trigger a navigation).
@Riverpod(keepAlive: true)
GoRouter appRouter(Ref ref) {
  // A notifier that fires whenever auth or onboarding state changes,
  // telling GoRouter to re-run its redirect callback.
  final refreshNotifier = ValueNotifier<int>(0);

  ref.listen(authStateProvider, (_, _) {
    refreshNotifier.value++;
  });
  ref.listen(hasCompletedOnboardingProvider, (_, _) {
    refreshNotifier.value++;
  });

  final router = GoRouter(
    initialLocation: AppRoutes.home,
    debugLogDiagnostics: true,
    refreshListenable: refreshNotifier,
    redirect: (context, state) {
      final isOnboardingDone = ref.read(hasCompletedOnboardingProvider);
      final authState = ref.read(authStateProvider);
      final isAuthenticated =
          !authState.isLoading && authState.value != null;
      final isOnOnboarding = state.matchedLocation == AppRoutes.onboarding;
      final isOnLogin = state.matchedLocation == AppRoutes.login;
      final isOnRegister = state.matchedLocation == AppRoutes.register;
      final isOnAuthRoute = isOnLogin || isOnRegister;

      // 1. Not done with onboarding → force onboarding
      if (!isOnboardingDone) {
        return isOnOnboarding ? null : AppRoutes.onboarding;
      }

      // 2. Done with onboarding but still on onboarding page → go to login
      if (isOnOnboarding) {
        return isAuthenticated ? AppRoutes.home : AppRoutes.login;
      }

      // 3. Not authenticated → force login (except register)
      if (!isAuthenticated) {
        return isOnAuthRoute ? null : AppRoutes.login;
      }

      // 4. Authenticated but on auth route → go home
      if (isOnAuthRoute) {
        return AppRoutes.home;
      }

      return null;
    },
    routes: [
      GoRoute(
        path: AppRoutes.onboarding,
        builder: (context, state) => const OnboardingScreen(),
      ),
      GoRoute(
        path: AppRoutes.login,
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: AppRoutes.register,
        builder: (context, state) => const RegisterScreen(),
      ),
      GoRoute(
        path: AppRoutes.home,
        builder: (context, state) => const HomeScreen(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      body: Center(
        child: Text('Page not found: ${state.uri}'),
      ),
    ),
  );

  ref.onDispose(() {
    refreshNotifier.dispose();
    router.dispose();
  });

  return router;
}
