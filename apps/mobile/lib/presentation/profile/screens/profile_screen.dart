import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/domain/entities/user.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart'
    as auth_providers;
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:mobile/core/responsive/responsive_config.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _twoFactorLoading = false;
  bool? _pendingTwoFactorValue;

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(auth_providers.currentUserProvider);
    final themeNotifier = ref.read(themeProvider.notifier);
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      body: user == null
          ? const Center(child: CircularProgressIndicator())
          : CustomScrollView(
              slivers: [
                // Modern Header with Gradient
                SliverAppBar(
                  expandedHeight: 280,
                  pinned: true,
                  stretch: true,
                  flexibleSpace: FlexibleSpaceBar(
                    background: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topLeft,
                          end: Alignment.bottomRight,
                          colors: [
                            colorScheme.primary,
                            colorScheme.primary.withValues(alpha: 0.8),
                            colorScheme.secondary.withValues(alpha: 0.6),
                          ],
                        ),
                      ),
                      child: SafeArea(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            const SizedBox(height: 24),
                            // Profile Avatar with Border
                            Container(
                              decoration: BoxDecoration(
                                shape: BoxShape.circle,
                                border: Border.all(
                                  color: Colors.white,
                                  width: 3,
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withValues(alpha: 0.2),
                                    blurRadius: 20,
                                    offset: const Offset(0, 8),
                                  ),
                                ],
                              ),
                              child: CircleAvatar(
                                radius: 50,
                                backgroundColor: Colors.white,
                                child: user.profileImageUrl == null
                                    ? Text(
                                        user.initials,
                                        style: TextStyle(
                                          fontSize: 38,
                                          fontWeight: FontWeight.bold,
                                          color: colorScheme.primary,
                                        ),
                                      )
                                    : null,
                              ),
                            ),
                            const SizedBox(height: 12),
                            // Name
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                              ),
                              child: Text(
                                user.displayName,
                                style: const TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.white,
                                  letterSpacing: -0.5,
                                ),
                                textAlign: TextAlign.center,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            const SizedBox(height: 6),
                            // Role Badge
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 14,
                                vertical: 5,
                              ),
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.25),
                                borderRadius: BorderRadius.circular(20),
                                border: Border.all(
                                  color: Colors.white.withValues(alpha: 0.4),
                                  width: 1.5,
                                ),
                              ),
                              child: Text(
                                user.role.toUpperCase(),
                                style: const TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                  letterSpacing: 1.2,
                                ),
                              ),
                            ),
                            const SizedBox(height: 6),
                            // Verification Badge
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 3,
                              ),
                              decoration: BoxDecoration(
                                color: user.isVerified
                                    ? Colors.green.withValues(alpha: 0.2)
                                    : Colors.orange.withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(
                                  color: user.isVerified
                                      ? Colors.green.shade200
                                      : Colors.orange.shade200,
                                  width: 1.5,
                                ),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    user.isVerified
                                        ? Icons.verified
                                        : Icons.pending,
                                    size: 13,
                                    color: user.isVerified
                                        ? Colors.green.shade100
                                        : Colors.orange.shade100,
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    user.isVerified ? 'Verified' : 'Pending',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w600,
                                      color: user.isVerified
                                          ? Colors.green.shade100
                                          : Colors.orange.shade100,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 16),
                          ],
                        ),
                      ),
                    ),
                  ),
                  actions: [
                    Container(
                      margin: const EdgeInsets.only(right: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(
                          Icons.edit_rounded,
                          color: Colors.white,
                        ),
                        onPressed: () => context.push('/profile/edit'),
                      ),
                    ),
                  ],
                ),
                // Content
                SliverPadding(
                  padding: EdgeInsets.symmetric(
                    horizontal: context.horizontalPadding,
                    vertical: 20,
                  ),
                  sliver: SliverList(
                    delegate: SliverChildListDelegate([
                      // Personal Information Card
                      _buildModernInfoCard(
                        context,
                        'Personal Information',
                        Icons.person_rounded,
                        colorScheme.primary,
                        [
                          _InfoItem('Email', user.email),
                          _InfoItem(
                            'Member since',
                            _formatDate(user.createdAt),
                          ),
                          if (user.lastLoginAt != null)
                            _InfoItem(
                              'Last login',
                              _formatDate(user.lastLoginAt!),
                            ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      // Settings Card
                      _buildModernSettingsCard(
                        context,
                        colorScheme,
                        themeNotifier,
                        user,
                      ),
                      const SizedBox(height: 16),
                      // Logout Button
                      _buildModernLogoutButton(context, colorScheme),
                      const SizedBox(height: 32),
                    ]),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildModernInfoCard(
    BuildContext context,
    String title,
    IconData icon,
    Color accentColor,
    List<_InfoItem> items,
  ) {
    final colorScheme = Theme.of(context).colorScheme;

    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: accentColor.withValues(alpha: 0.08),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: accentColor.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: accentColor, size: 20),
                ),
                const SizedBox(width: 12),
                Text(
                  title,
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                    letterSpacing: -0.2,
                  ),
                ),
              ],
            ),
          ),
          // Content
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: items.asMap().entries.map((entry) {
                final isLast = entry.key == items.length - 1;
                final item = entry.value;
                return Column(
                  children: [
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          width: 120,
                          child: Text(
                            item.label,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.6,
                              ),
                            ),
                          ),
                        ),
                        Expanded(
                          child: Text(
                            item.value,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w500,
                              color: colorScheme.onSurface,
                            ),
                          ),
                        ),
                      ],
                    ),
                    if (!isLast) ...[
                      const SizedBox(height: 12),
                      Divider(
                        height: 1,
                        color: colorScheme.outline.withValues(alpha: 0.1),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ],
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModernSettingsCard(
    BuildContext context,
    ColorScheme colorScheme,
    dynamic themeNotifier,
    User user,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        children: [
          // Theme Setting
          _buildModernListTile(
            context: context,
            icon: themeNotifier.themeIcon,
            iconColor: colorScheme.secondary,
            title: 'Theme',
            subtitle: themeNotifier.themeDisplayName,
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => _showThemeDialog(context),
          ),
          Divider(height: 1, color: colorScheme.outline.withValues(alpha: 0.1)),

          // Two-Factor Authentication
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: colorScheme.primary.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    Icons.security_rounded,
                    color: colorScheme.primary,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Two-Factor Authentication',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onSurface,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        (_pendingTwoFactorValue ?? user.twoFactorEnabled)
                            ? 'Two-factor protection is active'
                            : 'Add an extra layer of security',
                        style: TextStyle(
                          fontSize: 12,
                          color: colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                    ],
                  ),
                ),
                Switch.adaptive(
                  value: _pendingTwoFactorValue ?? user.twoFactorEnabled,
                  onChanged: _twoFactorLoading
                      ? null
                      : (value) => _handleTwoFactorToggle(user, value),
                ),
              ],
            ),
          ),
          if (_twoFactorLoading)
            Padding(
              padding: const EdgeInsets.only(left: 16, right: 16, bottom: 12),
              child: LinearProgressIndicator(
                backgroundColor: colorScheme.primary.withValues(alpha: 0.1),
              ),
            ),
          Divider(height: 1, color: colorScheme.outline.withValues(alpha: 0.1)),

          // Settings
          _buildModernListTile(
            context: context,
            icon: Icons.settings_rounded,
            iconColor: colorScheme.tertiary,
            title: 'Settings',
            subtitle: 'App preferences and configurations',
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Settings coming soon')),
              );
            },
          ),
          Divider(height: 1, color: colorScheme.outline.withValues(alpha: 0.1)),

          // Help & Support
          _buildModernListTile(
            context: context,
            icon: Icons.help_rounded,
            iconColor: Colors.green,
            title: 'Help & Support',
            subtitle: 'Get assistance and support',
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Help & Support coming soon')),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildModernListTile({
    required BuildContext context,
    required IconData icon,
    required Color iconColor,
    required String title,
    String? subtitle,
    Widget? trailing,
    VoidCallback? onTap,
  }) {
    final colorScheme = Theme.of(context).colorScheme;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: iconColor.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor, size: 20),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  if (subtitle != null) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 12,
                        color: colorScheme.onSurface.withValues(alpha: 0.6),
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (trailing != null) trailing,
          ],
        ),
      ),
    );
  }

  Widget _buildModernLogoutButton(
    BuildContext context,
    ColorScheme colorScheme,
  ) {
    return Container(
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: Colors.red.withValues(alpha: 0.2),
          width: 1.5,
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.06),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: InkWell(
        onTap: () async {
          final shouldLogout = await showDialog<bool>(
            context: context,
            builder: (context) => AlertDialog(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
              ),
              title: const Row(
                children: [
                  Icon(Icons.logout, color: Colors.red),
                  SizedBox(width: 12),
                  Text('Sign Out'),
                ],
              ),
              content: const Text(
                'Are you sure you want to sign out of your account?',
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(false),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () => Navigator.of(context).pop(true),
                  style: FilledButton.styleFrom(backgroundColor: Colors.red),
                  child: const Text('Sign Out'),
                ),
              ],
            ),
          );

          if (shouldLogout == true && context.mounted) {
            await ref.read(auth_providers.authProvider.notifier).logout();
            if (context.mounted) {
              context.go('/login');
            }
          }
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.red.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: const Icon(
                  Icons.logout_rounded,
                  color: Colors.red,
                  size: 20,
                ),
              ),
              const SizedBox(width: 12),
              const Text(
                'Sign Out',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.red,
                  letterSpacing: -0.2,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  void _showThemeDialog(BuildContext context) {
    final themeNotifier = ref.read(themeProvider.notifier);
    final currentTheme = ref.read(themeProvider);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Choose Theme'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<ThemeMode>(
              title: const Text('Light'),
              subtitle: const Text('Light theme'),
              value: ThemeMode.light,
              groupValue: currentTheme,
              secondary: const Icon(Icons.light_mode),
              onChanged: (value) {
                if (value != null) {
                  themeNotifier.setThemeMode(value);
                  Navigator.of(context).pop();
                }
              },
            ),
            RadioListTile<ThemeMode>(
              title: const Text('Dark'),
              subtitle: const Text('Dark theme'),
              value: ThemeMode.dark,
              groupValue: currentTheme,
              secondary: const Icon(Icons.dark_mode),
              onChanged: (value) {
                if (value != null) {
                  themeNotifier.setThemeMode(value);
                  Navigator.of(context).pop();
                }
              },
            ),
            RadioListTile<ThemeMode>(
              title: const Text('System'),
              subtitle: const Text('Follow system setting'),
              value: ThemeMode.system,
              groupValue: currentTheme,
              secondary: const Icon(Icons.brightness_auto),
              onChanged: (value) {
                if (value != null) {
                  themeNotifier.setThemeMode(value);
                  Navigator.of(context).pop();
                }
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
  }

  Future<void> _handleTwoFactorToggle(User user, bool enable) async {
    final password = await _promptForPassword(enabling: enable);
    if (password == null) {
      return;
    }

    if (!mounted) return;

    setState(() {
      _twoFactorLoading = true;
      _pendingTwoFactorValue = enable;
    });

    final notifier = ref.read(auth_providers.authProvider.notifier);

    try {
      if (enable) {
        await notifier.enableTwoFactor(password);
        if (!mounted) return;

        await _showTwoFactorEnabledDialog();
        if (!mounted) return;

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Two-factor authentication enabled')),
        );
      } else {
        await notifier.disableTwoFactor(password);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Two-factor authentication disabled')),
        );
      }
    } catch (error) {
      if (!mounted) return;
      final message = _formatAuthError(error);
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(message)));
    } finally {
      if (mounted) {
        setState(() {
          _twoFactorLoading = false;
          _pendingTwoFactorValue = null;
        });
      }
    }
  }

  Future<void> _showTwoFactorEnabledDialog() async {
    if (!mounted) return;

    await showDialog<void>(
      context: context,
      builder: (dialogContext) => const _TwoFactorEnabledDialog(),
    );
  }

  Future<String?> _promptForPassword({required bool enabling}) async {
    final controller = TextEditingController();
    String? errorMessage;
    try {
      return await showDialog<String>(
        context: context,
        barrierDismissible: false,
        builder: (context) => StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              title: Text(
                enabling
                    ? 'Enable Two-Factor Authentication'
                    : 'Disable Two-Factor Authentication',
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('For security, please confirm your password.'),
                  const SizedBox(height: 12),
                  TextField(
                    controller: controller,
                    autofocus: true,
                    obscureText: true,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      errorText: errorMessage,
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: () {
                    final value = controller.text.trim();
                    if (value.isEmpty) {
                      setDialogState(() {
                        errorMessage = 'Password is required';
                      });
                      return;
                    }
                    Navigator.of(context).pop(value);
                  },
                  child: const Text('Confirm'),
                ),
              ],
            );
          },
        ),
      );
    } finally {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        controller.dispose();
      });
    }
  }

  String _formatAuthError(Object error) {
    final message = error.toString();
    if (message.contains('401')) {
      return 'Invalid password. Please try again.';
    }
    return message.replaceFirst('Exception: ', '');
  }
}

class _InfoItem {
  final String label;
  final String value;

  _InfoItem(this.label, this.value);
}

class _TwoFactorEnabledDialog extends StatelessWidget {
  const _TwoFactorEnabledDialog();

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Two-Factor Enabled'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: const [
          Text(
            'Each sign-in now requires a 6-digit security code sent to your email.',
          ),
          SizedBox(height: 12),
          _TwoFactorInfoRow(
            icon: Icons.email_outlined,
            message:
                'Codes arrive at your registered email and expire quickly.',
          ),
          SizedBox(height: 8),
          _TwoFactorInfoRow(
            icon: Icons.history,
            message:
                'Lost the email? Request another code from the login screen.',
          ),
          SizedBox(height: 8),
          _TwoFactorInfoRow(
            icon: Icons.support_agent,
            message:
                'Reach out to support if you get locked out of your account.',
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Got it'),
        ),
      ],
    );
  }
}

class _TwoFactorInfoRow extends StatelessWidget {
  final IconData icon;
  final String message;

  const _TwoFactorInfoRow({required this.icon, required this.message});

  @override
  Widget build(BuildContext context) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: Theme.of(context).colorScheme.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Text(message, style: Theme.of(context).textTheme.bodyMedium),
        ),
      ],
    );
  }
}
