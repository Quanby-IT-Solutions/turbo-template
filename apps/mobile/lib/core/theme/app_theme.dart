import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

/// The [AppTheme] defines light and dark themes for the app.
///
/// Theme colors migrated from web app (apps/web/core/styles/globals.css)
/// Uses green/teal brand color scheme matching the web application.
///
/// Theme setup for FlexColorScheme package v8.
/// Use same major flex_color_scheme package version. If you use a
/// lower minor version, some properties may not be supported.
/// In that case, remove them after copying this theme to your
/// app or upgrade the package to version 8.3.0.
///
/// Use it in a [MaterialApp] like this:
///
/// MaterialApp(
///   theme: AppTheme.light,
///   darkTheme: AppTheme.dark,
/// );
abstract final class AppTheme {
  // Web color constants (converted from OKLCH to hex)
  // These constants document the web app color scheme for reference
  // FlexColorScheme automatically generates foreground/background from primary colors
  // Light mode colors
  static const Color _webPrimaryLight = Color(0xFF3EC37C); // oklch(0.73 0.18 152) - Medium vibrant green
  // ignore: unused_field
  static const Color _webPrimaryForegroundLight = Color(0xFFFAFAFA); // oklch(0.985 0 0) - Near white
  // ignore: unused_field
  static const Color _webSecondaryLight = Color(0xFFF7F7F7); // oklch(0.97 0 0) - Light gray
  static const Color _webSecondaryForegroundLight = Color(0xFF477283); // oklch(0.48 0.10 205) - Muted teal
  static const Color _webAccentLight = Color(0xFF6FE97B); // oklch(0.87 0.16 145) - Bright light green
  // ignore: unused_field
  static const Color _webAccentForegroundLight = Color(0xFF252525); // oklch(0.145 0 0) - Dark gray
  // ignore: unused_field
  static const Color _webMutedLight = Color(0xFFF7F7F7); // oklch(0.97 0 0) - Light gray
  // ignore: unused_field
  static const Color _webMutedForegroundLight = Color(0xFF8E8E8E); // oklch(0.556 0 0) - Medium gray
  static const Color _webDestructiveLight = Color(0xFFDC2626); // oklch(0.577 0.245 27.325) - Red
  // ignore: unused_field
  static const Color _webBorderLight = Color(0xFFEBEBEB); // oklch(0.922 0 0) - Light border
  // ignore: unused_field
  static const Color _webBackgroundLight = Color(0xFFFFFFFF); // oklch(1 0 0) - White
  // ignore: unused_field
  static const Color _webForegroundLight = Color(0xFF252525); // oklch(0.145 0 0) - Dark text
  // ignore: unused_field
  static const Color _webCardLight = Color(0xFFFFFFFF); // oklch(1 0 0) - White

  // Dark mode colors
  static const Color _webPrimaryDark = Color(0xFF6FE97B); // oklch(0.87 0.16 145) - Bright light green
  // ignore: unused_field
  static const Color _webPrimaryForegroundDark = Color(0xFF252525); // oklch(0.145 0 0) - Dark gray
  // ignore: unused_field
  static const Color _webSecondaryDark = Color(0xFF444444); // oklch(0.269 0 0) - Dark gray
  static const Color _webSecondaryForegroundDark = Color(0xFF6FE97B); // oklch(0.87 0.16 145) - Bright green
  static const Color _webAccentDark = Color(0xFF3EC37C); // oklch(0.73 0.18 152) - Medium green
  // ignore: unused_field
  static const Color _webAccentForegroundDark = Color(0xFFFAFAFA); // oklch(0.985 0 0) - Near white
  // ignore: unused_field
  static const Color _webMutedDark = Color(0xFF444444); // oklch(0.269 0 0) - Dark gray
  // ignore: unused_field
  static const Color _webMutedForegroundDark = Color(0xFFB5B5B5); // oklch(0.708 0 0) - Light gray
  static const Color _webDestructiveDark = Color(0xFFEF4444); // oklch(0.704 0.191 22.216) - Bright red
  // ignore: unused_field
  static const Color _webBackgroundDark = Color(0xFF252525); // oklch(0.145 0 0) - Dark background
  // ignore: unused_field
  static const Color _webForegroundDark = Color(0xFFFAFAFA); // oklch(0.985 0 0) - Light text
  // ignore: unused_field
  static const Color _webCardDark = Color(0xFF343434); // oklch(0.205 0 0) - Dark card

  // Chart colors (from web)
  static const Color _chart1Light = Color(0xFF6FE97B); // Bright light green
  static const Color _chart2Light = Color(0xFF3EC37C); // Medium vibrant green
  static const Color _chart3Light = Color(0xFF477283); // Muted teal
  static const Color _chart4Light = Color(0xFF39417C); // Dark deep blue
  static const Color _chart5Light = Color(0xFF7FD4A0); // Intermediate green-teal

  static const Color _chart1Dark = Color(0xFF6FE97B); // Bright light green
  static const Color _chart2Dark = Color(0xFF3EC37C); // Medium vibrant green
  static const Color _chart3Dark = Color(0xFF5A8A9D); // Lighter teal for visibility
  static const Color _chart4Dark = Color(0xFF4A5288); // Dark blue (slightly lighter)
  static const Color _chart5Dark = Color(0xFF8FE5B0); // Brighter green-teal

  // The FlexColorScheme defined light mode ThemeData.
  static ThemeData light = FlexThemeData.light(
    // User defined custom colors matching web app theme
    colors: const FlexSchemeColor(
      primary: _webPrimaryLight,
      primaryContainer: Color(0xFFB8F5C4), // Lighter tint of primary green
      secondary: _webSecondaryForegroundLight, // Use teal as secondary
      secondaryContainer: Color(0xFFD4E8F0), // Lighter tint of teal
      tertiary: _webAccentLight, // Bright light green
      tertiaryContainer: Color(0xFFD4F5DA), // Lighter tint of accent
      appBarColor: _webPrimaryLight, // Use primary green for app bar
      error: _webDestructiveLight,
      errorContainer: Color(0xFFFFE5E5), // Lighter tint of error
    ),
    // Input color modifiers.
    useMaterial3ErrorColors: true,
    // Component theme configurations for light mode.
    subThemesData: const FlexSubThemesData(
      inputDecoratorIsFilled: true,
      alignedDropdown: true,
      tooltipRadius: 4,
      tooltipSchemeColor: SchemeColor.inverseSurface,
      tooltipOpacity: 0.9,
      snackBarElevation: 6,
      snackBarBackgroundSchemeColor: SchemeColor.inverseSurface,
      navigationRailUseIndicator: true,
    ),
    // Direct ThemeData properties.
    visualDensity: FlexColorScheme.comfortablePlatformDensity,
    cupertinoOverrideTheme: const CupertinoThemeData(applyThemeToAll: true),
  );

  // The FlexColorScheme defined dark mode ThemeData.
  static ThemeData dark = FlexThemeData.dark(
    // User defined custom colors matching web app dark theme
    colors: const FlexSchemeColor(
      primary: _webPrimaryDark, // Bright light green for dark mode
      primaryContainer: Color(0xFF2A5C3A), // Darker tint of primary
      secondary: _webSecondaryForegroundDark, // Bright green for contrast
      secondaryContainer: Color(0xFF1E3D2A), // Darker tint of secondary
      tertiary: _webAccentDark, // Medium green for dark mode
      tertiaryContainer: Color(0xFF1E4D2E), // Darker tint of tertiary
      appBarColor: _webPrimaryDark, // Use bright green for app bar
      error: _webDestructiveDark,
      errorContainer: Color(0xFF5C1F1F), // Darker tint of error
    ),
    // Input color modifiers.
    useMaterial3ErrorColors: true,
    // Component theme configurations for dark mode.
    subThemesData: const FlexSubThemesData(
      blendOnColors: true,
      inputDecoratorIsFilled: true,
      alignedDropdown: true,
      tooltipRadius: 4,
      tooltipSchemeColor: SchemeColor.inverseSurface,
      tooltipOpacity: 0.9,
      snackBarElevation: 6,
      snackBarBackgroundSchemeColor: SchemeColor.inverseSurface,
      navigationRailUseIndicator: true,
    ),
    // Direct ThemeData properties.
    visualDensity: FlexColorScheme.comfortablePlatformDensity,
    cupertinoOverrideTheme: const CupertinoThemeData(applyThemeToAll: true),
  );

  // Chart colors - matching web app chart palette
  static Color getChartColor(int index, bool isDark) {
    if (isDark) {
      switch (index) {
        case 1:
          return _chart1Dark;
        case 2:
          return _chart2Dark;
        case 3:
          return _chart3Dark;
        case 4:
          return _chart4Dark;
        case 5:
          return _chart5Dark;
        default:
          return _chart1Dark;
      }
    } else {
      switch (index) {
        case 1:
          return _chart1Light;
        case 2:
          return _chart2Light;
        case 3:
          return _chart3Light;
        case 4:
          return _chart4Light;
        case 5:
          return _chart5Light;
        default:
          return _chart1Light;
      }
    }
  }

  // Medical app specific colors aligned with web green theme
  static const Color primaryMedical = _webPrimaryLight; // Medical green (matches primary)
  static const Color successColorLight = _webPrimaryLight; // Success green (#3EC37C)
  static const Color successColorDark = _webPrimaryDark; // Success green (#6FE97B) for dark mode
  static const Color warningColor = Color(0xFFFF9800); // Warning orange (kept as standard)
  static const Color errorColor = _webDestructiveLight; // Error red (matches destructive)
  static const Color emergencyColor = Color(0xFFD32F2F); // Emergency red (kept as standard)
  static const Color infoColorLight = _webPrimaryLight; // Info green (matches primary)
  static const Color infoColorDark = _webPrimaryDark; // Info green for dark mode

  // Backward-compatible static getters (default to light colors)
  // Use these when theme context is not available (e.g., notifications)
  static Color get successColor => successColorLight;
  static Color get infoColor => infoColorLight;

  // Medical specialty colors (kept as-is for differentiation)
  static const Color cardiologyColor = Color(0xFFE91E63);
  static const Color neurologyColor = Color(0xFF9C27B0);
  static const Color orthopedicsColor = Color(0xFF795548);
  static const Color dermatologyColor = Color(0xFFFF5722);
  static const Color pediatricsColor = Color(0xFF4CAF50);
  static const Color psychiatryColor = Color(0xFF3F51B5);

  // Get themed colors based on brightness
  static Color getThemedColor(Color lightColor, Color darkColor, bool isDark) {
    return isDark ? darkColor : lightColor;
  }

  // Get success color based on theme
  static Color getSuccessColor(bool isDark) {
    return isDark ? successColorDark : successColorLight;
  }

  // Get info color based on theme
  static Color getInfoColor(bool isDark) {
    return isDark ? infoColorDark : infoColorLight;
  }

  // Medical status colors for both themes (aligned with green theme)
  static Color getStatusColor(String status, bool isDark) {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'normal':
      case 'completed':
      case 'verified':
        return getSuccessColor(isDark);
      case 'warning':
      case 'pending':
      case 'scheduled':
        return warningColor;
      case 'critical':
      case 'emergency':
      case 'rejected':
        return emergencyColor;
      case 'info':
      case 'upcoming':
        return getInfoColor(isDark);
      default:
        return isDark ? Colors.grey[400]! : Colors.grey[600]!;
    }
  }

  // Vitals colors for different ranges (using green theme for success)
  static Color getVitalColor(String vital, double value, bool isDark) {
    switch (vital.toLowerCase()) {
      case 'heartrate':
        if (value < 60 || value > 100) return errorColor;
        if (value < 70 || value > 90) return warningColor;
        return getSuccessColor(isDark);
      case 'bloodpressure':
        // Assuming systolic value
        if (value > 140) return errorColor;
        if (value > 130) return warningColor;
        return getSuccessColor(isDark);
      case 'oxygensaturation':
        if (value < 95) return errorColor;
        if (value < 97) return warningColor;
        return getSuccessColor(isDark);
      case 'temperature':
        if (value > 100.4 || value < 96.8) return errorColor;
        if (value > 99.5 || value < 97.5) return warningColor;
        return getSuccessColor(isDark);
      default:
        return getInfoColor(isDark);
    }
  }
}
