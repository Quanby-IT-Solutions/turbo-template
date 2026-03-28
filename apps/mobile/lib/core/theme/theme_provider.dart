import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/theme/flex_theme_config.dart';
import 'package:mobile/services/storage/theme_storage_service.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'theme_provider.g.dart';

/// State class holding the current theme configuration.
class ThemeState {
  const ThemeState({
    required this.themeMode,
    required this.colorScheme,
  });

  final ThemeMode themeMode;
  final AppColorScheme colorScheme;

  /// Creates a default theme state.
  factory ThemeState.defaults() => const ThemeState(
        themeMode: FlexThemeConfig.defaultThemeMode,
        colorScheme: FlexThemeConfig.defaultColorScheme,
      );

  /// Creates a copy with the given fields replaced.
  ThemeState copyWith({
    ThemeMode? themeMode,
    AppColorScheme? colorScheme,
  }) {
    return ThemeState(
      themeMode: themeMode ?? this.themeMode,
      colorScheme: colorScheme ?? this.colorScheme,
    );
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is ThemeState &&
        other.themeMode == themeMode &&
        other.colorScheme == colorScheme;
  }

  @override
  int get hashCode => Object.hash(themeMode, colorScheme);
}

/// Provider for the theme state with persistence.
@Riverpod(keepAlive: true)
class ThemeController extends _$ThemeController {
  late ThemeStorageService _storageService;

  @override
  ThemeState build() {
    _storageService = ref.watch(themeStorageServiceProvider);

    // Load persisted preferences
    final savedThemeMode = _storageService.getThemeMode();
    final savedColorScheme = _storageService.getColorScheme();

    return ThemeState(
      themeMode: savedThemeMode ?? FlexThemeConfig.defaultThemeMode,
      colorScheme: savedColorScheme ?? FlexThemeConfig.defaultColorScheme,
    );
  }

  /// Sets the theme mode and persists the preference.
  Future<void> setThemeMode(ThemeMode mode) async {
    await _storageService.setThemeMode(mode);
    state = state.copyWith(themeMode: mode);
  }

  /// Sets the color scheme and persists the preference.
  Future<void> setColorScheme(AppColorScheme scheme) async {
    await _storageService.setColorScheme(scheme);
    state = state.copyWith(colorScheme: scheme);
  }

  /// Resets all theme preferences to defaults.
  Future<void> resetToDefaults() async {
    await _storageService.clearPreferences();
    state = ThemeState.defaults();
  }
}

/// Provider for the current theme mode.
@riverpod
ThemeMode themeMode(Ref ref) {
  return ref.watch(themeControllerProvider).themeMode;
}

/// Provider for the current color scheme.
@riverpod
AppColorScheme appColorScheme(Ref ref) {
  return ref.watch(themeControllerProvider).colorScheme;
}

/// Provider for the light theme based on the current color scheme.
@riverpod
ThemeData lightTheme(Ref ref) {
  final colorScheme = ref.watch(appColorSchemeProvider);
  return FlexThemeConfig.light(colorScheme);
}

/// Provider for the dark theme based on the current color scheme.
@riverpod
ThemeData darkTheme(Ref ref) {
  final colorScheme = ref.watch(appColorSchemeProvider);
  return FlexThemeConfig.dark(colorScheme);
}

/// Provider that returns a display name for the current theme mode.
@riverpod
String themeModeDisplayName(Ref ref) {
  final mode = ref.watch(themeModeProvider);
  return switch (mode) {
    ThemeMode.system => 'System',
    ThemeMode.light => 'Light',
    ThemeMode.dark => 'Dark',
    _ => 'System',
  };
}
