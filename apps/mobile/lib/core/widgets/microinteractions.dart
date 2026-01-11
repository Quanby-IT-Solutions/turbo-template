import 'package:flutter/material.dart';

class TapAnimationWrapper extends StatefulWidget {
  final Widget child;
  final VoidCallback? onTap;
  final MicroInteractionType type;
  final Duration duration;
  final bool enabled;

  const TapAnimationWrapper({
    super.key,
    required this.child,
    this.onTap,
    this.type = MicroInteractionType.flash,
    this.duration = const Duration(milliseconds: 300),
    this.enabled = true,
  });

  @override
  State<TapAnimationWrapper> createState() => _TapAnimationWrapperState();
}

class _TapAnimationWrapperState extends State<TapAnimationWrapper>
    with TickerProviderStateMixin {
  late AnimationController _controller;
  bool _isAnimating = false;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(duration: widget.duration, vsync: this);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _playAnimation() async {
    if (!widget.enabled || _isAnimating) return;

    setState(() {
      _isAnimating = true;
    });

    await _controller.forward();
    await _controller.reverse();

    if (mounted) {
      setState(() {
        _isAnimating = false;
      });
    }

    widget.onTap?.call();
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _playAnimation,
      child: widget.child,
    );
  }
}

class ScrollAnimationWrapper extends StatelessWidget {
  final Widget child;
  final ScrollAnimationType type;
  final Duration duration;
  final Duration? delay;
  final double offset;

  const ScrollAnimationWrapper({
    super.key,
    required this.child,
    this.type = ScrollAnimationType.fadeInUp,
    this.duration = const Duration(milliseconds: 600),
    this.delay,
    this.offset = 50,
  });

  @override
  Widget build(BuildContext context) {
    return child;
  }
}

class PageTransitionWrapper extends StatelessWidget {
  final Widget child;
  final PageTransitionType type;
  final Duration duration;

  const PageTransitionWrapper({
    super.key,
    required this.child,
    this.type = PageTransitionType.slideInRight,
    this.duration = const Duration(milliseconds: 300),
  });

  @override
  Widget build(BuildContext context) {
    return child;
  }
}

enum MicroInteractionType {
  flash,
  rubberBand,
  pulse,
  bounce,
  shake,
  swing,
  tada,
}

enum ScrollAnimationType {
  fadeIn,
  fadeInUp,
  fadeInDown,
  fadeInLeft,
  fadeInRight,
  slideInUp,
  slideInDown,
  slideInLeft,
  slideInRight,
  zoomIn,
  bounceInUp,
}

enum PageTransitionType {
  slideInRight,
  slideInLeft,
  slideInUp,
  slideInDown,
  fadeIn,
  zoomIn,
}
