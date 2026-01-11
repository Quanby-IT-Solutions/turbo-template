import 'package:flutter/material.dart';

/// A reusable quick action button widget for health services and actions.
///
/// Used in Patient home screen for health services grid and can be adapted
/// for Doctor quick actions. Displays an icon with a label in a compact card.
///
/// Design tokens:
/// - Card padding: 8px
/// - Border radius: 16px
/// - Icon container padding: 12px
/// - Icon container radius: 12px
/// - Border opacity: 0.15
/// - Background opacity: 0.05
/// - Shadow opacity: 0.15
/// - Icon size: 18px
class QuickActionButton extends StatelessWidget {
  const QuickActionButton({
    required this.icon,
    required this.label,
    required this.color,
    this.onTap,
    super.key,
  });

  /// The icon to display
  final IconData icon;

  /// The label text displayed below the icon
  final String label;

  /// The primary color for the icon container and decorations
  final Color color;

  /// Optional callback when the button is tapped
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: color.withValues(alpha: 0.15), width: 1),
          ),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Icon container
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: color,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: color.withValues(alpha: 0.15),
                      offset: const Offset(0, 2),
                      blurRadius: 8,
                      spreadRadius: 0,
                    ),
                  ],
                ),
                child: Icon(icon, color: Colors.white, size: 18),
              ),
              const SizedBox(height: 6),

              // Label text
              Flexible(
                child: Text(
                  label,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: color,
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.2,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
