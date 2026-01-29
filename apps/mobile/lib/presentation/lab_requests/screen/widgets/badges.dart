import 'package:flutter/material.dart';

class StatusBadge extends StatelessWidget {
  final String status;

  const StatusBadge({super.key, required this.status});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    switch (status) {
      case 'COMPLETED':
        return _buildBadge(
          'Completed',
          Icons.check_circle_rounded,
          Colors.green,
        );
      case 'PENDING':
        return _buildBadge('Pending', Icons.access_time_rounded, Colors.orange);
      case 'IN_PROGRESS':
        return _buildBadge('In Progress', Icons.info_rounded, Colors.blue);
      case 'CANCELLED':
        return _buildBadge('Cancelled', Icons.cancel_rounded, Colors.red);
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

  Widget _buildBadge(String label, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: color),
          const SizedBox(width: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class PriorityBadge extends StatelessWidget {
  final String? priority;

  const PriorityBadge({super.key, this.priority});

  @override
  Widget build(BuildContext context) {
    if (priority == null) return const SizedBox.shrink();

    switch (priority) {
      case 'URGENT':
        return _buildBadge('URGENT', Colors.red, alpha: 0.1, borderAlpha: 0.3);
      case 'HIGH':
        return _buildBadge('HIGH', Colors.red, alpha: 0.05, borderAlpha: 0.2);
      case 'LOW':
        return _buildBadge('LOW', Colors.grey, alpha: 0.1, borderAlpha: 0.2);
      case 'NORMAL':
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildBadge(
    String label,
    Color color, {
    required double alpha,
    required double borderAlpha,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: color.withValues(alpha: alpha),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: color.withValues(alpha: borderAlpha)),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 9,
          fontWeight: label == 'URGENT' ? FontWeight.w700 : FontWeight.w600,
          color: color,
          letterSpacing: 0.5,
        ),
      ),
    );
  }
}
