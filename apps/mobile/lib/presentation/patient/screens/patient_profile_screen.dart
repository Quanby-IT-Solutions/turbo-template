import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/responsive/responsive_config.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/presentation/patient/providers/patient_providers.dart';
import 'package:mobile/domain/entities/patient.dart';

class PatientProfileScreen extends ConsumerWidget {
  const PatientProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final patientAsync = ref.watch(currentPatientProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return AnimatedNavWrapper(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('My Profile'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: () {
                ref.invalidate(currentPatientProvider);
              },
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

            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(currentPatientProvider);
              },
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: context.contentMaxWidth),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildProfileCard(context, patient, colorScheme),
                        const SizedBox(height: 24),
                        _buildPersonalInfoSection(context, patient, colorScheme),
                        const SizedBox(height: 24),
                        _buildMedicalInfoSection(context, patient, colorScheme),
                        const SizedBox(height: 24),
                        _buildContactInfoSection(context, patient, colorScheme),
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

  Widget _buildProfileCard(
    BuildContext context,
    Patient patient,
    ColorScheme colorScheme,
  ) {
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: isDark
              ? [
                  colorScheme.primary.withValues(alpha: 0.08),
                  colorScheme.primary.withValues(alpha: 0.12),
                ]
              : [
                  colorScheme.primary.withValues(alpha: 0.06),
                  colorScheme.primary.withValues(alpha: 0.10),
                ],
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: colorScheme.primary.withValues(alpha: isDark ? 0.2 : 0.18),
          width: 1.8,
        ),
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 40,
            backgroundColor: colorScheme.primary,
            child: Text(
              patient.displayName
                  .split(' ')
                  .where((part) => part.isNotEmpty)
                  .map((part) => part[0])
                  .take(2)
                  .join()
                  .toUpperCase(),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 24,
              ),
            ),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  patient.displayName,
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  patient.email,
                  style: TextStyle(
                    color: colorScheme.onSurface.withOpacity(0.7),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getStatusColor(patient.verificationStatus)
                        .withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    patient.verificationStatus == 'VERIFIED'
                        ? 'Verified'
                        : patient.verificationStatus == 'PENDING'
                            ? 'Pending Verification'
                            : 'Not Verified',
                    style: TextStyle(
                      color: _getStatusColor(patient.verificationStatus),
                      fontWeight: FontWeight.w600,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPersonalInfoSection(
    BuildContext context,
    Patient patient,
    ColorScheme colorScheme,
  ) {
    return _buildSection(
      context: context,
      title: 'Personal Information',
      icon: Icons.person_outline_rounded,
      colorScheme: colorScheme,
      children: [
        _buildInfoRow(context, 'Full Name', patient.displayName),
        _buildInfoRow(context, 'Age', '${patient.age} years'),
        _buildInfoRow(
          context,
          'Date of Birth',
          _formatDate(patient.dateOfBirth),
        ),
        _buildInfoRow(
          context,
          'Gender',
          patient.gender == 'MALE'
              ? 'Male'
              : patient.gender == 'FEMALE'
                  ? 'Female'
                  : 'Other',
        ),
        if (patient.philHealthId != null && patient.philHealthId!.isNotEmpty)
          _buildInfoRow(context, 'PhilHealth ID', patient.philHealthId!),
      ],
    );
  }

  Widget _buildMedicalInfoSection(
    BuildContext context,
    Patient patient,
    ColorScheme colorScheme,
  ) {
    return _buildSection(
      context: context,
      title: 'Medical Information',
      icon: Icons.medical_information_outlined,
      colorScheme: colorScheme,
      children: [
        _buildInfoRow(
          context,
          'Blood Type',
          patient.bloodType.isNotEmpty ? patient.bloodType : 'Not specified',
        ),
        _buildInfoRow(
          context,
          'Height',
          patient.height > 0 ? '${patient.height.toStringAsFixed(1)} cm' : 'Not specified',
        ),
        _buildInfoRow(
          context,
          'Weight',
          patient.weight > 0 ? '${patient.weight.toStringAsFixed(1)} kg' : 'Not specified',
        ),
        if (patient.allergies != null && patient.allergies!.isNotEmpty)
          _buildInfoRow(
            context,
            'Allergies',
            patient.allergies!,
            isImportant: true,
          ),
        if (patient.medications != null && patient.medications!.isNotEmpty)
          _buildInfoRow(context, 'Current Medications', patient.medications!),
        if (patient.medicalHistory != null &&
            patient.medicalHistory!.isNotEmpty)
          _buildInfoRow(context, 'Medical History', patient.medicalHistory!),
      ],
    );
  }

  Widget _buildContactInfoSection(
    BuildContext context,
    Patient patient,
    ColorScheme colorScheme,
  ) {
    return _buildSection(
      context: context,
      title: 'Contact Information',
      icon: Icons.contact_phone_outlined,
      colorScheme: colorScheme,
      children: [
        _buildInfoRow(context, 'Email', patient.email),
        _buildInfoRow(
          context,
          'Phone',
          patient.contactNumber.isNotEmpty
              ? patient.contactNumber
              : 'Not provided',
        ),
        _buildInfoRow(
          context,
          'Address',
          patient.address.isNotEmpty ? patient.address : 'Not provided',
        ),
      ],
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

  Widget _buildInfoRow(
    BuildContext context,
    String label,
    String value, {
    bool isImportant = false,
  }) {
    final colorScheme = Theme.of(context).colorScheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 140,
            child: Text(
              label,
              style: TextStyle(
                color: colorScheme.onSurface.withOpacity(0.7),
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                color: isImportant
                    ? colorScheme.error
                    : colorScheme.onSurface,
                fontWeight: isImportant ? FontWeight.w600 : FontWeight.normal,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'VERIFIED':
        return Colors.green;
      case 'PENDING':
        return Colors.orange;
      case 'REJECTED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
