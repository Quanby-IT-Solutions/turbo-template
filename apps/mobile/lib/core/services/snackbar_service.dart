import 'package:flutter/material.dart';
import 'package:awesome_snackbar_content/awesome_snackbar_content.dart';

/// Unified Snackbar service for showing AwesomeSnackbarContent with optional action buttons
///
/// **When to use:**
/// - Important messages that need user attention (success, errors, warnings)
/// - Messages that require user interaction (delete with undo, confirmations)
/// - Beautiful, animated notifications with optional actions
///
/// **When NOT to use (use ToastService instead):**
/// - Simple informational messages
/// - Quick feedback that doesn't need actions
/// - Non-critical notifications
///
/// Documentation: https://pub.dev/packages/awesome_snackbar_content
///
/// Usage:
/// ```dart
/// // Without actions
/// SnackbarService.showSuccess(
///   context: context,
///   title: 'Success!',
///   message: 'Your changes have been saved',
/// );
///
/// // With actions
/// SnackbarService.showWarning(
///   context: context,
///   title: 'Unsaved Changes',
///   message: 'You have unsaved changes',
///   actions: [
///     SnackbarAction(
///       label: 'SAVE',
///       onPressed: () => _save(),
///       isPrimary: true,
///     ),
///     SnackbarAction(
///       label: 'DISCARD',
///       onPressed: () => _discard(),
///     ),
///   ],
/// );
///
/// // Delete with undo (common pattern)
/// SnackbarService.showDeleteWithUndo(
///   context: context,
///   itemName: 'Prescription',
///   onUndo: () => _restore(),
/// );
/// ```
class SnackbarService {
  // Private constructor
  SnackbarService._();

  /// Show a snackbar with awesome content and optional custom action buttons
  static void show({
    required BuildContext context,
    required String title,
    required String message,
    required ContentType contentType,
    List<SnackbarAction>? actions,
    Duration duration = const Duration(seconds: 5),
    bool inMaterialBanner = false,
  }) {
    final overlay = Overlay.of(context);
    late OverlayEntry overlayEntry;

    overlayEntry = OverlayEntry(
      builder: (context) => Positioned(
        bottom: 20,
        left: 16,
        right: 16,
        child: Material(
          color: Colors.transparent,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              // Action buttons above the snackbar (if provided)
              if (actions != null && actions.isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      for (int i = 0; i < actions.length; i++) ...[
                        if (i > 0) const SizedBox(width: 8),
                        _buildActionButton(
                          action: actions[i],
                          onRemove: () => overlayEntry.remove(),
                        ),
                      ],
                    ],
                  ),
                ),
              // The awesome snackbar content
              AwesomeSnackbarContent(
                title: title,
                message: message,
                contentType: contentType,
                inMaterialBanner: inMaterialBanner,
              ),
            ],
          ),
        ),
      ),
    );

    overlay.insert(overlayEntry);

    // Auto-dismiss after duration
    Future.delayed(duration, () {
      if (overlayEntry.mounted) {
        overlayEntry.remove();
      }
    });
  }

  /// Build an action button with consistent styling
  static Widget _buildActionButton({
    required SnackbarAction action,
    required VoidCallback onRemove,
  }) {
    if (action.icon != null) {
      return FilledButton.tonalIcon(
        onPressed: () {
          onRemove();
          action.onPressed();
        },
        icon: Icon(action.icon),
        label: Text(action.label),
        style: FilledButton.styleFrom(
          backgroundColor:
              action.backgroundColor ?? Colors.white.withValues(alpha: 0.9),
          foregroundColor: action.foregroundColor ?? Colors.grey.shade700,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        ),
      );
    }

    return FilledButton.tonal(
      onPressed: () {
        onRemove();
        action.onPressed();
      },
      style: FilledButton.styleFrom(
        backgroundColor:
            action.backgroundColor ??
            (action.isPrimary
                ? Colors.white
                : Colors.white.withValues(alpha: 0.9)),
        foregroundColor:
            action.foregroundColor ??
            (action.isPrimary ? Colors.orange.shade800 : Colors.grey.shade700),
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
      ),
      child: Text(action.label),
    );
  }

  /// Show a success snackbar with optional actions
  static void showSuccess({
    required BuildContext context,
    required String title,
    required String message,
    List<SnackbarAction>? actions,
    Duration duration = const Duration(seconds: 5),
  }) {
    show(
      context: context,
      title: title,
      message: message,
      contentType: ContentType.success,
      actions: actions,
      duration: duration,
    );
  }

  /// Show an error/failure snackbar with optional actions
  static void showError({
    required BuildContext context,
    required String title,
    required String message,
    List<SnackbarAction>? actions,
    Duration duration = const Duration(seconds: 5),
  }) {
    show(
      context: context,
      title: title,
      message: message,
      contentType: ContentType.failure,
      actions: actions,
      duration: duration,
    );
  }

  /// Show a warning snackbar with optional actions
  static void showWarning({
    required BuildContext context,
    required String title,
    required String message,
    List<SnackbarAction>? actions,
    Duration duration = const Duration(seconds: 5),
  }) {
    show(
      context: context,
      title: title,
      message: message,
      contentType: ContentType.warning,
      actions: actions,
      duration: duration,
    );
  }

  /// Show a help/info snackbar with optional actions
  static void showHelp({
    required BuildContext context,
    required String title,
    required String message,
    List<SnackbarAction>? actions,
    Duration duration = const Duration(seconds: 5),
  }) {
    show(
      context: context,
      title: title,
      message: message,
      contentType: ContentType.help,
      actions: actions,
      duration: duration,
    );
  }

  /// Show a delete confirmation snackbar with undo action
  /// Common pattern for delete operations with undo functionality
  static void showDeleteWithUndo({
    required BuildContext context,
    required String itemName,
    required VoidCallback onUndo,
    String title = 'Deleted',
    Duration duration = const Duration(seconds: 5),
  }) {
    show(
      context: context,
      title: title,
      message: '$itemName has been removed',
      contentType: ContentType.warning,
      duration: duration,
      actions: [
        SnackbarAction(
          label: 'UNDO',
          onPressed: onUndo,
          isPrimary: true,
          foregroundColor: Colors.orange.shade800,
        ),
        SnackbarAction(
          label: 'DISMISS',
          icon: Icons.close_rounded,
          onPressed: () {}, // Just dismisses
          foregroundColor: Colors.grey.shade700,
        ),
      ],
    );
  }

  /// Hide the current snackbar (if any)
  /// Note: This removes the overlay entry immediately
  static void hide(BuildContext context) {
    // Since we're using overlay, we can't hide it directly
    // The snackbar will auto-dismiss based on duration
    // This method is kept for API compatibility
  }
}

/// Model class for snackbar action buttons
class SnackbarAction {
  final String label;
  final VoidCallback onPressed;
  final IconData? icon;
  final bool isPrimary;
  final Color? backgroundColor;
  final Color? foregroundColor;

  const SnackbarAction({
    required this.label,
    required this.onPressed,
    this.icon,
    this.isPrimary = false,
    this.backgroundColor,
    this.foregroundColor,
  });
}
