import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/widgets/tour_item.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/shared/widgets/app_card.dart';
import 'package:mobile/shared/widgets/section_header.dart';
import 'package:mobile/shared/widgets/settings_group.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: TourItem(
          tabIndex: 2,
          order: 0,
          title: 'Your Profile',
          description: 'View and manage your account details here.',
          child: const Text('Profile'),
        ),
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 16),
        children: [
          // Avatar + name header
          TourItem(
            tabIndex: 2,
            order: 1,
            title: 'Profile Picture',
            description:
                'Your avatar is generated from your name initial. '
                'Tap to customize in a future update.',
            child: AppCard(
              margin: const EdgeInsets.symmetric(horizontal: 16),
              padding: const EdgeInsets.symmetric(vertical: 24),
              child: Column(
                children: [
                  CircleAvatar(
                    radius: 48,
                    backgroundColor: theme.colorScheme.primaryContainer,
                    backgroundImage: user?.image != null
                        ? NetworkImage(user!.image!)
                        : null,
                    child: user?.image == null
                        ? Text(
                            (user?.name.isNotEmpty == true)
                                ? user!.name[0].toUpperCase()
                                : '?',
                            style: theme.textTheme.headlineLarge?.copyWith(
                              color: theme.colorScheme.onPrimaryContainer,
                            ),
                          )
                        : null,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    user?.name ?? 'Unknown',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: theme.colorScheme.onSurface.withOpacity(0.9),
                      letterSpacing: -0.5,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.email ?? '',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.6),
                      height: 1.47,
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Account details section
          TourItem(
            tabIndex: 2,
            order: 2,
            title: 'Account Details',
            description: 'View your account information at a glance.',
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const SectionHeader(title: 'Account Information'),
                SettingsGroup(
                  children: [
                ListTile(
                  leading: Icon(
                    Icons.badge_outlined,
                    color: theme.colorScheme.primary,
                  ),
                  title: const Text('User ID'),
                  subtitle: Text(
                    user?.id ?? '—',
                    style: theme.textTheme.bodySmall?.copyWith(
                      fontFamily: 'monospace',
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ),
                ListTile(
                  leading: Icon(
                    Icons.email_outlined,
                    color: theme.colorScheme.primary,
                  ),
                  title: const Text('Email'),
                  subtitle: Text(user?.email ?? '—'),
                  trailing: user?.emailVerified == true
                      ? Chip(
                          label: const Text('Verified'),
                          avatar: Icon(
                            Icons.check_circle,
                            size: 16,
                            color: theme.colorScheme.primary,
                          ),
                          backgroundColor:
                              theme.colorScheme.primaryContainer,
                          side: BorderSide.none,
                          labelStyle: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onPrimaryContainer,
                          ),
                        )
                      : Chip(
                          label: const Text('Unverified'),
                          backgroundColor:
                              theme.colorScheme.errorContainer,
                          side: BorderSide.none,
                          labelStyle: theme.textTheme.labelSmall?.copyWith(
                            color: theme.colorScheme.onErrorContainer,
                          ),
                        ),
                ),
                ListTile(
                  leading: Icon(
                    Icons.calendar_today_outlined,
                    color: theme.colorScheme.primary,
                  ),
                  title: const Text('Member Since'),
                  subtitle: Text(
                    user?.createdAt != null
                        ? _formatDate(user!.createdAt!)
                        : '—',
                  ),
                ),
                if (user?.updatedAt != null)
                  ListTile(
                    leading: Icon(
                      Icons.update_outlined,
                      color: theme.colorScheme.primary,
                    ),
                    title: const Text('Last Updated'),
                    subtitle: Text(_formatDate(user!.updatedAt!)),
                  ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
}
