import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:intl/intl.dart';
import 'package:mobile/core/widgets/animated_nav_wrapper.dart';
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

  String _formatDate(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return DateFormat('MMM dd, yyyy').format(date);
    } catch (e) {
      return dateString;
    }
  }

  String _formatDateTime(String dateString) {
    try {
      final date = DateTime.parse(dateString);
      return DateFormat('MMM dd, yyyy, hh:mm a').format(date);
    } catch (e) {
      return dateString;
    }
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
      return (req['requestedTests'] as String? ?? '').toLowerCase().contains(
            query,
          ) ||
          (req['doctorName'] as String? ?? '').toLowerCase().contains(query) ||
          (req['organizationName'] as String? ?? '').toLowerCase().contains(
            query,
          );
    }).toList();
  }

  // Method to navigate to lab request booking screen
  void _navigateToLabRequestBooking(BuildContext context) {
    final user = ref.read(currentUserProvider);

    context.push(
      '/lab-request-booking',
      extra: {'patientId': user?.id, 'organizationId': null, 'doctorId': null},
    );
  }

  Widget _buildStatusBadge(String status, ColorScheme colorScheme) {
    switch (status) {
      case 'COMPLETED':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.green.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.green.withValues(alpha: 0.2)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.check_circle_rounded, size: 12, color: Colors.green),
              const SizedBox(width: 4),
              Text(
                'Completed',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Colors.green,
                ),
              ),
            ],
          ),
        );
      case 'PENDING':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.orange.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.orange.withValues(alpha: 0.2)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.access_time_rounded, size: 12, color: Colors.orange),
              const SizedBox(width: 4),
              Text(
                'Pending',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Colors.orange,
                ),
              ),
            ],
          ),
        );
      case 'IN_PROGRESS':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.blue.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.blue.withValues(alpha: 0.2)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.info_rounded, size: 12, color: Colors.blue),
              const SizedBox(width: 4),
              Text(
                'In Progress',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Colors.blue,
                ),
              ),
            ],
          ),
        );
      case 'CANCELLED':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: Colors.red.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.cancel_rounded, size: 12, color: Colors.red),
              const SizedBox(width: 4),
              Text(
                'Cancelled',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w600,
                  color: Colors.red,
                ),
              ),
            ],
          ),
        );
      default:
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.2),
            ),
          ),
          child: Text(
            status,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: colorScheme.onSurface,
            ),
          ),
        );
    }
  }

  Widget? _buildPriorityBadge(String? priority) {
    if (priority == null) return null;
    switch (priority) {
      case 'URGENT':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: Colors.red.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: Colors.red.withValues(alpha: 0.3)),
          ),
          child: Text(
            'URGENT',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w700,
              color: Colors.red,
              letterSpacing: 0.5,
            ),
          ),
        );
      case 'HIGH':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: Colors.red.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: Colors.red.withValues(alpha: 0.2)),
          ),
          child: Text(
            'HIGH',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w600,
              color: Colors.red,
              letterSpacing: 0.5,
            ),
          ),
        );
      case 'LOW':
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
          decoration: BoxDecoration(
            color: Colors.grey.withValues(alpha: 0.1),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
          ),
          child: Text(
            'LOW',
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.w600,
              color: Colors.grey,
              letterSpacing: 0.5,
            ),
          ),
        );
      case 'NORMAL':
      default:
        return null;
    }
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
          backgroundColor: colorScheme.surfaceContainerLow,
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          leading: IconButton(
            icon: Icon(
              Icons.arrow_back_ios_rounded,
              color: colorScheme.primary,
            ),
            onPressed: () => context.pop(),
          ),
          title: Text(
            'Lab Requests',
            style: TextStyle(
              color: colorScheme.onSurface,
              fontSize: 22,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.3,
            ),
          ),
        ),
        floatingActionButton: FloatingActionButton.extended(
          onPressed: () => _navigateToLabRequestBooking(context),
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
                    // Header Section with Search
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            decoration: InputDecoration(
                              hintText: 'Search lab requests...',
                              prefixIcon: Icon(
                                Icons.search_rounded,
                                color: colorScheme.primary,
                              ),
                              suffixIcon: _searchController.text.isNotEmpty
                                  ? IconButton(
                                      icon: Icon(
                                        Icons.clear_rounded,
                                        color: colorScheme.primary,
                                      ),
                                      onPressed: () {
                                        _searchController.clear();
                                        setState(() {});
                                      },
                                    )
                                  : null,
                              filled: true,
                              fillColor: colorScheme.surfaceContainerHigh,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                                borderSide: BorderSide.none,
                              ),
                            ),
                            onChanged: (value) => setState(() {}),
                          ),
                        ),
                        const SizedBox(width: 12),
                        ElevatedButton.icon(
                          onPressed: () =>
                              _navigateToLabRequestBooking(context),
                          icon: const Icon(Icons.description_rounded, size: 18),
                          label: const Text('Request'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: colorScheme.primary,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Stats Summary Cards
                    if (filteredRequests.isNotEmpty) ...[
                      SingleChildScrollView(
                        scrollDirection: Axis.horizontal,
                        child: Row(
                          children: [
                            _buildStatCard(
                              context,
                              Icons.description_rounded,
                              'Total Requests',
                              '${filteredRequests.length}',
                              colorScheme.primary,
                              colorScheme,
                            ),
                            const SizedBox(width: 12),
                            _buildStatCard(
                              context,
                              Icons.access_time_rounded,
                              'Pending',
                              '${filteredRequests.where((r) => r['status'] == 'PENDING').length}',
                              Colors.orange,
                              colorScheme,
                            ),
                            const SizedBox(width: 12),
                            _buildStatCard(
                              context,
                              Icons.check_circle_rounded,
                              'Completed',
                              '${filteredRequests.where((r) => r['status'] == 'COMPLETED').length}',
                              Colors.green,
                              colorScheme,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],

                    // Lab Requests List
                    if (filteredRequests.isEmpty)
                      _buildEmptyState(
                        context,
                        colorScheme,
                        _searchController.text.isNotEmpty,
                      )
                    else
                      ...filteredRequests.map(
                        (request) =>
                            _buildLabRequestCard(context, request, colorScheme),
                      ),
                    const SizedBox(height: 100),
                  ],
                ),
              ),
            );
          },
          loading: () => _buildLoadingState(context, colorScheme),
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

  Widget _buildStatCard(
    BuildContext context,
    IconData icon,
    String label,
    String value,
    Color color,
    ColorScheme colorScheme,
  ) {
    return Container(
      width: 160,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.1)),
      ),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.1),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w700,
                    color: colorScheme.onSurface,
                  ),
                ),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 11,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLoadingState(BuildContext context, ColorScheme colorScheme) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: List.generate(3, (index) => _buildSkeletonCard(colorScheme)),
      ),
    );
  }

  Widget _buildSkeletonCard(ColorScheme colorScheme) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.1)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      height: 16,
                      width: 200,
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      height: 12,
                      width: 150,
                      decoration: BoxDecoration(
                        color: colorScheme.surfaceContainerHighest,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ],
                ),
              ),
              Container(
                width: 60,
                height: 24,
                decoration: BoxDecoration(
                  color: colorScheme.surfaceContainerHighest,
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(
    BuildContext context,
    ColorScheme colorScheme,
    bool isSearch,
  ) {
    return Container(
      padding: const EdgeInsets.all(48),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.1)),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: colorScheme.surfaceContainerHighest,
              shape: BoxShape.circle,
            ),
            child: Icon(
              Icons.description_rounded,
              size: 48,
              color: colorScheme.onSurface.withValues(alpha: 0.6),
            ),
          ),
          const SizedBox(height: 24),
          Text(
            isSearch ? 'No results found' : 'No lab requests found',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: colorScheme.onSurface,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            isSearch
                ? "Try adjusting your search query to find what you're looking for."
                : "You haven't requested any lab tests yet. Click the button above to create your first request.",
            style: TextStyle(
              fontSize: 14,
              color: colorScheme.onSurface.withValues(alpha: 0.6),
            ),
            textAlign: TextAlign.center,
          ),
          if (!isSearch) ...[
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _navigateToLabRequestBooking(context),
              icon: const Icon(Icons.description_rounded),
              label: const Text('Request Lab Test'),
              style: ElevatedButton.styleFrom(
                backgroundColor: colorScheme.primary,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildLabRequestCard(
    BuildContext context,
    Map<String, dynamic> request,
    ColorScheme colorScheme,
  ) {
    final status = request['status'] as String? ?? 'PENDING';
    final priority = request['priority'] as String?;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: colorScheme.surfaceContainerLow,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: colorScheme.outline.withValues(alpha: 0.1)),
        boxShadow: [
          BoxShadow(
            color: colorScheme.shadow.withValues(alpha: 0.04),
            offset: const Offset(0, 2),
            blurRadius: 8,
          ),
        ],
      ),
      child: InkWell(
        onTap: () {
          _showLabRequestDetails(context, request, colorScheme);
        },
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Icon
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: colorScheme.primary.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.description_rounded,
                      color: colorScheme.primary,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 16),
                  // Main Content
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Title with Priority Badge
                        Row(
                          children: [
                            Expanded(
                              child: Text(
                                request['requestedTests'] as String? ??
                                    'Untitled Lab Test',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w700,
                                  color: colorScheme.onSurface,
                                ),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            if (priority != null) ...[
                              const SizedBox(width: 8),
                              _buildPriorityBadge(priority) ??
                                  const SizedBox.shrink(),
                            ],
                          ],
                        ),
                        const SizedBox(height: 8),
                        // Date, Doctor, Organization
                        Wrap(
                          spacing: 12,
                          runSpacing: 8,
                          children: [
                            Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  Icons.calendar_today_rounded,
                                  size: 14,
                                  color: colorScheme.onSurface.withValues(
                                    alpha: 0.6,
                                  ),
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  _formatDate(
                                    request['createdAt'] as String? ?? '',
                                  ),
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: colorScheme.onSurface.withValues(
                                      alpha: 0.6,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (request['doctorName'] != null) ...[
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.person_rounded,
                                    size: 14,
                                    color: colorScheme.onSurface.withValues(
                                      alpha: 0.6,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Text(
                                    request['doctorName'] as String,
                                    style: TextStyle(
                                      fontSize: 12,
                                      color: colorScheme.onSurface.withValues(
                                        alpha: 0.6,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                            if (request['organizationName'] != null) ...[
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    Icons.business_rounded,
                                    size: 14,
                                    color: colorScheme.onSurface.withValues(
                                      alpha: 0.6,
                                    ),
                                  ),
                                  const SizedBox(width: 4),
                                  Flexible(
                                    child: Text(
                                      request['organizationName'] as String,
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: colorScheme.onSurface.withValues(
                                          alpha: 0.6,
                                        ),
                                      ),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),
                  // Status Badge and Button
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      _buildStatusBadge(status, colorScheme),
                      const SizedBox(height: 8),
                      OutlinedButton(
                        onPressed: () {
                          _showLabRequestDetails(context, request, colorScheme);
                        },
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 6,
                          ),
                          minimumSize: Size.zero,
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              status == 'COMPLETED'
                                  ? 'View Results'
                                  : 'View Details',
                              style: const TextStyle(fontSize: 12),
                            ),
                            const SizedBox(width: 4),
                            Icon(Icons.arrow_forward_rounded, size: 14),
                          ],
                        ),
                      ),
                    ],
                  ),
                ],
              ),
              // Separator
              const Divider(height: 24),
              // Additional Info
              if (status == 'COMPLETED')
                Row(
                  children: [
                    Icon(
                      Icons.check_circle_rounded,
                      size: 16,
                      color: Colors.green,
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Results available • Completed ${_formatDate(request['updatedAt'] as String? ?? request['createdAt'] as String? ?? '')}',
                        style: TextStyle(fontSize: 12, color: Colors.green),
                      ),
                    ),
                  ],
                )
              else if (request['note'] != null &&
                  request['note'].toString().isNotEmpty)
                Text(
                  request['note'].toString(),
                  style: TextStyle(
                    fontSize: 12,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                )
              else
                Text(
                  'Awaiting processing',
                  style: TextStyle(
                    fontSize: 12,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  void _showLabRequestDetails(
    BuildContext context,
    Map<String, dynamic> request,
    ColorScheme colorScheme,
  ) {
    final status = request['status'] as String? ?? 'PENDING';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        decoration: BoxDecoration(
          color: colorScheme.surfaceContainerLow,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Lab Request Details',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w700,
                      color: colorScheme.onSurface,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 24),
            _buildDetailRow(
              'Test',
              request['requestedTests'] as String? ?? 'N/A',
              Icons.science_rounded,
              colorScheme,
            ),
            if (request['doctorName'] != null) ...[
              const SizedBox(height: 16),
              _buildDetailRow(
                'Requested By',
                'Dr. ${request['doctorName']}',
                Icons.person_rounded,
                colorScheme,
              ),
            ],
            if (request['organizationName'] != null) ...[
              const SizedBox(height: 16),
              _buildDetailRow(
                'Organization',
                request['organizationName'] as String,
                Icons.business_rounded,
                colorScheme,
              ),
            ],
            if (request['createdAt'] != null) ...[
              const SizedBox(height: 16),
              _buildDetailRow(
                'Request Date',
                _formatDateTime(request['createdAt'] as String),
                Icons.calendar_today_rounded,
                colorScheme,
              ),
            ],
            const SizedBox(height: 16),
            _buildDetailRow(
              'Status',
              status,
              Icons.info_rounded,
              colorScheme,
              statusColor: _getStatusColor(status),
            ),
            if (request['priority'] != null) ...[
              const SizedBox(height: 16),
              _buildDetailRow(
                'Priority',
                request['priority'] as String,
                Icons.priority_high_rounded,
                colorScheme,
              ),
            ],
            if (request['note'] != null &&
                request['note'].toString().isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildDetailRow(
                'Notes',
                request['note'].toString(),
                Icons.note_rounded,
                colorScheme,
              ),
            ],
            if (request['instructions'] != null &&
                request['instructions'].toString().isNotEmpty) ...[
              const SizedBox(height: 16),
              _buildDetailRow(
                'Instructions',
                request['instructions'].toString(),
                Icons.info_outline_rounded,
                colorScheme,
              ),
            ],
            if (status == 'COMPLETED' && request['updatedAt'] != null) ...[
              const SizedBox(height: 16),
              _buildDetailRow(
                'Completed Date',
                _formatDateTime(request['updatedAt'] as String),
                Icons.check_circle_rounded,
                colorScheme,
                statusColor: Colors.green,
              ),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'COMPLETED':
        return Colors.green;
      case 'PENDING':
        return Colors.orange;
      case 'IN_PROGRESS':
        return Colors.blue;
      case 'CANCELLED':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  Widget _buildDetailRow(
    String label,
    String value,
    IconData icon,
    ColorScheme colorScheme, {
    Color? statusColor,
  }) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: statusColor ?? colorScheme.primary),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                value,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: statusColor ?? colorScheme.onSurface,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
