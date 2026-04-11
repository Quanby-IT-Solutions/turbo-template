import 'package:flutter/material.dart';
import '../../core/theme/app_styles.dart';

class AppButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final Widget child;
  final bool isSecondary;
  final bool isLoading;

  const AppButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.isSecondary = false,
    this.isLoading = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    final color = isSecondary ? theme.colorScheme.surfaceContainerHigh : theme.colorScheme.primary;
    final onColor = isSecondary ? theme.colorScheme.onSurface : theme.colorScheme.onPrimary;

    return Semantics(
      button: true,
      enabled: onPressed != null && !isLoading,
      child: AnimatedContainer(
        duration: AppMotion.durationFast,
        curve: AppMotion.enterCurve,
        height: 56,
        decoration: BoxDecoration(
          borderRadius: AppRadii.smallRadius,
        ),
        child: FilledButton(
          onPressed: isLoading ? null : onPressed,
          style: FilledButton.styleFrom(
            backgroundColor: color,
            foregroundColor: onColor,
            disabledBackgroundColor: color.withOpacity(0.5),
            disabledForegroundColor: onColor.withOpacity(0.5),
            shape: RoundedRectangleBorder(
              borderRadius: AppRadii.smallRadius,
            ),
            padding: const EdgeInsets.symmetric(horizontal: AppSpacing.s24),
            elevation: 0,
          ),
          child: isLoading 
              ? SizedBox(
                  height: 24, 
                  width: 24, 
                  child: CircularProgressIndicator(
                    strokeWidth: 2, 
                    color: onColor,
                  ),
                )
              : DefaultTextStyle(
                  style: theme.textTheme.bodyLarge!.copyWith(
                    color: onColor,
                    fontWeight: FontWeight.w600,
                  ),
                  child: child,
                ),
        ),
      ),
    );
  }
}

class AppTextButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final Widget child;

  const AppTextButton({
    super.key,
    required this.onPressed,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    
    return TextButton(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        foregroundColor: theme.colorScheme.primary,
        minimumSize: const Size(48, 48), // Accessibility minimum
        shape: RoundedRectangleBorder(
          borderRadius: AppRadii.smallRadius,
        ),
        textStyle: theme.textTheme.bodyLarge?.copyWith(
          fontWeight: FontWeight.w600,
        ),
      ),
      child: child,
    );
  }
}
