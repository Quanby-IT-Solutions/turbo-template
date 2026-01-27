import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/data/repositories/appointment_repository.dart';
import 'package:mobile/presentation/scheduling/providers/appointment_providers.dart';
import 'doctor_info_card.dart';
import 'priority_selector.dart';
import 'appointment_type_selector.dart';
import 'date_time_picker.dart';
import 'appointment_text_field.dart';
import 'submit_appointment_button.dart';

class AppointmentBookingScreen extends ConsumerStatefulWidget {
  final String? doctorId;
  final String? doctorName;

  const AppointmentBookingScreen({super.key, this.doctorId, this.doctorName});

  @override
  ConsumerState<AppointmentBookingScreen> createState() =>
      _AppointmentBookingScreenState();
}

class _AppointmentBookingScreenState
    extends ConsumerState<AppointmentBookingScreen> {
  DateTime? _selectedDate;
  TimeOfDay? _selectedTime;
  String _selectedType = 'video_call';
  String _selectedPriority = 'MEDIUM';
  final _reasonController = TextEditingController();
  final _notesController = TextEditingController();

  String get _doctorId => widget.doctorId ?? 'doctor-temp-id';
  String get _doctorName => widget.doctorName ?? 'Dr. Sarah Anderson';

  @override
  void dispose() {
    _reasonController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    ref.read(doctorWeeklyAvailabilityProvider(_doctorId));
    await Future.delayed(const Duration(milliseconds: 100));

    final availabilityAsync = ref.read(
      doctorWeeklyAvailabilityProvider(_doctorId),
    );

    List<DoctorAvailability> availability = availabilityAsync.maybeWhen(
      data: (data) => data,
      orElse: () => [],
    );

    final availableDays = availability
        .where((a) => a.isAvailable)
        .map((a) => a.dayIndex)
        .toSet();

    if (!mounted) return;

    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
      selectableDayPredicate: (DateTime date) {
        if (date.isBefore(DateTime.now())) {
          return false;
        }

        if (availability.isEmpty) return true;

        final dayIndex = date.weekday % 7;
        return availableDays.contains(dayIndex);
      },
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: ColorScheme.light(
              primary: Theme.of(context).colorScheme.primary,
            ),
          ),
          child: child!,
        );
      },
    );

    if (picked != null) {
      setState(() {
        _selectedDate = picked;
        _selectedTime = null;
      });
    }
  }

  Future<void> _selectTime() async {
    if (_selectedDate == null) {
      ToastService.showError(
        context: context,
        title: 'Select Date First',
        description: 'Please select an appointment date before choosing a time',
      );
      return;
    }

    final dateStr = _selectedDate!.toIso8601String().split('T')[0];
    final params = AvailableSlotsParams(doctorId: _doctorId, date: dateStr);

    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    List<String> availableSlots = [];

    try {
      ref.invalidate(availableSlotsProvider(params));
      await Future.delayed(const Duration(milliseconds: 200));

      final slotsAsync = ref.read(availableSlotsProvider(params));

      availableSlots = await slotsAsync.when(
        data: (data) async => data,
        loading: () async {

          await Future.delayed(const Duration(seconds: 2));
          final retryAsync = ref.read(availableSlotsProvider(params));
          return retryAsync.maybeWhen(
            data: (data) => data,
            orElse: () => <String>[],
          );
        },
        error: (error, stack) async {
          throw Exception('Failed to load time slots');
        },
      );
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop(); // Close loading dialog

      ToastService.showError(
        context: context,
        title: 'Day Unavailable',
        description:
            'The doctor has no available time slots for this date. Please choose another date.',
      );
      return;
    }

    if (!mounted) return;
    Navigator.of(context).pop(); // Close loading dialog

    if (availableSlots.isEmpty) {
      ToastService.showError(
        context: context,
        title: 'No Slots Available',
        description:
            'No available time slots for the selected date. Please choose another date.',
      );
      return;
    }

    await _showTimeSlotPicker(availableSlots);
  }

  Future<void> _showTimeSlotPicker(List<String> availableSlots) async {
    final colorScheme = Theme.of(context).colorScheme;

    final selected = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Select Time Slot'),
        content: SizedBox(
          width: double.maxFinite,
          child: availableSlots.isEmpty
              ? const Center(
                  child: Padding(
                    padding: EdgeInsets.all(20.0),
                    child: Text('No available slots for this date'),
                  ),
                )
              : ListView.builder(
                  shrinkWrap: true,
                  itemCount: availableSlots.length,
                  itemBuilder: (context, index) {
                    final slot = availableSlots[index];
                    return ListTile(
                      leading: Icon(
                        Icons.access_time,
                        color: colorScheme.primary,
                      ),
                      title: Text(slot),
                      onTap: () => Navigator.pop(context, slot),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(8),
                      ),
                    );
                  },
                ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );

    if (selected != null) {
      final parts = selected.split(':');
      setState(() {
        _selectedTime = TimeOfDay(
          hour: int.parse(parts[0]),
          minute: int.parse(parts[1]),
        );
      });
    }
  }

  Future<void> _submitBooking() async {
    if (_selectedDate == null) {
      ToastService.showError(
        context: context,
        title: 'Date Required',
        description: 'Please select an appointment date',
      );
      return;
    }

    if (_selectedTime == null) {
      ToastService.showError(
        context: context,
        title: 'Time Required',
        description: 'Please select an appointment time',
      );
      return;
    }

    if (_reasonController.text.trim().isEmpty) {
      ToastService.showError(
        context: context,
        title: 'Reason Required',
        description: 'Please provide a reason for your visit',
      );
      return;
    }

    final timeString =
        '${_selectedTime!.hour.toString().padLeft(2, '0')}:${_selectedTime!.minute.toString().padLeft(2, '0')}';

    final appointment = await ref
        .read(appointmentBookingProvider.notifier)
        .bookAppointment(
          doctorId: _doctorId,
          scheduledAt: _selectedDate!,
          requestedTime: timeString,
          reason: _reasonController.text.trim(),
          notes: _notesController.text.trim().isNotEmpty
              ? _notesController.text.trim()
              : null,
          priority: _selectedPriority,
        );

    if (!mounted) return;

    if (appointment != null) {
      ToastService.showAppointment(
        context: context,
        title: 'Appointment Requested',
        description: 'Your appointment request has been submitted successfully',
        isSuccess: true,
      );
      context.pop();
    } else {
      final errorState = ref.read(appointmentBookingProvider);
      final errorMessage =
          errorState.error ?? 'Failed to book appointment. Please try again.';

      ToastService.showError(
        context: context,
        title: 'Booking Failed',
        description: errorMessage,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: colorScheme.surfaceContainerLow,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_rounded, color: colorScheme.primary),
          onPressed: () {
            if (Navigator.of(context).canPop()) {
              Navigator.of(context).pop();
            } else {
              context.go('/patient-home');
            }
          },
        ),
        title: Text(
          'Book Appointment',
          style: TextStyle(
            color: colorScheme.onSurface,
            fontSize: 22,
            fontWeight: FontWeight.w700,
            letterSpacing: -0.3,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Doctor Info Card
            DoctorInfoCard(
              doctorName: _doctorName,
              colorScheme: colorScheme,
            ),

            const SizedBox(height: 24),

            // Priority Section
            PrioritySelector(
              selectedPriority: _selectedPriority,
              onPriorityChanged: (value) => setState(() => _selectedPriority = value),
              colorScheme: colorScheme,
            ),

            const SizedBox(height: 24),

            // Appointment Type Section
            AppointmentTypeSelector(
              selectedType: _selectedType,
              onTypeChanged: (value) => setState(() => _selectedType = value),
              colorScheme: colorScheme,
            ),

            const SizedBox(height: 24),

            // Date & Time Section
            DateTimePicker(
              selectedDate: _selectedDate,
              selectedTime: _selectedTime,
              onSelectDate: _selectDate,
              onSelectTime: _selectTime,
              colorScheme: colorScheme,
            ),

            const SizedBox(height: 24),

            // Reason for Visit
            AppointmentTextField(
              label: 'Reason for Visit',
              hintText: 'Describe your symptoms or reason for visit...',
              controller: _reasonController,
              colorScheme: colorScheme,
            ),

            const SizedBox(height: 24),

            // Additional Notes (Optional)
            AppointmentTextField(
              label: 'Additional Notes (Optional)',
              hintText: 'Any additional information...',
              controller: _notesController,
              colorScheme: colorScheme,
            ),

            const SizedBox(height: 32),

            // Submit Button
            SubmitAppointmentButton(
              onSubmit: _submitBooking,
              colorScheme: colorScheme,
            ),

            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }
}