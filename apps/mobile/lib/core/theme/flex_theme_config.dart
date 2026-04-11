import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/material.dart';

/// Available color scheme choices for the app theme.
enum AppColorScheme {
  blue,
  green,
  purple,
  red,
  orange,
  indigo,
}

/// Helper that maps [AppColorScheme] to [FlexScheme] values and builds
/// [ThemeData] instances via `flex_color_scheme`.
class FlexThemeConfig {
  FlexThemeConfig._();

  static const ThemeMode defaultThemeMode = ThemeMode.system;
  static const AppColorScheme defaultColorScheme = AppColorScheme.blue;

  static FlexScheme _toFlex(AppColorScheme scheme) {
    return switch (scheme) {
      AppColorScheme.blue => FlexScheme.blue,
      AppColorScheme.green => FlexScheme.green,
      AppColorScheme.purple => FlexScheme.purpleBrown,
      AppColorScheme.red => FlexScheme.red,
      AppColorScheme.orange => FlexScheme.mango,
      AppColorScheme.indigo => FlexScheme.indigo,
    };
  }

  /// Builds a light [ThemeData] for the given colour scheme.
  static ThemeData light(AppColorScheme scheme) {
    return FlexThemeData.light(
      scheme: _toFlex(scheme),
      useMaterial3: true,
      appBarStyle: FlexAppBarStyle.surface,
    );
  }

  /// Builds a dark [ThemeData] for the given colour scheme.
  static ThemeData dark(AppColorScheme scheme) {
    return FlexThemeData.dark(
      scheme: _toFlex(scheme),
      useMaterial3: true,
      appBarStyle: FlexAppBarStyle.surface,
    );
  }
}
