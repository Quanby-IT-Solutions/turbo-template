import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';

class MedicalHistorySidebar extends ConsumerStatefulWidget {
  final String consultationId;
  final VoidCallback onClose;

  const MedicalHistorySidebar({
    super.key,
    required this.consultationId,
    required this.onClose,
  });

  @override
  ConsumerState<MedicalHistorySidebar> createState() =>
      _MedicalHistorySidebarState();
}

class _MedicalHistorySidebarState extends ConsumerState<MedicalHistorySidebar> {
  Map<String, dynamic>? _medicalHistory;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMedicalHistory();
  }

  Future<void> _loadMedicalHistory() async {
    try {
      final user = ref.read(currentUserProvider);
      if (user == null) return;

      // Get consultation to find patient ID
      // For now, we'll use a placeholder - in production, fetch consultation details
      // and use the patientId to fetch medical history

      // Fetch medical history from API
      // This is a placeholder - you'll need to implement the actual API call
      // based on your medical history service structure

      setState(() {
        _medicalHistory = {
          'diagnoses': [],
          'medications': [],
          'allergies': [],
          'vitals': [],
        };
        _isLoading = false;
      });
    } catch (e) {
      debugPrint('Failed to load medical history: $e');
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 300,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.3),
            blurRadius: 16,
            offset: const Offset(4, 0),
          ),
        ],
      ),
      child: Column(
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Theme.of(context).colorScheme.primaryContainer,
              border: Border(
                bottom: BorderSide(
                  color: Theme.of(
                    context,
                  ).colorScheme.outline.withValues(alpha: 0.2),
                ),
              ),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Medical History',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                  ),
                ),
                IconButton(
                  onPressed: widget.onClose,
                  icon: Icon(
                    Icons.close,
                    color: Theme.of(context).colorScheme.onPrimaryContainer,
                  ),
                ),
              ],
            ),
          ),

          // Content
          Expanded(
            child: _isLoading
                ? Center(
                    child: CircularProgressIndicator(
                      color: Theme.of(context).colorScheme.primary,
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildSection(
                        context,
                        'Diagnoses',
                        _medicalHistory?['diagnoses'] ?? [],
                      ),
                      const SizedBox(height: 16),
                      _buildSection(
                        context,
                        'Medications',
                        _medicalHistory?['medications'] ?? [],
                      ),
                      const SizedBox(height: 16),
                      _buildSection(
                        context,
                        'Allergies',
                        _medicalHistory?['allergies'] ?? [],
                      ),
                      const SizedBox(height: 16),
                      _buildSection(
                        context,
                        'Recent Vitals',
                        _medicalHistory?['vitals'] ?? [],
                      ),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSection(
    BuildContext context,
    String title,
    List<dynamic> items,
  ) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          if (items.isEmpty)
            Text(
              'No data available',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.6),
              ),
            )
          else
            ...items.map(
              (item) => Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  item.toString(),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ),
            ),
        ],
      ),
    );
  }
}
