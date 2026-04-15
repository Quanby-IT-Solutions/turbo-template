import 'package:flutter/material.dart';

class AppSpacing {
  AppSpacing._();
  static const double s4 = 4.0;
  static const double s8 = 8.0;
  static const double s12 = 12.0;
  static const double s16 = 16.0;
  static const double s24 = 24.0;
  static const double s32 = 32.0;
  static const double s48 = 48.0;
}

class AppRadii {
  AppRadii._();
  static const double small = 8.0;
  static const double medium = 12.0;
  static const double pill = 24.0;
  static const double circle = 999.0;

  static final BorderRadius smallRadius = BorderRadius.circular(small);
  static final BorderRadius mediumRadius = BorderRadius.circular(medium);
  static final BorderRadius pillRadius = BorderRadius.circular(pill);
}

class AppShadows {
  AppShadows._();
  
  static BoxShadow subtle(ColorScheme colorScheme) {
    return BoxShadow(
      offset: const Offset(0, 2),
      blurRadius: 20,
      color: colorScheme.shadow.withOpacity(0.06),
    );
  }
}

class AppMotion {
  AppMotion._();
  static const Duration durationFast = Duration(milliseconds: 200);
  static const Duration durationStandard = Duration(milliseconds: 300);
  static const Curve enterCurve = Curves.easeOutCubic;
  static const Curve transitionCurve = Curves.easeInOutQuart;
}
