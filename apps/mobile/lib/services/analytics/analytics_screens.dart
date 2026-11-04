import 'package:flutter/widgets.dart';
import 'package:mobile/core/constants/posthog_constants.dart';
import 'package:mobile/core/navigation/app_router.dart';
import 'package:persistent_bottom_nav_bar_v2/persistent_bottom_nav_bar_v2.dart';
import 'package:posthog_flutter/posthog_flutter.dart';

/// Records one screen name.
typedef AnalyticsScreenSink = void Function(String name);

/// Screen names for PostHog `$screen` events.
///
/// The four tabs live inside one go_router route (`/`), so the route observer
/// alone would name every tab `root ('/')`. Two pieces fix that: the observer
/// names the root route after the tab it always opens on ([nameFor]), and the
/// bottom bar records each tab the user taps ([recordTabTaps]).
abstract final class AnalyticsScreens {
  /// One name per tab, in bottom-bar order. Keep in sync with HomeScreen.
  static const tabs = ['/home', '/todos', '/profile', '/settings'];

  /// The observer's name for a route: the root route is the Home tab, and the
  /// startup screen has none, so the observer skips it (it only covers the
  /// launch's first session check).
  static String? nameFor(RouteSettings settings) => switch (settings.name) {
    AppRoutes.home => tabs.first,
    AppRoutes.startup => null,
    final name => name,
  };

  /// The active sink. Production code never reassigns this; see [reset].
  static AnalyticsScreenSink apply = posthogSink;

  static void posthogSink(String name) {
    if (!PosthogConstants.isEnabled) return;
    Posthog().screen(screenName: name);
  }

  /// Wraps the bottom bar so a user's tap on another tab is recorded.
  ///
  /// Taps only: the feature tour switches tabs through the controller, which
  /// does not go through the bar, so a tour never counts as screen views.
  static NavBarConfig recordTabTaps(NavBarConfig config) => config.copyWith(
    onItemSelected: (index) {
      if (index != config.selectedIndex) apply(tabs[index]);
      config.onItemSelected(index);
    },
  );

  /// Restores [posthogSink]. Test teardown only.
  @visibleForTesting
  static void reset() => apply = posthogSink;
}
