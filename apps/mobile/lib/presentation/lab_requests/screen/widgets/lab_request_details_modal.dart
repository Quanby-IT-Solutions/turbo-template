import 'package:flutter/material.dart';
import '../utils/lab_request_utils.dart';

void showLabRequestDetailsModal(
  BuildContext context,
  Map<String, dynamic> request,
) {
  final colorScheme = Theme.of(context).colorScheme;
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
          _ModalHeader(onClose: () => Navigator.of(context).pop()),
          const SizedBox(height: 24),
          _DetailsList(request: request, status: status),
          const SizedBox(height: 24),
        ],
      ),
    ),
  );
}

class _ModalHeader extends StatelessWidget {
  final VoidCallback onClose;

  const _ModalHeader({required this.onClose});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Row(
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
        IconButton(icon: const Icon(Icons.close_rounded), onPressed: onClose),
      ],
    );
  }
}

class _DetailsList extends StatelessWidget {
  final Map<String, dynamic> request;
  final String status;

  const _DetailsList({required this.request, required this.status});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _DetailRow(
          label: 'Test',
          value: (request['requestedTests'] as String?) ?? 'N/A',
          icon: Icons.science_rounded,
          colorScheme: colorScheme,
        ),
        if (request['doctorName'] != null) ...[
          const SizedBox(height: 16),
          _DetailRow(
            label: 'Requested By',
            value: 'Dr. ${request['doctorName']}',
            icon: Icons.person_rounded,
            colorScheme: colorScheme,
          ),
        ],
        if (request['organizationName'] != null) ...[
          const SizedBox(height: 16),
          _DetailRow(
            label: 'Organization',
            value: request['organizationName'] as String,
            icon: Icons.business_rounded,
            colorScheme: colorScheme,
          ),
        ],
        if (request['createdAt'] != null) ...[
          const SizedBox(height: 16),
          _DetailRow(
            label: 'Request Date',
            value: LabRequestUtils.formatDateTime(
              request['createdAt'] as String,
            ),
            icon: Icons.calendar_today_rounded,
            colorScheme: colorScheme,
          ),
        ],
        const SizedBox(height: 16),
        _DetailRow(
          label: 'Status',
          value: status,
          icon: Icons.info_rounded,
          colorScheme: colorScheme,
          statusColor: LabRequestUtils.getStatusColor(status),
        ),
        if (request['priority'] != null) ...[
          const SizedBox(height: 16),
          _DetailRow(
            label: 'Priority',
            value: request['priority'] as String,
            icon: Icons.priority_high_rounded,
            colorScheme: colorScheme,
          ),
        ],
        if (request['note'] != null &&
            request['note'].toString().isNotEmpty) ...[
          const SizedBox(height: 16),
          _DetailRow(
            label: 'Notes',
            value: request['note'].toString(),
            icon: Icons.note_rounded,
            colorScheme: colorScheme,
          ),
        ],
        if (request['instructions'] != null &&
            request['instructions'].toString().isNotEmpty) ...[
          const SizedBox(height: 16),
          _DetailRow(
            label: 'Instructions',
            value: request['instructions'].toString(),
            icon: Icons.info_outline_rounded,
            colorScheme: colorScheme,
          ),
        ],
        if (status == 'COMPLETED' && request['updatedAt'] != null) ...[
          const SizedBox(height: 16),
          _DetailRow(
            label: 'Completed Date',
            value: LabRequestUtils.formatDateTime(
              request['updatedAt'] as String,
            ),
            icon: Icons.check_circle_rounded,
            colorScheme: colorScheme,
            statusColor: Colors.green,
          ),
        ],
      ],
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final ColorScheme colorScheme;
  final Color? statusColor;

  const _DetailRow({
    required this.label,
    required this.value,
    required this.icon,
    required this.colorScheme,
    this.statusColor,
  });

  @override
  Widget build(BuildContext context) {
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
