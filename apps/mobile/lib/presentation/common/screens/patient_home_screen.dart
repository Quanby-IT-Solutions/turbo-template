import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/presentation/patient/providers/patient_providers.dart';
import 'package:mobile/presentation/scheduling/providers/appointment_providers.dart';
import 'package:mobile/domain/entities/appointment.dart';
import 'package:mobile/core/responsive/responsive_config.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/core/widgets/stat_card.dart';
import 'package:mobile/core/widgets/section_header.dart';
import 'package:mobile/core/widgets/section_container.dart';
import 'package:mobile/core/widgets/quick_action_button.dart';
import 'package:mobile/core/widgets/profile_menu_button.dart';
import 'package:mobile/core/widgets/theme_toggle_button.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart'
    as auth_providers;

class PatientHomeScreen extends ConsumerWidget {
  const PatientHomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final appointmentsAsync = ref.watch(appointmentsListProvider);
    final colorScheme = Theme.of(context).colorScheme;

    // Calculate stats matching web dashboard
    final stats =
        appointmentsAsync.whenData((appointments) {
          final now = DateTime.now();
          final today = DateTime(now.year, now.month, now.day);
          final withinWeek = today.add(const Duration(days: 7));

          final upcoming = appointments.where((apt) {
            return apt.status.toLowerCase() == 'confirmed' &&
                apt.scheduledAt.isAfter(
                  today.subtract(const Duration(days: 1)),
                ) &&
                apt.scheduledAt.isBefore(
                  withinWeek.add(const Duration(days: 1)),
                );
          }).length;

          final pending = appointments
              .where((apt) => apt.status.toLowerCase() == 'pending')
              .length;

          final completed = appointments
              .where((apt) => apt.status.toLowerCase() == 'completed')
              .length;

          return {
            'upcoming': upcoming,
            'pending': pending,
            'completed': completed,
          };
        }).value ??
        {'upcoming': 0, 'pending': 0, 'completed': 0};

    return AnimatedNavWrapper(
      child:
          // Builder(
          //   builder: (context) =>
          Scaffold(
            // drawer: const PatientNavigationDrawer(),
            body: Column(
              children: [
                AppBar(
                  title: Padding(
                    padding: const EdgeInsets.only(left: 8.0),
                    child: Text(
                      'Dashboard',
                      style: TextStyle(
                        color: colorScheme.onSurface,
                        fontSize: 22,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -0.3,
                      ),
                    ),
                  ),
                  centerTitle: false,
                  elevation: 0,
                  backgroundColor: Theme.of(
                    context,
                  ).appBarTheme.backgroundColor,
                  automaticallyImplyLeading: false,
                  // leading: IconButton(
                  //   icon: Icon(
                  //     Icons.menu_rounded,
                  //     color: colorScheme.primary,
                  //   ),
                  //   onPressed: () => Scaffold.of(context).openDrawer(),
                  // ),
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
                      ref.invalidate(currentPatientProvider);
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
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      // Stats Grid (4 cards)
                                      GridView.count(
                                        shrinkWrap: true,
                                        physics:
                                            const NeverScrollableScrollPhysics(),
                                        crossAxisCount: 2,
                                        childAspectRatio: 0.95,
                                        crossAxisSpacing: 16,
                                        mainAxisSpacing: 16,
                                        children: [
                                          StatCard(
                                            title: 'Upcoming',
                                            value: stats['upcoming']!
                                                .toString(),
                                            icon: Icons.calendar_today_rounded,
                                            color: colorScheme.primary,
                                            onTap: () => context.push(
                                              '/patient-schedule',
                                            ),
                                          ),
                                          StatCard(
                                            title: 'Pending',
                                            value: stats['pending']!.toString(),
                                            icon: Icons.pending_rounded,
                                            color: colorScheme.secondary,
                                            onTap: () => context.push(
                                              '/patient-schedule',
                                            ),
                                          ),
                                          StatCard(
                                            title: 'Completed',
                                            value: stats['completed']!
                                                .toString(),
                                            icon: Icons.check_circle_rounded,
                                            color: colorScheme.tertiary,
                                            onTap: () => context.push(
                                              '/patient-schedule',
                                            ),
                                          ),
                                          StatCard(
                                            title: 'Health Status',
                                            value: 'Active',
                                            icon: Icons.favorite_rounded,
                                            color: colorScheme.primary,
                                            onTap: null,
                                          ),
                                        ],
                                      ),

                                      const SizedBox(height: 32),

                                      // Your next appointment card
                                      _buildNextAppointmentCard(
                                        context,
                                        appointmentsAsync,
                                        colorScheme,
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
                                              icon: Icons
                                                  .health_and_safety_rounded,
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

                                      // Recent check-ins Section
                                      _buildRecentCheckInsSection(
                                        context,
                                        appointmentsAsync,
                                        colorScheme,
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
          ),
      //   ),
      // ),
    );
  }

  // Placeholder data for face scan self-checks (matching web format)
  static const List<Map<String, String>> _faceScanSeedData = [
    {
      'id': 'face-scan-1',
      'label': 'Face scan self-check',
      'description': 'Pulse 72 bpm · Stress low',
      'timestamp': 'Today · 7:45 AM',
    },
    {
      'id': 'face-scan-2',
      'label': 'Face scan self-check',
      'description': 'Pulse 76 bpm · Stress moderate',
      'timestamp': 'Yesterday · 8:10 PM',
    },
    {
      'id': 'face-scan-3',
      'label': 'Face scan self-check',
      'description': 'Pulse 71 bpm · Stress low',
      'timestamp': 'Yesterday · 6:30 PM',
    },
  ];

  Widget _buildNextAppointmentCard(
    BuildContext context,
    AsyncValue<List<Appointment>> appointmentsAsync,
    ColorScheme colorScheme,
  ) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surface,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.outline.withValues(alpha: 0.1),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.08),
            offset: const Offset(0, 4),
            blurRadius: 16,
            spreadRadius: 0,
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Your next appointment',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Know exactly when to be ready and who you\'re meeting with.',
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.w500,
              color: colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 20),
          appointmentsAsync.when(
            data: (appointments) {
              final today = DateTime.now();
              final todayStart = DateTime(today.year, today.month, today.day);

              final upcoming =
                  appointments
                      .where(
                        (apt) =>
                            (apt.status.toLowerCase() == 'confirmed' ||
                                apt.status.toLowerCase() == 'pending') &&
                            apt.scheduledAt.isAfter(
                              todayStart.subtract(const Duration(days: 1)),
                            ),
                      )
                      .toList()
                    ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));

              if (upcoming.isEmpty) {
                return Column(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerLow,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: colorScheme.outline.withValues(alpha: 0.2),
                          style: BorderStyle.solid,
                        ),
                      ),
                      child: Center(
                        child: Text(
                          'No visits booked yet. Schedule one when you\'re ready.',
                          style: TextStyle(
                            fontSize: 14,
                            color: colorScheme.onSurface.withValues(alpha: 0.6),
                          ),
                          textAlign: TextAlign.center,
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        onPressed: () => context.push('/patient-schedule'),
                        icon: const Icon(
                          Icons.calendar_today_rounded,
                          size: 18,
                        ),
                        label: const Text('Book a visit'),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 14),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      ),
                    ),
                  ],
                );
              }

              final nextAppointment = upcoming.first;
              final moreUpcoming = upcoming.length > 1
                  ? upcoming.sublist(
                      1,
                      upcoming.length > 4 ? 4 : upcoming.length,
                    )
                  : <Appointment>[];

              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: colorScheme.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: colorScheme.outline.withValues(alpha: 0.1),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Next visit',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: colorScheme.onSurface.withValues(alpha: 0.6),
                            letterSpacing: 0.5,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          _formatAppointmentDateLong(
                            nextAppointment.scheduledAt,
                          ),
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w600,
                            color: colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '${_formatAppointmentTime(nextAppointment.scheduledAt)} · ${nextAppointment.doctorName}',
                          style: TextStyle(
                            fontSize: 13,
                            color: colorScheme.onSurface.withValues(alpha: 0.6),
                          ),
                        ),
                        if (nextAppointment.reasonForVisit != null &&
                            nextAppointment.reasonForVisit!.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            nextAppointment.reasonForVisit!,
                            style: TextStyle(
                              fontSize: 13,
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.6,
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (moreUpcoming.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Text(
                      'Coming up next',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface.withValues(alpha: 0.6),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    ...moreUpcoming.map(
                      (appointment) => Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceContainerLow.withValues(
                            alpha: 0.5,
                          ),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: colorScheme.outline.withValues(alpha: 0.1),
                          ),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _formatAppointmentDateLong(
                                      appointment.scheduledAt,
                                    ),
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: colorScheme.onSurface,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${_formatAppointmentTime(appointment.scheduledAt)} · ${appointment.doctorName}',
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: colorScheme.onSurface.withValues(
                                        alpha: 0.6,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: colorScheme.surfaceContainerLow,
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                appointment.status.toLowerCase(),
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w500,
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.6,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: () => context.push('/patient-schedule'),
                      icon: const Icon(Icons.calendar_today_rounded, size: 18),
                      label: const Text('Book a visit'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
            loading: () => Container(
              padding: const EdgeInsets.all(16),
              child: Column(
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 16),
                  Text(
                    'Loading appointments...',
                    style: TextStyle(
                      fontSize: 14,
                      color: colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                  ),
                ],
              ),
            ),
            error: (error, stack) => Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: colorScheme.errorContainer.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: colorScheme.error.withValues(alpha: 0.2),
                ),
              ),
              child: Column(
                children: [
                  Icon(Icons.error_outline_rounded, color: colorScheme.error),
                  const SizedBox(height: 8),
                  Text(
                    'Unable to load appointments',
                    style: TextStyle(
                      fontSize: 14,
                      color: colorScheme.error,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: () => context.push('/patient-schedule'),
                    child: const Text('Go to schedule'),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentCheckInsSection(
    BuildContext context,
    AsyncValue<List<Appointment>> appointmentsAsync,
    ColorScheme colorScheme,
  ) {
    return SectionContainer(
      color: colorScheme.secondary,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SectionHeader(
            icon: Icons.history_rounded,
            title: 'Recent check-ins',
            subtitle: 'Meet history and self-check logs in one glance.',
            color: colorScheme.secondary,
          ),
          const SizedBox(height: 20),
          // Meet history and Face scan self-checks in a grid layout
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'MEET HISTORY',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface.withValues(alpha: 0.6),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ...appointmentsAsync.when(
                      data: (appointments) {
                        final completed =
                            appointments
                                .where(
                                  (apt) =>
                                      apt.status.toLowerCase() == 'completed' ||
                                      apt.status.toLowerCase() == 'confirmed',
                                )
                                .toList()
                              ..sort(
                                (a, b) =>
                                    b.scheduledAt.compareTo(a.scheduledAt),
                              );

                        final recent = completed.take(3).toList();

                        if (recent.isEmpty) {
                          return [
                            Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: colorScheme.surfaceContainerLow
                                    .withValues(alpha: 0.5),
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(
                                  color: colorScheme.outline.withValues(
                                    alpha: 0.1,
                                  ),
                                ),
                              ),
                              child: Text(
                                'Completed visits will appear here after each call.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.6,
                                  ),
                                ),
                              ),
                            ),
                          ];
                        }

                        return recent.map((appointment) {
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: colorScheme.surfaceContainerLow.withValues(
                                alpha: 0.5,
                              ),
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(
                                color: colorScheme.outline.withValues(
                                  alpha: 0.1,
                                ),
                              ),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  _formatAppointmentDateLong(
                                    appointment.scheduledAt,
                                  ),
                                  style: TextStyle(
                                    fontSize: 13,
                                    fontWeight: FontWeight.w600,
                                    color: colorScheme.onSurface,
                                  ),
                                ),
                                const SizedBox(height: 2),
                                Text(
                                  '${_formatAppointmentTime(appointment.scheduledAt)} · ${appointment.doctorName}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: colorScheme.onSurface.withValues(
                                      alpha: 0.6,
                                    ),
                                  ),
                                ),
                                if (appointment.reasonForVisit != null &&
                                    appointment.reasonForVisit!.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    appointment.reasonForVisit!,
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: colorScheme.onSurface.withValues(
                                        alpha: 0.6,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          );
                        }).toList();
                      },
                      loading: () => [
                        Container(
                          padding: const EdgeInsets.all(12),
                          child: const SizedBox(
                            height: 60,
                            child: Center(child: CircularProgressIndicator()),
                          ),
                        ),
                      ],
                      error: (_, __) => [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: colorScheme.errorContainer.withValues(
                              alpha: 0.1,
                            ),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            'Unable to load',
                            style: TextStyle(
                              fontSize: 12,
                              color: colorScheme.error,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'FACE SCAN SELF-CHECKS',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface.withValues(alpha: 0.6),
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 12),
                    ..._faceScanSeedData.take(3).map((entry) {
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: colorScheme.surfaceContainerLow.withValues(
                            alpha: 0.5,
                          ),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: colorScheme.outline.withValues(alpha: 0.1),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              entry['label']!,
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: colorScheme.onSurface,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              entry['description']!,
                              style: TextStyle(
                                fontSize: 11,
                                color: colorScheme.onSurface.withValues(
                                  alpha: 0.6,
                                ),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              entry['timestamp']!,
                              style: TextStyle(
                                fontSize: 11,
                                color: colorScheme.onSurface.withValues(
                                  alpha: 0.6,
                                ),
                              ),
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildHealthServicesGrid(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final services = [
      _HealthService(
        icon: Icons.calendar_today_rounded,
        label: 'Schedule',
        color: colorScheme.primary,
        onTap: () => context.push('/patient-schedule'),
      ),
      _HealthService(
        icon: Icons.videocam_rounded,
        label: 'Meet Doctor',
        color: colorScheme.secondary,
        onTap: () => context.push('/patient-meet-doctor'),
      ),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
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

  String _formatAppointmentDateLong(DateTime date) {
    final weekdays = [
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
      'Sunday',
    ];
    final months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    final weekday = weekdays[date.weekday - 1];
    final month = months[date.month - 1];
    return '$weekday, $month ${date.day}';
  }

  String _formatAppointmentTime(DateTime date) {
    final hour = date.hour;
    final minute = date.minute;
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '${displayHour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} $period';
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
