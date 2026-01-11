import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/constants/app_constants.dart';
import 'package:mobile/core/services/http_service.dart';
import 'package:mobile/core/services/toast_service.dart';

class ConsultationNotesScreen extends StatefulWidget {
  final String? consultationId;

  const ConsultationNotesScreen({super.key, this.consultationId});

  @override
  State<ConsultationNotesScreen> createState() =>
      _ConsultationNotesScreenState();
}

class _ConsultationNotesScreenState extends State<ConsultationNotesScreen> {
  final _notesController = TextEditingController();
  final _diagnosisController = TextEditingController();
  final _recommendationsController = TextEditingController();
  final _followUpController = TextEditingController();

  bool _isUrgent = false;
  String _selectedSeverity = 'Normal';
  final List<String> _prescriptions = [];
  final List<String> _labRequests = [];

  @override
  void dispose() {
    _notesController.dispose();
    _diagnosisController.dispose();
    _recommendationsController.dispose();
    _followUpController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Consultation Notes'),
        backgroundColor: Colors.blue.shade700,
        foregroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: _saveNotes,
            child: const Text(
              'SAVE',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(AppConstants.defaultPadding),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Patient Info Card
            Card(
              color: Colors.blue.shade50,
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: Colors.blue.shade700,
                      child: const Icon(Icons.person, color: Colors.white),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Sarah Johnson',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 18,
                            ),
                          ),
                          Text(
                            'Patient ID: PAT001 • Age: 32',
                            style: TextStyle(color: Colors.blue.shade600),
                          ),
                          Text(
                            'Consultation: ${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year} ${DateTime.now().hour}:${DateTime.now().minute.toString().padLeft(2, '0')}',
                            style: TextStyle(color: Colors.blue.shade600),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.green,
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: const Text(
                        'COMPLETED',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 24),

            // Chief Complaint & Symptoms
            _buildSection(
              'Chief Complaint & Symptoms',
              _notesController,
              'Enter patient\'s main complaint and observed symptoms...',
              maxLines: 4,
            ),

            const SizedBox(height: 16),

            // Assessment & Diagnosis
            _buildSection(
              'Assessment & Diagnosis',
              _diagnosisController,
              'Enter your clinical assessment and diagnosis...',
              maxLines: 3,
            ),

            const SizedBox(height: 16),

            // Severity & Urgency
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Condition Assessment',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 12),

                    Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Severity Level'),
                              const SizedBox(height: 8),
                              DropdownButtonFormField<String>(
                                initialValue: _selectedSeverity,
                                decoration: const InputDecoration(
                                  border: OutlineInputBorder(),
                                  contentPadding: EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                ),
                                items:
                                    [
                                          'Normal',
                                          'Mild',
                                          'Moderate',
                                          'Severe',
                                          'Critical',
                                        ]
                                        .map(
                                          (severity) => DropdownMenuItem(
                                            value: severity,
                                            child: Text(severity),
                                          ),
                                        )
                                        .toList(),
                                onChanged: (value) {
                                  setState(() {
                                    _selectedSeverity = value!;
                                  });
                                },
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Urgent Follow-up'),
                              const SizedBox(height: 8),
                              SwitchListTile(
                                title: Text(
                                  _isUrgent ? 'Required' : 'Not Required',
                                ),
                                value: _isUrgent,
                                onChanged: (value) {
                                  setState(() {
                                    _isUrgent = value;
                                  });
                                },
                                contentPadding: EdgeInsets.zero,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Treatment Recommendations
            _buildSection(
              'Treatment & Recommendations',
              _recommendationsController,
              'Enter treatment plan and recommendations for the patient...',
              maxLines: 4,
            ),

            const SizedBox(height: 16),

            // Prescriptions Section
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Prescriptions',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        OutlinedButton.icon(
                          onPressed: _addPrescription,
                          icon: const Icon(Icons.add),
                          label: const Text('Add'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (_prescriptions.isEmpty)
                      const Text(
                        'No prescriptions added',
                        style: TextStyle(color: Colors.grey),
                      )
                    else
                      Column(
                        children: _prescriptions.asMap().entries.map((entry) {
                          return ListTile(
                            leading: const Icon(Icons.medication),
                            title: Text(entry.value),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete, color: Colors.red),
                              onPressed: () {
                                setState(() {
                                  _prescriptions.removeAt(entry.key);
                                });
                              },
                            ),
                          );
                        }).toList(),
                      ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Lab Requests Section
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Lab Requests',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        OutlinedButton.icon(
                          onPressed: _addLabRequest,
                          icon: const Icon(Icons.add),
                          label: const Text('Add'),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (_labRequests.isEmpty)
                      const Text(
                        'No lab requests added',
                        style: TextStyle(color: Colors.grey),
                      )
                    else
                      Column(
                        children: _labRequests.asMap().entries.map((entry) {
                          return ListTile(
                            leading: const Icon(Icons.science),
                            title: Text(entry.value),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete, color: Colors.red),
                              onPressed: () {
                                setState(() {
                                  _labRequests.removeAt(entry.key);
                                });
                              },
                            ),
                          );
                        }).toList(),
                      ),
                  ],
                ),
              ),
            ),

            const SizedBox(height: 16),

            // Follow-up Instructions
            _buildSection(
              'Follow-up Instructions',
              _followUpController,
              'Enter follow-up instructions and next appointment details...',
              maxLines: 3,
            ),

            const SizedBox(height: 32),

            // Action Buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.cancel),
                    label: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _saveNotes,
                    icon: const Icon(Icons.save),
                    label: const Text('Save Notes'),
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(
    String title,
    TextEditingController controller,
    String hint, {
    int maxLines = 1,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: controller,
              maxLines: maxLines,
              decoration: InputDecoration(
                hintText: hint,
                border: const OutlineInputBorder(),
                contentPadding: const EdgeInsets.all(12),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _addPrescription() {
    showDialog(
      context: context,
      builder: (context) {
        final controller = TextEditingController();
        return AlertDialog(
          title: const Text('Add Prescription'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: controller,
                decoration: const InputDecoration(
                  labelText: 'Medication & Dosage',
                  hintText: 'e.g., Amoxicillin 500mg - Take twice daily',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                if (controller.text.isNotEmpty) {
                  setState(() {
                    _prescriptions.add(controller.text);
                  });
                  Navigator.pop(context);
                }
              },
              child: const Text('Add'),
            ),
          ],
        );
      },
    );
  }

  void _addLabRequest() {
    showDialog(
      context: context,
      builder: (context) {
        String selectedTest = 'Complete Blood Count (CBC)';
        final tests = [
          'Complete Blood Count (CBC)',
          'Basic Metabolic Panel',
          'Lipid Panel',
          'Thyroid Function Tests',
          'Liver Function Tests',
          'Urinalysis',
          'Chest X-Ray',
          'ECG',
          'Blood Glucose',
          'Hemoglobin A1C',
        ];

        return AlertDialog(
          title: const Text('Add Lab Request'),
          content: StatefulBuilder(
            builder: (context, setState) => Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<String>(
                  initialValue: selectedTest,
                  decoration: const InputDecoration(
                    labelText: 'Lab Test',
                    border: OutlineInputBorder(),
                  ),
                  items: tests
                      .map(
                        (test) =>
                            DropdownMenuItem(value: test, child: Text(test)),
                      )
                      .toList(),
                  onChanged: (value) {
                    setState(() {
                      selectedTest = value!;
                    });
                  },
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _labRequests.add(selectedTest);
                });
                Navigator.pop(context);
              },
              child: const Text('Add'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _saveNotes() async {
    if (widget.consultationId == null) {
      ToastService.showError(
        context: context,
        title: 'Error',
        description: 'Consultation ID is required',
      );
      return;
    }

    try {
      // Save notes to backend
      await HttpService.updateConsultation(
        consultationId: widget.consultationId!,
        notes: _notesController.text.trim().isNotEmpty
            ? _notesController.text.trim()
            : null,
        diagnosis: _diagnosisController.text.trim().isNotEmpty
            ? _diagnosisController.text.trim()
            : null,
        treatment: _recommendationsController.text.trim().isNotEmpty
            ? _recommendationsController.text.trim()
            : null,
        followUpDate: _followUpController.text.trim().isNotEmpty
            ? _followUpController.text.trim()
            : null,
        status: 'COMPLETED', // Mark consultation as completed
      );

      if (mounted) {
        ToastService.showMedicalSuccess(
          context: context,
          title: 'Consultation Notes Saved',
          description: 'All notes have been saved successfully.',
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
    }
  }
}
