import 'package:flutter/material.dart';
import 'package:mobile/core/theme/flex_theme_config.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'theme_storage_service.g.dart';

/// Service for persisting theme preferences (theme mode and color scheme)
/// to [SharedPreferences].
class ThemeStorageService {
  ThemeStorageService(this._prefs);

  final SharedPreferences _prefs;

  // ── Keys ──────────────────────────────────────────────────────────────────

  static const _themeModeKey = 'theme_mode';
  static const _colorSchemeKey = 'color_scheme';

  // ── Theme mode ────────────────────────────────────────────────────────────

  ThemeMode? getThemeMode() {
    final value = _prefs.getString(_themeModeKey);
    if (value == null) return null;
    return ThemeMode.values.firstWhere(
      (m) => m.name == value,
      orElse: () => FlexThemeConfig.defaultThemeMode,
    );
  }

  Future<void> setThemeMode(ThemeMode mode) =>
      _prefs.setString(_themeModeKey, mode.name);

  // ── Color scheme ──────────────────────────────────────────────────────────

  AppColorScheme? getColorScheme() {
    final value = _prefs.getString(_colorSchemeKey);
    if (value == null) return null;
    return AppColorScheme.values.firstWhere(
      (s) => s.name == value,
      orElse: () => FlexThemeConfig.defaultColorScheme,
    );
  }

  Future<void> setColorScheme(AppColorScheme scheme) =>
      _prefs.setString(_colorSchemeKey, scheme.name);

  // ── Bulk operations ───────────────────────────────────────────────────────

  Future<void> clearPreferences() async {
    await _prefs.remove(_themeModeKey);
    await _prefs.remove(_colorSchemeKey);
  }
}

/// Provider for [ThemeStorageService].
///
/// Depends on [sharedPreferencesProvider] which must be overridden in
/// main.dart before use.
@Riverpod(keepAlive: true)
ThemeStorageService themeStorageService(Ref ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return ThemeStorageService(prefs);
}

/// Provider for [SharedPreferences].
///
/// Must be overridden in main.dart with an eagerly initialised instance.
@Riverpod(keepAlive: true)
SharedPreferences sharedPreferences(Ref ref) {
  throw UnimplementedError(
    'sharedPreferencesProvider must be overridden in ProviderScope',
  );
}
