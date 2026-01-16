import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/responsive/responsive_config.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/presentation/patient/providers/patient_providers.dart';
import 'package:mobile/data/repositories/patient_repository.dart';
import 'package:mobile/domain/entities/patient.dart';

class PatientProfileEditScreen extends ConsumerStatefulWidget {
  const PatientProfileEditScreen({super.key});

  @override
  ConsumerState<PatientProfileEditScreen> createState() =>
      _PatientProfileEditScreenState();
}

class _PatientProfileEditScreenState
    extends ConsumerState<PatientProfileEditScreen> {
  final _formKey = GlobalKey<FormState>();
  final _firstNameController = TextEditingController();
  final _middleNameController = TextEditingController();
  final _lastNameController = TextEditingController();
  final _contactNumberController = TextEditingController();
  final _addressController = TextEditingController();
  final _weightController = TextEditingController();
  final _heightController = TextEditingController();
  final _bloodTypeController = TextEditingController();
  final _medicalHistoryController = TextEditingController();
  final _allergiesController = TextEditingController();
  final _medicationsController = TextEditingController();
  final _philHealthIdController = TextEditingController();

  bool _isSaving = false;
  String? _selectedGender;
  DateTime? _selectedDateOfBirth;
  Patient? _currentPatient;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadPatientData();
    });
  }

  @override
  void dispose() {
    _firstNameController.dispose();
    _middleNameController.dispose();
    _lastNameController.dispose();
    _contactNumberController.dispose();
    _addressController.dispose();
    _weightController.dispose();
    _heightController.dispose();
    _bloodTypeController.dispose();
    _medicalHistoryController.dispose();
    _allergiesController.dispose();
    _medicationsController.dispose();
    _philHealthIdController.dispose();
    super.dispose();
  }

  void _loadPatientData() {
    final patientAsync = ref.read(currentPatientProvider);
    patientAsync.whenData((patient) {
      if (patient != null) {
        setState(() {
          _currentPatient = patient;
          _firstNameController.text = patient.firstName;
          _middleNameController.text = patient.middleName ?? '';
          _lastNameController.text = patient.lastName;
          _contactNumberController.text = patient.contactNumber;
          _addressController.text = patient.address;
          _weightController.text =
              patient.weight > 0 ? patient.weight.toStringAsFixed(1) : '';
          _heightController.text =
              patient.height > 0 ? patient.height.toStringAsFixed(1) : '';
          _bloodTypeController.text = patient.bloodType;
          _medicalHistoryController.text = patient.medicalHistory ?? '';
          _allergiesController.text = patient.allergies ?? '';
          _medicationsController.text = patient.medications ?? '';
          _philHealthIdController.text = patient.philHealthId ?? '';
          _selectedGender = patient.gender;
          _selectedDateOfBirth = patient.dateOfBirth;
        });
      }
    });
  }

  Future<void> _selectDateOfBirth() async {
    final date = await showDatePicker(
      context: context,
      initialDate: _selectedDateOfBirth ?? DateTime(1990),
      firstDate: DateTime(1920),
      lastDate: DateTime.now(),
    );
    if (date != null) {
      setState(() {
        _selectedDateOfBirth = date;
      });
    }
  }

Future<void> _saveProfile() async {
  if (!_formKey.currentState!.validate() || _currentPatient == null) {
    return;
  }

  setState(() => _isSaving = true);

  try {
    final updateData = <String, dynamic>{};

    if (_firstNameController.text.trim().isNotEmpty) {
      updateData['firstName'] = _firstNameController.text.trim();
    }
    if (_middleNameController.text.trim().isNotEmpty) {
      updateData['middleName'] = _middleNameController.text.trim();
    }
    if (_lastNameController.text.trim().isNotEmpty) {
      updateData['lastName'] = _lastNameController.text.trim();
    }
    if (_selectedGender != null) {
      updateData['gender'] = _selectedGender;
    }
    
    // ✅ FIXED: Format date with UTC timezone 'Z' at the end
    if (_selectedDateOfBirth != null) {
      // Create a UTC datetime at midnight for the selected date
      final utcDate = DateTime.utc(
        _selectedDateOfBirth!.year,
        _selectedDateOfBirth!.month,
        _selectedDateOfBirth!.day,
      );
      updateData['dateOfBirth'] = utcDate.toIso8601String();
    }
    
    if (_contactNumberController.text.trim().isNotEmpty) {
      updateData['contactNumber'] = _contactNumberController.text.trim();
    }
    if (_addressController.text.trim().isNotEmpty) {
      updateData['address'] = _addressController.text.trim();
    }
    if (_weightController.text.trim().isNotEmpty) {
      final weight = double.tryParse(_weightController.text.trim());
      if (weight != null && weight > 0) {
        updateData['weight'] = weight;
      }
    }
    if (_heightController.text.trim().isNotEmpty) {
      final height = double.tryParse(_heightController.text.trim());
      if (height != null && height > 0) {
        updateData['height'] = height;
      }
    }
    if (_bloodTypeController.text.trim().isNotEmpty) {
      updateData['bloodType'] = _bloodTypeController.text.trim();
    }
    if (_medicalHistoryController.text.trim().isNotEmpty) {
      updateData['medicalHistory'] = _medicalHistoryController.text.trim();
    }
    if (_allergiesController.text.trim().isNotEmpty) {
      updateData['allergies'] = _allergiesController.text.trim();
    }
    if (_medicationsController.text.trim().isNotEmpty) {
      updateData['medications'] = _medicationsController.text.trim();
    }
    if (_philHealthIdController.text.trim().isNotEmpty) {
      updateData['philHealthId'] = _philHealthIdController.text.trim();
    }

    final repository = PatientRepository();
    await repository.updatePatient(_currentPatient!.id, updateData);

    // Invalidate provider to refresh data
    ref.invalidate(currentPatientProvider);

    if (mounted) {
      ToastService.showMedicalSuccess(
        context: context,
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully.',
      );
      context.pop();
    }
  } catch (e) {
    if (mounted) {
      ToastService.showError(
        context: context,
        title: 'Update Failed',
        description: 'Failed to update profile: ${e.toString()}',
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
    final patientAsync = ref.watch(currentPatientProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return AnimatedNavWrapper(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Edit Profile'),
          actions: [
            if (_isSaving)
              const Padding(
                padding: EdgeInsets.all(16.0),
                child: SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
              )
            else
              IconButton(
                icon: const Icon(Icons.check_rounded),
                onPressed: _saveProfile,
                tooltip: 'Save',
              ),
          ],
        ),
        body: patientAsync.when(
          data: (patient) {
            if (patient == null) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      Icons.person_outline_rounded,
                      size: 64,
                      color: colorScheme.outline,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'No patient profile found',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ],
                ),
              );
            }

            return SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: ConstrainedBox(
                  constraints: BoxConstraints(maxWidth: context.contentMaxWidth),
                  child: Form(
                    key: _formKey,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildSection(
                          context: context,
                          title: 'Personal Information',
                          icon: Icons.person_outline_rounded,
                          colorScheme: colorScheme,
                          children: [
                            _buildTextField(
                              controller: _firstNameController,
                              label: 'First Name',
                              icon: Icons.person_outline_rounded,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'First name is required';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              controller: _middleNameController,
                              label: 'Middle Name',
                              icon: Icons.person_outline_rounded,
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              controller: _lastNameController,
                              label: 'Last Name',
                              icon: Icons.person_outline_rounded,
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Last name is required';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              controller: _contactNumberController,
                              label: 'Phone Number',
                              icon: Icons.phone_outlined,
                              keyboardType: TextInputType.phone,
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              controller: _addressController,
                              label: 'Address',
                              icon: Icons.location_on_outlined,
                              maxLines: 2,
                            ),
                            const SizedBox(height: 16),
                            _buildDropdown(
                              label: 'Gender',
                              icon: Icons.wc_rounded,
                              value: _selectedGender,
                              items: const ['MALE', 'FEMALE', 'OTHER'],
                              onChanged: (value) {
                                setState(() {
                                  _selectedGender = value;
                                });
                              },
                            ),
                            const SizedBox(height: 16),
                            _buildDatePicker(
                              label: 'Date of Birth',
                              icon: Icons.calendar_today_outlined,
                              selectedDate: _selectedDateOfBirth,
                              onTap: _selectDateOfBirth,
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        _buildSection(
                          context: context,
                          title: 'Medical Information',
                          icon: Icons.medical_information_outlined,
                          colorScheme: colorScheme,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: _buildTextField(
                                    controller: _weightController,
                                    label: 'Weight (kg)',
                                    icon: Icons.monitor_weight_outlined,
                                    keyboardType: TextInputType.number,
                                  ),
                                ),
                                const SizedBox(width: 16),
                                Expanded(
                                  child: _buildTextField(
                                    controller: _heightController,
                                    label: 'Height (cm)',
                                    icon: Icons.height_outlined,
                                    keyboardType: TextInputType.number,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              controller: _bloodTypeController,
                              label: 'Blood Type',
                              icon: Icons.bloodtype_outlined,
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              controller: _allergiesController,
                              label: 'Allergies',
                              icon: Icons.warning_amber_rounded,
                              maxLines: 3,
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              controller: _medicationsController,
                              label: 'Current Medications',
                              icon: Icons.medication_outlined,
                              maxLines: 3,
                            ),
                            const SizedBox(height: 16),
                            _buildTextField(
                              controller: _medicalHistoryController,
                              label: 'Medical History',
                              icon: Icons.history_outlined,
                              maxLines: 4,
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        _buildSection(
                          context: context,
                          title: 'PhilHealth Information',
                          icon: Icons.credit_card_outlined,
                          colorScheme: colorScheme,
                          children: [
                            _buildTextField(
                              controller: _philHealthIdController,
                              label: 'PhilHealth ID',
                              icon: Icons.badge_outlined,
                            ),
                          ],
                        ),
                        const SizedBox(height: 32),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isSaving ? null : _saveProfile,
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(vertical: 16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            child: _isSaving
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Text(
                                    'Save Changes',
                                    style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                          ),
                        ),
                        const SizedBox(height: 100),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (error, stack) => Center(
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
                  'Failed to load profile',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                Text(
                  error.toString(),
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: () => ref.invalidate(currentPatientProvider),
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSection({
    required BuildContext context,
    required String title,
    required IconData icon,
    required ColorScheme colorScheme,
    required List<Widget> children,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, color: colorScheme.primary),
              const SizedBox(width: 12),
              Text(
                title,
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w700,
                  color: colorScheme.onSurface,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ...children,
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String label,
    required IconData icon,
    TextInputType? keyboardType,
    int maxLines = 1,
    String? Function(String?)? validator,
  }) {
    final colorScheme = Theme.of(context).colorScheme;

    return TextFormField(
      controller: controller,
      keyboardType: keyboardType,
      maxLines: maxLines,
      validator: validator,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: colorScheme.primary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        filled: true,
        fillColor: colorScheme.surface,
      ),
    );
  }

  Widget _buildDropdown({
    required String label,
    required IconData icon,
    required String? value,
    required List<String> items,
    required void Function(String?) onChanged,
  }) {
    final colorScheme = Theme.of(context).colorScheme;

    return DropdownButtonFormField<String>(
      value: value,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: colorScheme.primary),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        filled: true,
        fillColor: colorScheme.surface,
      ),
      items: items.map((item) {
        return DropdownMenuItem<String>(
          value: item,
          child: Text(item == 'MALE'
              ? 'Male'
              : item == 'FEMALE'
                  ? 'Female'
                  : 'Other'),
        );
      }).toList(),
      onChanged: onChanged,
    );
  }

  Widget _buildDatePicker({
    required String label,
    required IconData icon,
    required DateTime? selectedDate,
    required VoidCallback onTap,
  }) {
    final colorScheme = Theme.of(context).colorScheme;

    return InkWell(
      onTap: onTap,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: label,
          prefixIcon: Icon(icon, color: colorScheme.primary),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          filled: true,
          fillColor: colorScheme.surface,
          suffixIcon: const Icon(Icons.calendar_today_outlined),
        ),
        child: Text(
          selectedDate != null
              ? '${selectedDate.day}/${selectedDate.month}/${selectedDate.year}'
              : 'Select date of birth',
          style: TextStyle(
            color: selectedDate != null
                ? colorScheme.onSurface
                : colorScheme.onSurface.withValues(alpha: 0.5),
          ),
        ),
      ),
    );
  }
}
