import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

/// Navigation helper with smooth animated transitions
class NavigationHelper {
  /// Navigate with a smooth slide transition
  static void slideToPage(
    BuildContext context,
    String route, {
    Object? extra,
    Map<String, String> pathParameters = const {},
    Map<String, dynamic> queryParameters = const {},
  }) {
    context.pushNamed(
      route,
      extra: extra,
      pathParameters: pathParameters,
      queryParameters: queryParameters,
    );
  }

  /// Navigate and replace current page with smooth transition
  static void replaceWithSlide(
    BuildContext context,
    String route, {
    Object? extra,
    Map<String, String> pathParameters = const {},
    Map<String, dynamic> queryParameters = const {},
  }) {
    context.goNamed(
      route,
      extra: extra,
      pathParameters: pathParameters,
      queryParameters: queryParameters,
    );
  }

  /// Pop with smooth transition
  static void popWithAnimation(BuildContext context) {
    if (context.canPop()) {
      context.pop();
    }
  }

  /// Navigate to home with scale animation
  static void goToHome(BuildContext context) {
    context.goNamed('patient-home');
  }

  /// Navigate to profile with slide animation
  static void goToProfile(BuildContext context) {
    context.pushNamed('profile');
  }

  /// Navigate to profile edit with slide up animation
  static void goToProfileEdit(BuildContext context) {
    context.pushNamed('profile-edit');
  }

  /// Navigate to appointments with appropriate animation
  static void goToAppointments(BuildContext context) {
    context.pushNamed('appointment-requests');
  }

  /// Navigate to doctor search with scale animation
  static void goToDoctorSearch(BuildContext context) {
    context.pushNamed('doctor-search');
  }

  /// Navigate to medical records with fade animation
  static void goToMedicalRecords(BuildContext context) {
    context.pushNamed('medical-records');
  }

  /// Navigate to notifications with slide animation
  static void goToNotifications(BuildContext context) {
    context.pushNamed('notifications');
  }

  /// Navigate to video call with slide up animation (urgent feel)
  static void goToVideoCall(BuildContext context) {
    context.pushNamed('video-call');
  }

  /// Navigate back to login (for logout)
  static void goToLogin(BuildContext context) {
    context.goNamed('login');
  }

  /// Navigate to onboarding
  static void goToOnboarding(BuildContext context) {
    context.goNamed('onboarding');
  }

  /// Navigation with custom transition parameters
  static void navigateWithCustomTransition(
    BuildContext context,
    String routeName, {
    Object? extra,
    Map<String, String> pathParameters = const {},
    Map<String, dynamic> queryParameters = const {},
  }) {
    context.pushNamed(
      routeName,
      extra: extra,
      pathParameters: pathParameters,
      queryParameters: queryParameters,
    );
  }
}

/// Extension methods for easier navigation
extension NavigationExtensions on BuildContext {
  /// Quick slide navigation
  void slideToRoute(String route) {
    NavigationHelper.slideToPage(this, route);
  }

  /// Quick pop with animation
  void popAnimated() {
    NavigationHelper.popWithAnimation(this);
  }

  /// Quick home navigation
  void goHome() {
    NavigationHelper.goToHome(this);
  }

  /// Quick profile navigation
  void goProfile() {
    NavigationHelper.goToProfile(this);
  }
}

/// Smooth navigation mixin for widgets
mixin SmoothNavigation {
  /// Navigate with smooth animation
  void navigateSmooth(
    BuildContext context,
    String route, {
    Object? extra,
    bool replace = false,
  }) {
    if (replace) {
      NavigationHelper.replaceWithSlide(context, route, extra: extra);
    } else {
      NavigationHelper.slideToPage(context, route, extra: extra);
    }
  }

  /// Pop with smooth animation
  void popSmooth(BuildContext context) {
    NavigationHelper.popWithAnimation(context);
  }
}

/// Common navigation patterns for Q-Health app
class QHealthNavigation {
  /// Authentication flow navigation
  static void toLogin(BuildContext context) => context.goNamed('login');
  static void toSignup(BuildContext context) => context.pushNamed('signup');
  static void toOnboarding(BuildContext context) =>
      context.goNamed('onboarding');

  /// Main app navigation
  static void toHome(BuildContext context) => context.goNamed('patient-home');

  /// Feature navigation
  static void toProfile(BuildContext context) => context.pushNamed('profile');
  static void toMedicalRecords(BuildContext context) =>
      context.pushNamed('medical-records');
  static void toAppointments(BuildContext context) =>
      context.pushNamed('appointment-requests');
  static void toDoctorSearch(BuildContext context) =>
      context.pushNamed('doctor-search');
  static void toNotifications(BuildContext context) =>
      context.pushNamed('notifications');
  static void toVideoCall(BuildContext context) =>
      context.pushNamed('video-call');

  /// Emergency/urgent navigation
  static void toEmergencyCall(BuildContext context) {
    context.pushNamed('video-call');
  }

  /// Settings and profile
  static void toProfileEdit(BuildContext context) =>
      context.pushNamed('profile-edit');
  static void toSettings(BuildContext context) => context.pushNamed('profile');
}
