import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/domain/entities/appointment.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/presentation/scheduling/providers/appointment_providers.dart';
import 'appointment_tab_bar.dart';
import 'empty_state_widget.dart';
import 'pending_appointment_card.dart';
import 'confirmed_appointment_card.dart';
import 'error_state_widget.dart';
import 'appointment_utils.dart';

class AppointmentRequestsScreen extends ConsumerStatefulWidget {
  const AppointmentRequestsScreen({super.key});

  @override
  ConsumerState<AppointmentRequestsScreen> createState() =>
      _AppointmentRequestsScreenState();
}

class _AppointmentRequestsScreenState
    extends ConsumerState<AppointmentRequestsScreen>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    // Load appointments from API on init
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(appointmentsListProvider.notifier).refresh();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _handleAppointmentAction(
    Appointment appointment,
    String action,
  ) async {
    try {
      if (action == 'accept') {
        await ref
            .read(appointmentActionsProvider.notifier)
            .updateStatus(appointmentId: appointment.id, status: 'confirmed');

        if (mounted) {
          ToastService.showAppointment(
            context: context,
            title: 'Appointment Accepted',
            description:
                'Appointment with ${appointment.patientName} has been confirmed',
            isSuccess: true,
          );
        }
      } else {
        await ref
            .read(appointmentActionsProvider.notifier)
            .updateStatus(appointmentId: appointment.id, status: 'cancelled');

        if (mounted) {
          ToastService.showError(
            context: context,
            title: 'Appointment Declined',
            description:
                'Appointment with ${appointment.patientName} has been declined',
          );
        }
      }

      // Refresh appointments list after action
      if (mounted) {
        ref.read(appointmentsListProvider.notifier).refresh();
      }
    } catch (e) {
      if (mounted) {
        ToastService.showError(
          context: context,
          title: 'Action Failed',
          description: 'Failed to update appointment: ${e.toString()}',
        );
      }
    }
  }

  Future<void> _rescheduleAppointment(Appointment appointment) async {
    // Navigate to reschedule request screen
    context.push('/reschedule-request', extra: {'appointment': appointment});
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
          automaticallyImplyLeading: false,
          title: Text(
            'Appointment Requests',
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(96),
            child: appointmentsAsync.maybeWhen(
              data: (appointments) => AppointmentTabBar(
                tabController: _tabController,
                appointments: appointments,
                colorScheme: colorScheme,
                filterAppointments: AppointmentUtils.filterAppointments,
              ),
              orElse: () => AppointmentTabBar(
                tabController: _tabController,
                appointments: const [],
                colorScheme: colorScheme,
                filterAppointments: AppointmentUtils.filterAppointments,
              ),
            ),
          ),
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
            return ErrorStateWidget(
              errorMessage: error.toString(),
              onRetry: () =>
                  ref.read(appointmentsListProvider.notifier).refresh(),
              colorScheme: colorScheme,
            );
          },
          data: (appointments) {
            final pendingRequests = AppointmentUtils.filterAppointments(
              appointments,
              'pending',
            );
            final todayAppointments = AppointmentUtils.filterAppointments(
              appointments,
              'today',
            );
            final upcomingAppointments = AppointmentUtils.filterAppointments(
              appointments,
              'upcoming',
            );

            return TabBarView(
              controller: _tabController,
              children: [
                _buildPendingRequestsTab(pendingRequests),
                _buildTodayAppointmentsTab(todayAppointments),
                _buildUpcomingAppointmentsTab(upcomingAppointments),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildPendingRequestsTab(List<Appointment> pendingRequests) {
    final colorScheme = Theme.of(context).colorScheme;

    if (pendingRequests.isEmpty) {
      return EmptyStateWidget(
        icon: Icons.inbox_rounded,
        title: 'No Pending Requests',
        description: 'New appointment requests will appear here.',
        iconColor: colorScheme.secondary,
        colorScheme: colorScheme,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
      itemCount: pendingRequests.length,
      itemBuilder: (context, index) {
        final appointment = pendingRequests[index];
        return PendingAppointmentCard(
          appointment: appointment,
          colorScheme: colorScheme,
          onAction: _handleAppointmentAction,
          onReschedule: _rescheduleAppointment,
          formatDateTime: AppointmentUtils.formatDateTime,
        );
      },
    );
  }

  Widget _buildTodayAppointmentsTab(List<Appointment> todayAppointments) {
    final colorScheme = Theme.of(context).colorScheme;

    if (todayAppointments.isEmpty) {
      return EmptyStateWidget(
        icon: Icons.calendar_today_rounded,
        title: 'No Appointments Today',
        description: 'Enjoy your free day!',
        iconColor: colorScheme.tertiary,
        colorScheme: colorScheme,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
      itemCount: todayAppointments.length,
      itemBuilder: (context, index) {
        final appointment = todayAppointments[index];
        return ConfirmedAppointmentCard(
          appointment: appointment,
          colorScheme: colorScheme,
          onReschedule: _rescheduleAppointment,
          formatDateTime: AppointmentUtils.formatDateTime,
        );
      },
    );
  }

  Widget _buildUpcomingAppointmentsTab(List<Appointment> upcomingAppointments) {
    final colorScheme = Theme.of(context).colorScheme;

    if (upcomingAppointments.isEmpty) {
      return EmptyStateWidget(
        icon: Icons.event_rounded,
        title: 'No Upcoming Appointments',
        description: 'Your upcoming appointments will appear here.',
        iconColor: colorScheme.outline,
        colorScheme: colorScheme,
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 120),
      itemCount: upcomingAppointments.length,
      itemBuilder: (context, index) {
        final appointment = upcomingAppointments[index];
        return ConfirmedAppointmentCard(
          appointment: appointment,
          colorScheme: colorScheme,
          onReschedule: _rescheduleAppointment,
          formatDateTime: AppointmentUtils.formatDateTime,
        );
      },
    );
  }
}