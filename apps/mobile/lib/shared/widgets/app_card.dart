import 'package:flutter/material.dart';
import '../../core/theme/app_styles.dart';

class AppCard extends StatefulWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry margin;

  const AppCard({
    super.key,
    required this.child,
    this.padding = EdgeInsets.zero,
    this.onTap,
    this.margin = EdgeInsets.zero,
  });

  @override
  State<AppCard> createState() => _AppCardState();
}

class _AppCardState extends State<AppCard> {
  bool _isPressed = false;

  void _handleTapDown(TapDownDetails details) {
    if (widget.onTap != null) setState(() => _isPressed = true);
  }

  void _handleTapUp(TapUpDetails details) {
    if (widget.onTap != null) setState(() => _isPressed = false);
  }

  void _handleTapCancel() {
    if (widget.onTap != null) setState(() => _isPressed = false);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isTappable = widget.onTap != null;

    Widget content = AnimatedContainer(
      duration: AppMotion.durationFast,
      curve: AppMotion.enterCurve,
      margin: widget.margin,
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerLow,
        borderRadius: AppRadii.mediumRadius,
        boxShadow: _isPressed 
            ? [] 
            : [AppShadows.subtle(theme.colorScheme)], // Diffused shadow
      ),
      child: ClipRRect(
        borderRadius: AppRadii.mediumRadius,
        child: Padding(
          padding: widget.padding,
          child: widget.child,
        ),
      ),
    );

    if (isTappable) {
      return GestureDetector(
        onTapDown: _handleTapDown,
        onTapUp: _handleTapUp,
        onTapCancel: _handleTapCancel,
        onTap: widget.onTap,
        child: content,
      );
    }

    return content;
  }
}
