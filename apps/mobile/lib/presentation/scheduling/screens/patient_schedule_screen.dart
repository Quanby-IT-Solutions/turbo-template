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
    extends ConsumerState<PatientScheduleScreen> {
  String _filterStatus = 'all';
  int _currentPage = 1;
  static const int _itemsPerPage = 10;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      ref.read(appointmentsListProvider.notifier).refresh();
    });
  }

  int _getStatusCount(List<Appointment> appointments, String status) {
    if (status == 'all') {
      return appointments.length;
    }
    return appointments.where((a) => a.status.toLowerCase() == status.toLowerCase()).length;
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
                Icons.filter_list_rounded,
                color: colorScheme.primary,
              ),
              onPressed: () => _showFilterBottomSheet(context, appointmentsAsync, colorScheme),
            ),
            const SizedBox(width: 8),
          ],
          bottom: PreferredSize(
            preferredSize: const Size.fromHeight(72),
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: appointmentsAsync.maybeWhen(
                    data: (appointments) {
                  final allCount = _getStatusCount(appointments, 'all');
                  final pendingCount = _getStatusCount(appointments, 'pending');
                  final confirmedCount = _getStatusCount(appointments, 'confirmed');

                  return SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding: const EdgeInsets.symmetric(horizontal: 0),
                    child: Row(
                      children: [
                        _buildFilterChip(
                          label: 'All',
                          count: allCount,
                          icon: Icons.calendar_view_week_rounded,
                          isSelected: _filterStatus == 'all',
                          onTap: () => setState(() {
                            _filterStatus = 'all';
                            _currentPage = 1;
                          }),
                          colorScheme: colorScheme,
                        ),
                        const SizedBox(width: 12),
                        _buildFilterChip(
                          label: 'Pending',
                          count: pendingCount,
                          icon: Icons.pending_actions_rounded,
                          isSelected: _filterStatus == 'pending',
                          onTap: () => setState(() {
                            _filterStatus = 'pending';
                            _currentPage = 1;
                          }),
                          colorScheme: colorScheme,
                        ),
                        const SizedBox(width: 12),
                        _buildFilterChip(
                          label: 'Confirmed',
                          count: confirmedCount,
                          icon: Icons.check_circle_rounded,
                          isSelected: _filterStatus == 'confirmed',
                          onTap: () => setState(() {
                            _filterStatus = 'confirmed';
                            _currentPage = 1;
                          }),
                          colorScheme: colorScheme,
                        ),
                        const SizedBox(width: 12),
                      ],
                    ),
                  );
                },
                orElse: () => SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip(
                        label: 'All',
                        count: 0,
                        icon: Icons.calendar_view_week_rounded,
                        isSelected: _filterStatus == 'all',
                        onTap: () => setState(() {
                          _filterStatus = 'all';
                          _currentPage = 1;
                        }),
                        colorScheme: colorScheme,
                      ),
                      const SizedBox(width: 12),
                      _buildFilterChip(
                        label: 'Pending',
                        count: 0,
                        icon: Icons.pending_actions_rounded,
                        isSelected: _filterStatus == 'pending',
                        onTap: () => setState(() {
                          _filterStatus = 'pending';
                          _currentPage = 1;
                        }),
                        colorScheme: colorScheme,
                      ),
                      const SizedBox(width: 12),
                      _buildFilterChip(
                        label: 'Confirmed',
                        count: 0,
                        icon: Icons.check_circle_rounded,
                        isSelected: _filterStatus == 'confirmed',
                        onTap: () => setState(() {
                          _filterStatus = 'confirmed';
                          _currentPage = 1;
                        }),
                        colorScheme: colorScheme,
                      ),
                      const SizedBox(width: 12),
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
            final filteredAppointments = _filterAppointments(appointments, _filterStatus);

            return RefreshIndicator(
              onRefresh: () async {
                await ref.read(appointmentsListProvider.notifier).refresh();
              },
              child: _buildAppointmentsList(filteredAppointments),
            );
          },
        ),
      ),
    );
  }

  Widget _buildFilterChip({
    required String label,
    required int count,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
    required ColorScheme colorScheme,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        constraints: const BoxConstraints(minHeight: 40),
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? colorScheme.primary : colorScheme.surfaceContainerHigh,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected
                ? colorScheme.primary
                : colorScheme.outline.withValues(alpha: 0.2),
            width: 1.5,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
                children: [
            Icon(
              icon,
              size: 16,
              color: isSelected
                  ? Colors.white
                  : colorScheme.onSurface.withValues(alpha: 0.7),
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                fontSize: 13,
                fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                color: isSelected
                    ? Colors.white
                    : colorScheme.onSurface.withValues(alpha: 0.8),
              ),
            ),
            const SizedBox(width: 6),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected
                    ? Colors.white.withValues(alpha: 0.3)
                    : colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: isSelected
                      ? Colors.white
                      : colorScheme.primary,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showFilterBottomSheet(
    BuildContext context,
    AsyncValue<List<Appointment>> appointmentsAsync,
    ColorScheme colorScheme,
  ) {
    showModalBottomSheet(
      context: context,
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
                Text(
                  'Filter by Status',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 16),
            appointmentsAsync.maybeWhen(
              data: (appointments) {
                final allCount = _getStatusCount(appointments, 'all');
                final pendingCount = _getStatusCount(appointments, 'pending');
                final confirmedCount = _getStatusCount(appointments, 'confirmed');
                final cancelledCount = _getStatusCount(appointments, 'cancelled');
                final rescheduledCount = _getStatusCount(appointments, 'rescheduled');

                return Column(
                  children: [
                    _buildFilterOption(
                      context: context,
                      label: 'All',
                      count: allCount,
                      icon: Icons.calendar_view_week_rounded,
                      isSelected: _filterStatus == 'all',
                      onTap: () {
                        setState(() {
                          _filterStatus = 'all';
                          _currentPage = 1;
                        });
                        Navigator.of(context).pop();
                      },
                      colorScheme: colorScheme,
                    ),
                    _buildFilterOption(
                      context: context,
                      label: 'Pending',
                      count: pendingCount,
                      icon: Icons.pending_actions_rounded,
                      isSelected: _filterStatus == 'pending',
                      onTap: () {
                        setState(() {
                          _filterStatus = 'pending';
                          _currentPage = 1;
                        });
                        Navigator.of(context).pop();
                      },
                      colorScheme: colorScheme,
                    ),
                    _buildFilterOption(
                      context: context,
                      label: 'Confirmed',
                      count: confirmedCount,
                      icon: Icons.check_circle_rounded,
                      isSelected: _filterStatus == 'confirmed',
                      onTap: () {
                        setState(() {
                          _filterStatus = 'confirmed';
                          _currentPage = 1;
                        });
                        Navigator.of(context).pop();
                      },
                      colorScheme: colorScheme,
                    ),
                    _buildFilterOption(
                      context: context,
                      label: 'Cancelled',
                      count: cancelledCount,
                      icon: Icons.cancel_rounded,
                      isSelected: _filterStatus == 'cancelled',
                      onTap: () {
                        setState(() {
                          _filterStatus = 'cancelled';
                          _currentPage = 1;
                        });
                        Navigator.of(context).pop();
                      },
                      colorScheme: colorScheme,
                    ),
                    _buildFilterOption(
                      context: context,
                      label: 'Rescheduled',
                      count: rescheduledCount,
                      icon: Icons.schedule_rounded,
                      isSelected: _filterStatus == 'rescheduled',
                      onTap: () {
                        setState(() {
                          _filterStatus = 'rescheduled';
                          _currentPage = 1;
                        });
                        Navigator.of(context).pop();
                      },
                      colorScheme: colorScheme,
                    ),
                  ],
                );
              },
              orElse: () => const SizedBox.shrink(),
            ),
            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterOption({
    required BuildContext context,
    required String label,
    required int count,
    required IconData icon,
    required bool isSelected,
    required VoidCallback onTap,
    required ColorScheme colorScheme,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: isSelected
              ? colorScheme.primary.withValues(alpha: 0.1)
              : colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isSelected
                ? colorScheme.primary
                : Colors.transparent,
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              size: 24,
              color: isSelected
                  ? colorScheme.primary
                  : colorScheme.onSurface.withValues(alpha: 0.7),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: isSelected ? FontWeight.w700 : FontWeight.w600,
                  color: isSelected
                      ? colorScheme.primary
                      : colorScheme.onSurface,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: isSelected
                    ? colorScheme.primary
                    : colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '$count',
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w700,
                  color: isSelected ? Colors.white : colorScheme.primary,
                ),
              ),
            ),
            if (isSelected) ...[
              const SizedBox(width: 12),
              Icon(
                Icons.check_circle_rounded,
                size: 20,
                color: colorScheme.primary,
              ),
            ],
          ],
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
              _filterStatus == 'all' 
                ? 'Book an appointment to get started'
                : 'No ${_filterStatus} appointments found',
              style: TextStyle(
                fontSize: 14,
                color: colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            if (_filterStatus == 'all') ...[
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => context.push('/doctor-search'),
              icon: const Icon(Icons.add_rounded),
              label: const Text('Book Appointment'),
            ),
            ],
          ],
        ),
      );
    }

    // Pagination
    final totalPages = (appointments.length / _itemsPerPage).ceil();
    final startIndex = (_currentPage - 1) * _itemsPerPage;
    final endIndex = startIndex + _itemsPerPage;
    final paginatedAppointments = appointments.sublist(
      startIndex.clamp(0, appointments.length),
      endIndex.clamp(0, appointments.length),
    );

    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
            itemCount: paginatedAppointments.length,
      itemBuilder: (context, index) {
              final appointment = paginatedAppointments[index];
        return _buildAppointmentCard(appointment);
      },
          ),
        ),
        if (totalPages > 1) _buildPaginationControls(
          currentPage: _currentPage,
          totalPages: totalPages,
          totalItems: appointments.length,
          startIndex: startIndex,
          endIndex: endIndex,
          onPageChanged: (page) {
            setState(() {
              _currentPage = page;
            });
          },
        ),
      ],
    );
  }

  Widget _buildPaginationControls({
    required int currentPage,
    required int totalPages,
    required int totalItems,
    required int startIndex,
    required int endIndex,
    required Function(int) onPageChanged,
  }) {
    final colorScheme = Theme.of(context).colorScheme;

    return SafeArea(
      top: false,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerLow,
          border: Border(
            top: BorderSide(
              color: colorScheme.outline.withValues(alpha: 0.1),
              width: 1,
            ),
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Flexible(
              child: Text(
                'Showing ${startIndex + 1} to ${endIndex.clamp(0, totalItems)} of $totalItems',
                style: TextStyle(
                  fontSize: 12,
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                ),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
              IconButton(
                icon: const Icon(Icons.chevron_left_rounded),
                onPressed: currentPage > 1
                    ? () => onPageChanged(currentPage - 1)
                    : null,
                iconSize: 20,
              ),
              ...List.generate(
                totalPages > 5 ? 5 : totalPages,
                (index) {
                  int page;
                  if (totalPages <= 5) {
                    page = index + 1;
                  } else if (currentPage <= 3) {
                    page = index + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + index;
                  } else {
                    page = currentPage - 2 + index;
                  }
                  
                  if (totalPages > 5 && index == 2 && currentPage > 3 && currentPage < totalPages - 2) {
                    return Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: Text(
                        '...',
                        style: TextStyle(
                          color: colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                    );
                  }
                  
                  return Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    child: GestureDetector(
                      onTap: () => onPageChanged(page),
                      child: Container(
                        width: 32,
                        height: 32,
                        decoration: BoxDecoration(
                          color: currentPage == page
                              ? colorScheme.primary
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        alignment: Alignment.center,
                        child: Text(
                          '$page',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: currentPage == page
                                ? FontWeight.w700
                                : FontWeight.w500,
                            color: currentPage == page
                                ? Colors.white
                                : colorScheme.onSurface,
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
              IconButton(
                icon: const Icon(Icons.chevron_right_rounded),
                onPressed: currentPage < totalPages
                    ? () => onPageChanged(currentPage + 1)
                    : null,
                iconSize: 20,
              ),
            ],
          ),
        ],
      ),
      ),
    );
  }

  Widget _buildAppointmentCard(Appointment appointment) {
    final colorScheme = Theme.of(context).colorScheme;
    final statusColor = _getStatusColor(appointment.status);
    final isPast = appointment.scheduledAt.isBefore(DateTime.now());

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
                          appointment.doctorDisplayName,
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
              // Reason for Visit
              if (appointment.reasonForVisit != null) ...[
                const SizedBox(height: 16),
                      Text(
                  'Reason: ${appointment.reasonForVisit!}',
                        style: TextStyle(
                    fontSize: 14,
                    color: colorScheme.onSurface.withValues(alpha: 0.7),
                        ),
                      ),
              ],
              // Specialization
              if (appointment.doctorSpecialization != null) ...[
                const SizedBox(height: 8),
                      Text(
                  'Specialization: ${appointment.doctorSpecialization!}',
                        style: TextStyle(
                          fontSize: 14,
                    color: colorScheme.onSurface.withValues(alpha: 0.7),
                        ),
                      ),
                    ],
              // Notes
              if (appointment.notes != null && appointment.notes!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Text(
                  'Notes: ${appointment.notes!}',
                  style: TextStyle(
                    fontSize: 14,
                    color: colorScheme.onSurface.withValues(alpha: 0.7),
                  ),
                ),
              ],
              // Reschedule Requests
              if (appointment.rescheduleRequests != null && appointment.rescheduleRequests!.isNotEmpty) ...[
                const SizedBox(height: 16),
                ...appointment.rescheduleRequests!
                    .where((req) => req.status == 'PENDING')
                    .map((req) => _buildRescheduleRequestCard(req, appointment)),
              ],
              // Action Buttons
              if ((appointment.isPending || appointment.isConfirmed) && !isPast) ...[
                const SizedBox(height: 16),
                Row(
                  children: [
                    if (appointment.isPending || appointment.isConfirmed)
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _cancelAppointment(appointment),
                          icon: const Icon(Icons.close_rounded, size: 18),
                          label: const Text('Cancel Appointment'),
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
                    if (appointment.isConfirmed && !appointment.hasPendingRescheduleRequest) ...[
                      if (appointment.isPending || appointment.isConfirmed)
                      const SizedBox(width: 8),
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: appointment.hasPendingRescheduleRequest
                              ? null
                              : () => _rescheduleAppointment(appointment),
                          icon: const Icon(Icons.schedule_rounded, size: 18),
                          label: const Text('Request Reschedule'),
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
                    ],
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildRescheduleRequestCard(RescheduleRequest request, Appointment appointment) {
    final canApproveReject = request.requestedByRole != 'PATIENT';

    String formatDate(String dateString) {
      try {
        final date = DateTime.parse(dateString);
        final months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        final weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return '${weekdays[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}, ${date.year}';
      } catch (e) {
        return dateString;
      }
    }

    String formatTime(String timeString) {
      try {
        final parts = timeString.split(':');
        final hour = int.parse(parts[0]);
        final minute = parts[1];
        final ampm = hour >= 12 ? 'PM' : 'AM';
        final displayHour = hour % 12 == 0 ? 12 : hour % 12;
        return '$displayHour:$minute $ampm';
      } catch (e) {
        return timeString;
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.orange.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: Colors.orange.withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            request.requestedByRole == 'PATIENT'
                ? 'Your Reschedule Request Pending'
                : 'Reschedule Request Pending',
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w700,
              color: Colors.orange.shade900,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Requested: ${formatDate(request.newDate)} at ${formatTime(request.newTime)}',
            style: TextStyle(
              fontSize: 12,
              color: Colors.orange.shade700,
            ),
          ),
          if (request.reason.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text(
              'Reason: ${request.reason}',
              style: TextStyle(
                fontSize: 12,
                color: Colors.orange.shade700,
              ),
            ),
          ],
          if (canApproveReject) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _approveRescheduleRequest(appointment, request),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'Approve',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => _rejectRescheduleRequest(appointment, request),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    ),
                    child: const Text(
                      'Reject',
                      style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                ),
              ],
            ),
          ] else ...[
            const SizedBox(height: 8),
            Text(
              "Waiting for doctor's response...",
              style: TextStyle(
                fontSize: 12,
                fontStyle: FontStyle.italic,
                color: Colors.orange.shade600,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _approveRescheduleRequest(Appointment appointment, RescheduleRequest request) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Approve Reschedule'),
        content: const Text(
          'Are you sure you want to approve this reschedule request? The appointment date and time will be updated.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('No'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: Colors.green,
            ),
            child: const Text('Yes, Approve'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        final repository = ref.read(appointmentRepositoryProvider);
        await repository.respondToReschedule(
          appointmentId: appointment.id,
          requestId: request.id,
          approve: true,
        );

        if (mounted) {
          ToastService.showSuccess(
            context: context,
            title: 'Reschedule Approved',
            description: 'The appointment has been rescheduled successfully',
          );
          ref.read(appointmentsListProvider.notifier).refresh();
        }
      } catch (e) {
        if (mounted) {
          ToastService.showError(
            context: context,
            title: 'Approval Failed',
            description: 'Failed to approve reschedule request: ${e.toString()}',
          );
        }
      }
    }
  }

  Future<void> _rejectRescheduleRequest(Appointment appointment, RescheduleRequest request) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reject Reschedule'),
        content: const Text(
          'Are you sure you want to reject this reschedule request?',
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
            child: const Text('Yes, Reject'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        final repository = ref.read(appointmentRepositoryProvider);
        await repository.respondToReschedule(
          appointmentId: appointment.id,
          requestId: request.id,
          approve: false,
        );

        if (mounted) {
          ToastService.showSuccess(
            context: context,
            title: 'Reschedule Rejected',
            description: 'The reschedule request has been rejected',
          );
          ref.read(appointmentsListProvider.notifier).refresh();
        }
      } catch (e) {
        if (mounted) {
          ToastService.showError(
            context: context,
            title: 'Rejection Failed',
            description: 'Failed to reject reschedule request: ${e.toString()}',
          );
        }
      }
    }
  }

  void _showAppointmentDetails(Appointment appointment) {
    final colorScheme = Theme.of(context).colorScheme;

    String formatDateLong(String dateString) {
      try {
        final date = DateTime.parse(dateString);
        final months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        final weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        return '${weekdays[date.weekday - 1]}, ${months[date.month - 1]} ${date.day}, ${date.year}';
      } catch (e) {
        return dateString;
      }
    }

    String formatTime(String timeString) {
      try {
        final parts = timeString.split(':');
        final hour = int.parse(parts[0]);
        final minute = parts[1];
        final ampm = hour >= 12 ? 'PM' : 'AM';
        final displayHour = hour % 12 == 0 ? 12 : hour % 12;
        return '$displayHour:$minute $ampm';
      } catch (e) {
        return timeString;
      }
    }

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.9,
        ),
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerLow,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 12),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: colorScheme.onSurface.withValues(alpha: 0.3),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 16, 24, 0),
              child: Row(
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
            ),
            // Scrollable content
            Flexible(
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Doctor Information
                    Text(
                      'Doctor Information',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
            _buildDetailRow(
                            'Doctor Name',
                            appointment.doctorDisplayName,
              Icons.person_rounded,
              colorScheme,
            ),
                          if (appointment.doctorSpecialization != null) ...[
                            const SizedBox(height: 12),
            _buildDetailRow(
                              'Specialization',
                              appointment.doctorSpecialization!,
                              Icons.medical_services_rounded,
              colorScheme,
            ),
                          ],
                          if (appointment.doctor?.email != null) ...[
                            const SizedBox(height: 12),
            _buildDetailRow(
                              'Email',
                              appointment.doctor!.email!,
                              Icons.email_rounded,
              colorScheme,
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Appointment Timeline
                    Text(
                      'Appointment Timeline',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    _buildAppointmentTimeline(appointment, colorScheme, formatDateLong, formatTime),
                    const SizedBox(height: 24),
                    // Reason & Notes
                    Text(
                      'Reason & Notes',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: colorScheme.primary,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
            if (appointment.reasonForVisit != null) ...[
              _buildDetailRow(
                              'Reason for Visit',
                appointment.reasonForVisit!,
                Icons.note_rounded,
                colorScheme,
              ),
            ],
            if (appointment.notes != null && appointment.notes!.isNotEmpty) ...[
                            if (appointment.reasonForVisit != null) const SizedBox(height: 12),
              _buildDetailRow(
                              'Additional Notes',
                appointment.notes!,
                Icons.description_rounded,
                colorScheme,
              ),
            ],
                        ],
                      ),
                    ),
                    // Reschedule History
                    if (appointment.rescheduleRequests != null && appointment.rescheduleRequests!.isNotEmpty) ...[
            const SizedBox(height: 24),
                      Text(
                        'Reschedule History',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: colorScheme.primary,
                        ),
                      ),
                      const SizedBox(height: 12),
                      ...appointment.rescheduleRequests!.map((req) => _buildRescheduleHistoryCard(req, colorScheme, formatDateLong, formatTime)),
                    ],
                    // Actions
                    if ((appointment.isPending || appointment.isConfirmed) && !appointment.scheduledAt.isBefore(DateTime.now())) ...[
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          if (appointment.isPending || appointment.isConfirmed)
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () {
                                  Navigator.of(context).pop();
                                  _cancelAppointment(appointment);
                                },
                                icon: const Icon(Icons.close_rounded, size: 18),
                                label: const Text('Cancel Appointment'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: Colors.red,
                                  side: BorderSide(
                                    color: Colors.red.withValues(alpha: 0.5),
                                  ),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                          if (appointment.isConfirmed && !appointment.hasPendingRescheduleRequest) ...[
                            if (appointment.isPending || appointment.isConfirmed)
                              const SizedBox(width: 12),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: () {
                                  Navigator.of(context).pop();
                                  _rescheduleAppointment(appointment);
                                },
                                icon: const Icon(Icons.schedule_rounded, size: 18),
                                label: const Text('Request Reschedule'),
                                style: OutlinedButton.styleFrom(
                                  foregroundColor: colorScheme.primary,
                                  side: BorderSide(
                                    color: colorScheme.primary.withValues(alpha: 0.5),
                                  ),
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAppointmentTimeline(
    Appointment appointment,
    ColorScheme colorScheme,
    String Function(String) formatDateLong,
    String Function(String) formatTime,
  ) {
    final isRescheduled = appointment.status == 'rescheduled';
    final approvedReschedule = appointment.rescheduleRequests?.firstWhere(
      (req) => req.status == 'APPROVED',
      orElse: () => appointment.rescheduleRequests?.firstWhere(
        (req) => req.currentDate != null && req.currentTime != null,
        orElse: () => appointment.rescheduleRequests!.first,
      ) ?? appointment.rescheduleRequests!.first,
    );
    final hasOriginalDate = approvedReschedule != null && approvedReschedule.currentDate != null && approvedReschedule.currentTime != null;

    String formatDateTime(DateTime dateTime) {
      final months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      final weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      return '${weekdays[dateTime.weekday - 1]}, ${months[dateTime.month - 1]} ${dateTime.day}, ${dateTime.year}';
    }

    String formatTimeFromDateTime(DateTime dateTime) {
      final hour = dateTime.hour;
      final minute = dateTime.minute.toString().padLeft(2, '0');
      final ampm = hour >= 12 ? 'PM' : 'AM';
      final displayHour = hour % 12 == 0 ? 12 : hour % 12;
      return '$displayHour:$minute $ampm';
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          // Step 1: Requested
          _buildTimelineStep(
            stepNumber: 1,
            label: 'REQUESTED ON',
            value: '${formatDateTime(appointment.createdAt)} at ${formatTimeFromDateTime(appointment.createdAt)}',
            description: 'Appointment request created',
            color: colorScheme.primary,
            showConnector: true,
            showStatus: true,
            appointment: appointment,
            colorScheme: colorScheme,
          ),
          // Step 2: Original Date (if rescheduled)
          if (isRescheduled && hasOriginalDate)
            _buildTimelineStep(
              stepNumber: 2,
              label: 'ORIGINAL DATE & TIME',
              value: '${formatDateLong(approvedReschedule.currentDate!)} at ${formatTime(approvedReschedule.currentTime!)}',
              description: 'Originally scheduled',
              color: Colors.orange,
              showConnector: true,
              colorScheme: colorScheme,
            ),
          // Step 2/3: Scheduled/Rescheduled
          _buildTimelineStep(
            stepNumber: isRescheduled && hasOriginalDate ? 3 : 2,
            label: isRescheduled ? 'RESCHEDULED DATE & TIME' : 'SCHEDULED DATE & TIME',
            value: '${formatDateTime(appointment.scheduledAt)} at ${formatTimeFromDateTime(appointment.scheduledAt)}',
            description: isRescheduled ? 'Appointment rescheduled' : 'Appointment scheduled',
            color: appointment.status == 'confirmed'
                ? Colors.green
                : appointment.status == 'pending'
                    ? Colors.orange
                    : appointment.status == 'cancelled' || appointment.status == 'rejected'
                        ? Colors.red
                        : isRescheduled
                            ? Colors.purple
                            : colorScheme.surfaceContainerHighest,
            showConnector: false,
            colorScheme: colorScheme,
          ),
        ],
      ),
    );
  }

  Widget _buildTimelineStep({
    required int stepNumber,
    required String label,
    required String value,
    required String description,
    required Color color,
    required bool showConnector,
    required ColorScheme colorScheme,
    bool showStatus = false,
    Appointment? appointment,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Column(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: color,
                shape: BoxShape.circle,
                border: Border.all(
                  color: color,
                  width: 2,
                ),
              ),
              child: Center(
                child: Text(
                  '$stepNumber',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.w700,
                    fontSize: 14,
                  ),
                ),
              ),
            ),
            if (showConnector)
              Container(
                width: 2,
                height: 60,
                color: colorScheme.outline.withValues(alpha: 0.3),
                margin: const EdgeInsets.only(top: 8),
              ),
          ],
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Padding(
            padding: EdgeInsets.only(bottom: showConnector ? 60 : 0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                    letterSpacing: 0.5,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  description,
                  style: TextStyle(
                    fontSize: 12,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
                if (showStatus && appointment != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: _getStatusColor(appointment.status).withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(
                        color: _getStatusColor(appointment.status).withValues(alpha: 0.3),
                      ),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          'STATUS: ',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: colorScheme.onSurface.withValues(alpha: 0.6),
                            letterSpacing: 0.5,
                          ),
                        ),
                        Text(
                          appointment.status.toUpperCase(),
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            color: _getStatusColor(appointment.status),
                            letterSpacing: 0.5,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (appointment.priority != null) ...[
                    const SizedBox(height: 8),
                    Text(
                      'PRIORITY: ${appointment.priority!.toUpperCase()}',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w700,
                        color: colorScheme.onSurface.withValues(alpha: 0.6),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildRescheduleHistoryCard(
    RescheduleRequest request,
    ColorScheme colorScheme,
    String Function(String) formatDateLong,
    String Function(String) formatTime,
  ) {
    Color getStatusColor(String status) {
      switch (status) {
        case 'APPROVED':
          return Colors.green;
        case 'REJECTED':
          return Colors.red;
        case 'PENDING':
          return Colors.orange;
        default:
          return colorScheme.outline;
      }
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: getStatusColor(request.status).withValues(alpha: 0.3),
          width: 1,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: getStatusColor(request.status).withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: getStatusColor(request.status).withValues(alpha: 0.3),
                  ),
                ),
                child: Text(
                  request.status,
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w700,
                    color: getStatusColor(request.status),
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              Text(
                formatDateLong(request.createdAt.toIso8601String()),
                style: TextStyle(
                  fontSize: 10,
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (request.currentDate != null && request.currentTime != null) ...[
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'From',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${formatDateLong(request.currentDate!)} at ${formatTime(request.currentTime!)}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onSurface,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'To',
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onSurface.withValues(alpha: 0.6),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${formatDateLong(request.newDate)} at ${formatTime(request.newTime)}',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: colorScheme.onSurface,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ] else ...[
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'To',
                  style: TextStyle(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${formatDateLong(request.newDate)} at ${formatTime(request.newTime)}',
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface,
                  ),
                ),
              ],
            ),
          ],
          if (request.reason.isNotEmpty) ...[
            const SizedBox(height: 12),
            Text(
              'Reason',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.w600,
                color: colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              request.reason,
              style: TextStyle(
                fontSize: 12,
                color: colorScheme.onSurface,
              ),
            ),
          ],
          const SizedBox(height: 8),
          Text(
            'Requested by: ${request.requestedByRole == 'PATIENT' ? 'You' : 'Doctor'}',
            style: TextStyle(
              fontSize: 10,
              color: colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
        ],
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
