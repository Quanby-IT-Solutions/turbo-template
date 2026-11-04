import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:mobile/core/constants/posthog_constants.dart';
import 'package:mobile/core/constants/sentry_constants.dart';
import 'package:mobile/core/widgets/startup_screen.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/auth/presentation/screens/login_screen.dart';
import 'package:mobile/features/auth/presentation/screens/register_screen.dart';
import 'package:mobile/features/home/presentation/screens/home_screen.dart';
import 'package:mobile/features/onboarding/presentation/providers/onboarding_provider.dart';
import 'package:mobile/features/onboarding/presentation/screens/onboarding_screen.dart';
import 'package:mobile/services/analytics/analytics_screens.dart';
import 'package:posthog_flutter/posthog_flutter.dart';
import 'package:sentry_flutter/sentry_flutter.dart';

part 'app_router.g.dart';

/// Named route paths used across the app.
class AppRoutes {
  AppRoutes._();

  static const onboarding = '/onboarding';
  static const login = '/login';
  static const register = '/register';
  static const home = '/';

  /// Shown only until the launch's first session check answers.
  static const startup = '/startup';
}

/// Where the router sends [location], or `null` to stay.
///
/// [sessionChecked] is whether the launch's first session check has answered.
/// Until it has, signed in and signed out cannot be told apart, so the app
/// waits on [AppRoutes.startup] instead of guessing /login. Later loading
/// states (sign-in, sign-out) count as signed out, as before: sign-out relies
/// on /login showing at once.
String? appRedirect({
  required String location,
  required bool onboardingDone,
  required bool sessionChecked,
  required bool authenticated,
}) {
  final isOnOnboarding = location == AppRoutes.onboarding;
  final isOnStartup = location == AppRoutes.startup;
  final isOnAuthRoute =
      location == AppRoutes.login || location == AppRoutes.register;

  // 1. Not done with onboarding → force onboarding. It needs no session.
  if (!onboardingDone) {
    return isOnOnboarding ? null : AppRoutes.onboarding;
  }

  // 2. First session check still running → wait on the startup screen.
  if (!sessionChecked) {
    return isOnStartup ? null : AppRoutes.startup;
  }

  // 3. Done with onboarding or startup → wherever the session says.
  if (isOnOnboarding || isOnStartup) {
    return authenticated ? AppRoutes.home : AppRoutes.login;
  }

  // 4. Not authenticated → force login (except register).
  if (!authenticated) {
    return isOnAuthRoute ? null : AppRoutes.login;
  }

  // 5. Authenticated but on auth route → go home.
  if (isOnAuthRoute) {
    return AppRoutes.home;
  }

  return null;
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

  // Whether the launch's first session check has answered (with a session, no
  // session, or an error). Set once and never cleared: later loading states
  // are sign-in and sign-out, which keep their old handling.
  var sessionChecked = !ref.read(authStateProvider).isLoading;

  ref.listen(authStateProvider, (_, next) {
    if (!next.isLoading) sessionChecked = true;
    refreshNotifier.value++;
  });
  ref.listen(hasCompletedOnboardingProvider, (_, _) {
    refreshNotifier.value++;
  });

  final router = GoRouter(
    initialLocation: AppRoutes.home,
    debugLogDiagnostics: true,
    refreshListenable: refreshNotifier,
    // Route names become navigation breadcrumbs, so a crash report shows the
    // screens the user passed through, and PostHog screen views. Each
    // observer exists only in a build with its own defines; with neither, the
    // list is empty and no observer is constructed at all.
    observers: [
      if (SentryConstants.isEnabled) SentryNavigatorObserver(),
      if (PosthogConstants.isEnabled)
        PosthogObserver(nameExtractor: AnalyticsScreens.nameFor),
    ],
    redirect: (context, state) {
      final authState = ref.read(authStateProvider);
      return appRedirect(
        location: state.matchedLocation,
        onboardingDone: ref.read(hasCompletedOnboardingProvider),
        sessionChecked: sessionChecked,
        authenticated: !authState.isLoading && authState.value != null,
      );
    },
    routes: [
      GoRoute(
        path: AppRoutes.startup,
        builder: (context, state) => const StartupScreen(),
      ),
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
    errorBuilder: (context, state) =>
        Scaffold(body: Center(child: Text('Page not found: ${state.uri}'))),
  );

  ref.onDispose(() {
    refreshNotifier.dispose();
    router.dispose();
  });

  return router;
}
