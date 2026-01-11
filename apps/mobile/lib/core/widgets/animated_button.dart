import 'package:flutter/material.dart';

class AnimatedButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final String text;
  final IconData? icon;
  final bool isLoading;
  final Color? backgroundColor;
  final Color? textColor;
  final double? width;
  final double height;
  final BorderRadius? borderRadius;
  final EdgeInsets padding;
  final AnimationType animationType;
  final Duration animationDuration;
  final Duration? animationDelay;

  const AnimatedButton({
    super.key,
    required this.onPressed,
    required this.text,
    this.icon,
    this.isLoading = false,
    this.backgroundColor,
    this.textColor,
    this.width,
    this.height = 48,
    this.borderRadius,
    this.padding = const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
    this.animationType = AnimationType.bounceInUp,
    this.animationDuration = const Duration(milliseconds: 600),
    this.animationDelay,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveBackgroundColor = backgroundColor ?? colorScheme.primary;
    final effectiveTextColor = textColor ?? Colors.white;
    final effectiveBorderRadius = borderRadius ?? BorderRadius.circular(12);

    Widget button = Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: onPressed != null
            ? effectiveBackgroundColor
            : colorScheme.onSurface.withOpacity(0.12),
        borderRadius: effectiveBorderRadius,
        boxShadow: onPressed != null
            ? [
                BoxShadow(
                  color: effectiveBackgroundColor.withOpacity(0.25),
                  offset: const Offset(0, 4),
                  blurRadius: 12,
                  spreadRadius: 0,
                ),
              ]
            : null,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: onPressed,
          borderRadius: effectiveBorderRadius,
          child: Container(
            padding: padding,
            alignment: Alignment.center,
            child: isLoading
                ? SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor: AlwaysStoppedAnimation<Color>(
                        effectiveTextColor,
                      ),
                    ),
                  )
                : Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      if (icon != null) ...[
                        Icon(icon, color: effectiveTextColor, size: 18),
                        const SizedBox(width: 8),
                      ],
                      Text(
                        text,
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: effectiveTextColor,
                          letterSpacing: 0.5,
                        ),
                      ),
                    ],
                  ),
          ),
        ),
      ),
    );

    return button;
  }
}

class AnimatedIconButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final IconData icon;
  final String? tooltip;
  final Color? iconColor;
  final Color? backgroundColor;
  final double size;
  final AnimationType animationType;
  final Duration animationDuration;
  final Duration? animationDelay;

  const AnimatedIconButton({
    super.key,
    required this.onPressed,
    required this.icon,
    this.tooltip,
    this.iconColor,
    this.backgroundColor,
    this.size = 24,
    this.animationType = AnimationType.bounceIn,
    this.animationDuration = const Duration(milliseconds: 500),
    this.animationDelay,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveIconColor = iconColor ?? colorScheme.primary;

    Widget button = IconButton(
      onPressed: onPressed,
      icon: Icon(icon, color: effectiveIconColor, size: size),
      tooltip: tooltip,
      style: IconButton.styleFrom(backgroundColor: backgroundColor),
    );

    return button;
  }
}

enum AnimationType {
  none,
  bounceIn,
  bounceInUp,
  bounceInDown,
  bounceInLeft,
  bounceInRight,
  fadeIn,
  slideInUp,
  slideInDown,
  zoomIn,
  pulse,
}
