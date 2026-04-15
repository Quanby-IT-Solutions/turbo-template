import 'package:awesome_snackbar_content/awesome_snackbar_content.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toastification/toastification.dart';
import 'package:mobile/core/widgets/tour_item.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/features/home/presentation/providers/tour_provider.dart';
import 'package:mobile/features/onboarding/presentation/providers/onboarding_provider.dart';
import 'package:mobile/core/theme/theme_provider.dart';
import 'package:mobile/services/storage/tour_storage_service.dart';
import 'package:mobile/shared/widgets/app_card.dart';
import 'package:mobile/shared/widgets/section_header.dart';
import 'package:mobile/shared/widgets/settings_group.dart';

class SettingsTab extends ConsumerWidget {
  const SettingsTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final themeMode = ref.watch(themeModeProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
      ),
      body: ListView(
        children: [
          // User info section
          TourItem(
            tabIndex: 3,
            order: 0,
            title: 'Your Profile',
            description: 'View your account details at a glance.',
            child: AppCard(
              margin: const EdgeInsets.all(16),
              padding: const EdgeInsets.all(24),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: theme.colorScheme.primaryContainer,
                    child: Text(
                      (user?.name.isNotEmpty == true)
                          ? user!.name[0].toUpperCase()
                          : '?',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        color: theme.colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          user?.name ?? 'Unknown',
                          style: theme.textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w600,
                            letterSpacing: -0.5,
                            height: 1.1,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          user?.email ?? '',
                          style: theme.textTheme.bodyMedium?.copyWith(
                            color: theme.colorScheme.onSurface.withOpacity(0.6),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          // Theme section
          TourItem(
            tabIndex: 3,
            order: 1,
            title: 'Theme Settings',
            description:
                'Choose between System, Light, or Dark theme to '
                'customize your experience.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(title: 'Appearance'),
                SettingsGroup(
                  children: [
                    RadioGroup<ThemeMode>(
                      groupValue: themeMode,
                      onChanged: (mode) {
                        if (mode != null) {
                          ref
                              .read(themeControllerProvider.notifier)
                              .setThemeMode(mode);
                        }
                      },
                      child: Column(
                        children: [
                          RadioListTile<ThemeMode>(
                            title: const Text('System'),
                            subtitle: const Text('Follow device theme'),
                            value: ThemeMode.system,
                          ),
                          RadioListTile<ThemeMode>(
                            title: const Text('Light'),
                            value: ThemeMode.light,
                          ),
                          RadioListTile<ThemeMode>(
                            title: const Text('Dark'),
                            value: ThemeMode.dark,
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Actions section
          const SectionHeader(title: 'Account'),
          SettingsGroup(
            children: [
              TourItem(
                tabIndex: 3,
                order: 2,
                title: 'Replay Tour',
                description: 'Tap here anytime to replay this feature tour.',
                child: ListTile(
                  leading: const Icon(Icons.tour_outlined),
                  title: const Text('Take a Tour'),
                  subtitle: const Text('Replay the feature tour'),
                  trailing: Icon(
                    Icons.chevron_right,
                    color: theme.colorScheme.onSurface.withOpacity(0.3),
                  ),
                  onTap: () {
                    final userId = ref.read(currentUserProvider)?.id;
                    if (userId != null) {
                      ref.read(tourStorageServiceProvider).resetTour(userId);
                    }
                    ref.read(tourTriggerProvider.notifier).trigger();
                  },
                ),
              ),
              ListTile(
                leading: const Icon(Icons.replay_outlined),
                title: const Text('Reset Onboarding'),
                subtitle: const Text('Show onboarding screens again'),
                trailing: Icon(
                  Icons.chevron_right,
                  color: theme.colorScheme.onSurface.withOpacity(0.3),
                ),
                onTap: () async {
                  await ref
                      .read(onboardingStateProvider.notifier)
                      .resetOnboarding();
                  if (context.mounted) {
                    ScaffoldMessenger.of(context)
                      ..hideCurrentSnackBar()
                      ..showSnackBar(
                        SnackBar(
                          elevation: 0,
                          behavior: SnackBarBehavior.floating,
                          backgroundColor: Colors.transparent,
                          content: AwesomeSnackbarContent(
                            title: 'Onboarding Reset',
                            message: 'Restart the app to see onboarding again.',
                            contentType: ContentType.success,
                          ),
                        ),
                      );
                  }
                },
              ),
              ListTile(
                leading: Icon(
                  Icons.logout,
                  color: theme.colorScheme.error,
                ),
                title: Text(
                  'Sign Out',
                  style: TextStyle(color: theme.colorScheme.error),
                ),
                onTap: () async {
                  final confirmed = await showDialog<bool>(
                    context: context,
                    builder: (ctx) => AlertDialog(
                      title: const Text('Sign Out'),
                      content:
                          const Text('Are you sure you want to sign out?'),
                      actions: [
                        TextButton(
                          onPressed: () => Navigator.of(ctx).pop(false),
                          child: const Text('Cancel'),
                        ),
                        FilledButton(
                          onPressed: () => Navigator.of(ctx).pop(true),
                          child: const Text('Sign Out'),
                        ),
                      ],
                    ),
                  );
                  if (confirmed == true) {
                    await ref.read(authStateProvider.notifier).signOut();
                    toastification.show(
                      title: const Text('Signed out successfully'),
                      type: ToastificationType.success,
                      autoCloseDuration: const Duration(seconds: 2),
                      style: ToastificationStyle.flat,
                    );
                  }
                },
              ),
            ],
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }
}
