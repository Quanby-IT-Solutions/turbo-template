import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/core/navigation/app_router.dart';
import 'package:mobile/services/analytics/analytics_screens.dart';
import 'package:persistent_bottom_nav_bar_v2/persistent_bottom_nav_bar_v2.dart';

/// Screen names for PostHog `$screen` events.
///
/// The four tabs live inside one route (`/`), so the route observer alone
/// would name every tab the same. Tab taps are recorded separately, and the
/// root route is named after the tab it always opens on.
void main() {
  /// Every screen name handed to analytics, in order.
  final screens = <String>[];

  setUp(() {
    screens.clear();
    AnalyticsScreens.apply = screens.add;
  });

  tearDown(AnalyticsScreens.reset);

  NavBarConfig config({required int selectedIndex, required List<int> taps}) =>
      NavBarConfig(
        selectedIndex: selectedIndex,
        items: [
          for (final title in ['Home', 'Todos', 'Profile', 'Settings'])
            ItemConfig(icon: const Icon(Icons.circle), title: title),
        ],
        onItemSelected: taps.add,
      );

  test('the root route is named after the first tab', () {
    expect(
      AnalyticsScreens.nameFor(const RouteSettings(name: AppRoutes.home)),
      '/home',
    );
  });

  test('other routes keep their path', () {
    expect(
      AnalyticsScreens.nameFor(const RouteSettings(name: AppRoutes.login)),
      AppRoutes.login,
    );
  });

  test('a tab tap records that tab and still switches tabs', () {
    final taps = <int>[];
    final wrapped = AnalyticsScreens.recordTabTaps(
      config(selectedIndex: 0, taps: taps),
    );

    wrapped.onItemSelected(3);

    expect(screens, ['/settings']);
    expect(taps, [3]);
  });

  test('tapping the tab already shown records nothing', () {
    final taps = <int>[];
    final wrapped = AnalyticsScreens.recordTabTaps(
      config(selectedIndex: 1, taps: taps),
    );

    wrapped.onItemSelected(1);

    expect(screens, isEmpty);
    expect(taps, [1]);
  });

  test('one screen name per tab', () {
    expect(AnalyticsScreens.tabs, ['/home', '/todos', '/profile', '/settings']);
  });
}
