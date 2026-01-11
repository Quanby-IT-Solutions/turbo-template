import 'package:flutter/material.dart';
import 'package:mobile/core/constants/app_constants.dart';
import 'package:mobile/core/services/toast_service.dart';

class DiagnosisFormScreen extends StatefulWidget {
  const DiagnosisFormScreen({super.key});

  @override
  State<DiagnosisFormScreen> createState() => _DiagnosisFormScreenState();
}

class _DiagnosisFormScreenState extends State<DiagnosisFormScreen> {
  final _searchController = TextEditingController();
  final _notesController = TextEditingController();
  final List<Map<String, dynamic>> _selectedDiagnoses = [];

  final List<Map<String, dynamic>> _commonDiagnoses = [
    {'code': 'J00', 'name': 'Acute nasopharyngitis [common cold]', 'category': 'Respiratory'},
    {'code': 'K59.00', 'name': 'Constipation, unspecified', 'category': 'Digestive'},
    {'code': 'M25.50', 'name': 'Pain in unspecified joint', 'category': 'Musculoskeletal'},
    {'code': 'R50.9', 'name': 'Fever, unspecified', 'category': 'General'},
    {'code': 'Z51.11', 'name': 'Encounter for antineoplastic chemotherapy', 'category': 'Follow-up'},
    {'code': 'I10', 'name': 'Essential (primary) hypertension', 'category': 'Cardiovascular'},
    {'code': 'E11.9', 'name': 'Type 2 diabetes mellitus without complications', 'category': 'Endocrine'},
    {'code': 'F32.9', 'name': 'Major depressive disorder, single episode, unspecified', 'category': 'Mental Health'},
    {'code': 'L30.9', 'name': 'Dermatitis, unspecified', 'category': 'Skin'},
    {'code': 'G43.909', 'name': 'Migraine, unspecified, not intractable, without status migrainosus', 'category': 'Neurological'},
  ];

  List<Map<String, dynamic>> _filteredDiagnoses = [];

  @override
  void initState() {
    super.initState();
    _filteredDiagnoses = _commonDiagnoses;
  }

  @override
  void dispose() {
    _searchController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _filterDiagnoses(String query) {
    setState(() {
      if (query.isEmpty) {
        _filteredDiagnoses = _commonDiagnoses;
      } else {
        _filteredDiagnoses = _commonDiagnoses
            .where((diagnosis) =>
                diagnosis['name'].toLowerCase().contains(query.toLowerCase()) ||
                diagnosis['code'].toLowerCase().contains(query.toLowerCase()) ||
                diagnosis['category'].toLowerCase().contains(query.toLowerCase()))
            .toList();
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Add Diagnosis'),
        backgroundColor: Colors.green.shade700,
        foregroundColor: Colors.white,
        actions: [
          TextButton(
            onPressed: _selectedDiagnoses.isNotEmpty ? _saveDiagnoses : null,
            child: const Text(
              'SAVE',
              style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
      body: Column(
        children: [
          // Search Bar
          Container(
            padding: const EdgeInsets.all(AppConstants.defaultPadding),
            color: Colors.green.shade50,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Search ICD-10 Diagnoses',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    labelText: 'Search by condition, code, or category',
                    prefixIcon: Icon(Icons.search),
                    border: OutlineInputBorder(),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                  onChanged: _filterDiagnoses,
                ),
              ],
            ),
          ),

          // Selected Diagnoses
          if (_selectedDiagnoses.isNotEmpty)
            Container(
              padding: const EdgeInsets.all(AppConstants.defaultPadding),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Selected Diagnoses',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: _selectedDiagnoses.map((diagnosis) {
                      return Chip(
                        label: Text('${diagnosis['code']} - ${diagnosis['name']}'),
                        deleteIcon: const Icon(Icons.close),
                        onDeleted: () {
                          setState(() {
                            _selectedDiagnoses.remove(diagnosis);
                          });
                        },
                      );
                    }).toList(),
                  ),
                ],
              ),
            ),

          // Available Diagnoses List
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: AppConstants.defaultPadding),
              itemCount: _filteredDiagnoses.length,
              itemBuilder: (context, index) {
                final diagnosis = _filteredDiagnoses[index];
                final isSelected = _selectedDiagnoses.contains(diagnosis);

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: _getCategoryColor(diagnosis['category']),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        diagnosis['category'],
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    title: Text(
                      diagnosis['name'],
                      style: const TextStyle(fontWeight: FontWeight.w500),
                    ),
                    subtitle: Text(
                      'ICD-10: ${diagnosis['code']}',
                      style: const TextStyle(color: Colors.grey),
                    ),
                    trailing: isSelected
                        ? const Icon(Icons.check_circle, color: Colors.green)
                        : const Icon(Icons.add_circle_outline),
                    onTap: () {
                      setState(() {
                        if (isSelected) {
                          _selectedDiagnoses.remove(diagnosis);
                        } else {
                          _selectedDiagnoses.add(diagnosis);
                        }
                      });
                    },
                  ),
                );
              },
            ),
          ),

          // Notes Section
          Container(
            padding: const EdgeInsets.all(AppConstants.defaultPadding),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Additional Notes',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _notesController,
                  maxLines: 3,
                  decoration: const InputDecoration(
                    hintText: 'Add any additional diagnostic notes or observations...',
                    border: OutlineInputBorder(),
                  ),
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
                    onPressed: _selectedDiagnoses.isNotEmpty ? _saveDiagnoses : null,
                    child: const Text('Save Diagnoses'),
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
      case 'respiratory':
        return Colors.blue;
      case 'cardiovascular':
        return Colors.red;
      case 'digestive':
        return Colors.orange;
      case 'musculoskeletal':
        return Colors.purple;
      case 'neurological':
        return Colors.indigo;
      case 'endocrine':
        return Colors.green;
      case 'mental health':
        return Colors.teal;
      case 'skin':
        return Colors.brown;
      case 'general':
        return Colors.grey;
      default:
        return Colors.blueGrey;
    }
  }

  void _saveDiagnoses() {
    ToastService.showMedicalSuccess(
      context: context,
      title: 'Diagnoses Saved',
      description: '${_selectedDiagnoses.length} diagnosis(es) saved to patient record',
    );
    Navigator.of(context).pop(_selectedDiagnoses);
  }
}