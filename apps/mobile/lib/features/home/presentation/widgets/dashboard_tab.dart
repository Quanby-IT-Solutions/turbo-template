import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/widgets/tour_item.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';

class DashboardTab extends ConsumerWidget {
  const DashboardTab({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: TourItem(
          tabIndex: 0,
          order: 0,
          title: 'Welcome!',
          description:
              'This is your personalized dashboard with a greeting '
              'and account overview.',
          child: const Text('Home'),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Hello, ${user?.name ?? 'there'}!',
                      style: theme.textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Welcome to Turbo Template',
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: theme.colorScheme.onSurfaceVariant,
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: 32),
              TourItem(
                tabIndex: 0,
                order: 1,
                title: 'Your Email',
                description: 'View your registered email address here.',
                child: Card(
                  child: ListTile(
                    leading: Icon(
                      Icons.email_outlined,
                      color: theme.colorScheme.primary,
                    ),
                    title: const Text('Email'),
                    subtitle: Text(user?.email ?? '—'),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              TourItem(
                tabIndex: 0,
                order: 2,
                title: 'Member Since',
                description: 'See when you joined the platform.',
                child: Card(
                  child: ListTile(
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
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
}
