import 'package:flutter/material.dart';

class StatsSummary extends StatelessWidget {
  final List<Map<String, dynamic>> requests;

  const StatsSummary({super.key, required this.requests});

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    final totalRequests = requests.length;
    final pendingCount = requests.where((r) => r['status'] == 'PENDING').length;
    final completedCount = requests
        .where((r) => r['status'] == 'COMPLETED')
        .length;

    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: [
          _StatCard(
            icon: Icons.description_rounded,
            label: 'Total Requests',
            value: '$totalRequests',
            color: colorScheme.primary,
          ),
          const SizedBox(width: 12),
          _StatCard(
            icon: Icons.access_time_rounded,
            label: 'Pending',
            value: '$pendingCount',
            color: Colors.orange,
          ),
          const SizedBox(width: 12),
          _StatCard(
            icon: Icons.check_circle_rounded,
            label: 'Completed',
            value: '$completedCount',
            color: Colors.green,
          ),
        ],
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _StatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

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
}
