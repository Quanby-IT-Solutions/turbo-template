import 'package:flutter/material.dart';
import '../../core/theme/app_styles.dart';

class TaskTile extends StatelessWidget {
  final Key tileKey;
  final String title;
  final bool isCompleted;
  final ValueChanged<bool?> onToggle;
  final VoidCallback onDismissed;
  final Future<bool?> Function() confirmDismiss;

  const TaskTile({
    super.key,
    required this.tileKey,
    required this.title,
    required this.isCompleted,
    required this.onToggle,
    required this.onDismissed,
    required this.confirmDismiss,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Dismissible(
      key: tileKey,
      direction: DismissDirection.endToStart,
      background: Container(
        alignment: Alignment.centerRight,
        padding: const EdgeInsets.only(right: AppSpacing.s24),
        color: theme.colorScheme.primary,
        child: Icon(
          Icons.delete_outline,
          color: theme.colorScheme.onPrimary,
        ),
      ),
      confirmDismiss: (_) => confirmDismiss(),
      onDismissed: (_) => onDismissed(),
      child: AnimatedOpacity(
        opacity: isCompleted ? 0.4 : 1.0,
        duration: AppMotion.durationFast,
        curve: AppMotion.enterCurve,
        child: AnimatedSlide(
          offset: isCompleted ? const Offset(0.01, 0) : Offset.zero,
          duration: AppMotion.durationFast,
          curve: AppMotion.enterCurve,
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: AppSpacing.s24, vertical: AppSpacing.s8),
            leading: Checkbox(
              value: isCompleted,
              onChanged: onToggle,
              activeColor: theme.colorScheme.primary,
              shape: RoundedRectangleBorder(borderRadius: AppRadii.smallRadius),
            ),
            title: AnimatedDefaultTextStyle(
              duration: AppMotion.durationFast,
              style: theme.textTheme.bodyLarge!.copyWith(
                decoration: isCompleted ? TextDecoration.lineThrough : null,
                color: isCompleted
                    ? theme.colorScheme.onSurface.withOpacity(0.38)
                    : theme.colorScheme.onSurface.withOpacity(0.9),
                fontWeight: isCompleted ? FontWeight.w400 : FontWeight.w500,
                height: 1.47,
              ),
              child: Text(title),
            ),
          ),
        ),
      ),
    );
  }
}
