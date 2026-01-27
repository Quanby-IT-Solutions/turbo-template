import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/constants/app_constants.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/domain/entities/appointment.dart';
import 'package:mobile/presentation/scheduling/providers/appointment_providers.dart';

class RescheduleResponseScreen extends ConsumerStatefulWidget {
  final Appointment appointment;
  final Map<String, dynamic> rescheduleRequest;

  const RescheduleResponseScreen({
    super.key,
    required this.appointment,
    required this.rescheduleRequest,
  });

  @override
  ConsumerState<RescheduleResponseScreen> createState() =>
      _RescheduleResponseScreenState();
}

class _RescheduleResponseScreenState
    extends ConsumerState<RescheduleResponseScreen> {
  final _notesController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _respondToReschedule(bool approve) async {
    setState(() => _isSubmitting = true);

    try {
      final repository = ref.read(appointmentRepositoryProvider);
      await repository.respondToReschedule(
        appointmentId: widget.appointment.id,
        requestId: widget.rescheduleRequest['id'] as String,
        approve: approve,
        notes: _notesController.text.trim().isNotEmpty
            ? _notesController.text.trim()
            : null,
      );

      if (mounted) {
        ToastService.showAppointment(
          context: context,
          title: approve ? 'Reschedule Approved' : 'Reschedule Rejected',
          description: approve
              ? 'The appointment has been rescheduled successfully'
              : 'The reschedule request has been rejected',
          isSuccess: approve,
        );

        // Refresh appointments
        ref.read(appointmentsListProvider.notifier).refresh();

        // Navigate back
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ToastService.showError(
          context: context,
          title: 'Action Failed',
          description: e.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  DateTime _parseDate(String? dateStr) {
    if (dateStr == null) return DateTime.now();
    try {
      return DateTime.parse(dateStr);
    } catch (e) {
      return DateTime.now();
    }
  }

  String _formatDateTime(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
  }

  @override
  Widget build(BuildContext context) {
    final currentDate = _parseDate(
      widget.rescheduleRequest['currentDate'] as String?,
    );
    final newDate = _parseDate(widget.rescheduleRequest['newDate'] as String?);
    final reason =
        widget.rescheduleRequest['reason'] as String? ?? 'No reason provided';
    final proposedBy =
        widget.rescheduleRequest['proposedBy'] as String? ?? 'Unknown';

    return Scaffold(
      appBar: AppBar(title: const Text('Reschedule Request')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Request Info Card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(
                          Icons.info_outline,
                          color: Theme.of(context).colorScheme.primary,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Reschedule Request',
                          style: Theme.of(context).textTheme.titleLarge
                              ?.copyWith(fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Proposed by: ${proposedBy == 'DOCTOR' ? 'Doctor' : 'Patient'}',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Reason: $reason',
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Current Time
            Text(
              'Current Appointment',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Card(
              color: Theme.of(context).colorScheme.surfaceContainerHighest,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(
                      Icons.calendar_today,
                      color: Theme.of(context).colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _formatDateTime(currentDate),
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // New Time
            Text(
              'Proposed New Time',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Card(
              color: Theme.of(context).colorScheme.primaryContainer,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Icon(
                      Icons.event,
                      color: Theme.of(context).colorScheme.onPrimaryContainer,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        _formatDateTime(newDate),
                        style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                          fontWeight: FontWeight.w600,
                          color: Theme.of(
                            context,
                          ).colorScheme.onPrimaryContainer,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Notes Field (Optional)
            Text(
              'Response Notes (Optional)',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                hintText: 'Add any notes about your decision...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),

            const SizedBox(height: 32),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _isSubmitting
                        ? null
                        : () => _respondToReschedule(false),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Reject'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _isSubmitting
                        ? null
                        : () => _respondToReschedule(true),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: _isSubmitting
                        ? const SizedBox(
                            width: 20,
                            height: 20,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text('Approve'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
