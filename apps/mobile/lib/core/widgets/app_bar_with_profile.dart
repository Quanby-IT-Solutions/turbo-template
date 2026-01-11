import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:mobile/core/theme/theme_provider.dart';

/// Standardized AppBar title widget with profile avatar and theme toggle.
///
/// Designed to work with DraggableHome's title parameter or as a standalone AppBar title.
/// Provides consistent profile navigation and theme switching across all screens.
///
/// Features:
/// - Profile avatar with image loading and fallback icon
/// - Theme toggle button (light/dark mode)
/// - Popup menu with profile, settings, and logout options
/// - Responsive layout with proper spacing
/// - Material 3 theming integration
///
/// Usage with DraggableHome:
/// ```dart
/// DraggableHome(
///   title: const AppBarWithProfile(),
///   headerWidget: _buildHeaderWidget(context, user),
///   body: [...],
/// )
/// ```
///
/// Usage with standard Scaffold:
/// ```dart
/// Scaffold(
///   appBar: AppBar(
///     automaticallyImplyLeading: false,
///     title: const AppBarWithProfile(),
///   ),
///   body: ...,
/// )
/// ```
class AppBarWithProfile extends ConsumerWidget {
  const AppBarWithProfile({
    super.key,
    this.title,
    this.showPopupMenu = true,
    this.onLogout,
  });

  /// Optional title text to display (defaults to role-based title)
  final String? title;

  /// Whether to show the popup menu on avatar tap (default: true)
  final bool showPopupMenu;

  /// Custom logout callback (optional)
  final VoidCallback? onLogout;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final themeNotifier = ref.read(themeProvider.notifier);
    final colorScheme = Theme.of(context).colorScheme;

    return Row(
      children: [
        // Profile Avatar Button
        if (showPopupMenu)
          _buildProfileMenuButton(context, ref, colorScheme)
        else
          _buildSimpleProfileButton(context, user, colorScheme),

        // Spacer to center the title
        const Spacer(),

        // Center Title (if provided)
        if (title != null)
          Text(
            title!,
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w700,
                  color: colorScheme.onSurface,
                  letterSpacing: -0.3,
                ),
          ),

        // Spacer to balance the layout
        const Spacer(),

        // Theme Toggle Button
        _buildThemeToggleButton(context, themeNotifier, colorScheme),
      ],
    );
  }

  /// Builds profile button with popup menu
  Widget _buildProfileMenuButton(
    BuildContext context,
    WidgetRef ref,
    ColorScheme colorScheme,
  ) {
    final user = ref.watch(currentUserProvider);

    return PopupMenuButton<String>(
      icon: _buildProfileAvatar(context, user, colorScheme),
      tooltip: 'Profile & Settings',
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: colorScheme.outline.withValues(alpha: 0.1),
          width: 1,
        ),
      ),
      elevation: 8,
      onSelected: (value) => _handleMenuSelection(value, context, ref),
      itemBuilder: (context) => [
        _buildMenuItem(
          context,
          'profile',
          Icons.person_rounded,
          'Profile',
          colorScheme.primary,
        ),
        _buildMenuItem(
          context,
          'settings',
          Icons.settings_rounded,
          'Settings',
          colorScheme.secondary,
        ),
        _buildMenuItem(
          context,
          'help',
          Icons.help_rounded,
          'Help & Support',
          colorScheme.tertiary,
        ),
        const PopupMenuDivider(),
        _buildMenuItem(
          context,
          'logout',
          Icons.logout_rounded,
          'Logout',
          colorScheme.error,
        ),
      ],
    );
  }

  /// Builds simple profile button without popup menu
  Widget _buildSimpleProfileButton(
    BuildContext context,
    dynamic user,
    ColorScheme colorScheme,
  ) {
    return IconButton(
      icon: _buildProfileAvatar(context, user, colorScheme),
      tooltip: 'Profile',
      onPressed: () => context.push('/profile'),
    );
  }

  /// Builds the profile avatar with image or fallback icon
  Widget _buildProfileAvatar(
    BuildContext context,
    dynamic user,
    ColorScheme colorScheme,
  ) {
    final hasProfileImage =
        user?.profileImageUrl != null &&
        user.profileImageUrl.toString().isNotEmpty;

    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        border: Border.all(color: colorScheme.primary, width: 2),
      ),
      child: ClipOval(
        child: hasProfileImage
            ? Image.network(
                user.profileImageUrl,
                width: 36,
                height: 36,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) {
                  return _buildFallbackAvatar(colorScheme);
                },
                loadingBuilder: (context, child, loadingProgress) {
                  if (loadingProgress == null) return child;
                  return _buildLoadingAvatar(colorScheme);
                },
              )
            : _buildFallbackAvatar(colorScheme),
      ),
    );
  }

  /// Builds fallback avatar icon when no image is available
  Widget _buildFallbackAvatar(ColorScheme colorScheme) {
    return Container(
      color: colorScheme.primary.withValues(alpha: 0.1),
      child: Icon(Icons.person, size: 20, color: colorScheme.primary),
    );
  }

  /// Builds loading indicator for avatar image
  Widget _buildLoadingAvatar(ColorScheme colorScheme) {
    return Container(
      color: colorScheme.surface,
      child: Center(
        child: SizedBox(
          width: 16,
          height: 16,
          child: CircularProgressIndicator(
            strokeWidth: 2,
            valueColor: AlwaysStoppedAnimation<Color>(colorScheme.primary),
          ),
        ),
      ),
    );
  }

  /// Builds a popup menu item with icon and text
  PopupMenuItem<String> _buildMenuItem(
    BuildContext context,
    String value,
    IconData icon,
    String label,
    Color color,
  ) {
    return PopupMenuItem(
      value: value,
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: color),
          ),
          const SizedBox(width: 12),
          Text(label),
        ],
      ),
    );
  }

  /// Builds the theme toggle button
  Widget _buildThemeToggleButton(
    BuildContext context,
    ThemeNotifier themeNotifier,
    ColorScheme colorScheme,
  ) {
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

  /// Handles menu item selection
  void _handleMenuSelection(String value, BuildContext context, WidgetRef ref) {
    switch (value) {
      case 'profile':
        context.push('/profile');
        break;
      case 'settings':
        // TODO: Implement settings navigation
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Settings coming soon'),
            duration: Duration(seconds: 2),
          ),
        );
        break;
      case 'help':
        // TODO: Implement help navigation
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Help & Support coming soon'),
            duration: Duration(seconds: 2),
          ),
        );
        break;
      case 'logout':
        if (onLogout != null) {
          onLogout!();
        } else {
          _showLogoutDialog(context, ref);
        }
        break;
    }
  }

  /// Shows logout confirmation dialog
  Future<void> _showLogoutDialog(BuildContext context, WidgetRef ref) async {
    final shouldLogout = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sign Out'),
        content: const Text('Are you sure you want to sign out of Q-Health?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );

    if (shouldLogout == true && context.mounted) {
      await ref.read(authProvider.notifier).logout();
      ref.invalidate(authProvider);
      ref.invalidate(authErrorProvider);
      if (context.mounted) {
        context.go('/login');
      }
    }
  }
}
