import 'package:flutter/material.dart';

/// A reusable activity/consultation card widget for displaying appointments,
/// activities, or consultation slots.
///
/// Used in both Patient (Recent Activity) and Doctor (Today's Schedule,
/// Pending Requests) home screens with consistent styling.
///
/// Design tokens:
/// - Card padding: 16px
/// - Border radius: 12px
/// - Icon container padding: 8px
/// - Icon container radius: 10px
/// - Border opacity: 0.12
/// - Background opacity: 0.04
/// - Icon size: 18px
/// - Arrow icon size: 14px
/// - Title font size: 14px
/// - Subtitle font size: 12px
/// - Spacing between icon and text: 12px
class ActivityCard extends StatelessWidget {
  const ActivityCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    this.onTap,
    super.key,
  });

  /// The main title text (e.g., appointment description, patient name)
  final String title;

  /// The subtitle text (e.g., date/time, status)
  final String subtitle;

  /// The icon to display in the colored container
  final IconData icon;

  /// The primary color for decorations
  final Color color;

  /// Optional callback when the card is tapped
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.04),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withValues(alpha: 0.12), width: 1),
          ),
          child: Row(
            children: [
              // Icon container
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: Colors.white, size: 18),
              ),
              const SizedBox(width: 12),

              // Text content
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: color,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ],
                ),
              ),

              // Arrow icon
              Icon(Icons.arrow_forward_ios_rounded, size: 14, color: color),
            ],
          ),
        ),
      ),
    );
  }
}
