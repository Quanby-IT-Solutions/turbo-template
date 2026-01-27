import 'package:flutter/material.dart';
import 'package:mobile/domain/entities/appointment.dart';

class AppointmentTabBar extends StatelessWidget {
  final TabController tabController;
  final List<Appointment> appointments;
  final ColorScheme colorScheme;
  final Function(List<Appointment>, String) filterAppointments;

  const AppointmentTabBar({
    super.key,
    required this.tabController,
    required this.appointments,
    required this.colorScheme,
    required this.filterAppointments,
  });

  @override
  Widget build(BuildContext context) {
    final pendingCount = filterAppointments(appointments, 'pending').length;
    final todayCount = filterAppointments(appointments, 'today').length;
    final upcomingCount = filterAppointments(appointments, 'upcoming').length;

    return Container(
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
          controller: tabController,
          indicator: BoxDecoration(
            color: colorScheme.primary,
            borderRadius: BorderRadius.circular(12),
          ),
          indicatorSize: TabBarIndicatorSize.tab,
          dividerColor: Colors.transparent,
          labelColor: Colors.white,
          unselectedLabelColor: colorScheme.onSurface.withValues(
            alpha: 0.6,
          ),
          labelStyle: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 12,
          ),
          unselectedLabelStyle: const TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 12,
          ),
          tabs: [
            Tab(
              text: 'Pending ($pendingCount)',
              icon: const Icon(
                Icons.pending_actions_rounded,
                size: 18,
              ),
            ),
            Tab(
              text: 'Today ($todayCount)',
              icon: const Icon(Icons.today_rounded, size: 18),
            ),
            Tab(
              text: 'Upcoming ($upcomingCount)',
              icon: const Icon(
                Icons.calendar_month_rounded,
                size: 18,
              ),
            ),
          ],
        ),
      ),
    );
  }
}