import 'package:flutter/material.dart';

class AnimatedLoadingIndicator extends StatelessWidget {
  final double size;
  final Color? color;
  final LoadingAnimationType type;
  final String? message;
  final Duration animationDuration;

  const AnimatedLoadingIndicator({
    super.key,
    this.size = 40,
    this.color,
    this.type = LoadingAnimationType.pulse,
    this.message,
    this.animationDuration = const Duration(milliseconds: 1000),
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveColor = color ?? colorScheme.primary;

    Widget indicator = _buildIndicator(effectiveColor);

    if (message != null) {
      return Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          indicator,
          const SizedBox(height: 16),
          Text(
            message!,
            style: TextStyle(
              color: colorScheme.onSurface.withOpacity(0.7),
              fontSize: 14,
              fontWeight: FontWeight.w500,
            ),
            textAlign: TextAlign.center,
          ),
        ],
      );
    }

    return indicator;
  }

  Widget _buildIndicator(Color effectiveColor) {
    switch (type) {
      case LoadingAnimationType.pulse:
        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: effectiveColor,
            shape: BoxShape.circle,
          ),
          child: Icon(
            Icons.healing,
            color: Colors.white,
            size: size * 0.5,
          ),
        );

      case LoadingAnimationType.spin:
        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            border: Border.all(
              color: effectiveColor.withOpacity(0.3),
              width: 3,
            ),
            borderRadius: BorderRadius.circular(size / 2),
          ),
          child: Container(
            margin: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              color: effectiveColor,
              borderRadius: BorderRadius.circular(size / 2),
              gradient: LinearGradient(
                colors: [
                  effectiveColor,
                  effectiveColor.withOpacity(0.3),
                ],
              ),
            ),
          ),
        );

      case LoadingAnimationType.bounce:
        return Container(
          width: size,
          height: size,
          decoration: BoxDecoration(
            color: effectiveColor,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            Icons.medical_services,
            color: Colors.white,
            size: size * 0.6,
          ),
        );

      case LoadingAnimationType.heartbeat:
        return Icon(
          Icons.favorite,
          color: effectiveColor,
          size: size,
        );

      case LoadingAnimationType.circularProgress:
        return SizedBox(
          width: size,
          height: size,
          child: CircularProgressIndicator(
            strokeWidth: 3,
            valueColor: AlwaysStoppedAnimation<Color>(effectiveColor),
          ),
        );

      case LoadingAnimationType.dots:
        return _buildDotsIndicator(effectiveColor);
    }
  }

  Widget _buildDotsIndicator(Color effectiveColor) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(3, (index) {
        return Container(
          margin: EdgeInsets.symmetric(horizontal: size * 0.05),
          width: size * 0.2,
          height: size * 0.2,
          decoration: BoxDecoration(
            color: effectiveColor,
            shape: BoxShape.circle,
          ),
        );
      }),
    );
  }
}

class AnimatedProgressIndicator extends StatelessWidget {
  final double progress;
  final double height;
  final Color? backgroundColor;
  final Color? progressColor;
  final BorderRadius? borderRadius;
  final AnimationType animationType;

  const AnimatedProgressIndicator({
    super.key,
    required this.progress,
    this.height = 8,
    this.backgroundColor,
    this.progressColor,
    this.borderRadius,
    this.animationType = AnimationType.slideInLeft,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final effectiveBackgroundColor =
        backgroundColor ?? colorScheme.surfaceContainerHigh;
    final effectiveProgressColor = progressColor ?? colorScheme.primary;
    final effectiveBorderRadius = borderRadius ?? BorderRadius.circular(height / 2);

    Widget progressBar = Container(
      height: height,
      decoration: BoxDecoration(
        color: effectiveBackgroundColor,
        borderRadius: effectiveBorderRadius,
      ),
      child: FractionallySizedBox(
        alignment: Alignment.centerLeft,
        widthFactor: progress.clamp(0.0, 1.0),
        child: Container(
          decoration: BoxDecoration(
            color: effectiveProgressColor,
            borderRadius: effectiveBorderRadius,
          ),
        ),
      ),
    );

    return _wrapWithAnimation(progressBar);
  }

  Widget _wrapWithAnimation(Widget child) {
    return child;
  }
}

enum LoadingAnimationType {
  pulse,
  spin,
  bounce,
  heartbeat,
  circularProgress,
  dots,
}

enum AnimationType {
  slideInLeft,
  slideInRight,
  fadeIn,
  zoomIn,
}
