import 'package:biosensesignal_flutter_sdk/images/image_data.dart';
import 'package:biosensesignal_flutter_sdk/images/image_validity.dart';
import 'package:flutter/material.dart';

/// Widget that displays real-time guidance flags during vital scanning
/// Only shows warnings when specific conditions are met
class GuidanceFlagsWidget extends StatelessWidget {
  final ImageData? imageData;
  final bool isVisible;

  const GuidanceFlagsWidget({
    super.key,
    required this.imageData,
    this.isVisible = true,
  });

  @override
  Widget build(BuildContext context) {
    if (!isVisible || imageData == null) {
      return const SizedBox.shrink();
    }

    final validity = imageData!.imageValidity;
    final warnings = _getWarningsFromValidity(validity);

    if (warnings.isEmpty) {
      return const SizedBox.shrink();
    }

    return Positioned(
      top: 80,
      left: 16,
      right: 16,
      child: Column(
        children: warnings
            .map((warning) => _buildWarningFlag(warning))
            .toList(),
      ),
    );
  }

  List<GuidanceWarning> _getWarningsFromValidity(int validity) {
    final warnings = <GuidanceWarning>[];

    switch (validity) {
      case ImageValidity.invalidDeviceOrientation:
        warnings.add(
          GuidanceWarning(
            icon: Icons.screen_rotation,
            message: 'Rotate device to portrait mode',
            color: Colors.orange,
          ),
        );
        break;
      case ImageValidity.invalidRoi:
        warnings.add(
          GuidanceWarning(
            icon: Icons.center_focus_strong,
            message: 'Position face in the center frame',
            color: Colors.red,
          ),
        );
        break;
      case ImageValidity.tiltedHead:
        warnings.add(
          GuidanceWarning(
            icon: Icons.straighten,
            message: 'Straighten your head - avoid tilting',
            color: Colors.amber,
          ),
        );
        break;
      case ImageValidity.faceTooFar:
        warnings.add(
          GuidanceWarning(
            icon: Icons.zoom_in,
            message: 'Move closer to the camera',
            color: Colors.blue,
          ),
        );
        break;
      case ImageValidity.unevenLight:
        warnings.add(
          GuidanceWarning(
            icon: Icons.light_mode,
            message: 'Improve lighting on your face',
            color: Colors.purple,
          ),
        );
        break;
      default:
        // Valid image - no warnings
        break;
    }

    return warnings;
  }

  Widget _buildWarningFlag(GuidanceWarning warning) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: warning.color.withOpacity(0.9),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: warning.color.withOpacity(0.3),
            blurRadius: 8,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(warning.icon, color: Colors.white, size: 20),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              warning.message,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// Data class for guidance warnings
class GuidanceWarning {
  final IconData icon;
  final String message;
  final Color color;

  const GuidanceWarning({
    required this.icon,
    required this.message,
    required this.color,
  });
}

/// Enhanced guidance flags widget with animations
class AnimatedGuidanceFlagsWidget extends StatefulWidget {
  final ImageData? imageData;
  final bool isVisible;

  const AnimatedGuidanceFlagsWidget({
    super.key,
    required this.imageData,
    this.isVisible = true,
  });

  @override
  State<AnimatedGuidanceFlagsWidget> createState() =>
      _AnimatedGuidanceFlagsWidgetState();
}

class _AnimatedGuidanceFlagsWidgetState
    extends State<AnimatedGuidanceFlagsWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );

    _fadeAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _animationController, curve: Curves.easeInOut),
    );

    _slideAnimation =
        Tween<Offset>(begin: const Offset(-1, 0), end: Offset.zero).animate(
          CurvedAnimation(
            parent: _animationController,
            curve: Curves.easeOutBack,
          ),
        );
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(AnimatedGuidanceFlagsWidget oldWidget) {
    super.didUpdateWidget(oldWidget);

    // Animate in when warnings appear
    if (widget.imageData != null &&
        widget.imageData!.imageValidity != ImageValidity.valid) {
      _animationController.forward();
    } else {
      _animationController.reverse();
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!widget.isVisible || widget.imageData == null) {
      return const SizedBox.shrink();
    }

    final validity = widget.imageData!.imageValidity;
    final warnings = _getWarningsFromValidity(validity);

    if (warnings.isEmpty) {
      return const SizedBox.shrink();
    }

    return AnimatedBuilder(
      animation: _animationController,
      builder: (context, child) {
        return Positioned(
          top: 80,
          left: 16,
          right: 16,
          child: SlideTransition(
            position: _slideAnimation,
            child: FadeTransition(
              opacity: _fadeAnimation,
              child: Column(
                children: warnings
                    .map((warning) => _buildAnimatedWarningFlag(warning))
                    .toList(),
              ),
            ),
          ),
        );
      },
    );
  }

  List<GuidanceWarning> _getWarningsFromValidity(int validity) {
    final warnings = <GuidanceWarning>[];

    switch (validity) {
      case ImageValidity.invalidDeviceOrientation:
        warnings.add(
          GuidanceWarning(
            icon: Icons.screen_rotation,
            message: 'Rotate device to portrait mode',
            color: Colors.orange,
          ),
        );
        break;
      case ImageValidity.invalidRoi:
        warnings.add(
          GuidanceWarning(
            icon: Icons.center_focus_strong,
            message: 'Position face in the center frame',
            color: Colors.red,
          ),
        );
        break;
      case ImageValidity.tiltedHead:
        warnings.add(
          GuidanceWarning(
            icon: Icons.straighten,
            message: 'Straighten your head - avoid tilting',
            color: Colors.amber,
          ),
        );
        break;
      case ImageValidity.faceTooFar:
        warnings.add(
          GuidanceWarning(
            icon: Icons.zoom_in,
            message: 'Move closer to the camera',
            color: Colors.blue,
          ),
        );
        break;
      case ImageValidity.unevenLight:
        warnings.add(
          GuidanceWarning(
            icon: Icons.light_mode,
            message: 'Improve lighting on your face',
            color: Colors.purple,
          ),
        );
        break;
      default:
        // Valid image - no warnings
        break;
    }

    return warnings;
  }

  Widget _buildAnimatedWarningFlag(GuidanceWarning warning) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: warning.color.withOpacity(0.9),
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: warning.color.withOpacity(0.3),
            blurRadius: 8,
            spreadRadius: 2,
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(warning.icon, color: Colors.white, size: 20),
          const SizedBox(width: 12),
          Flexible(
            child: Text(
              warning.message,
              style: const TextStyle(
                color: Colors.white,
                fontSize: 14,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
