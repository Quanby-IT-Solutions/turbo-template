import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/presentation/patient/providers/patient_lab_requests_provider.dart';

class LabRequestBookingScreen extends ConsumerStatefulWidget {
  final String? organizationId;
  final String? organizationName;

  const LabRequestBookingScreen({
    super.key,
    this.organizationId,
    this.organizationName,
  });

  @override
  ConsumerState<LabRequestBookingScreen> createState() =>
      _LabRequestBookingScreenState();
}

class _LabRequestBookingScreenState
    extends ConsumerState<LabRequestBookingScreen> {
  String _selectedPriority = 'NORMAL';
  String? _selectedDoctorId;
  final _requestedTestsController = TextEditingController();
  final _instructionsController = TextEditingController();
  final _notesController = TextEditingController();
  final _roomController = TextEditingController();
  bool _isLoadingDoctors = false;
  List<DoctorOption> _availableDoctors = [];

  final List<Map<String, dynamic>> _priorityOptions = [
    {
      'value': 'LOW',
      'label': 'Low',
      'icon': Icons.flag_outlined,
      'description': 'Routine test',
      'color': Colors.blue,
    },
    {
      'value': 'NORMAL',
      'label': 'Normal',
      'icon': Icons.flag,
      'description': 'Standard priority',
      'color': Colors.orange,
    },
    {
      'value': 'HIGH',
      'label': 'High',
      'icon': Icons.flag_rounded,
      'description': 'Urgent test',
      'color': Colors.red,
    },
  ];

  @override
  void initState() {
    super.initState();
    _loadDoctors();
  }

  @override
  void dispose() {
    _requestedTestsController.dispose();
    _instructionsController.dispose();
    _notesController.dispose();
    _roomController.dispose();
    super.dispose();
  }

  Future<void> _loadDoctors() async {
    if (widget.organizationId == null) return;

    setState(() => _isLoadingDoctors = true);

    try {
      // TODO: Replace with actual API call to get doctors by organization
      // For now using mock data
      await Future.delayed(const Duration(seconds: 1));

      setState(() {
        _availableDoctors = [
          DoctorOption(
            id: 'doc-1',
            name: 'Dr. Sarah Anderson',
            specialization: 'Pathology',
          ),
          DoctorOption(
            id: 'doc-2',
            name: 'Dr. Michael Chen',
            specialization: 'Radiology',
          ),
          DoctorOption(
            id: 'doc-3',
            name: 'Dr. Emily Thompson',
            specialization: 'Laboratory Medicine',
          ),
        ];
      });
    } catch (e) {
      if (mounted) {
        ToastService.showError(
          context: context,
          title: 'Failed to load doctors',
          description: e.toString(),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoadingDoctors = false);
      }
    }
  }

  Future<void> _submitRequest() async {
    if (_requestedTestsController.text.trim().isEmpty) {
      ToastService.showError(
        context: context,
        title: 'Tests Required',
        description: 'Please specify the requested tests',
      );
      return;
    }

    // Parse requested tests from comma-separated input
    final requestedTests = _requestedTestsController.text
        .split(',')
        .map((test) => test.trim())
        .where((test) => test.isNotEmpty)
        .toList();

    if (requestedTests.isEmpty) {
      ToastService.showError(
        context: context,
        title: 'Tests Required',
        description: 'Please specify at least one test',
      );
      return;
    }

    final labRequest = await ref
        .read(labRequestBookingProvider.notifier)
        .createLabRequest(
          patientId: 'temp-patient-id', // TODO: Get from auth state
          organizationId: widget.organizationId ?? 'temp-org-id',
          doctorId: _selectedDoctorId,
          roomId: _roomController.text.trim().isNotEmpty
              ? _roomController.text.trim()
              : null,
          note: _notesController.text.trim().isNotEmpty
              ? _notesController.text.trim()
              : null,
          priority: _selectedPriority,
          requestedTests: requestedTests,
          instructions: _instructionsController.text.trim().isNotEmpty
              ? _instructionsController.text.trim()
              : null,
          status: 'PENDING',
        );

    if (!mounted) return;

    if (labRequest != null) {
      ToastService.showAppointment(
        context: context,
        title: 'Lab Request Submitted',
        description: 'Your lab request has been submitted successfully',
        isSuccess: true,
      );
      context.pop();
    } else {
      final errorState = ref.read(labRequestBookingProvider);
      final errorMessage =
          errorState.error ?? 'Failed to submit lab request. Please try again.';

      ToastService.showError(
        context: context,
        title: 'Submission Failed',
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
          onPressed: () => context.pop(),
        ),
        title: Text(
          'Request Lab Tests',
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
            // Organization Info Card
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
                      Icons.local_hospital_rounded,
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
                          widget.organizationName ?? 'Medical Laboratory',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: colorScheme.onSurface,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Healthcare Facility',
                          style: TextStyle(
                            fontSize: 14,
                            color: colorScheme.primary,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Doctor Selection
            Text(
              'Referring Doctor (Optional)',
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
              child: _isLoadingDoctors
                  ? const Padding(
                      padding: EdgeInsets.all(16),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  : DropdownButtonFormField<String>(
                      initialValue: _selectedDoctorId,
                      decoration: InputDecoration(
                        hintText: 'Select a doctor (optional)',
                        hintStyle: TextStyle(
                          color: colorScheme.onSurface.withValues(alpha: 0.4),
                        ),
                        prefixIcon: Icon(
                          Icons.person_rounded,
                          color: colorScheme.primary,
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 16,
                        ),
                      ),
                      items: [
                        DropdownMenuItem<String>(
                          value: null,
                          child: Text(
                            'No doctor selected',
                            style: TextStyle(
                              color: colorScheme.onSurface.withValues(
                                alpha: 0.6,
                              ),
                            ),
                          ),
                        ),
                        ..._availableDoctors.map((doctor) {
                          return DropdownMenuItem<String>(
                            value: doctor.id,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  doctor.name,
                                  style: TextStyle(
                                    fontWeight: FontWeight.w600,
                                    color: colorScheme.onSurface,
                                  ),
                                ),
                                Text(
                                  doctor.specialization,
                                  style: TextStyle(
                                    fontSize: 12,
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
                      onChanged: (value) {
                        setState(() => _selectedDoctorId = value);
                      },
                    ),
            ),

            const SizedBox(height: 24),

            // Room Number
            Text(
              'Room Number (Optional)',
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
                controller: _roomController,
                decoration: InputDecoration(
                  hintText: 'E.g., Room 301, Ward B',
                  hintStyle: TextStyle(
                    color: colorScheme.onSurface.withValues(alpha: 0.4),
                  ),
                  prefixIcon: Icon(
                    Icons.meeting_room_rounded,
                    color: colorScheme.primary,
                  ),
                  border: InputBorder.none,
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 16,
                  ),
                ),
                style: TextStyle(fontSize: 15, color: colorScheme.onSurface),
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

            // Requested Tests Input
            Text(
              'Requested Tests',
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
                controller: _requestedTestsController,
                maxLines: 4,
                decoration: InputDecoration(
                  hintText:
                      'Enter tests separated by commas\nE.g., CBC, Blood Glucose, X-Ray, Urinalysis',
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

            // Instructions
            Text(
              'Instructions',
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
                controller: _instructionsController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText:
                      'Special instructions for the lab\nE.g., Fasting required, Morning sample only',
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

            // Additional Notes
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
                  hintText: 'Any additional information or notes...',
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
                final bookingState = ref.watch(labRequestBookingProvider);
                final isLoading = bookingState.isLoading;

                return SizedBox(
                  width: double.infinity,
                  height: 56,
                  child: ElevatedButton(
                    onPressed: isLoading ? null : _submitRequest,
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
}

class DoctorOption {
  final String id;
  final String name;
  final String specialization;

  DoctorOption({
    required this.id,
    required this.name,
    required this.specialization,
  });
}
