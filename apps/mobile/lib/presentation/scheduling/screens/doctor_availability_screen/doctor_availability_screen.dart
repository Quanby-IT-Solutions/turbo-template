import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/constants/app_constants.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/domain/entities/weekly_availability.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:mobile/presentation/scheduling/providers/availability_providers.dart';
import 'package:mobile/presentation/scheduling/widgets/weekly_availability_calendar.dart';

class DoctorAvailabilityScreen extends ConsumerStatefulWidget {
  const DoctorAvailabilityScreen({super.key});

  @override
  ConsumerState<DoctorAvailabilityScreen> createState() =>
      _DoctorAvailabilityScreenState();
}

class _DoctorAvailabilityScreenState
    extends ConsumerState<DoctorAvailabilityScreen> {
  List<WeeklySlot> _currentSlots = [];
  bool _isSaving = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadAvailability();
    });
  }

  void _loadAvailability() {
    final user = ref.read(currentUserProvider);
    if (user != null) {
      ref
          .read(weeklyAvailabilityProvider.notifier)
          .fetchWeeklyAvailability(user.id);
    }
  }

  void _handleSlotsChanged(List<WeeklySlot> slots) {
    setState(() {
      _currentSlots = slots;
    });
  }

  Future<void> _saveAvailability() async {
    final user = ref.read(currentUserProvider);
    if (user == null) {
      ToastService.showError(
        context: context,
        title: 'Error',
        description: 'User not authenticated',
      );
      return;
    }

    setState(() => _isSaving = true);

    try {
      await ref
          .read(weeklyAvailabilityProvider.notifier)
          .setWeeklyAvailability(doctorId: user.id, slots: _currentSlots);

      if (mounted) {
        ToastService.showSuccess(
          context: context,
          title: 'Availability Saved',
          description: 'Your weekly availability has been updated successfully',
        );
        context.pop();
      }
    } catch (e) {
      if (mounted) {
        ToastService.showError(
          context: context,
          title: 'Save Failed',
          description: e.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isSaving = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final availabilityState = ref.watch(weeklyAvailabilityProvider);

    // Sync state if loaded from provider
    if (availabilityState.isNotEmpty && _currentSlots.isEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        setState(() {
          _currentSlots = availabilityState;
        });
      });
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Set Weekly Availability'),
        actions: [
          if (_isSaving)
            const Padding(
              padding: EdgeInsets.all(16),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            )
          else
            TextButton(onPressed: _saveAvailability, child: const Text('Save')),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Weekly Schedule',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'Set your recurring weekly availability. Patients will see these time slots when booking appointments.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: WeeklyAvailabilityCalendar(
                  initialSlots: _currentSlots,
                  onSlotsChanged: _handleSlotsChanged,
                ),
              ),
            ),
            const SizedBox(height: 24),
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primaryContainer,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.info_outline,
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'You can add multiple time slots per day. Overlapping slots will be automatically validated.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onPrimaryContainer,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
