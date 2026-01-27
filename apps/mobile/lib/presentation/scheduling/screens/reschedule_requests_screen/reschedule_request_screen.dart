import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/constants/app_constants.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/domain/entities/appointment.dart';
import 'package:mobile/presentation/scheduling/providers/appointment_providers.dart';

class RescheduleRequestScreen extends ConsumerStatefulWidget {
  final Appointment appointment;

  const RescheduleRequestScreen({super.key, required this.appointment});

  @override
  ConsumerState<RescheduleRequestScreen> createState() =>
      _RescheduleRequestScreenState();
}

class _RescheduleRequestScreenState
    extends ConsumerState<RescheduleRequestScreen> {
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  final _reasonController = TextEditingController();
  final _notesController = TextEditingController();
  bool _isSubmitting = false;

  @override
  void dispose() {
    _reasonController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? widget.appointment.scheduledAt,
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
    );

    if (picked != null) {
      setState(() => _selectedDate = picked);
    }
  }

  Future<void> _selectTime() async {
    final picked = await showTimePicker(
      context: context,
      initialTime:
          _selectedTime ??
          TimeOfDay.fromDateTime(widget.appointment.scheduledAt),
    );

    if (picked != null) {
      setState(() => _selectedTime = picked);
    }
  }

  Future<void> _submitRescheduleRequest() async {
    if (_selectedDate == null || _selectedTime == null) {
      ToastService.showError(
        context: context,
        title: 'Missing Information',
        description: 'Please select both date and time',
      );
      return;
    }

    if (_reasonController.text.trim().isEmpty) {
      ToastService.showError(
        context: context,
        title: 'Reason Required',
        description: 'Please provide a reason for rescheduling',
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      final newDateTime = DateTime(
        _selectedDate!.year,
        _selectedDate!.month,
        _selectedDate!.day,
        _selectedTime!.hour,
        _selectedTime!.minute,
      );

      final repository = ref.read(appointmentRepositoryProvider);
      await repository.proposeReschedule(
        appointmentId: widget.appointment.id,
        newDate: newDateTime.toIso8601String().split('T').first,
        newTime:
            '${_selectedTime!.hour.toString().padLeft(2, '0')}:${_selectedTime!.minute.toString().padLeft(2, '0')}',
        reason: _reasonController.text.trim(),
        notes: _notesController.text.trim().isNotEmpty
            ? _notesController.text.trim()
            : null,
      );

      if (mounted) {
        ToastService.showAppointment(
          context: context,
          title: 'Reschedule Request Sent',
          description: 'Your reschedule request has been sent successfully',
          isSuccess: true,
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
          title: 'Request Failed',
          description: e.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentTime = widget.appointment.scheduledAt;

    return Scaffold(
      appBar: AppBar(title: const Text('Request Reschedule')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Current Appointment Info
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Current Appointment',
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Date: ${_formatDate(currentTime)}',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                    Text(
                      'Time: ${_formatTime(currentTime)}',
                      style: Theme.of(context).textTheme.bodyLarge,
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // New Date Selection
            Text(
              'New Date & Time',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _selectDate,
                    icon: const Icon(Icons.calendar_today),
                    label: Text(
                      _selectedDate != null
                          ? _formatDate(_selectedDate!)
                          : 'Select Date',
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _selectTime,
                    icon: const Icon(Icons.access_time),
                    label: Text(
                      _selectedTime != null
                          ? _formatTimeOfDay(_selectedTime!)
                          : 'Select Time',
                    ),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Reason Field
            Text(
              'Reason for Reschedule *',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _reasonController,
              decoration: const InputDecoration(
                hintText: 'Please provide a reason for rescheduling...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),

            const SizedBox(height: 16),

            // Notes Field (Optional)
            Text(
              'Additional Notes (Optional)',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _notesController,
              decoration: const InputDecoration(
                hintText: 'Any additional information...',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),

            const SizedBox(height: 32),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 56,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submitRescheduleRequest,
                child: _isSubmitting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text(
                        'Submit Reschedule Request',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  String _formatTime(DateTime date) {
    final hour = date.hour;
    final minute = date.minute;
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '${displayHour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} $period';
  }

  String _formatTimeOfDay(TimeOfDay time) {
    final hour = time.hour;
    final minute = time.minute;
    final period = hour >= 12 ? 'PM' : 'AM';
    final displayHour = hour > 12 ? hour - 12 : (hour == 0 ? 12 : hour);
    return '${displayHour.toString().padLeft(2, '0')}:${minute.toString().padLeft(2, '0')} $period';
  }
}
