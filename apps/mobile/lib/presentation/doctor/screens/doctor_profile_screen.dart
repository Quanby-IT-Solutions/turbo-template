import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/responsive/responsive_config.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/presentation/doctor/providers/doctor_providers.dart';
import 'package:mobile/domain/entities/doctor.dart';

class DoctorProfileScreen extends ConsumerWidget {
  const DoctorProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final doctorAsync = ref.watch(currentDoctorProvider);
    final colorScheme = Theme.of(context).colorScheme;

    return AnimatedNavWrapper(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('My Profile'),
          actions: [
            IconButton(
              icon: const Icon(Icons.refresh_rounded),
              onPressed: () {
                ref.invalidate(currentDoctorProvider);
              },
            ),
          ],
        ),
        body: doctorAsync.when(
          data: (doctor) {
            if (doctor == null) {
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
                      'No doctor profile found',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                  ],
                ),
              );
            }

            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(currentDoctorProvider);
              },
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Center(
                  child: ConstrainedBox(
                    constraints: BoxConstraints(maxWidth: context.contentMaxWidth),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildProfileCard(context, doctor, colorScheme),
                        const SizedBox(height: 24),
                        _buildPersonalInfoSection(context, doctor, colorScheme),
                        const SizedBox(height: 24),
                        _buildProfessionalInfoSection(context, doctor, colorScheme),
                        const SizedBox(height: 24),
                        _buildContactInfoSection(context, doctor, colorScheme),
                        if (doctor.organizationName != null) ...[
                          const SizedBox(height: 24),
                          _buildOrganizationSection(context, doctor, colorScheme),
                        ],
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
                  onPressed: () => ref.invalidate(currentDoctorProvider),
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
    Doctor doctor,
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
                  colorScheme.secondary.withValues(alpha: 0.12),
                ]
              : [
                  colorScheme.primary.withValues(alpha: 0.06),
                  colorScheme.secondary.withValues(alpha: 0.10),
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
              doctor.displayName
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
                  'Dr. ${doctor.displayName}',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  doctor.email,
                  style: TextStyle(
                    color: colorScheme.onSurface.withOpacity(0.7),
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: _getApprovalStatusColor(doctor.approvalStatus)
                        .withOpacity(0.12),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    doctor.approvalStatus == 'APPROVED'
                        ? 'Approved'
                        : doctor.approvalStatus == 'PENDING'
                            ? 'Pending Approval'
                            : 'Rejected',
                    style: TextStyle(
                      color: _getApprovalStatusColor(doctor.approvalStatus),
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
    Doctor doctor,
    ColorScheme colorScheme,
  ) {
    return _buildSection(
      context: context,
      title: 'Personal Information',
      icon: Icons.person_outline_rounded,
      colorScheme: colorScheme,
      children: [
        _buildInfoRow(context, 'Full Name', 'Dr. ${doctor.displayName}'),
        _buildInfoRow(context, 'Email', doctor.email),
        if (doctor.middleName != null && doctor.middleName!.isNotEmpty)
          _buildInfoRow(
            context,
            'Middle Name',
            doctor.middleName!,
          ),
      ],
    );
  }

  Widget _buildProfessionalInfoSection(
    BuildContext context,
    Doctor doctor,
    ColorScheme colorScheme,
  ) {
    return _buildSection(
      context: context,
      title: 'Professional Information',
      icon: Icons.badge_outlined,
      colorScheme: colorScheme,
      children: [
        _buildInfoRow(context, 'Specialization', doctor.specialization),
        _buildInfoRow(context, 'Qualifications', doctor.qualifications),
        _buildInfoRow(
          context,
          'Experience',
          '${doctor.experience} ${doctor.experience == 1 ? 'year' : 'years'}',
        ),
        _buildInfoRow(
          context,
          'Approval Status',
          doctor.approvalStatus == 'APPROVED'
              ? 'Approved'
              : doctor.approvalStatus == 'PENDING'
                  ? 'Pending'
                  : 'Rejected',
          isImportant: doctor.approvalStatus != 'APPROVED',
        ),
        if (doctor.approvalRejectionReason != null &&
            doctor.approvalRejectionReason!.isNotEmpty)
          _buildInfoRow(
            context,
            'Rejection Reason',
            doctor.approvalRejectionReason!,
            isImportant: true,
          ),
      ],
    );
  }

  Widget _buildContactInfoSection(
    BuildContext context,
    Doctor doctor,
    ColorScheme colorScheme,
  ) {
    return _buildSection(
      context: context,
      title: 'Contact Information',
      icon: Icons.contact_phone_outlined,
      colorScheme: colorScheme,
      children: [
        _buildInfoRow(context, 'Email', doctor.email),
        _buildInfoRow(
          context,
          'Phone',
          doctor.contactNumber.isNotEmpty
              ? doctor.contactNumber
              : 'Not provided',
        ),
      ],
    );
  }

  Widget _buildOrganizationSection(
    BuildContext context,
    Doctor doctor,
    ColorScheme colorScheme,
  ) {
    return _buildSection(
      context: context,
      title: 'Organization',
      icon: Icons.business_outlined,
      colorScheme: colorScheme,
      children: [
        if (doctor.organizationName != null)
          _buildInfoRow(context, 'Organization', doctor.organizationName!),
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

  Color _getApprovalStatusColor(String status) {
    switch (status) {
      case 'APPROVED':
        return Colors.green;
      case 'PENDING':
        return Colors.orange;
      case 'REJECTED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }
}
