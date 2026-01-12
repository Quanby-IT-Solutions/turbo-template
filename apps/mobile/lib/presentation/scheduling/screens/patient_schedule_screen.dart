import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/domain/entities/appointment.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/presentation/scheduling/providers/appointment_providers.dart';

class PatientScheduleScreen extends ConsumerStatefulWidget {
  const PatientScheduleScreen({super.key});

  @override
  ConsumerState<PatientScheduleScreen> createState() =>
      _PatientScheduleScreenState();
}

class _PatientScheduleScreenState
    extends ConsumerState<PatientScheduleScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(appointmentsListProvider.notifier).refresh();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  List<Appointment> _filterAppointments(
    List<Appointment> appointments,
    String filterType,
  ) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);

    switch (filterType) {
      case 'upcoming':
        return appointments
            .where((a) =>
                (a.isConfirmed || a.isPending) &&
                a.scheduledAt.isAfter(now))
            .toList()
          ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
      case 'past':
        return appointments
            .where((a) => a.scheduledAt.isBefore(today))
            .toList()
          ..sort((a, b) => b.scheduledAt.compareTo(a.scheduledAt));
      case 'pending':
        return appointments.where((a) => a.isPending).toList()
          ..sort((a, b) => a.scheduledAt.compareTo(b.scheduledAt));
      case 'all':
      default:
        return appointments
          ..sort((a, b) => b.scheduledAt.compareTo(a.scheduledAt));
    }
  }

  Future<void> _rescheduleAppointment(Appointment appointment) async {
    context.push('/reschedule-request', extra: {'appointment': appointment});
  }

  Future<void> _cancelAppointment(Appointment appointment) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Appointment'),
        content: Text(
          'Are you sure you want to cancel your appointment with ${appointment.doctorName}?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('No'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: Colors.red,
            ),
            child: const Text('Yes, Cancel'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        await ref
            .read(appointmentActionsProvider.notifier)
            .cancelAppointment(appointmentId: appointment.id);

        if (mounted) {
          ToastService.showSuccess(
            context: context,
            title: 'Appointment Cancelled',
            description: 'Your appointment has been cancelled successfully',
          );
          ref.read(appointmentsListProvider.notifier).refresh();
        }
      } catch (e) {
        if (mounted) {
          ToastService.showError(
            context: context,
            title: 'Cancellation Failed',
            description: 'Failed to cancel appointment: ${e.toString()}',
          );
        }
      }
    }
  }

  String _formatDateTime(DateTime dateTime) {
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
    final weekdays = [
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ];
    final weekday = weekdays[dateTime.weekday - 1];
    final hour = dateTime.hour > 12 ? dateTime.hour - 12 : dateTime.hour;
    final ampm = dateTime.hour >= 12 ? 'PM' : 'AM';
    final minute = dateTime.minute.toString().padLeft(2, '0');
    return '$weekday, ${months[dateTime.month - 1]} ${dateTime.day}, $hour:$minute $ampm';
  }

  Color _getStatusColor(String status) {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return Colors.green;
      case 'pending':
        return Colors.orange;
      case 'cancelled':
        return Colors.red;
      case 'completed':
        return Colors.blue;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final appointmentsAsync = ref.watch(appointmentsListProvider);

    return AnimatedNavWrapper(
      child: Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        appBar: AppBar(
          backgroundColor: colorScheme.surfaceContainerLow,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          leading: IconButton(
            icon: Icon(
              Icons.arrow_back_ios_rounded,
              color: colorScheme.primary,
            ),
            onPressed: () => context.pop(),
          ),
          title: Text(
            'Schedule',
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
          actions: [
            IconButton(
              icon: Icon(
                Icons.search_rounded,
                color: colorScheme.primary,
              ),
              onPressed: () {
                // TODO: Implement search
                ToastService.showInfo(
                  context: context,
                  title: 'Search',
                  description: 'Search functionality coming soon',
                );
              },
            ),
            const SizedBox(width: 8),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(96),
            child: Container(
              margin: const EdgeInsets.fromLTRB(16, 8, 16, 24),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerHigh,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: colorScheme.outline.withValues(alpha: 0.1),
                  width: 1,
                ),
              ),
              child: Padding(
                padding: const EdgeInsets.all(6),
                child: TabBar(
                  controller: _tabController,
                  indicator: BoxDecoration(
                    color: colorScheme.primary,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  indicatorSize: TabBarIndicatorSize.tab,
                  dividerColor: Colors.transparent,
                  labelColor: Colors.white,
                  unselectedLabelColor:
                      colorScheme.onSurface.withValues(alpha: 0.6),
                  labelStyle: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                  unselectedLabelStyle: const TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: 12,
                  ),
                  tabs: appointmentsAsync.maybeWhen(
                    data: (appointments) {
                      final upcomingCount = _filterAppointments(
                        appointments,
                        'upcoming',
                      ).length;
                      final pastCount = _filterAppointments(
                        appointments,
                        'past',
                      ).length;
                      final pendingCount = _filterAppointments(
                        appointments,
                        'pending',
                      ).length;
                      final allCount = appointments.length;

                      return [
                        Tab(
                          text: 'All ($allCount)',
                          icon: const Icon(Icons.calendar_view_week_rounded,
                              size: 18),
                        ),
                        Tab(
                          text: 'Upcoming ($upcomingCount)',
                          icon: const Icon(Icons.upcoming_rounded, size: 18),
                        ),
                        Tab(
                          text: 'Pending ($pendingCount)',
                          icon: const Icon(Icons.pending_actions_rounded,
                              size: 18),
                        ),
                        Tab(
                          text: 'Past ($pastCount)',
                          icon: const Icon(Icons.history_rounded, size: 18),
                        ),
                      ];
                    },
                    orElse: () => const [
                      Tab(
                        text: 'All (0)',
                        icon: Icon(Icons.calendar_view_week_rounded, size: 18),
                      ),
                      Tab(
                        text: 'Upcoming (0)',
                        icon: Icon(Icons.upcoming_rounded, size: 18),
                      ),
                      Tab(
                        text: 'Pending (0)',
                        icon: Icon(Icons.pending_actions_rounded, size: 18),
                      ),
                      Tab(
                        text: 'Past (0)',
                        icon: Icon(Icons.history_rounded, size: 18),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => context.push('/doctor-search'),
          icon: const Icon(Icons.add_rounded),
          label: const Text('Book Appointment'),
          backgroundColor: colorScheme.primary,
          foregroundColor: Colors.white,
        ),
        body: appointmentsAsync.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stack) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (mounted) {
                ToastService.showError(
                  context: context,
                  title: 'Loading Failed',
                  description:
                      'Failed to load appointments: ${error.toString()}',
                );
              }
            });
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.error_outline_rounded,
                    size: 64,
                    color: colorScheme.error,
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Failed to load appointments',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w600,
                      color: colorScheme.onSurface,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    error.toString(),
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      fontSize: 14,
                      color: colorScheme.onSurface.withValues(alpha: 0.6),
                    ),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: () =>
                        ref.read(appointmentsListProvider.notifier).refresh(),
                    icon: const Icon(Icons.refresh_rounded),
                    label: const Text('Retry'),
                  ),
                ],
              ),
            );
          },
          data: (appointments) {
            final allAppointments = _filterAppointments(appointments, 'all');
            final upcomingAppointments =
                _filterAppointments(appointments, 'upcoming');
            final pendingAppointments =
                _filterAppointments(appointments, 'pending');
            final pastAppointments = _filterAppointments(appointments, 'past');

            return RefreshIndicator(
              onRefresh: () async {
                await ref.read(appointmentsListProvider.notifier).refresh();
              },
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildAppointmentsList(allAppointments),
                  _buildAppointmentsList(upcomingAppointments),
                  _buildAppointmentsList(pendingAppointments),
                  _buildAppointmentsList(pastAppointments),
                ],
              ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildAppointmentsList(List<Appointment> appointments) {
    final colorScheme = Theme.of(context).colorScheme;

    if (appointments.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: colorScheme.secondary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(32),
                border: Border.all(
                  color: colorScheme.secondary.withValues(alpha: 0.2),
                  width: 2,
                ),
              ),
              child: Icon(
                Icons.calendar_today_rounded,
                size: 64,
                color: colorScheme.secondary,
              ),
            ),
            const SizedBox(height: 24),
            Text(
              'No Appointments',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Book an appointment to get started',
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => context.push('/doctor-search'),
              icon: const Icon(Icons.add_rounded),
              label: const Text('Book Appointment'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 100),
      itemCount: appointments.length,
      itemBuilder: (context, index) {
        final appointment = appointments[index];
        return _buildAppointmentCard(appointment);
      },
    );
  }

  Widget _buildAppointmentCard(Appointment appointment) {
    final colorScheme = Theme.of(context).colorScheme;
    final statusColor = _getStatusColor(appointment.status);
    final isPast = appointment.scheduledAt.isBefore(DateTime.now());
    final canReschedule = !isPast &&
        (appointment.isConfirmed || appointment.isPending);
    final canCancel = !isPast && appointment.isPending;

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: statusColor.withValues(alpha: 0.2),
          width: 1,
        ),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.06),
            offset: const Offset(0, 4),
            blurRadius: 12,
          ),
        ],
      ),
      child: InkWell(
        onTap: () {
          // Show appointment details
          _showAppointmentDetails(appointment);
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      Icons.person_rounded,
                      color: statusColor,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          appointment.doctorName,
                          style: TextStyle(
                            fontWeight: FontWeight.w700,
                            fontSize: 16,
                            color: colorScheme.onSurface,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _formatDateTime(appointment.scheduledAt),
                          style: TextStyle(
                            color: colorScheme.onSurface.withValues(alpha: 0.6),
                            fontSize: 14,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(
                        color: statusColor.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Text(
                      appointment.status.toUpperCase(),
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.w700,
                        fontSize: 10,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                ],
              ),
              if (appointment.reasonForVisit != null) ...[
                const SizedBox(height: 16),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: colorScheme.surfaceContainerHighest.withValues(
                      alpha: 0.5,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Reason for Visit:',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 12,
                          color: colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        appointment.reasonForVisit!,
                        style: TextStyle(
                          fontSize: 14,
                          color: colorScheme.onSurface,
                          height: 1.4,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (canReschedule || canCancel) ...[
                const SizedBox(height: 16),
                Row(
                  children: [
                    if (canReschedule)
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _rescheduleAppointment(appointment),
                          icon: const Icon(Icons.schedule_rounded, size: 18),
                          label: const Text('Reschedule'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: colorScheme.primary,
                            side: BorderSide(
                              color: colorScheme.primary.withValues(alpha: 0.5),
                            ),
                            padding:
                                const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                    if (canReschedule && canCancel)
                      const SizedBox(width: 8),
                    if (canCancel)
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _cancelAppointment(appointment),
                          icon: const Icon(Icons.close_rounded, size: 18),
                          label: const Text('Cancel'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.red,
                            side: BorderSide(
                              color: Colors.red.withValues(alpha: 0.5),
                            ),
                            padding:
                                const EdgeInsets.symmetric(vertical: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showAppointmentDetails(Appointment appointment) {
    final colorScheme = Theme.of(context).colorScheme;
    final statusColor = _getStatusColor(appointment.status);

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerLow,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Appointment Details',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: colorScheme.onSurface,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _buildDetailRow(
              'Doctor',
              appointment.doctorName,
              Icons.person_rounded,
              colorScheme,
            ),
            const SizedBox(height: 16),
            _buildDetailRow(
              'Date & Time',
              _formatDateTime(appointment.scheduledAt),
              Icons.calendar_today_rounded,
              colorScheme,
            ),
            const SizedBox(height: 16),
            _buildDetailRow(
              'Status',
              appointment.status.toUpperCase(),
              Icons.info_rounded,
              colorScheme,
              statusColor: statusColor,
            ),
            if (appointment.reasonForVisit != null) ...[
              const SizedBox(height: 16),
              _buildDetailRow(
                'Reason',
                appointment.reasonForVisit!,
                Icons.note_rounded,
                colorScheme,
              ),
            ],
            if (appointment.notes != null && appointment.notes!.isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildDetailRow(
                'Notes',
                appointment.notes!,
                Icons.description_rounded,
                colorScheme,
              ),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(
    String label,
    String value,
    IconData icon,
    ColorScheme colorScheme, {
    Color? statusColor,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          icon,
          size: 20,
          color: statusColor ?? colorScheme.primary,
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: statusColor ?? colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
