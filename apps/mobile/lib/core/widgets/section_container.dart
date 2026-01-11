import 'package:flutter/material.dart';

/// A reusable container widget for content sections with consistent styling.
///
/// Used in both Patient and Doctor home screens to wrap major sections like
/// Health Services, Recent Activity, Today's Schedule, etc. with consistent
/// padding, colors, borders, and border radius.
///
/// Design tokens:
/// - Container padding: 20px all sides
/// - Border radius: 20px
/// - Border width: 1px
/// - Border opacity: 0.08
/// - Background opacity: 0.02
class SectionContainer extends StatelessWidget {
  const SectionContainer({required this.color, required this.child, super.key});

  /// The primary color for the border and background tint
  final Color color;

  /// The child widget to display inside the container
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.02),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.08), width: 1),
      ),
      child: child,
    );
  }
}
