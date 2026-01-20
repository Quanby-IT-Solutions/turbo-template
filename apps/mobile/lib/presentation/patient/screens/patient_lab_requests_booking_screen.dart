import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/presentation/patient/providers/patient_lab_requests_provider.dart';

class LabRequestBookingScreen extends ConsumerStatefulWidget {
  final String? patientId;
  final String? organizationId;
  final String? doctorId;

  const LabRequestBookingScreen({
    super.key,
    this.patientId,
    this.organizationId,
    this.doctorId,
  });

  @override
  ConsumerState<LabRequestBookingScreen> createState() =>
      _LabRequestBookingScreenState();
}

class _LabRequestBookingScreenState
    extends ConsumerState<LabRequestBookingScreen> {
  String _selectedPriority = 'NORMAL';
  final _noteController = TextEditingController();
  final _instructionsController = TextEditingController();
  final List<String> _selectedTests = [];

  // Test categories with their respective tests
  final Map<String, List<Map<String, dynamic>>> _testCategories = {
    'Blood Tests': [
      {
        'name': 'Complete Blood Count (CBC)',
        'description': 'Measures different components of blood',
        'icon': Icons.bloodtype,
      },
      {
        'name': 'Blood Glucose',
        'description': 'Checks blood sugar levels',
        'icon': Icons.health_and_safety,
      },
      {
        'name': 'Lipid Profile',
        'description': 'Cholesterol and triglycerides',
        'icon': Icons.favorite,
      },
      {
        'name': 'Liver Function Test',
        'description': 'Checks liver health',
        'icon': Icons.medical_services,
      },
    ],
    'Imaging': [
      {
        'name': 'X-Ray',
        'description': 'Radiographic imaging',
        'icon': Icons.local_hospital,
      },
      {
        'name': 'CT Scan',
        'description': 'Computed tomography scan',
        'icon': Icons.mediation,
      },
      {
        'name': 'MRI',
        'description': 'Magnetic resonance imaging',
        'icon': Icons.psychology,
      },
      {
        'name': 'Ultrasound',
        'description': 'Sonography imaging',
        'icon': Icons.child_care,
      },
    ],
    'Urine Tests': [
      {
        'name': 'Urinalysis',
        'description': 'Complete urine analysis',
        'icon': Icons.science,
      },
      {
        'name': 'Urine Culture',
        'description': 'Bacterial infection detection',
        'icon': Icons.biotech,
      },
    ],
    'Other Tests': [
      {
        'name': 'ECG',
        'description': 'Electrocardiogram',
        'icon': Icons.monitor_heart,
      },
      {
        'name': 'Thyroid Function Test',
        'description': 'TSH, T3, T4 levels',
        'icon': Icons.airline_seat_recline_normal,
      },
    ],
  };

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
  void dispose() {
    _noteController.dispose();
    _instructionsController.dispose();
    super.dispose();
  }

  void _toggleTest(String testName) {
    setState(() {
      if (_selectedTests.contains(testName)) {
        _selectedTests.remove(testName);
      } else {
        _selectedTests.add(testName);
      }
    });
  }

  Future<void> _submitRequest() async {
    if (_selectedTests.isEmpty) {
      ToastService.showError(
        context: context,
        title: 'Tests Required',
        description: 'Please select at least one test',
      );
      return;
    }

    if (_noteController.text.trim().isEmpty) {
      ToastService.showError(
        context: context,
        title: 'Note Required',
        description: 'Please provide a note for the lab request',
      );
      return;
    }

    final labRequest = await ref
        .read(labRequestBookingProvider.notifier)
        .createLabRequest(
          patientId: widget.patientId ?? 'temp-patient-id',
          organizationId: widget.organizationId ?? 'temp-org-id',
          doctorId: widget.doctorId,
          note: _noteController.text.trim(),
          priority: _selectedPriority,
          requestedTests: _selectedTests,
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
            // Info Card
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
                          'Medical Laboratory',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: colorScheme.onSurface,
                            letterSpacing: -0.2,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Select tests and provide details',
                          style: TextStyle(
                            fontSize: 14,
                            color: colorScheme.onSurface.withValues(alpha: 0.6),
                          ),
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

            // Test Selection
            Text(
              'Select Tests (${_selectedTests.length} selected)',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: colorScheme.onSurface,
                letterSpacing: -0.2,
              ),
            ),
            const SizedBox(height: 12),

            ..._testCategories.entries.map((category) {
              return Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Padding(
                    padding: const EdgeInsets.only(bottom: 8, top: 8),
                    child: Text(
                      category.key,
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.primary,
                      ),
                    ),
                  ),
                  ...category.value.map((test) {
                    final isSelected = _selectedTests.contains(test['name']);
                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      decoration: BoxDecoration(
                        color: isSelected
                            ? colorScheme.primary.withValues(alpha: 0.1)
                            : colorScheme.surfaceContainerLow,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected
                              ? colorScheme.primary
                              : colorScheme.outline.withValues(alpha: 0.1),
                          width: isSelected ? 2 : 1,
                        ),
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          onTap: () => _toggleTest(test['name']),
                          borderRadius: BorderRadius.circular(16),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: isSelected
                                        ? colorScheme.primary
                                        : colorScheme.primary.withValues(
                                            alpha: 0.1,
                                          ),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Icon(
                                    test['icon'],
                                    color: isSelected
                                        ? Colors.white
                                        : colorScheme.primary,
                                    size: 24,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        test['name'],
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: FontWeight.w600,
                                          color: colorScheme.onSurface,
                                        ),
                                      ),
                                      Text(
                                        test['description'],
                                        style: TextStyle(
                                          fontSize: 13,
                                          color: colorScheme.onSurface
                                              .withValues(alpha: 0.6),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (isSelected)
                                  Icon(
                                    Icons.check_circle_rounded,
                                    color: colorScheme.primary,
                                    size: 24,
                                  ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ],
              );
            }),

            const SizedBox(height: 24),

            // Note
            Text(
              'Note',
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
                controller: _noteController,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Describe symptoms or reason for tests...',
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

            // Special Instructions (Optional)
            Text(
              'Special Instructions (Optional)',
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
                  hintText: 'E.g., fasting required, morning sample...',
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
