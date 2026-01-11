import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/services/snackbar_service.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/core/responsive/responsive_config.dart';

// Prescription model for dummy data
class Prescription {
  final String id;
  final String medication;
  final String dosage;
  final String frequency;
  final String doctorName;
  final DateTime prescribedDate;
  final DateTime expiryDate;
  final String instructions;
  final bool isActive;

  Prescription({
    required this.id,
    required this.medication,
    required this.dosage,
    required this.frequency,
    required this.doctorName,
    required this.prescribedDate,
    required this.expiryDate,
    required this.instructions,
    required this.isActive,
  });
}

class PrescriptionsScreen extends StatefulWidget {
  const PrescriptionsScreen({super.key});

  @override
  State<PrescriptionsScreen> createState() => _PrescriptionsScreenState();
}

class _PrescriptionsScreenState extends State<PrescriptionsScreen> {
  // Dummy prescription data
  late List<Prescription> _prescriptions;

  @override
  void initState() {
    super.initState();
    _prescriptions = [
      Prescription(
        id: '1',
        medication: 'Amoxicillin',
        dosage: '500mg',
        frequency: '3 times daily',
        doctorName: 'Dr. Sarah Johnson',
        prescribedDate: DateTime.now().subtract(const Duration(days: 5)),
        expiryDate: DateTime.now().add(const Duration(days: 9)),
        instructions: 'Take with food. Complete the full course.',
        isActive: true,
      ),
      Prescription(
        id: '2',
        medication: 'Lisinopril',
        dosage: '10mg',
        frequency: 'Once daily',
        doctorName: 'Dr. Michael Chen',
        prescribedDate: DateTime.now().subtract(const Duration(days: 30)),
        expiryDate: DateTime.now().add(const Duration(days: 335)),
        instructions: 'Take in the morning. Monitor blood pressure.',
        isActive: true,
      ),
      Prescription(
        id: '3',
        medication: 'Metformin',
        dosage: '850mg',
        frequency: 'Twice daily',
        doctorName: 'Dr. Emily Rodriguez',
        prescribedDate: DateTime.now().subtract(const Duration(days: 60)),
        expiryDate: DateTime.now().add(const Duration(days: 305)),
        instructions: 'Take with meals. Monitor blood glucose.',
        isActive: true,
      ),
      Prescription(
        id: '4',
        medication: 'Ibuprofen',
        dosage: '400mg',
        frequency: 'As needed',
        doctorName: 'Dr. Sarah Johnson',
        prescribedDate: DateTime.now().subtract(const Duration(days: 90)),
        expiryDate: DateTime.now().subtract(const Duration(days: 5)),
        instructions: 'Take for pain relief. Maximum 3 times daily.',
        isActive: false,
      ),
      Prescription(
        id: '5',
        medication: 'Atorvastatin',
        dosage: '20mg',
        frequency: 'Once daily',
        doctorName: 'Dr. Michael Chen',
        prescribedDate: DateTime.now().subtract(const Duration(days: 120)),
        expiryDate: DateTime.now().add(const Duration(days: 245)),
        instructions: 'Take at bedtime. Monitor cholesterol levels.',
        isActive: true,
      ),
    ];
  }

  void _deletePrescription(int index) {
    final deletedPrescription = _prescriptions[index];
    final deletedIndex = index;

    setState(() {
      _prescriptions.removeAt(index);
    });

    if (mounted) {
      SnackbarService.showDeleteWithUndo(
        context: context,
        itemName: deletedPrescription.medication,
        title: 'Prescription Deleted',
        onUndo: () {
          setState(() {
            _prescriptions.insert(deletedIndex, deletedPrescription);
          });
        },
      );
    }
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }

  Color _getStatusColor(Prescription prescription) {
    if (!prescription.isActive) {
      return Colors.grey;
    }
    if (prescription.expiryDate.isBefore(DateTime.now())) {
      return Colors.red;
    }
    if (prescription.expiryDate.isBefore(
      DateTime.now().add(const Duration(days: 7)),
    )) {
      return Colors.orange;
    }
    return Colors.green;
  }

  String _getStatusText(Prescription prescription) {
    if (!prescription.isActive) {
      return 'Inactive';
    }
    if (prescription.expiryDate.isBefore(DateTime.now())) {
      return 'Expired';
    }
    if (prescription.expiryDate.isBefore(
      DateTime.now().add(const Duration(days: 7)),
    )) {
      return 'Expiring Soon';
    }
    return 'Active';
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedNavWrapper(
      child: Column(
        children: [
          AppBar(
            title: Text(
              'My Prescriptions',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontSize: 22,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.3,
              ),
            ),
            elevation: 0,
            backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
            leading: IconButton(
              icon: Icon(
                Icons.arrow_back_ios_rounded,
                color: Theme.of(context).colorScheme.primary,
              ),
              onPressed: () {
                if (Navigator.of(context).canPop()) {
                  Navigator.of(context).pop();
                } else {
                  context.go('/patient-home');
                }
              },
            ),
            actions: [
              Container(
                margin: const EdgeInsets.only(right: 8),
                child: IconButton(
                  icon: Icon(
                    Icons.filter_list_rounded,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  style: IconButton.styleFrom(
                    backgroundColor: Theme.of(context)
                        .colorScheme
                        .primary
                        .withValues(alpha: 0.1),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  onPressed: () {
                    // Future: Add filter functionality
                  },
                ),
              ),
            ],
          ),
          Expanded(
            child: _prescriptions.isEmpty
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: Theme.of(context)
                                  .colorScheme
                                  .secondary
                                  .withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: Theme.of(context)
                                    .colorScheme
                                    .secondary
                                    .withValues(alpha: 0.18),
                                width: 1.8,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Theme.of(context)
                                      .colorScheme
                                      .secondary
                                      .withValues(alpha: 0.06),
                                  offset: const Offset(0, 4),
                                  blurRadius: 16,
                                  spreadRadius: 0,
                                ),
                              ],
                            ),
                            child: Icon(
                              Icons.medication_outlined,
                              size: 64,
                              color: Theme.of(context).colorScheme.secondary,
                            ),
                          ),
                          const SizedBox(height: 32),
                          Text(
                            'No Prescriptions',
                            style: TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                              color: Theme.of(context).colorScheme.onSurface,
                              letterSpacing: -0.3,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Your prescriptions will appear here',
                            style: TextStyle(
                              fontSize: 14,
                              color: Theme.of(context)
                                  .colorScheme
                                  .onSurface
                                  .withValues(alpha: 0.6),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                : CustomScrollView(
                    slivers: [
                      SliverPadding(
                        padding: const EdgeInsets.all(24),
                        sliver: SliverList(
                          delegate: SliverChildListDelegate([
                            Center(
                              child: ConstrainedBox(
                                constraints: BoxConstraints(
                                  maxWidth: context.contentMaxWidth,
                                ),
                                child: ListView.builder(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  itemCount: _prescriptions.length,
                                  itemBuilder: (context, index) {
                                    final prescription = _prescriptions[index];
                                    return Dismissible(
                                      key: Key(prescription.id),
                                      direction: DismissDirection.endToStart,
                                      onDismissed: (direction) =>
                                          _deletePrescription(index),
                                      background: Container(
                                        alignment: Alignment.centerRight,
                                        padding: const EdgeInsets.only(right: 20),
                                        margin: const EdgeInsets.only(bottom: 16),
                                        decoration: BoxDecoration(
                                          color: Colors.red,
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: const Icon(
                                          Icons.delete_rounded,
                                          color: Colors.white,
                                          size: 32,
                                        ),
                                      ),
                                      child: Container(
                                        margin: const EdgeInsets.only(bottom: 16),
                                        decoration: BoxDecoration(
                                          color: Theme.of(context)
                                              .colorScheme
                                              .surfaceContainerLow,
                                          borderRadius: BorderRadius.circular(20),
                                          border: Border.all(
                                            color: _getStatusColor(
                                              prescription,
                                            ).withValues(alpha: 0.18),
                                            width: 1.8,
                                          ),
                                          boxShadow: [
                                            BoxShadow(
                                              color: Theme.of(context)
                                                  .colorScheme
                                                  .shadow
                                                  .withValues(alpha: 0.06),
                                              offset: const Offset(0, 4),
                                              blurRadius: 16,
                                              spreadRadius: 0,
                                            ),
                                          ],
                                        ),
                                        child: Material(
                                          color: Colors.transparent,
                                          child: InkWell(
                                            onTap: () =>
                                                _showPrescriptionDetails(prescription),
                                            borderRadius: BorderRadius.circular(20),
                                            child: Padding(
                                              padding: const EdgeInsets.all(20),
                                              child: Column(
                                                crossAxisAlignment:
                                                    CrossAxisAlignment.start,
                                                children: [
                                                  Row(
                                                    children: [
                                                      Expanded(
                                                        child: Column(
                                                          crossAxisAlignment:
                                                              CrossAxisAlignment.start,
                                                          children: [
                                                            Text(
                                                              prescription.medication,
                                                              style: TextStyle(
                                                                fontSize: 18,
                                                                fontWeight: FontWeight.w700,
                                                                color: Theme.of(context)
                                                                    .colorScheme
                                                                    .onSurface,
                                                                letterSpacing: -0.2,
                                                              ),
                                                            ),
                                                            const SizedBox(height: 4),
                                                            Text(
                                                              '${prescription.dosage} - ${prescription.frequency}',
                                                              style: TextStyle(
                                                                fontSize: 14,
                                                                color: Theme.of(context)
                                                                    .colorScheme
                                                                    .onSurface
                                                                    .withValues(alpha: 0.6),
                                                                fontWeight: FontWeight.w500,
                                                              ),
                                                            ),
                                                          ],
                                                        ),
                                                      ),
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(
                                                          horizontal: 10,
                                                          vertical: 6,
                                                        ),
                                                        decoration: BoxDecoration(
                                                          color: _getStatusColor(
                                                            prescription,
                                                          ).withValues(alpha: 0.1),
                                                          borderRadius:
                                                              BorderRadius.circular(8),
                                                          border: Border.all(
                                                            color: _getStatusColor(
                                                              prescription,
                                                            ).withValues(alpha: 0.3),
                                                          ),
                                                        ),
                                                        child: Text(
                                                          _getStatusText(prescription),
                                                          style: TextStyle(
                                                            color:
                                                                _getStatusColor(prescription),
                                                            fontWeight: FontWeight.w700,
                                                            fontSize: 10,
                                                            letterSpacing: 0.5,
                                                          ),
                                                        ),
                                                      ),
                                                    ],
                                                  ),
                                                  const SizedBox(height: 16),
                                                  Container(
                                                    padding: const EdgeInsets.all(12),
                                                    decoration: BoxDecoration(
                                                      color: Theme.of(context)
                                                          .colorScheme
                                                          .surfaceContainerHighest
                                                          .withValues(alpha: 0.5),
                                                      borderRadius:
                                                          BorderRadius.circular(12),
                                                    ),
                                                    child: Column(
                                                      children: [
                                                        Row(
                                                          children: [
                                                            Icon(
                                                              Icons.person_rounded,
                                                              size: 16,
                                                              color: Theme.of(context)
                                                                  .colorScheme
                                                                  .primary,
                                                            ),
                                                            const SizedBox(width: 8),
                                                            Expanded(
                                                              child: Text(
                                                                prescription.doctorName,
                                                                style: TextStyle(
                                                                  fontSize: 14,
                                                                  fontWeight:
                                                                      FontWeight.w500,
                                                                  color: Theme.of(context)
                                                                      .colorScheme
                                                                      .onSurface,
                                                                ),
                                                              ),
                                                            ),
                                                          ],
                                                        ),
                                                        const SizedBox(height: 8),
                                                        Row(
                                                          children: [
                                                            Icon(
                                                              Icons
                                                                  .calendar_today_rounded,
                                                              size: 16,
                                                              color: Theme.of(context)
                                                                  .colorScheme
                                                                  .primary,
                                                            ),
                                                            const SizedBox(width: 8),
                                                            Expanded(
                                                              child: Text(
                                                                'Prescribed: ${_formatDate(prescription.prescribedDate)}',
                                                                style: TextStyle(
                                                                  fontSize: 13,
                                                                  color: Theme.of(context)
                                                                      .colorScheme
                                                                      .onSurface
                                                                      .withValues(alpha: 0.7),
                                                                ),
                                                              ),
                                                            ),
                                                            Text(
                                                              'Expires: ${_formatDate(prescription.expiryDate)}',
                                                              style: TextStyle(
                                                                fontSize: 13,
                                                                fontWeight:
                                                                    FontWeight.w600,
                                                                color: _getStatusColor(
                                                                  prescription,
                                                                ),
                                                              ),
                                                            ),
                                                          ],
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                  if (prescription
                                                      .instructions.isNotEmpty) ...[
                                                    const SizedBox(height: 12),
                                                    Container(
                                                      padding: const EdgeInsets.all(12),
                                                      decoration: BoxDecoration(
                                                        color: Colors.blue
                                                            .withValues(alpha: 0.1),
                                                        borderRadius:
                                                            BorderRadius.circular(12),
                                                        border: Border.all(
                                                          color: Colors.blue
                                                              .withValues(alpha: 0.2),
                                                        ),
                                                      ),
                                                      child: Row(
                                                        crossAxisAlignment:
                                                            CrossAxisAlignment.start,
                                                        children: [
                                                          Icon(
                                                            Icons.info_outline_rounded,
                                                            size: 18,
                                                            color: Colors.blue[700],
                                                          ),
                                                          const SizedBox(width: 8),
                                                          Expanded(
                                                            child: Text(
                                                              prescription.instructions,
                                                              style: TextStyle(
                                                                fontSize: 13,
                                                                color: Colors.blue[900],
                                                                height: 1.4,
                                                              ),
                                                            ),
                                                          ),
                                                        ],
                                                      ),
                                                    ),
                                                  ],
                                                ],
                                              ),
                                            ),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                            ),
                          ]),
                        ),
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  void _showPrescriptionDetails(Prescription prescription) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(prescription.medication),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildDetailRow('Dosage', prescription.dosage),
            _buildDetailRow('Frequency', prescription.frequency),
            _buildDetailRow('Doctor', prescription.doctorName),
            _buildDetailRow(
              'Prescribed',
              _formatDate(prescription.prescribedDate),
            ),
            _buildDetailRow('Expires', _formatDate(prescription.expiryDate)),
            _buildDetailRow('Status', _getStatusText(prescription)),
            const SizedBox(height: 12),
            const Text(
              'Instructions:',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(prescription.instructions),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              '$label:',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}
