import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/theme/theme_provider.dart';

/// A reusable theme toggle button widget for AppBar actions.
///
/// Switches between light and dark mode with an animated icon transition.
///
/// Features:
/// - Animated rotation and fade transition
/// - Accessible with proper tooltip
/// - Theme-aware icon colors
/// - Smooth toggle animation
///
/// Usage:
/// ```dart
/// AppBar(
///   actions: [
///     const ThemeToggleButton(),
///   ],
/// )
/// ```
class ThemeToggleButton extends ConsumerWidget {
  const ThemeToggleButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeNotifier = ref.read(themeProvider.notifier);
    final colorScheme = Theme.of(context).colorScheme;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return IconButton(
      icon: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        transitionBuilder: (child, animation) {
          return RotationTransition(
            turns: Tween<double>(begin: 0.5, end: 1.0).animate(animation),
            child: FadeTransition(opacity: animation, child: child),
          );
        },
        child: Icon(
          isDark ? Icons.light_mode_rounded : Icons.dark_mode_rounded,
          key: ValueKey<bool>(isDark),
          color: colorScheme.primary,
          size: 24,
        ),
      ),
      tooltip: isDark ? 'Switch to light mode' : 'Switch to dark mode',
      onPressed: () async {
        await themeNotifier.toggleTheme();
      },
    );
  }
}
