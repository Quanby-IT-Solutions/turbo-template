import 'package:flex_color_scheme/flex_color_scheme.dart';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

/// The [AppTheme] defines light and dark themes for the app.
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
  // The FlexColorScheme defined light mode ThemeData.
  static ThemeData light = FlexThemeData.light(
    // User defined custom colors made with FlexSchemeColor() API.
    colors: const FlexSchemeColor(
      primary: Color(0xFF0170B0),
      primaryContainer: Color(0xFFD7E9FF),
      secondary: Color(0xFF003350),
      secondaryContainer: Color(0xFFB8D1E8),
      tertiary: Color(0xFF6A7A99),
      tertiaryContainer: Color(0xFFCEE0FF),
      appBarColor: Color(0xFFB8D1E8),
      error: Color(0xFFBA1A1A),
      errorContainer: Color(0xFFFFDAD6),
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
    // Computing from light scheme using defaultError and toDark() methods.
    // User defined custom colors made with FlexSchemeColor() API.
    colors: const FlexSchemeColor(
      primary: Color(0xFF0170B0),
      primaryContainer: Color(0xFFD7E9FF),
      secondary: Color(0xFF003350),
      secondaryContainer: Color(0xFFB8D1E8),
      tertiary: Color(0xFF6A7A99),
      tertiaryContainer: Color(0xFFCEE0FF),
      appBarColor: Color(0xFFB8D1E8),
      error: Color(0xFFBA1A1A),
      errorContainer: Color(0xFFFFDAD6),
    ).defaultError.toDark(10, false),
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

  // Medical app specific colors for both themes
  static const Color primaryMedical = Color(0xFF0170B0); // Medical blue (matches primary)
  static const Color successColor = Color(0xFF4CAF50); // Success green
  static const Color warningColor = Color(0xFFFF9800); // Warning orange
  static const Color errorColor = Color(0xFFBA1A1A); // Error red (matches error)
  static const Color emergencyColor = Color(0xFFD32F2F); // Emergency red
  static const Color infoColor = Color(0xFF0170B0); // Info blue (matches primary)

  // Medical specialty colors
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

  // Medical status colors for both themes
  static Color getStatusColor(String status, bool isDark) {
    switch (status.toLowerCase()) {
      case 'healthy':
      case 'normal':
      case 'completed':
      case 'verified':
        return successColor;
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
        return infoColor;
      default:
        return isDark ? Colors.grey[400]! : Colors.grey[600]!;
    }
  }

  // Vitals colors for different ranges
  static Color getVitalColor(String vital, double value, bool isDark) {
    switch (vital.toLowerCase()) {
      case 'heartrate':
        if (value < 60 || value > 100) return errorColor;
        if (value < 70 || value > 90) return warningColor;
        return successColor;
      case 'bloodpressure':
        // Assuming systolic value
        if (value > 140) return errorColor;
        if (value > 130) return warningColor;
        return successColor;
      case 'oxygensaturation':
        if (value < 95) return errorColor;
        if (value < 97) return warningColor;
        return successColor;
      case 'temperature':
        if (value > 100.4 || value < 96.8) return errorColor;
        if (value > 99.5 || value < 97.5) return warningColor;
        return successColor;
      default:
        return infoColor;
    }
  }
}
