import 'package:flutter/material.dart';
import 'package:toastification/toastification.dart';

/// Toast service for showing notifications using toastification package
/// Provides consistent toast notifications throughout the app
///
/// Supports multiple styles: fillColored, flat, flatColored, minimal, simple
/// Supports different alignments and animations
/// Documentation: https://pub.dev/packages/toastification
class ToastService {
  // Private constructor
  ToastService._();

  // Q-Health brand color
  static const Color _primaryColor = Color(0xFF0170B0);

  /// Helper method to create styled title text
  static Text _buildTitle(String title, {Color color = Colors.white}) {
    return Text(
      title,
      style: TextStyle(
        color: color,
        fontWeight: FontWeight.bold,
        fontSize: 16,
      ),
    );
  }

  /// Helper method to create styled description text
  static Text? _buildDescription(String? description,
      {Color color = Colors.white}) {
    if (description == null) return null;
    return Text(
      description,
      style: TextStyle(
        color: color,
        fontSize: 14,
      ),
    );
  }

  /// Animation builders for different animation effects
  static ToastificationAnimationBuilder bounceAnimation = (
    context,
    animation,
    alignment,
    child,
  ) {
    return ScaleTransition(
      scale: CurvedAnimation(
        parent: animation,
        curve: Curves.bounceOut,
      ),
      child: child,
    );
  };

  static ToastificationAnimationBuilder slideAnimation = (
    context,
    animation,
    alignment,
    child,
  ) {
    return SlideTransition(
      position: Tween<Offset>(
        begin: const Offset(1, 0),
        end: Offset.zero,
      ).animate(
        CurvedAnimation(
          parent: animation,
          curve: Curves.easeOutCubic,
        ),
      ),
      child: child,
    );
  };

  static ToastificationAnimationBuilder fadeAnimation = (
    context,
    animation,
    alignment,
    child,
  ) {
    return FadeTransition(
      opacity: animation,
      child: child,
    );
  };

  static ToastificationAnimationBuilder rotateAnimation = (
    context,
    animation,
    alignment,
    child,
  ) {
    return RotationTransition(
      turns: Tween<double>(begin: 0.0, end: 1.0).animate(
        CurvedAnimation(
          parent: animation,
          curve: Curves.easeInOut,
        ),
      ),
      child: FadeTransition(
        opacity: animation,
        child: child,
      ),
    );
  };

  /// Show a success toast
  static void showSuccess({
    required BuildContext context,
    required String title,
    String? description,
    Duration autoCloseDuration = const Duration(seconds: 3),
    bool showCloseButton = true,
    bool showProgressBar = true,
    Alignment alignment = Alignment.topRight,
    ToastificationStyle style = ToastificationStyle.fillColored,
    ToastificationAnimationBuilder? animationBuilder,
  }) {
    toastification.show(
      context: context,
      type: ToastificationType.success,
      style: style,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: autoCloseDuration,
      primaryColor: Colors.green,
      backgroundColor: Colors.green,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.check_circle, color: Colors.white),
      borderRadius: BorderRadius.circular(12),
      boxShadow: lowModeShadow,
      closeButtonShowType: showCloseButton
          ? CloseButtonShowType.onHover
          : CloseButtonShowType.none,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
      showProgressBar: showProgressBar,
      applyBlurEffect: false,
      animationBuilder: animationBuilder,
    );
  }

  /// Show an error toast
  static void showError({
    required BuildContext context,
    required String title,
    String? description,
    Duration autoCloseDuration = const Duration(seconds: 4),
    bool showCloseButton = true,
    bool showProgressBar = true,
    Alignment alignment = Alignment.topRight,
    ToastificationStyle style = ToastificationStyle.fillColored,
    ToastificationAnimationBuilder? animationBuilder,
  }) {
    toastification.show(
      context: context,
      type: ToastificationType.error,
      style: style,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: autoCloseDuration,
      primaryColor: Colors.red,
      backgroundColor: Colors.red,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.error, color: Colors.white),
      borderRadius: BorderRadius.circular(12),
      boxShadow: lowModeShadow,
      closeButtonShowType: showCloseButton
          ? CloseButtonShowType.onHover
          : CloseButtonShowType.none,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
      showProgressBar: showProgressBar,
      applyBlurEffect: false,
      animationBuilder: animationBuilder,
    );
  }

  /// Show a warning toast
  static void showWarning({
    required BuildContext context,
    required String title,
    String? description,
    Duration autoCloseDuration = const Duration(seconds: 3),
    bool showCloseButton = true,
    bool showProgressBar = true,
    Alignment alignment = Alignment.topRight,
    ToastificationStyle style = ToastificationStyle.fillColored,
    ToastificationAnimationBuilder? animationBuilder,
  }) {
    toastification.show(
      context: context,
      type: ToastificationType.warning,
      style: style,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: autoCloseDuration,
      primaryColor: Colors.orange,
      backgroundColor: Colors.orange,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.warning, color: Colors.white),
      borderRadius: BorderRadius.circular(12),
      boxShadow: lowModeShadow,
      closeButtonShowType: showCloseButton
          ? CloseButtonShowType.onHover
          : CloseButtonShowType.none,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
      showProgressBar: showProgressBar,
      applyBlurEffect: false,
      animationBuilder: animationBuilder,
    );
  }

  /// Show an info toast
  static void showInfo({
    required BuildContext context,
    required String title,
    String? description,
    Duration autoCloseDuration = const Duration(seconds: 3),
    bool showCloseButton = true,
    bool showProgressBar = true,
    Alignment alignment = Alignment.topRight,
    ToastificationStyle style = ToastificationStyle.fillColored,
    ToastificationAnimationBuilder? animationBuilder,
  }) {
    toastification.show(
      context: context,
      type: ToastificationType.info,
      style: style,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: autoCloseDuration,
      primaryColor: Colors.blue,
      backgroundColor: Colors.blue,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.info, color: Colors.white),
      borderRadius: BorderRadius.circular(12),
      boxShadow: lowModeShadow,
      closeButtonShowType: showCloseButton
          ? CloseButtonShowType.onHover
          : CloseButtonShowType.none,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
      showProgressBar: showProgressBar,
      applyBlurEffect: false,
      animationBuilder: animationBuilder,
    );
  }

  /// Show a custom toast with full control
  static void showCustom({
    required BuildContext context,
    required String title,
    String? description,
    ToastificationType type = ToastificationType.info,
    ToastificationStyle style = ToastificationStyle.fillColored,
    Color? primaryColor,
    Color? backgroundColor,
    Color? foregroundColor,
    Widget? icon,
    Alignment alignment = Alignment.topRight,
    Duration autoCloseDuration = const Duration(seconds: 3),
    bool showCloseButton = true,
    bool showProgressBar = true,
    ToastificationAnimationBuilder? animationBuilder,
  }) {
    toastification.show(
      context: context,
      type: type,
      style: style,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: autoCloseDuration,
      primaryColor: primaryColor,
      backgroundColor: backgroundColor,
      foregroundColor: foregroundColor,
      icon: icon,
      borderRadius: BorderRadius.circular(12),
      boxShadow: lowModeShadow,
      closeButtonShowType: showCloseButton 
          ? CloseButtonShowType.onHover 
          : CloseButtonShowType.none,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
      showProgressBar: showProgressBar,
      applyBlurEffect: false,
      animationBuilder: animationBuilder,
    );
  }

  /// Show a medical-themed success toast (using Q-Health primary color)
  static void showMedicalSuccess({
    required BuildContext context,
    required String title,
    String? description,
    Duration autoCloseDuration = const Duration(seconds: 3),
    Alignment alignment = Alignment.topRight,
    ToastificationStyle style = ToastificationStyle.fillColored,
    ToastificationAnimationBuilder? animationBuilder,
  }) {
    toastification.show(
      context: context,
      type: ToastificationType.success,
      style: style,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: autoCloseDuration,
      primaryColor: _primaryColor,
      backgroundColor: _primaryColor,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.check_circle, color: Colors.white),
      borderRadius: BorderRadius.circular(12),
      boxShadow: lowModeShadow,
      closeButtonShowType: CloseButtonShowType.onHover,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
      showProgressBar: true,
      applyBlurEffect: false,
      animationBuilder: animationBuilder,
    );
  }

  /// Show a loading/processing toast (doesn't auto-close by default)
  /// Returns the ToastificationItem so you can dismiss it manually
  static ToastificationItem showLoading({
    required BuildContext context,
    required String title,
    String? description,
    bool autoClose = false,
    Duration? autoCloseDuration,
  }) {
    return toastification.show(
      context: context,
      type: ToastificationType.info,
      style: ToastificationStyle.fillColored,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: Alignment.topRight,
      autoCloseDuration: autoClose ? (autoCloseDuration ?? const Duration(seconds: 3)) : null,
      primaryColor: Colors.blue,
      backgroundColor: Colors.blue,
      foregroundColor: Colors.white,
      icon: const SizedBox(
        width: 24,
        height: 24,
        child: CircularProgressIndicator(
          strokeWidth: 2,
          valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
        ),
      ),
      borderRadius: BorderRadius.circular(12),
      boxShadow: lowModeShadow,
      closeButtonShowType: CloseButtonShowType.none,
      closeOnClick: false,
      pauseOnHover: true,
      dragToClose: false,
      showProgressBar: false,
      applyBlurEffect: false,
    );
  }

  /// Dismiss a specific toast
  static void dismiss(ToastificationItem item) {
    toastification.dismiss(item);
  }

  /// Dismiss all toasts
  static void dismissAll() {
    toastification.dismissAll();
  }

  // ========== Style-Specific Methods ==========

  /// Show a minimal style toast (simple and clean)
  static void showMinimal({
    required BuildContext context,
    required String title,
    String? description,
    ToastificationType type = ToastificationType.info,
    Duration autoCloseDuration = const Duration(seconds: 3),
    Alignment alignment = Alignment.topRight,
  }) {
    toastification.show(
      context: context,
      type: type,
      style: ToastificationStyle.minimal,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: autoCloseDuration,
      borderRadius: BorderRadius.circular(12),
      boxShadow: lowModeShadow,
      closeButtonShowType: CloseButtonShowType.onHover,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
      showProgressBar: false,
    );
  }

  /// Show a flat style toast (no shadows, clean design)
  static void showFlat({
    required BuildContext context,
    required String title,
    String? description,
    ToastificationType type = ToastificationType.info,
    Duration autoCloseDuration = const Duration(seconds: 3),
    Alignment alignment = Alignment.topRight,
  }) {
    toastification.show(
      context: context,
      type: type,
      style: ToastificationStyle.flat,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: autoCloseDuration,
      borderRadius: BorderRadius.circular(12),
      closeButtonShowType: CloseButtonShowType.onHover,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
      showProgressBar: true,
    );
  }

  /// Show a simple style toast (basic styling)
  static void showSimple({
    required BuildContext context,
    required String title,
    String? description,
    ToastificationType type = ToastificationType.info,
    Duration autoCloseDuration = const Duration(seconds: 3),
    Alignment alignment = Alignment.topRight,
  }) {
    toastification.show(
      context: context,
      type: type,
      style: ToastificationStyle.simple,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: autoCloseDuration,
      borderRadius: BorderRadius.circular(8),
      closeButtonShowType: CloseButtonShowType.onHover,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
    );
  }

  /// Show a flat colored style toast (colored with no shadows)
  static void showFlatColored({
    required BuildContext context,
    required String title,
    String? description,
    ToastificationType type = ToastificationType.info,
    Duration autoCloseDuration = const Duration(seconds: 3),
    Alignment alignment = Alignment.topRight,
  }) {
    toastification.show(
      context: context,
      type: type,
      style: ToastificationStyle.flatColored,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: autoCloseDuration,
      borderRadius: BorderRadius.circular(12),
      closeButtonShowType: CloseButtonShowType.onHover,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
      showProgressBar: true,
    );
  }

  // ========== Specialized Medical Toasts ==========

  /// Show appointment-related toast
  static void showAppointment({
    required BuildContext context,
    required String title,
    String? description,
    bool isSuccess = true,
    Alignment alignment = Alignment.topRight,
  }) {
    toastification.show(
      context: context,
      type: isSuccess ? ToastificationType.success : ToastificationType.info,
      style: ToastificationStyle.fillColored,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: const Duration(seconds: 4),
      primaryColor: _primaryColor,
      backgroundColor: _primaryColor,
      foregroundColor: Colors.white,
      icon: Icon(
        isSuccess ? Icons.check_circle : Icons.calendar_today,
        color: Colors.white,
      ),
      borderRadius: BorderRadius.circular(12),
      boxShadow: lowModeShadow,
      closeButtonShowType: CloseButtonShowType.onHover,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
      showProgressBar: true,
      applyBlurEffect: false,
    );
  }

  /// Show prescription-related toast
  static void showPrescription({
    required BuildContext context,
    required String title,
    String? description,
    Alignment alignment = Alignment.topRight,
  }) {
    toastification.show(
      context: context,
      type: ToastificationType.success,
      style: ToastificationStyle.fillColored,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: const Duration(seconds: 4),
      primaryColor: Colors.green,
      backgroundColor: Colors.green,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.medication, color: Colors.white),
      borderRadius: BorderRadius.circular(12),
      boxShadow: lowModeShadow,
      closeButtonShowType: CloseButtonShowType.onHover,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
      showProgressBar: true,
    );
  }

  /// Show vital signs update toast
  static void showVitals({
    required BuildContext context,
    required String title,
    String? description,
    Alignment alignment = Alignment.topRight,
  }) {
    toastification.show(
      context: context,
      type: ToastificationType.info,
      style: ToastificationStyle.fillColored,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: const Duration(seconds: 3),
      primaryColor: _primaryColor,
      backgroundColor: _primaryColor,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.favorite, color: Colors.white),
      borderRadius: BorderRadius.circular(12),
      boxShadow: lowModeShadow,
      closeButtonShowType: CloseButtonShowType.onHover,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
      showProgressBar: true,
    );
  }

  /// Show video call notification toast
  static void showVideoCall({
    required BuildContext context,
    required String title,
    String? description,
    Alignment alignment = Alignment.topCenter,
  }) {
    toastification.show(
      context: context,
      type: ToastificationType.info,
      style: ToastificationStyle.fillColored,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: const Duration(seconds: 10),
      primaryColor: _primaryColor,
      backgroundColor: _primaryColor,
      foregroundColor: Colors.white,
      icon: const Icon(Icons.videocam, color: Colors.white),
      borderRadius: BorderRadius.circular(12),
      boxShadow: highModeShadow,
      closeButtonShowType: CloseButtonShowType.always,
      closeOnClick: false,
      pauseOnHover: true,
      dragToClose: false,
      showProgressBar: true,
      applyBlurEffect: true,
    );
  }

  /// Show network/connectivity toast
  static void showNetwork({
    required BuildContext context,
    required String title,
    String? description,
    bool isConnected = false,
    Alignment alignment = Alignment.bottomCenter,
  }) {
    toastification.show(
      context: context,
      type: isConnected ? ToastificationType.success : ToastificationType.error,
      style: ToastificationStyle.flatColored,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: alignment,
      autoCloseDuration: const Duration(seconds: 3),
      icon: Icon(
        isConnected ? Icons.wifi : Icons.wifi_off,
        color: Colors.white,
      ),
      borderRadius: BorderRadius.circular(12),
      closeButtonShowType: CloseButtonShowType.onHover,
      closeOnClick: true,
      pauseOnHover: false,
      dragToClose: true,
      showProgressBar: false,
    );
  }

  /// Show a bottom-aligned toast (useful for mobile actions)
  static void showBottomToast({
    required BuildContext context,
    required String title,
    String? description,
    ToastificationType type = ToastificationType.info,
    Duration autoCloseDuration = const Duration(seconds: 2),
  }) {
    toastification.show(
      context: context,
      type: type,
      style: ToastificationStyle.fillColored,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: Alignment.bottomCenter,
      autoCloseDuration: autoCloseDuration,
      borderRadius: BorderRadius.circular(12),
      boxShadow: lowModeShadow,
      closeButtonShowType: CloseButtonShowType.none,
      closeOnClick: true,
      pauseOnHover: false,
      dragToClose: true,
      showProgressBar: false,
      animationBuilder: slideAnimation,
    );
  }

  /// Show a center-aligned important toast
  static void showCenterToast({
    required BuildContext context,
    required String title,
    String? description,
    ToastificationType type = ToastificationType.warning,
    Duration autoCloseDuration = const Duration(seconds: 5),
  }) {
    toastification.show(
      context: context,
      type: type,
      style: ToastificationStyle.fillColored,
      title: _buildTitle(title),
      description: _buildDescription(description),
      alignment: Alignment.center,
      autoCloseDuration: autoCloseDuration,
      borderRadius: BorderRadius.circular(12),
      boxShadow: highModeShadow,
      closeButtonShowType: CloseButtonShowType.always,
      closeOnClick: true,
      pauseOnHover: true,
      dragToClose: true,
      showProgressBar: true,
      applyBlurEffect: true,
      animationBuilder: bounceAnimation,
    );
  }
}
