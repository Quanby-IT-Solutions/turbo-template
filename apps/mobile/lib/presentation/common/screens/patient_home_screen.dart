import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:mobile/core/responsive/responsive_config.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/core/widgets/stat_card.dart';
import 'package:mobile/core/widgets/section_header.dart';
import 'package:mobile/core/widgets/section_container.dart';
import 'package:mobile/core/widgets/activity_card.dart';
import 'package:mobile/core/widgets/quick_action_button.dart';
import 'package:mobile/core/widgets/profile_menu_button.dart';
import 'package:mobile/core/widgets/theme_toggle_button.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart'
    as auth_providers;

class PatientHomeScreen extends ConsumerWidget {
  const PatientHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return AnimatedNavWrapper(
      child: Column(
        children: [
          AppBar(
            title: Text(
              'Dashboard',
              style: TextStyle(
                color: colorScheme.onSurface,
                fontSize: 22,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.3,
              ),
            ),
            elevation: 0,
            backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
            actions: [
              const ThemeToggleButton(),
              ProfileMenuButton(
                onLogout: () => _showLogoutDialog(context, ref),
              ),
              const SizedBox(width: 8),
            ],
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async {
                // TODO: Implement data refresh
                await Future.delayed(const Duration(seconds: 1));
              },
              child: CustomScrollView(
                slivers: [
                  SliverPadding(
                    padding: const EdgeInsets.all(24),
                    sliver: SliverList(
                      delegate: SliverChildListDelegate([
                        Center(
                          child: ConstrainedBox(
                            constraints: BoxConstraints(
                              maxWidth: context.contentMaxWidth,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Profile Card
                                _buildProfileCard(context, user, colorScheme),

                                const SizedBox(height: 32),

                                // Quick Stats
                                Row(
                                  children: [
                                    Expanded(
                                      child: StatCard(
                                        title: 'Upcoming',
                                        value: '1',
                                        icon: Icons.upcoming_rounded,
                                        color: colorScheme.primary,
                                        onTap: () => context.push(
                                          '/consultations-history',
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 20),
                                    Expanded(
                                      child: StatCard(
                                        title: 'Prescriptions',
                                        value: '2',
                                        icon: Icons.medication_rounded,
                                        color: colorScheme.secondary,
                                        onTap: () =>
                                            context.push('/prescriptions'),
                                      ),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 32),

                                // Health Services Section
                                SectionContainer(
                                  color: colorScheme.primary,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      SectionHeader(
                                        icon: Icons.health_and_safety_rounded,
                                        title: 'Health Services',
                                        subtitle:
                                            'Essential health services for your wellbeing',
                                        color: colorScheme.primary,
                                      ),
                                      const SizedBox(height: 20),
                                      _buildHealthServicesGrid(context),
                                    ],
                                  ),
                                ),

                                const SizedBox(height: 32),

                                // Recent Activity Section
                                SectionContainer(
                                  color: colorScheme.secondary,
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      SectionHeader(
                                        icon: Icons.history_rounded,
                                        title: 'Recent Activity',
                                        subtitle:
                                            'Latest health updates and appointments',
                                        color: colorScheme.secondary,
                                      ),
                                      const SizedBox(height: 20),
                                      ActivityCard(
                                        title:
                                            'Appointment confirmed with Dr. Sarah Johnson',
                                        subtitle: 'Tomorrow, 2:00 PM',
                                        icon: Icons.calendar_today_rounded,
                                        color: colorScheme.primary,
                                        onTap: () => context.push(
                                          '/consultations-history',
                                        ),
                                      ),
                                      const SizedBox(height: 12),
                                      ActivityCard(
                                        title:
                                            'New prescription available: Amoxicillin',
                                        subtitle: '1 day ago',
                                        icon: Icons.medication_rounded,
                                        color: colorScheme.secondary,
                                        onTap: () =>
                                            context.push('/prescriptions'),
                                      ),
                                      const SizedBox(height: 12),
                                      ActivityCard(
                                        title: 'Vitals check completed',
                                        subtitle: '3 days ago',
                                        icon: Icons.monitor_heart_rounded,
                                        color: colorScheme.tertiary,
                                        onTap: () =>
                                            context.push('/health-trends'),
                                      ),
                                      const SizedBox(height: 12),
                                      ActivityCard(
                                        title: 'Lab results available',
                                        subtitle: '5 days ago',
                                        icon: Icons.science_rounded,
                                        color: colorScheme.outline,
                                        onTap: () => context.push(
                                          '/consultations-history',
                                        ),
                                      ),
                                    ],
                                  ),
                                ),

                                const SizedBox(
                                  height: 100,
                                ), // Bottom nav padding
                              ],
                            ),
                          ),
                        ),
                      ]),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProfileCard(
    BuildContext context,
    dynamic user,
    ColorScheme colorScheme,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  colorScheme.primary.withValues(alpha: 0.08),
                  colorScheme.primary.withValues(alpha: 0.12),
                ]
              : [
                  colorScheme.primary.withValues(alpha: 0.06),
                  colorScheme.primary.withValues(alpha: 0.10),
                ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.primary.withValues(alpha: isDark ? 0.2 : 0.18),
          width: 1.8,
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.primary.withValues(alpha: 0.06),
            offset: const Offset(0, 4),
            blurRadius: 16,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Row(
        children: [
          // Patient Health Badge Design
          Stack(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  gradient: RadialGradient(
                    colors: [
                      Colors.white,
                      Colors.white.withValues(alpha: 0.95),
                    ],
                  ),
                  borderRadius: BorderRadius.circular(26),
                  border: Border.all(color: colorScheme.primary, width: 3.5),
                  boxShadow: [
                    BoxShadow(
                      color: colorScheme.primary.withValues(alpha: 0.25),
                      offset: const Offset(0, 6),
                      blurRadius: 16,
                      spreadRadius: 0,
                    ),
                    BoxShadow(
                      color: Colors.white.withValues(alpha: 0.8),
                      offset: const Offset(0, -2),
                      blurRadius: 8,
                      spreadRadius: 0,
                    ),
                  ],
                ),
                child: CircleAvatar(
                  radius: 30,
                  backgroundColor: colorScheme.primary.withValues(alpha: 0.12),
                  child: Icon(
                    Icons.favorite_rounded,
                    size: 36,
                    color: colorScheme.primary,
                  ),
                ),
              ),
              Positioned(
                bottom: 2,
                right: 2,
                child: Container(
                  padding: const EdgeInsets.all(5),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [colorScheme.secondary, colorScheme.tertiary],
                    ),
                    shape: BoxShape.circle,
                    boxShadow: [
                      const BoxShadow(
                        color: Colors.white,
                        blurRadius: 6,
                        spreadRadius: 3,
                      ),
                      BoxShadow(
                        color: colorScheme.secondary.withValues(alpha: 0.4),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.verified_rounded,
                    size: 14,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(width: 16),

          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  user?.displayName ?? 'Patient',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 6),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 10,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [colorScheme.secondary, colorScheme.tertiary],
                    ),
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: colorScheme.secondary.withValues(alpha: 0.4),
                        offset: const Offset(0, 2),
                        blurRadius: 6,
                        spreadRadius: 0,
                      ),
                    ],
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.verified_rounded,
                        size: 12,
                        color: Colors.white,
                      ),
                      SizedBox(width: 4),
                      Text(
                        'ACTIVE',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 9,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.6,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _getSafeId(String? id) {
    if (id == null || id.isEmpty) return '12345678';
    return id.length >= 8 ? id.substring(0, 8) : id.padRight(8, '0');
  }

  Widget _buildHealthServicesGrid(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final services = [
      _HealthService(
        icon: Icons.search_rounded,
        label: 'Find Doctor',
        color: colorScheme.primary,
        onTap: () => context.push('/doctor-search'),
      ),
      _HealthService(
        icon: Icons.monitor_heart_rounded,
        label: 'Vitals Scanner',
        color: colorScheme.secondary,
        onTap: () => context.push('/vitals-scanner'),
      ),
      _HealthService(
        icon: Icons.history_rounded,
        label: 'Medical History',
        color: colorScheme.tertiary,
        onTap: () => context.push('/consultations-history'),
      ),
      _HealthService(
        icon: Icons.trending_up_rounded,
        label: 'Health Trends',
        color: colorScheme.outline,
        onTap: () => context.push('/health-trends'),
      ),
      _HealthService(
        icon: Icons.medication_rounded,
        label: 'Prescriptions',
        color: colorScheme.error,
        onTap: () => context.push('/prescriptions'),
      ),
      _HealthService(
        icon: Icons.calendar_today_rounded,
        label: 'Appointments',
        color: colorScheme.inversePrimary,
        onTap: () => context.push('/consultations-history'),
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 1.0,
        crossAxisSpacing: 10,
        mainAxisSpacing: 10,
      ),
      itemCount: services.length,
      itemBuilder: (context, index) {
        final service = services[index];
        return QuickActionButton(
          icon: service.icon,
          label: service.label,
          color: service.color,
          onTap: service.onTap,
        );
      },
    );
  }

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

    if (shouldLogout == true) {
      await ref.read(auth_providers.authProvider.notifier).logout();
      ref.invalidate(auth_providers.authProvider);
      ref.invalidate(auth_providers.authErrorProvider);
      if (context.mounted) {
        context.go('/login');
      }
    }
  }
}

class _HealthService {
  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  const _HealthService({
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
  });
}
