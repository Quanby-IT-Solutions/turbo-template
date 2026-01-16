import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/data/repositories/appointment_repository.dart';
import 'package:mobile/presentation/scheduling/providers/appointment_providers.dart';

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

  // Use temporary doctorId if not provided (for testing)
  String get _doctorId => widget.doctorId ?? 'doctor-temp-id';
  String get _doctorName => widget.doctorName ?? 'Dr. Sarah Anderson';

  final List<Map<String, dynamic>> _appointmentTypes = [
    {
      'value': 'video_call',
      'label': 'Video Call',
      'icon': Icons.videocam_rounded,
      'description': 'Online consultation via video',
      'color': Colors.blue,
    },
    {
      'value': 'phone_call',
      'label': 'Phone Call',
      'icon': Icons.phone_rounded,
      'description': 'Audio consultation via phone',
      'color': Colors.green,
    },
    {
      'value': 'in_person',
      'label': 'In Person',
      'icon': Icons.local_hospital_rounded,
      'description': 'Visit doctor at clinic',
      'color': Colors.purple,
    },
  ];

  final List<Map<String, dynamic>> _priorityOptions = [
    {
      'value': 'LOW',
      'label': 'Low',
      'icon': Icons.flag_outlined,
      'description': 'Routine check-up',
      'color': Colors.blue,
    },
    {
      'value': 'MEDIUM',
      'label': 'Medium',
      'icon': Icons.flag,
      'description': 'Standard appointment',
      'color': Colors.orange,
    },
    {
      'value': 'HIGH',
      'label': 'High',
      'icon': Icons.flag_rounded,
      'description': 'Urgent consultation',
      'color': Colors.red,
    },
  ];

  @override
  void dispose() {
    _reasonController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _selectDate() async {
    // Get doctor's weekly availability
    ref.read(doctorWeeklyAvailabilityProvider(_doctorId));
    await Future.delayed(const Duration(milliseconds: 100));

    final availabilityAsync = ref.read(
      doctorWeeklyAvailabilityProvider(_doctorId),
    );

    List<DoctorAvailability> availability = availabilityAsync.maybeWhen(
      data: (data) => data,
      orElse: () => [],
    );

    // Create set of available day indices (0=Sunday, 6=Saturday)
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
        // Disable dates in the past
        if (date.isBefore(DateTime.now())) {
          return false;
        }

        // If no availability data loaded, allow all future dates
        if (availability.isEmpty) return true;

        // Only enable days where doctor is available
        // Flutter's weekday: 1=Monday, 7=Sunday
        // Convert to: 0=Sunday, 6=Saturday
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

    // Show loading indicator
    if (!mounted) return;
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );

    List<String> availableSlots = [];

    try {
      // Trigger provider and wait for data
      ref.invalidate(availableSlotsProvider(params));
      await Future.delayed(const Duration(milliseconds: 200));

      final slotsAsync = ref.read(availableSlotsProvider(params));

      availableSlots = await slotsAsync.when(
        data: (data) async => data,
        loading: () async {
          // Wait for actual data
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

    final scheduledAt = DateTime(
      _selectedDate!.year,
      _selectedDate!.month,
      _selectedDate!.day,
      _selectedTime!.hour,
      _selectedTime!.minute,
    );

    final appointment = await ref
        .read(appointmentBookingProvider.notifier)
        .bookAppointment(
          doctorId: _doctorId,
          scheduledAt: scheduledAt,
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
      // Get the actual error message from provider state
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
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerLow,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: colorScheme.outline.withValues(alpha: 0.1),
                ),
                boxShadow: [
                  BoxShadow(
                    color: colorScheme.shadow.withValues(alpha: 0.06),
                    offset: const Offset(0, 4),
                    blurRadius: 12,
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    decoration: BoxDecoration(
                      color: colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Icon(
                      Icons.person_rounded,
                      size: 32,
                      color: colorScheme.primary,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _doctorName,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: colorScheme.onSurface,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Cardiology Specialist',
                          style: TextStyle(
                            fontSize: 14,
                            color: colorScheme.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Icon(
                              Icons.star_rounded,
                              size: 16,
                              color: Colors.amber[700],
                            ),
                            const SizedBox(width: 4),
                            Text(
                              '4.9 (324 reviews)',
                              style: TextStyle(
                                fontSize: 12,
                                color: colorScheme.onSurface.withValues(
                                  alpha: 0.6,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Priority Section
            Text(
              'Priority Level',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
                letterSpacing: -0.2,
              ),
            ),
            const SizedBox(height: 12),

            Row(
              children: _priorityOptions.map((priority) {
                final isSelected = _selectedPriority == priority['value'];
                return Expanded(
                  child: Container(
                    margin: EdgeInsets.only(
                      right: priority != _priorityOptions.last ? 8 : 0,
                    ),
                    decoration: BoxDecoration(
                      color: isSelected
                          ? (priority['color'] as Color).withValues(alpha: 0.1)
                          : colorScheme.surfaceContainerLow,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: isSelected
                            ? (priority['color'] as Color)
                            : colorScheme.outline.withValues(alpha: 0.1),
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => setState(
                          () => _selectedPriority = priority['value'],
                        ),
                        borderRadius: BorderRadius.circular(12),
                        child: Padding(
                          padding: const EdgeInsets.symmetric(
                            vertical: 12,
                            horizontal: 8,
                          ),
                          child: Column(
                            children: [
                              Icon(
                                priority['icon'],
                                color: isSelected
                                    ? priority['color']
                                    : colorScheme.onSurface.withValues(
                                        alpha: 0.6,
                                      ),
                                size: 24,
                              ),
                              const SizedBox(height: 6),
                              Text(
                                priority['label'],
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: isSelected
                                      ? FontWeight.w700
                                      : FontWeight.w600,
                                  color: isSelected
                                      ? priority['color']
                                      : colorScheme.onSurface,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                );
              }).toList(),
            ),

            const SizedBox(height: 24),

            // Appointment Type Section
            Text(
              'Appointment Type',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
                letterSpacing: -0.2,
              ),
            ),
            const SizedBox(height: 12),

            ..._appointmentTypes.map((type) {
              final isSelected = _selectedType == type['value'];
              return Container(
                margin: const EdgeInsets.only(bottom: 12),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (type['color'] as Color).withValues(alpha: 0.1)
                      : colorScheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: isSelected
                        ? (type['color'] as Color)
                        : colorScheme.outline.withValues(alpha: 0.1),
                    width: isSelected ? 2 : 1,
                  ),
                  boxShadow: [
                    if (isSelected)
                      BoxShadow(
                        color: (type['color'] as Color).withValues(alpha: 0.2),
                        offset: const Offset(0, 4),
                        blurRadius: 12,
                      ),
                  ],
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => setState(() => _selectedType = type['value']),
                    borderRadius: BorderRadius.circular(16),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: type['color'],
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              type['icon'],
                              color: Colors.white,
                              size: 24,
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  type['label'],
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w600,
                                    color: colorScheme.onSurface,
                                  ),
                                ),
                                Text(
                                  type['description'],
                                  style: TextStyle(
                                    fontSize: 13,
                                    color: colorScheme.onSurface.withValues(
                                      alpha: 0.6,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (isSelected)
                            Icon(
                              Icons.check_circle_rounded,
                              color: type['color'],
                              size: 24,
                            ),
                        ],
                      ),
                    ),
                  ),
                ),
              );
            }),

            const SizedBox(height: 24),

            // Date & Time Section
            Text(
              'Date & Time',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
                letterSpacing: -0.2,
              ),
            ),
            const SizedBox(height: 12),

            Row(
              children: [
                Expanded(
                  child: _buildSelectionCard(
                    icon: Icons.calendar_today_rounded,
                    label: 'Date',
                    value: _selectedDate != null
                        ? '${_selectedDate!.day}/${_selectedDate!.month}/${_selectedDate!.year}'
                        : 'Select Date',
                    onTap: _selectDate,
                    colorScheme: colorScheme,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildSelectionCard(
                    icon: Icons.access_time_rounded,
                    label: 'Time',
                    value: _selectedTime != null
                        ? _selectedTime!.format(context)
                        : 'Select Time',
                    onTap: _selectTime,
                    colorScheme: colorScheme,
                    isDisabled: _selectedDate == null,
                  ),
                ),
              ],
            ),

            const SizedBox(height: 24),

            // Reason for Visit
            Text(
              'Reason for Visit',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
                letterSpacing: -0.2,
              ),
            ),
            const SizedBox(height: 12),

            Container(
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerLow,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: colorScheme.outline.withValues(alpha: 0.1),
                ),
              ),
              child: TextField(
                controller: _reasonController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Describe your symptoms or reason for visit...',
                  hintStyle: TextStyle(
                    color: colorScheme.onSurface.withValues(alpha: 0.4),
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.all(16),
                ),
                style: TextStyle(fontSize: 15, color: colorScheme.onSurface),
              ),
            ),

            const SizedBox(height: 24),

            // Additional Notes (Optional)
            Text(
              'Additional Notes (Optional)',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
                letterSpacing: -0.2,
              ),
            ),
            const SizedBox(height: 12),

            Container(
              decoration: BoxDecoration(
                color: colorScheme.surfaceContainerLow,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: colorScheme.outline.withValues(alpha: 0.1),
                ),
              ),
              child: TextField(
                controller: _notesController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Any additional information...',
                  hintStyle: TextStyle(
                    color: colorScheme.onSurface.withValues(alpha: 0.4),
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.all(16),
                ),
                style: TextStyle(fontSize: 15, color: colorScheme.onSurface),
              ),
            ),

            const SizedBox(height: 32),

            // Submit Button
            Consumer(
              builder: (context, ref, child) {
                final bookingState = ref.watch(appointmentBookingProvider);
                final isLoading = bookingState.isLoading;

                return SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : _submitBooking,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: colorScheme.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16),
                      ),
                      shadowColor: colorScheme.primary.withValues(alpha: 0.3),
                    ),
                    child: isLoading
                        ? const SizedBox(
                            height: 24,
                            width: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                Colors.white,
                              ),
                            ),
                          )
                        : const Text(
                            'Submit Request',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -0.2,
                            ),
                          ),
                  ),
                );
              },
            ),

            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectionCard({
    required IconData icon,
    required String label,
    required String value,
    required VoidCallback onTap,
    required ColorScheme colorScheme,
    bool isDisabled = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDisabled
            ? colorScheme.surfaceContainerLow.withValues(alpha: 0.5)
            : colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.1)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.04),
            offset: const Offset(0, 2),
            blurRadius: 8,
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isDisabled ? null : onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  icon,
                  color: isDisabled
                      ? colorScheme.primary.withValues(alpha: 0.4)
                      : colorScheme.primary,
                  size: 24,
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: colorScheme.onSurface.withValues(
                      alpha: isDisabled ? 0.4 : 0.6,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface.withValues(
                      alpha: isDisabled ? 0.4 : 1.0,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
