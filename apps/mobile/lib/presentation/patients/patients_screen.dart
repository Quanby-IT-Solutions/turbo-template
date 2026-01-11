import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/responsive/responsive_config.dart';
import 'package:mobile/core/services/toast_service.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';

class PatientsScreen extends StatefulWidget {
  const PatientsScreen({super.key});

  @override
  State<PatientsScreen> createState() => _PatientsScreenState();
}

class _PatientsScreenState extends State<PatientsScreen> {
  final TextEditingController _searchController = TextEditingController();
  final List<_PatientSummary> _patients = _mockPatients;
  String _searchQuery = '';
  String _selectedFilter = 'Active';

  @override
  void initState() {
    super.initState();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text.toLowerCase();
      });
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final filteredPatients = _patients.where((patient) {
      final matchesSearch =
          patient.name.toLowerCase().contains(_searchQuery) ||
          patient.conditions.any(
            (condition) => condition.toLowerCase().contains(_searchQuery),
          );

      final matchesFilter =
          _selectedFilter == 'All' ||
          (_selectedFilter == 'Active' && patient.isActive) ||
          (_selectedFilter == 'Monitoring' && patient.isMonitoring) ||
          (_selectedFilter == 'Follow-up' && patient.needsFollowUp);

      return matchesSearch && matchesFilter;
    }).toList();

    return AnimatedNavWrapper(
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Patient roster'),
          actions: [
            IconButton(
              tooltip: 'Add patient to panel',
              icon: const Icon(Icons.person_add_alt_1_rounded),
              onPressed: () {
                ToastService.showInfo(
                  context: context,
                  title: 'Invite patient',
                  description:
                      'Share your clinic code with patients to connect instantly.',
                );
              },
            ),
          ],
        ),
        body: SafeArea(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 120),
            child: Center(
              child: ConstrainedBox(
                constraints: BoxConstraints(maxWidth: context.contentMaxWidth),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(context, filteredPatients.length),
                    const SizedBox(height: 16),
                    _buildSearch(context),
                    const SizedBox(height: 16),
                    _buildFilters(),
                    const SizedBox(height: 24),
                    ...filteredPatients.map(
                      (patient) => _PatientCard(patient: patient),
                    ),
                    if (filteredPatients.isEmpty)
                      _buildEmptyState(context, _selectedFilter, _searchQuery),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context, int count) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Care panel overview',
                style: Theme.of(
                  context,
                ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 4),
              Text(
                '$count patient${count == 1 ? '' : 's'} match your filters.',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withOpacity(0.7),
                ),
              ),
            ],
          ),
        ),
        ElevatedButton.icon(
          onPressed: () => context.push('/consultations-history'),
          icon: const Icon(Icons.history_edu_rounded),
          label: const Text('Consultation history'),
          style: ElevatedButton.styleFrom(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSearch(BuildContext context) {
    return TextField(
      controller: _searchController,
      decoration: InputDecoration(
        prefixIcon: const Icon(Icons.search_rounded),
        hintText: 'Search patient name, condition, or ID...',
        filled: true,
        fillColor: Theme.of(context).colorScheme.surfaceContainerLow,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(
            color: Theme.of(context).colorScheme.outline.withOpacity(0.1),
          ),
        ),
      ),
    );
  }

  Widget _buildFilters() {
    const filters = ['All', 'Active', 'Monitoring', 'Follow-up'];

    return Wrap(
      spacing: 12,
      children: filters
          .map(
            (filter) => ChoiceChip(
              label: Text(filter),
              selected: _selectedFilter == filter,
              onSelected: (_) {
                setState(() => _selectedFilter = filter);
              },
            ),
          )
          .toList(),
    );
  }

  Widget _buildEmptyState(BuildContext context, String filter, String query) {
    final description = query.isNotEmpty
        ? 'No patient matches "$query". Try adjusting your search terms.'
        : filter == 'All'
        ? 'Invite patients to your panel to start remote consultations.'
        : 'No patients tagged "$filter" right now. Update filters to see others.';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 48),
      child: Column(
        children: [
          Icon(
            Icons.person_search_rounded,
            size: 72,
            color: Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(height: 16),
          Text(
            'Nothing to show yet',
            style: Theme.of(
              context,
            ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            description,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurface.withOpacity(0.7),
            ),
          ),
        ],
      ),
    );
  }
}

class _PatientCard extends StatelessWidget {
  const _PatientCard({required this.patient});

  final _PatientSummary patient;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 18),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                CircleAvatar(
                  radius: 26,
                  backgroundColor: Theme.of(context).colorScheme.primary,
                  child: Text(
                    patient.initials,
                    style: const TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        patient.name,
                        style: Theme.of(context).textTheme.titleMedium
                            ?.copyWith(fontWeight: FontWeight.w700),
                      ),
                      const SizedBox(height: 4),
                      Wrap(
                        spacing: 8,
                        runSpacing: 6,
                        children: patient.conditions
                            .map(
                              (condition) => Chip(
                                label: Text(condition),
                                backgroundColor: Theme.of(
                                  context,
                                ).colorScheme.primary.withOpacity(0.08),
                              ),
                            )
                            .toList(),
                      ),
                    ],
                  ),
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _StatusPill(
                      label: patient.statusLabel,
                      color: patient.statusColor,
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Last consult: ${patient.lastConsultLabel}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withOpacity(0.6),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              patient.summary,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withOpacity(0.75),
              ),
            ),
            const SizedBox(height: 16),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _PatientActionButton(
                  label: 'View records',
                  icon: Icons.folder_shared_rounded,
                  onTap: () => context.push('/medical-records'),
                ),
                _PatientActionButton(
                  label: 'Start chat',
                  icon: Icons.chat_bubble_outline_rounded,
                  onTap: () => ToastService.showInfo(
                    context: context,
                    title: 'Messaging coming soon',
                    description:
                        'Secure in-app messaging launches with the notification service rollout.',
                  ),
                ),
                _PatientActionButton(
                  label: 'Schedule follow-up',
                  icon: Icons.event_available_rounded,
                  onTap: () => context.push('/appointment-requests'),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({required this.label, required this.color});

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(30),
        border: Border.all(color: color.withOpacity(0.4)),
      ),
      child: Text(
        label,
        style: TextStyle(color: color.darken(), fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _PatientActionButton extends StatelessWidget {
  const _PatientActionButton({
    required this.label,
    required this.icon,
    required this.onTap,
  });

  final String label;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon),
      label: Text(label),
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      ),
    );
  }
}

class _PatientSummary {
  const _PatientSummary({
    required this.name,
    required this.conditions,
    required this.lastConsultLabel,
    required this.summary,
    required this.statusLabel,
    required this.statusColor,
    this.isActive = true,
    this.isMonitoring = false,
    this.needsFollowUp = false,
  });

  final String name;
  final List<String> conditions;
  final String lastConsultLabel;
  final String summary;
  final String statusLabel;
  final Color statusColor;
  final bool isActive;
  final bool isMonitoring;
  final bool needsFollowUp;

  String get initials => name
      .split(' ')
      .where((part) => part.isNotEmpty)
      .map((part) => part[0])
      .take(2)
      .join()
      .toUpperCase();
}

const List<_PatientSummary> _mockPatients = [
  _PatientSummary(
    name: 'Sarah Johnson',
    conditions: ['Hypertension', 'Weight management'],
    lastConsultLabel: '3 days ago',
    summary:
        'BP readings trending down. Continue Losartan 50mg daily. Encourage 30‑minute walks 3x weekly.',
    statusLabel: 'Active monitoring',
    statusColor: Colors.deepPurple,
    isMonitoring: true,
  ),
  _PatientSummary(
    name: 'Michael Chen',
    conditions: ['Type 2 Diabetes'],
    lastConsultLabel: 'Yesterday',
    summary:
        'Review CGM data during next consult. Pending lab request for HbA1c and lipid panel.',
    statusLabel: 'Follow-up due',
    statusColor: Colors.orange,
    needsFollowUp: true,
  ),
  _PatientSummary(
    name: 'Emily Davis',
    conditions: ['Asthma'],
    lastConsultLabel: '2 weeks ago',
    summary:
        'Inhaler technique reviewed. Monitor peak flow and upload readings thrice weekly.',
    statusLabel: 'Stable',
    statusColor: Colors.green,
  ),
  _PatientSummary(
    name: 'Robert Wilson',
    conditions: ['Depression', 'Sleep hygiene'],
    lastConsultLabel: '5 days ago',
    summary:
        'PHQ-9 improved from 14 to 9. Continue CBT exercises, next session scheduled next Tuesday.',
    statusLabel: 'Active care plan',
    statusColor: Colors.blue,
  ),
  _PatientSummary(
    name: 'Maria Santos',
    conditions: ['Post-op recovery'],
    lastConsultLabel: 'Pending',
    summary:
        'Awaiting clearance notes. Upload wound photo for remote assessment before sutures removal.',
    statusLabel: 'Awaiting update',
    statusColor: Colors.teal,
    isActive: false,
  ),
];

extension on Color {
  Color darken([double amount = .2]) {
    final hsl = HSLColor.fromColor(this);
    final adjusted = hsl.withLightness(
      (hsl.lightness - amount).clamp(0.0, 1.0),
    );
    return adjusted.toColor();
  }
}
