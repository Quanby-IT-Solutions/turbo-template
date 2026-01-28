import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:mobile/presentation/lab_requests/booking/widgets/doctor_option.dart';
import 'package:mobile/presentation/lab_requests/booking/field/doctor_selection_field.dart';
import 'package:mobile/presentation/lab_requests/booking/field/instructions_field.dart';
import 'package:mobile/presentation/lab_requests/booking/field/notes_field.dart';
import 'package:mobile/presentation/lab_requests/booking/field/requested_test_field.dart';
import 'package:mobile/presentation/lab_requests/booking/field/room_no_field.dart';
import 'package:mobile/presentation/lab_requests/booking/widgets/organization_info.dart';
import 'package:mobile/presentation/lab_requests/booking/widgets/priority_selector.dart';
import 'package:mobile/presentation/lab_requests/booking/widgets/submit_button.dart';
import 'package:mobile/presentation/lab_requests/providers/patient_lab_requests_provider.dart';

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

  String? _organizationName;
  String? _organizationType;

  @override
  void initState() {
    super.initState();
    _loadOrganization();
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

  Future<void> _loadOrganization() async {
    if (widget.organizationId == null) return;

    try {
      final repository = ref.read(labRequestRepositoryProvider);
      final orgData = await repository.getOrganization(widget.organizationId!);

      if (mounted) {
        setState(() {
          _organizationName = orgData['name'] as String?;
          _organizationType = orgData['type'] as String?;
        });
      }
    } catch (e) {
      debugPrint('Failed to load organization: $e');
      // Don't show error, just use fallback name
    }
  }

  Future<void> _loadDoctors() async {
    if (widget.organizationId == null) return;

    setState(() => _isLoadingDoctors = true);

    try {
      final repository = ref.read(labRequestRepositoryProvider);
      final doctorsData = await repository.getDoctorsByOrganization(
        widget.organizationId!,
      );

      if (mounted) {
        setState(() {
          _availableDoctors = doctorsData.map((doc) {
            final doctorInfo = doc['doctorInfo'] as Map<String, dynamic>?;
            final firstName = doctorInfo?['firstName'] as String? ?? '';
            final lastName = doctorInfo?['lastName'] as String? ?? '';
            final specialization =
                doctorInfo?['specialization'] as String? ?? 'General Practice';

            return DoctorOption(
              id: doc['id'] as String? ?? '',
              name: 'Dr. $firstName $lastName',
              specialization: specialization,
            );
          }).toList();
        });
      }
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
    final user = ref.read(currentUserProvider);
    final userId = user?.id;

    if (userId == null) {
      ToastService.showError(
        context: context,
        title: 'Authentication Required',
        description: 'Please log in to submit a lab request',
      );
      return;
    }

    if (_requestedTestsController.text.trim().isEmpty) {
      ToastService.showError(
        context: context,
        title: 'Tests Required',
        description: 'Please specify the requested tests',
      );
      return;
    }

    final requestedTestsString = _requestedTestsController.text.trim();

    final labRequest = await ref
        .read(labRequestBookingProvider.notifier)
        .createLabRequest(
          patientId: userId,
          organizationId: widget.organizationId ?? '',
          doctorId: _selectedDoctorId,
          roomId: _roomController.text.trim().isNotEmpty
              ? _roomController.text.trim()
              : null,
          note: _notesController.text.trim().isNotEmpty
              ? _notesController.text.trim()
              : null,
          priority: _selectedPriority,
          requestedTests: requestedTestsString,
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

      ref.invalidate(patientLabRequestsProvider(userId));

      context.go('/lab-request');
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
            OrganizationInfoCard(
              organizationName:
                  _organizationName ??
                  widget.organizationName ??
                  'Medical Laboratory',
              organizationType: _organizationType ?? 'Healthcare Facility',
            ),
            const SizedBox(height: 24),
            DoctorSelectionField(
              selectedDoctorId: _selectedDoctorId,
              availableDoctors: _availableDoctors,
              isLoading: _isLoadingDoctors,
              onChanged: (value) => setState(() => _selectedDoctorId = value),
            ),
            const SizedBox(height: 24),
            RoomNumberField(controller: _roomController),
            const SizedBox(height: 24),
            PrioritySelector(
              selectedPriority: _selectedPriority,
              onChanged: (value) => setState(() => _selectedPriority = value),
            ),
            const SizedBox(height: 24),
            RequestedTestsField(controller: _requestedTestsController),
            const SizedBox(height: 24),
            InstructionsField(controller: _instructionsController),
            const SizedBox(height: 24),
            NotesField(controller: _notesController),
            const SizedBox(height: 32),
            SubmitButton(onPressed: _submitRequest),
            const SizedBox(height: 100),
          ],
        ),
      ),
    );
  }
}
