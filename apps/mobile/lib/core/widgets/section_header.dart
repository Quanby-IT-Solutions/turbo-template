import 'package:flutter/material.dart';

/// A reusable section header widget with icon, title, and subtitle.
///
/// Used in both Patient and Doctor home screens to create consistent
/// section headers for Health Services, Recent Activity, Today's Schedule, etc.
///
/// Design tokens:
/// - Icon container padding: 8px
/// - Icon container radius: 12px
/// - Icon size: 20px
/// - Title font size: 20px
/// - Title font weight: w700
/// - Subtitle font size: 14px
/// - Subtitle opacity: 0.7
/// - Spacing between icon and text: 12px
/// - Spacing between title and subtitle: 8px
class SectionHeader extends StatelessWidget {
  const SectionHeader({
    required this.icon,
    required this.title,
    required this.color,
    this.subtitle,
    super.key,
  });

  /// The icon to display in the colored container
  final IconData icon;

  /// The main title text
  final String title;

  /// Optional subtitle/description text
  final String? subtitle;

  /// The primary color for the icon container and title
  final Color color;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            // Icon container
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, color: Colors.white, size: 20),
            ),
            const SizedBox(width: 12),

            // Title text
            Flexible(
              child: Text(
                title,
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  fontSize: 20,
                  color: color,
                  letterSpacing: -0.3,
                ),
              ),
            ),
          ],
        ),

        // Subtitle (if provided)
        if (subtitle != null) ...[
          const SizedBox(height: 8),
          Text(
            subtitle!,
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurface.withValues(alpha: 0.7),
              height: 1.3,
            ),
          ),
        ],
      ],
    );
  }
}
