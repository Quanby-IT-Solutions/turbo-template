import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
import 'package:mobile/presentation/lab_requests/screen/widgets/empty_state.dart';
import 'package:mobile/presentation/lab_requests/screen/widgets/lab_request_card.dart';
import 'package:mobile/presentation/lab_requests/screen/widgets/lab_request_details_modal.dart';
import 'package:mobile/presentation/lab_requests/screen/widgets/loading_state.dart';
import 'package:mobile/presentation/lab_requests/screen/widgets/search_header.dart';
import 'package:mobile/presentation/lab_requests/screen/widgets/stats_summary.dart';
import 'package:mobile/presentation/patient/providers/patient_providers.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';

class PatientLabRequestsScreen extends ConsumerStatefulWidget {
  const PatientLabRequestsScreen({super.key});

  @override
  ConsumerState<PatientLabRequestsScreen> createState() =>
      _PatientLabRequestsScreenState();
}

class _PatientLabRequestsScreenState
    extends ConsumerState<PatientLabRequestsScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<Map<String, dynamic>> _filterRequests(
    List<Map<String, dynamic>> requests,
    String searchQuery,
  ) {
    if (searchQuery.trim().isEmpty) {
      return requests;
    }
    final query = searchQuery.toLowerCase();
    return requests.where((req) {
      final tests = req['requestedTests'] as String? ?? '';
      final doctor = req['doctorName'] as String? ?? '';
      final org = req['organizationName'] as String? ?? '';
      return tests.toLowerCase().contains(query) ||
          doctor.toLowerCase().contains(query) ||
          org.toLowerCase().contains(query);
    }).toList();
  }

  void _navigateToOrganizationSearchScreen(BuildContext context) {
    final user = ref.read(currentUserProvider);

    context.push(
      '/organization-search',
      extra: {'patientId': user?.id, 'organizationId': null, 'doctorId': null},
    );
  }

  void _showLabRequestDetails(
    BuildContext context,
    Map<String, dynamic> request,
  ) {
    showLabRequestDetailsModal(context, request);
  }

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    final user = ref.watch(currentUserProvider);
    final labRequestsAsync = ref.watch(patientLabRequestsProvider(user?.id));

    return AnimatedNavWrapper(
      child: Scaffold(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        appBar: AppBar(
          title: Padding(
            padding: const EdgeInsets.only(left: 8.0),
            child: Text(
              'Lab Requests',
              style: TextStyle(
                color: colorScheme.onSurface,
                fontSize: 22,
                fontWeight: FontWeight.w700,
                letterSpacing: -0.3,
              ),
            ),
          ),
          centerTitle: false,
          elevation: 0,
          backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
          automaticallyImplyLeading: false,
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _navigateToOrganizationSearchScreen(context),
          icon: const Icon(Icons.add_rounded),
          label: const Text('Request Test'),
          backgroundColor: colorScheme.primary,
          foregroundColor: Colors.white,
        ),
        body: labRequestsAsync.when(
          data: (labRequests) {
            final filteredRequests = _filterRequests(
              labRequests,
              _searchController.text,
            );

            return RefreshIndicator(
              onRefresh: () async {
                ref.invalidate(patientLabRequestsProvider(user?.id));
              },
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SearchHeader(
                      controller: _searchController,
                      onChanged: (value) => setState(() {}),
                      onClear: () {
                        _searchController.clear();
                        setState(() {});
                      },
                      onRequestPressed: () =>
                          _navigateToOrganizationSearchScreen(context),
                    ),
                    const SizedBox(height: 16),

                    if (filteredRequests.isNotEmpty) ...[
                      StatsSummary(requests: filteredRequests),
                      const SizedBox(height: 16),
                    ],

                    if (filteredRequests.isEmpty)
                      EmptyState(
                        isSearch: _searchController.text.isNotEmpty,
                        onRequestPressed: () =>
                            _navigateToOrganizationSearchScreen(context),
                      )
                    else
                      ...filteredRequests.map(
                        (request) => LabRequestCard(
                          request: request,
                          onTap: () => _showLabRequestDetails(context, request),
                        ),
                      ),
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            );
          },
          loading: () => const LoadingState(),
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
                  'Error loading lab requests',
                  style: TextStyle(fontSize: 16, color: colorScheme.error),
                ),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: () {
                    ref.invalidate(patientLabRequestsProvider(user?.id));
                  },
                  child: const Text('Retry'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
