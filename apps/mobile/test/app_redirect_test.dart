import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/navigation/app_router.dart';

/// The router's redirect rules.
///
/// The case that motivated the startup route: a signed-in user's cold start.
/// The router used to treat "session still loading" as signed out, so it
/// showed /login (and PostHog recorded it) until the session check answered,
/// then jumped to Home.
void main() {
  String? redirect(
    String location, {
    bool onboardingDone = true,
    bool sessionChecked = true,
    bool authenticated = false,
  }) => appRedirect(
    location: location,
    onboardingDone: onboardingDone,
    sessionChecked: sessionChecked,
    authenticated: authenticated,
  );

  group('before the first session check answers', () {
    test('a launch waits on the startup screen, not on /login', () {
      expect(
        redirect(AppRoutes.home, sessionChecked: false),
        AppRoutes.startup,
      );
    });

    test('the startup screen stays put', () {
      expect(redirect(AppRoutes.startup, sessionChecked: false), isNull);
    });

    test('onboarding still comes first on a fresh install', () {
      expect(
        redirect(AppRoutes.home, onboardingDone: false, sessionChecked: false),
        AppRoutes.onboarding,
      );
    });
  });

  group('once the first session check answers', () {
    test('signed in: startup goes to Home', () {
      expect(redirect(AppRoutes.startup, authenticated: true), AppRoutes.home);
    });

    test('signed out: startup goes to /login', () {
      expect(redirect(AppRoutes.startup), AppRoutes.login);
    });
  });

  group('unchanged rules', () {
    test('onboarding not done forces onboarding', () {
      expect(
        redirect(AppRoutes.login, onboardingDone: false),
        AppRoutes.onboarding,
      );
      expect(redirect(AppRoutes.onboarding, onboardingDone: false), isNull);
    });

    test('finished onboarding leaves the onboarding route', () {
      expect(redirect(AppRoutes.onboarding), AppRoutes.login);
      expect(
        redirect(AppRoutes.onboarding, authenticated: true),
        AppRoutes.home,
      );
    });

    test('signed out is sent to /login, except register', () {
      expect(redirect(AppRoutes.home), AppRoutes.login);
      expect(redirect(AppRoutes.login), isNull);
      expect(redirect(AppRoutes.register), isNull);
    });

    test('signed in leaves the auth routes for Home', () {
      expect(redirect(AppRoutes.login, authenticated: true), AppRoutes.home);
      expect(redirect(AppRoutes.register, authenticated: true), AppRoutes.home);
      expect(redirect(AppRoutes.home, authenticated: true), isNull);
    });
  });
}
