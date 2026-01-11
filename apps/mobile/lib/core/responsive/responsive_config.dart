import 'package:flutter/material.dart';
import 'package:responsive_framework/responsive_framework.dart';

const String MOBILE = 'MOBILE';
const String TABLET = 'TABLET';
const String DESKTOP = 'DESKTOP';

class ResponsiveConfig {
  // Get responsive values based on screen size using responsive_framework
  static T responsive<T>(
    BuildContext context, {
    required T mobile,
    T? tablet,
    T? desktop,
  }) {
    if (ResponsiveBreakpoints.of(context).isDesktop) {
      return desktop ?? tablet ?? mobile;
    } else if (ResponsiveBreakpoints.of(context).isTablet) {
      return tablet ?? mobile;
    } else {
      return mobile;
    }
  }

  // Medical app specific responsive values
  static double getHorizontalPadding(BuildContext context) {
    return responsive(context, mobile: 16.0, tablet: 32.0, desktop: 64.0);
  }

  static double getContentMaxWidth(BuildContext context) {
    return responsive(
      context,
      mobile: double.infinity,
      tablet: 800.0,
      desktop: 1200.0,
    );
  }

  static int getCrossAxisCount(BuildContext context) {
    return responsive(context, mobile: 1, tablet: 2, desktop: 3);
  }

  static int getGridCrossAxisCount(BuildContext context) {
    return responsive(context, mobile: 2, tablet: 3, desktop: 4);
  }

  // Card layouts
  static double getCardWidth(BuildContext context) {
    return responsive(
      context,
      mobile: double.infinity,
      tablet: 350.0,
      desktop: 320.0,
    );
  }

  // Navigation type based on screen size using responsive_framework
  static NavigationType getNavigationType(BuildContext context) {
    if (ResponsiveBreakpoints.of(context).isDesktop) {
      return NavigationType.drawer;
    } else if (ResponsiveBreakpoints.of(context).isTablet) {
      return NavigationType.rail;
    } else {
      return NavigationType.bottom;
    }
  }

  // Dialog sizing
  static double getDialogWidth(BuildContext context) {
    return responsive(
      context,
      mobile: MediaQuery.of(context).size.width * 0.9,
      tablet: 500.0,
      desktop: 600.0,
    );
  }

  // Form layouts
  static bool shouldUseWideLayout(BuildContext context) {
    return ResponsiveBreakpoints.of(context).isTablet ||
        ResponsiveBreakpoints.of(context).isDesktop;
  }

  // Medical specific layouts
  static int getVitalsGridCount(BuildContext context) {
    return responsive(context, mobile: 2, tablet: 3, desktop: 4);
  }

  static int getAppointmentColumns(BuildContext context) {
    return responsive(context, mobile: 1, tablet: 2, desktop: 3);
  }

  // Video call layout
  static bool shouldShowSidebarInCall(BuildContext context) {
    return ResponsiveBreakpoints.of(context).isTablet ||
        ResponsiveBreakpoints.of(context).isDesktop;
  }

  // Dashboard layout
  static int getDashboardColumns(BuildContext context) {
    return responsive(context, mobile: 1, tablet: 2, desktop: 3);
  }

  static double getQuickActionWidth(BuildContext context) {
    return responsive(
      context,
      mobile: double.infinity,
      tablet: 200.0,
      desktop: 180.0,
    );
  }
}

enum NavigationType { bottom, rail, drawer }

// Extension for easier access to responsive values using responsive_framework
extension ResponsiveExtensions on BuildContext {
  bool get isMobile => ResponsiveBreakpoints.of(this).isMobile;
  bool get isTablet => ResponsiveBreakpoints.of(this).isTablet;
  bool get isDesktop => ResponsiveBreakpoints.of(this).isDesktop;

  double get horizontalPadding => ResponsiveConfig.getHorizontalPadding(this);
  double get contentMaxWidth => ResponsiveConfig.getContentMaxWidth(this);
  int get crossAxisCount => ResponsiveConfig.getCrossAxisCount(this);
  int get gridCrossAxisCount => ResponsiveConfig.getGridCrossAxisCount(this);

  NavigationType get navigationType => ResponsiveConfig.getNavigationType(this);
  bool get shouldUseWideLayout => ResponsiveConfig.shouldUseWideLayout(this);
}
