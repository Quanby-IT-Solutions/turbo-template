import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
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
import 'package:mobile/presentation/doctor/providers/doctor_providers.dart';
import 'package:mobile/presentation/scheduling/providers/appointment_providers.dart';
import 'package:mobile/domain/entities/appointment.dart';

class DoctorHomeScreen extends ConsumerWidget {
  const DoctorHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(auth_providers.currentUserProvider);
    final appointmentsAsync = ref.watch(appointmentsListProvider);
    final colorScheme = Theme.of(context).colorScheme;

    // Filter appointments for today and pending
    final todayAppointments = appointmentsAsync.whenData((appointments) {
      final now = DateTime.now();
      final todayStart = DateTime(now.year, now.month, now.day);
      final todayEnd = todayStart.add(const Duration(days: 1));
      return appointments.where((apt) {
        return apt.scheduledAt.isAfter(todayStart) &&
            apt.scheduledAt.isBefore(todayEnd) &&
            (apt.status.toLowerCase() == 'confirmed' ||
                apt.status.toLowerCase() == 'pending');
      }).toList()
        ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
    }).value ?? [];

    final pendingAppointments = appointmentsAsync.whenData((appointments) {
      return appointments
          .where((apt) => apt.status.toLowerCase() == 'pending')
          .toList()
        ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
    }).value ?? [];

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
                ref.invalidate(appointmentsListProvider);
                await Future.delayed(const Duration(milliseconds: 500));
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
                                        title: 'Today',
                                        value: todayAppointments.length.toString(),
                                        icon: Icons.people_rounded,
                                        color: colorScheme.primary,
                                        onTap: () => context.push(
                                          '/appointment-requests',
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 20),
                                    Expanded(
                                      child: StatCard(
                                        title: 'Pending',
                                        value: pendingAppointments.length.toString(),
                                        icon: Icons.pending_actions_rounded,
                                        color: colorScheme.secondary,
                                        onTap: () => context.push(
                                          '/appointment-requests',
                                        ),
                                      ),
                                    ),
                                  ],
                                ),

                                const SizedBox(height: 24),

                                // Verification Card
                                _buildVerificationCard(context, user),

                                const SizedBox(height: 32),

                                // Clinical Tools Section
                                _buildQuickActions(context),

                                const SizedBox(height: 32),

                                // Today's Schedule Section
                                _buildTodaySchedule(context, ref),

                                const SizedBox(height: 32),

                                // Pending Requests Section
                                _buildPendingRequests(context, ref),

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
                  colorScheme.secondary.withValues(alpha: 0.12),
                ]
              : [
                  colorScheme.primary.withValues(alpha: 0.06),
                  colorScheme.secondary.withValues(alpha: 0.10),
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
          // Doctor Medical Badge Design
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
                    Icons.local_hospital_rounded,
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
                  'Dr. ${user?.displayName ?? 'Doctor'}',
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

  Widget _buildVerificationCard(BuildContext context, user) {
    final colorScheme = Theme.of(context).colorScheme;
    final isVerified = user?.isVerified ?? false;

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        gradient: LinearGradient(
          colors: isVerified
              ? [
                  colorScheme.primary,
                  colorScheme.primary.withValues(alpha: 0.8),
                ]
              : [colorScheme.tertiary, colorScheme.primary],
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.primary.withValues(alpha: 0.18),
            blurRadius: 25,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.2),
              borderRadius: BorderRadius.circular(16),
            ),
            padding: const EdgeInsets.all(12),
            child: const Icon(
              Icons.verified_user,
              color: Colors.white,
              size: 28,
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  isVerified ? 'Credentials verified' : 'Complete verification',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 18,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  isVerified
                      ? 'Your patients can see that your PRC license and identity checks are up-to-date.'
                      : 'Upload your PRC license, government ID, and finish liveness verification to accept bookings.',
                  style: TextStyle(
                    color: Colors.white.withValues(alpha: 0.9),
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 14),
                ElevatedButton.icon(
                  onPressed: () {
                    context.push('/credential-upload');
                  },
                  icon: Icon(
                    isVerified ? Icons.shield_outlined : Icons.upload_file,
                  ),
                  label: Text(
                    isVerified
                        ? 'View verification details'
                        : 'Continue verification',
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.white,
                    foregroundColor: colorScheme.primary,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    final actions = [
      _HealthService(
        icon: Icons.play_circle_fill_rounded,
        label: 'Start Consult',
        color: colorScheme.primary,
        onTap: () => context.push('/video-call'),
      ),
      _HealthService(
        icon: Icons.schedule_rounded,
        label: 'Availability',
        color: colorScheme.secondary,
        onTap: () => context.push('/doctor-availability'),
      ),
      _HealthService(
        icon: Icons.description_rounded,
        label: 'Prescriptions',
        color: colorScheme.tertiary,
        onTap: () => context.push('/prescription-form'),
      ),
      _HealthService(
        icon: Icons.science_rounded,
        label: 'Lab Request',
        color: colorScheme.error,
        onTap: () => context.push('/lab-request'),
      ),
      _HealthService(
        icon: Icons.monitor_heart_rounded,
        label: 'Vitals Scanner',
        color: colorScheme.outline,
        onTap: () => context.push('/vitals-scanner'),
      ),
      _HealthService(
        icon: Icons.people_alt_rounded,
        label: 'Patients',
        color: colorScheme.inversePrimary,
        onTap: () => context.push('/doctor-patients'),
      ),
    ];

    return SectionContainer(
      color: colorScheme.primary,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            icon: Icons.dashboard_rounded,
            title: 'Clinical Tools',
            subtitle: 'Quick access to essential doctor tools',
            color: colorScheme.primary,
          ),
          const SizedBox(height: 20),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              childAspectRatio: 1.0,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
            ),
            itemCount: actions.length,
            itemBuilder: (context, index) {
              final action = actions[index];
              return QuickActionButton(
                icon: action.icon,
                label: action.label,
                color: action.color,
                onTap: action.onTap,
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildTodaySchedule(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final appointmentsAsync = ref.watch(appointmentsListProvider);

    return SectionContainer(
      color: colorScheme.secondary,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            icon: Icons.calendar_today_rounded,
            title: 'Today\'s Consultations',
            subtitle: 'Your scheduled appointments for today',
            color: colorScheme.secondary,
          ),
          const SizedBox(height: 20),
          appointmentsAsync.when(
            data: (appointments) {
              final now = DateTime.now();
              final todayStart = DateTime(now.year, now.month, now.day);
              final todayEnd = todayStart.add(const Duration(days: 1));
              final todayAppointments = appointments
                  .where((apt) =>
                      apt.scheduledAt.isAfter(todayStart) &&
                      apt.scheduledAt.isBefore(todayEnd) &&
                      (apt.status.toLowerCase() == 'confirmed' ||
                          apt.status.toLowerCase() == 'pending'))
                  .toList()
                ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));

              if (todayAppointments.isEmpty) {
                return ActivityCard(
                  title: 'No appointments today',
                  subtitle: 'You have a clear schedule',
                  icon: Icons.calendar_today_rounded,
                  color: colorScheme.outline,
                  onTap: null,
                );
              }

              return Column(
                children: List.generate(todayAppointments.length, (index) {
                  final apt = todayAppointments[index];
                  return Padding(
                    padding: EdgeInsets.only(
                      bottom: index < todayAppointments.length - 1 ? 12 : 0,
                    ),
                    child: ActivityCard(
                      title: apt.patientName,
                      subtitle:
                          '${_formatTime(apt.scheduledAt)} · ${apt.statusDisplayName}',
                      icon: Icons.person_rounded,
                      color: _getStatusColor(apt.status, colorScheme),
                      onTap: () => context.push('/video-call'),
                    ),
                  );
                }),
              );
            },
            loading: () => const ActivityCard(
              title: 'Loading...',
              subtitle: 'Please wait',
              icon: Icons.calendar_today_rounded,
              color: Colors.grey,
              onTap: null,
            ),
            error: (_, __) => ActivityCard(
              title: 'Unable to load appointments',
              subtitle: 'Pull to refresh',
              icon: Icons.error_outline_rounded,
              color: colorScheme.error,
              onTap: () {},
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPendingRequests(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final appointmentsAsync = ref.watch(appointmentsListProvider);

    return SectionContainer(
      color: colorScheme.tertiary,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            icon: Icons.pending_actions_rounded,
            title: 'Pending Requests',
            subtitle: 'Appointments waiting for your approval',
            color: colorScheme.tertiary,
          ),
          const SizedBox(height: 20),
          appointmentsAsync.when(
            data: (appointments) {
              final pendingAppointments = appointments
                  .where((apt) => apt.status.toLowerCase() == 'pending')
                  .toList()
                ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));

              if (pendingAppointments.isEmpty) {
                return ActivityCard(
                  title: 'No pending requests',
                  subtitle: 'All appointments are confirmed',
                  icon: Icons.check_circle_outline_rounded,
                  color: colorScheme.outline,
                  onTap: null,
                );
              }

              return Column(
                children: List.generate(pendingAppointments.length, (index) {
                  final apt = pendingAppointments[index];
                  return Padding(
                    padding: EdgeInsets.only(
                      bottom: index < pendingAppointments.length - 1 ? 12 : 0,
                    ),
                    child: ActivityCard(
                      title: apt.patientName,
                      subtitle:
                          '${_formatAppointmentDate(apt.scheduledAt)} · Pending',
                      icon: Icons.schedule_rounded,
                      color: Colors.deepOrange,
                      onTap: () => context.push('/appointment-requests'),
                    ),
                  );
                }),
              );
            },
            loading: () => const ActivityCard(
              title: 'Loading...',
              subtitle: 'Please wait',
              icon: Icons.pending_actions_rounded,
              color: Colors.grey,
              onTap: null,
            ),
            error: (_, __) => ActivityCard(
              title: 'Unable to load requests',
              subtitle: 'Pull to refresh',
              icon: Icons.error_outline_rounded,
              color: colorScheme.error,
              onTap: () {},
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

  String _getGreeting() {
    final hour = DateTime.now().hour;
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  }

  Color _getStatusColor(String status, ColorScheme colorScheme) {
    final normalized = status.toLowerCase();
    switch (normalized) {
      case 'confirmed':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'cancelled':
        return Colors.red;
      case 'completed':
        return Colors.blue;
      default:
        return colorScheme.primary;
    }
  }

  String _formatTime(DateTime date) {
    final hour = date.hour;
    final minute = date.minute;
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '${displayHour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} $period';
  }

  String _formatAppointmentDate(DateTime date) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final appointmentDate = DateTime(date.year, date.month, date.day);

    if (appointmentDate == today) {
      return 'Today, ${_formatTime(date)}';
    } else if (appointmentDate == today.add(const Duration(days: 1))) {
      return 'Tomorrow, ${_formatTime(date)}';
    } else if (appointmentDate == today.subtract(const Duration(days: 1))) {
      return 'Yesterday, ${_formatTime(date)}';
    } else {
      final difference = appointmentDate.difference(today).inDays;
      if (difference < 7 && difference > -7) {
        return '${date.weekday == 1 ? 'Mon' : date.weekday == 2 ? 'Tue' : date.weekday == 3 ? 'Wed' : date.weekday == 4 ? 'Thu' : date.weekday == 5 ? 'Fri' : date.weekday == 6 ? 'Sat' : 'Sun'}, ${_formatTime(date)}';
      } else {
        return '${date.day}/${date.month}/${date.year}, ${_formatTime(date)}';
      }
    }
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

    if (shouldLogout == true && context.mounted) {
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

class _ConsultationSlot {
  const _ConsultationSlot({
    required this.patientName,
    required this.timeLabel,
    required this.statusLabel,
    required this.statusColor,
    required this.route,
  });

  final String patientName;
  final String timeLabel;
  final String statusLabel;
  final Color statusColor;
  final String route;
}
