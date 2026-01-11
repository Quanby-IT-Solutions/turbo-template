import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_constants.dart';
import 'package:mobile/core/services/toast_service.dart';

class LabRequestScreen extends StatefulWidget {
  const LabRequestScreen({super.key});

  @override
  State<LabRequestScreen> createState() => _LabRequestScreenState();
}

class _LabRequestScreenState extends State<LabRequestScreen> {
  final _notesController = TextEditingController();
  final _reasonController = TextEditingController();
  final List<Map<String, dynamic>> _selectedTests = [];
  String _urgencyLevel = 'Routine';
  String _selectedCategory = 'All';

  final List<Map<String, dynamic>> _labTests = [
    {
      'name': 'Complete Blood Count (CBC)',
      'code': 'CBC',
      'category': 'Hematology',
      'description': 'Measures different blood cells',
    },
    {
      'name': 'Basic Metabolic Panel',
      'code': 'BMP',
      'category': 'Chemistry',
      'description': 'Tests kidney function, blood sugar, electrolytes',
    },
    {
      'name': 'Comprehensive Metabolic Panel',
      'code': 'CMP',
      'category': 'Chemistry',
      'description': 'Extended panel including liver function',
    },
    {
      'name': 'Lipid Panel',
      'code': 'LIPID',
      'category': 'Chemistry',
      'description': 'Cholesterol and triglycerides',
    },
    {
      'name': 'Thyroid Stimulating Hormone',
      'code': 'TSH',
      'category': 'Endocrine',
      'description': 'Thyroid function test',
    },
    {
      'name': 'Free T4',
      'code': 'FT4',
      'category': 'Endocrine',
      'description': 'Thyroid hormone level',
    },
    {
      'name': 'Hemoglobin A1C',
      'code': 'HBA1C',
      'category': 'Chemistry',
      'description': 'Average blood sugar over 3 months',
    },
    {
      'name': 'Prothrombin Time',
      'code': 'PT',
      'category': 'Coagulation',
      'description': 'Blood clotting test',
    },
    {
      'name': 'Partial Thromboplastin Time',
      'code': 'PTT',
      'category': 'Coagulation',
      'description': 'Blood clotting pathway test',
    },
    {
      'name': 'Urinalysis',
      'code': 'UA',
      'category': 'Microbiology',
      'description': 'Urine examination',
    },
    {
      'name': 'Blood Culture',
      'code': 'BC',
      'category': 'Microbiology',
      'description': 'Detects bacteria in blood',
    },
    {
      'name': 'C-Reactive Protein',
      'code': 'CRP',
      'category': 'Immunology',
      'description': 'Inflammation marker',
    },
    {
      'name': 'Erythrocyte Sedimentation Rate',
      'code': 'ESR',
      'category': 'Hematology',
      'description': 'Inflammation indicator',
    },
    {
      'name': 'Vitamin D',
      'code': 'VIT_D',
      'category': 'Chemistry',
      'description': 'Vitamin D level',
    },
    {
      'name': 'Vitamin B12',
      'code': 'B12',
      'category': 'Chemistry',
      'description': 'Vitamin B12 level',
    },
  ];

  final List<String> _categories = [
    'All',
    'Hematology',
    'Chemistry',
    'Endocrine',
    'Coagulation',
    'Microbiology',
    'Immunology',
  ];
  final List<String> _urgencyLevels = ['Routine', 'Urgent', 'STAT'];

  List<Map<String, dynamic>> get _filteredTests {
    if (_selectedCategory == 'All') {
      return _labTests;
    }
    return _labTests
        .where((test) => test['category'] == _selectedCategory)
        .toList();
  }

  @override
  void dispose() {
    _notesController.dispose();
    _reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Lab Request'),
        backgroundColor: Colors.purple.shade700,
        foregroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: _selectedTests.isNotEmpty ? _submitRequest : null,
            child: const Text(
              'SUBMIT',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Patient Info & Request Details
          Container(
            padding: const EdgeInsets.all(AppConstants.defaultPadding),
            color: Colors.purple.shade50,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Lab Request Details',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 16),

                // Patient Info
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Patient:',
                            style: TextStyle(fontWeight: FontWeight.w500),
                          ),
                          const Text('Sarah Johnson'),
                          const Text('DOB: 01/15/1991'),
                          const Text('MRN: PAT001'),
                        ],
                      ),
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Ordering Physician:',
                            style: TextStyle(fontWeight: FontWeight.w500),
                          ),
                          const Text('Dr. Michael Wilson'),
                          Text(
                            'Date: ${DateTime.now().day}/${DateTime.now().month}/${DateTime.now().year}',
                          ),
                        ],
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16),

                // Urgency Level
                Row(
                  children: [
                    const Text(
                      'Urgency: ',
                      style: TextStyle(fontWeight: FontWeight.w500),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        initialValue: _urgencyLevel,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 8,
                          ),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        items: _urgencyLevels
                            .map(
                              (level) => DropdownMenuItem(
                                value: level,
                                child: Row(
                                  children: [
                                    Icon(
                                      _getUrgencyIcon(level),
                                      color: _getUrgencyColor(level),
                                      size: 16,
                                    ),
                                    const SizedBox(width: 8),
                                    Text(level),
                                  ],
                                ),
                              ),
                            )
                            .toList(),
                        onChanged: (value) {
                          setState(() {
                            _urgencyLevel = value!;
                          });
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Category Filter
          Container(
            padding: const EdgeInsets.symmetric(
              horizontal: AppConstants.defaultPadding,
              vertical: 8,
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: _categories.map((category) {
                  final isSelected = _selectedCategory == category;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(category),
                      selected: isSelected,
                      onSelected: (selected) {
                        setState(() {
                          _selectedCategory = category;
                        });
                      },
                    ),
                  );
                }).toList(),
              ),
            ),
          ),

          // Selected Tests
          if (_selectedTests.isNotEmpty)
            Container(
              padding: const EdgeInsets.symmetric(
                horizontal: AppConstants.defaultPadding,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Selected Tests (${_selectedTests.length})',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: _selectedTests.map((test) {
                      return Chip(
                        label: Text(test['code']),
                        deleteIcon: const Icon(Icons.close),
                        onDeleted: () {
                          setState(() {
                            _selectedTests.remove(test);
                          });
                        },
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),

          // Available Tests
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(
                horizontal: AppConstants.defaultPadding,
              ),
              itemCount: _filteredTests.length,
              itemBuilder: (context, index) {
                final test = _filteredTests[index];
                final isSelected = _selectedTests.contains(test);

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: _getCategoryColor(test['category']),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        test['code'],
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(
                      test['name'],
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                    subtitle: Text(
                      test['description'],
                      style: const TextStyle(color: Colors.grey),
                    ),
                    trailing: isSelected
                        ? const Icon(Icons.check_circle, color: Colors.green)
                        : const Icon(Icons.add_circle_outline),
                    onTap: () {
                      setState(() {
                        if (isSelected) {
                          _selectedTests.remove(test);
                        } else {
                          _selectedTests.add(test);
                        }
                      });
                    },
                  ),
                );
              },
            ),
          ),

          // Clinical Reason & Notes
          Container(
            padding: const EdgeInsets.all(AppConstants.defaultPadding),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Clinical Reason',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _reasonController,
                  decoration: const InputDecoration(
                    hintText: 'Clinical indication for laboratory testing...',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Additional Notes',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _notesController,
                  decoration: const InputDecoration(
                    hintText:
                        'Special instructions or additional information...',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 2,
                ),
              ],
            ),
          ),

          // Action Buttons
          Padding(
            padding: const EdgeInsets.all(AppConstants.defaultPadding),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Cancel'),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: ElevatedButton(
                    onPressed: _selectedTests.isNotEmpty
                        ? _submitRequest
                        : null,
                    child: const Text('Submit Request'),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Color _getCategoryColor(String category) {
    switch (category.toLowerCase()) {
      case 'hematology':
        return Colors.red;
      case 'chemistry':
        return Colors.blue;
      case 'endocrine':
        return Colors.green;
      case 'coagulation':
        return Colors.orange;
      case 'microbiology':
        return Colors.purple;
      case 'immunology':
        return Colors.teal;
      default:
        return Colors.grey;
    }
  }

  IconData _getUrgencyIcon(String urgency) {
    switch (urgency.toLowerCase()) {
      case 'routine':
        return Icons.schedule;
      case 'urgent':
        return Icons.warning;
      case 'stat':
        return Icons.priority_high;
      default:
        return Icons.schedule;
    }
  }

  Color _getUrgencyColor(String urgency) {
    switch (urgency.toLowerCase()) {
      case 'routine':
        return Colors.green;
      case 'urgent':
        return Colors.orange;
      case 'stat':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  void _submitRequest() {
    if (_reasonController.text.isEmpty) {
      ToastService.showError(
        context: context,
        title: 'Validation Error',
        description: 'Please provide a clinical reason for the tests',
      );
      return;
    }

    ToastService.showPrescription(
      context: context,
      title: 'Lab Request Submitted',
      description: '${_selectedTests.length} test(s) requested successfully',
    );
    Navigator.of(context).pop(_selectedTests);
  }
}
