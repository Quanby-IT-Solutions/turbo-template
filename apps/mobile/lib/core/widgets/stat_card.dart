import 'package:flutter/material.dart';

/// A reusable statistic card widget that displays a metric with an icon.
///
/// Used in both Patient and Doctor home screens to show quick stats like
/// upcoming appointments, prescriptions count, patients count, etc.
///
/// Design tokens:
/// - Card padding: 20px all sides
/// - Border radius: 20px
/// - Icon container padding: 12px
/// - Icon container radius: 16px
/// - Border opacity: 0.1
/// - Shadow opacity: 0.06
/// - Icon background opacity: 0.15
class StatCard extends StatelessWidget {
  const StatCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
    this.onTap,
    super.key,
  });

  /// The label text displayed below the value (e.g., "Upcoming", "Prescriptions")
  final String title;

  /// The numeric or text value to display prominently (e.g., "1", "12")
  final String value;

  /// The icon to display in the colored container
  final IconData icon;

  /// The primary color for the icon, value text, and decorations
  final Color color;

  /// Optional callback when the card is tapped
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.06),
            offset: const Offset(0, 4),
            blurRadius: 12,
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(20),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                // Icon container
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(icon, size: 28, color: color),
                ),
                const SizedBox(height: 12),

                // Value text
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.w700,
                    color: color,
                    letterSpacing: -0.5,
                  ),
                ),
                const SizedBox(height: 4),

                // Title text
                Text(
                  title,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: colorScheme.onSurface.withValues(alpha: 0.7),
                    letterSpacing: 0.2,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
