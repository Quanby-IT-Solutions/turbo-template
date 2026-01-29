import 'package:flutter/material.dart';
import '../utils/lab_request_utils.dart';
import 'badges.dart';

class LabRequestCard extends StatelessWidget {
  final Map<String, dynamic> request;
  final VoidCallback onTap;

  const LabRequestCard({super.key, required this.request, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
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
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildIcon(colorScheme),
                  const SizedBox(width: 16),
                  Expanded(child: _buildMainContent(colorScheme, priority)),
                  _buildStatusSection(colorScheme, status),
                ],
              ),
              const Divider(height: 24),
              _buildFooter(colorScheme, status),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildIcon(ColorScheme colorScheme) {
    return Container(
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
    );
  }

  Widget _buildMainContent(ColorScheme colorScheme, String? priority) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                (request['requestedTests'] as String?) ?? 'Untitled Lab Test',
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
              PriorityBadge(priority: priority),
            ],
          ],
        ),
        const SizedBox(height: 8),
        _buildMetadata(colorScheme),
      ],
    );
  }

  Widget _buildMetadata(ColorScheme colorScheme) {
    return Wrap(
      spacing: 12,
      runSpacing: 8,
      children: [
        _buildMetadataItem(
          Icons.calendar_today_rounded,
          LabRequestUtils.formatDate(request['createdAt'] as String? ?? ''),
          colorScheme,
        ),
        if (request['doctorName'] != null)
          _buildMetadataItem(
            Icons.person_rounded,
            request['doctorName'] as String,
            colorScheme,
          ),
        if (request['organizationName'] != null)
          _buildMetadataItem(
            Icons.business_rounded,
            request['organizationName'] as String,
            colorScheme,
            flexible: true,
          ),
      ],
    );
  }

  Widget _buildMetadataItem(
    IconData icon,
    String text,
    ColorScheme colorScheme, {
    bool flexible = false,
  }) {
    final content = Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(
          icon,
          size: 14,
          color: colorScheme.onSurface.withValues(alpha: 0.6),
        ),
        const SizedBox(width: 4),
        flexible
            ? Flexible(
                child: Text(
                  text,
                  style: TextStyle(
                    fontSize: 12,
                    color: colorScheme.onSurface.withValues(alpha: 0.6),
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              )
            : Text(
                text,
                style: TextStyle(
                  fontSize: 12,
                  color: colorScheme.onSurface.withValues(alpha: 0.6),
                ),
              ),
      ],
    );

    return content;
  }

  Widget _buildStatusSection(ColorScheme colorScheme, String status) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.end,
      children: [
        StatusBadge(status: status),
        const SizedBox(height: 8),
        OutlinedButton(
          onPressed: onTap,
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            minimumSize: Size.zero,
            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                status == 'COMPLETED' ? 'View Results' : 'View Details',
                style: const TextStyle(fontSize: 12),
              ),
              const SizedBox(width: 4),
              const Icon(Icons.arrow_forward_rounded, size: 14),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildFooter(ColorScheme colorScheme, String status) {
    if (status == 'COMPLETED') {
      return Row(
        children: [
          const Icon(Icons.check_circle_rounded, size: 16, color: Colors.green),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Results available • Completed ${LabRequestUtils.formatDate(request['updatedAt'] as String? ?? request['createdAt'] as String? ?? '')}',
              style: const TextStyle(fontSize: 12, color: Colors.green),
            ),
          ),
        ],
      );
    } else if (request['note'] != null &&
        request['note'].toString().isNotEmpty) {
      return Text(
        request['note'].toString(),
        style: TextStyle(
          fontSize: 12,
          color: colorScheme.onSurface.withValues(alpha: 0.6),
        ),
      );
    } else {
      return Text(
        'Awaiting processing',
        style: TextStyle(
          fontSize: 12,
          color: colorScheme.onSurface.withValues(alpha: 0.6),
        ),
      );
    }
  }
}
