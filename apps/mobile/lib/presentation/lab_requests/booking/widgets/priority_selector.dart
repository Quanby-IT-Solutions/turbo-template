import 'package:flutter/material.dart';

class PrioritySelector extends StatelessWidget {
  final String selectedPriority;
  final ValueChanged<String> onChanged;

  const PrioritySelector({
    super.key,
    required this.selectedPriority,
    required this.onChanged,
  });

  static final List<Map<String, dynamic>> _priorityOptions = [
    {
      'value': 'LOW',
      'label': 'Low',
      'icon': Icons.flag_outlined,
      'description': 'Routine test',
      'color': Colors.blue,
    },
    {
      'value': 'NORMAL',
      'label': 'Normal',
      'icon': Icons.flag,
      'description': 'Standard priority',
      'color': Colors.orange,
    },
    {
      'value': 'HIGH',
      'label': 'High',
      'icon': Icons.flag_rounded,
      'description': 'Urgent test',
      'color': Colors.red,
    },
  ];

  @override
  Widget build(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Priority Level',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: colorScheme.onSurface,
            letterSpacing: -0.2,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: _priorityOptions.map((priority) {
            final isSelected = selectedPriority == priority['value'];
            return Expanded(
              child: Container(
                margin: EdgeInsets.only(
                  right: priority != _priorityOptions.last ? 8 : 0,
                ),
                decoration: BoxDecoration(
                  color: isSelected
                      ? (priority['color'] as Color).withValues(alpha: 0.1)
                      : colorScheme.surfaceContainerLow,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: isSelected
                        ? (priority['color'] as Color)
                        : colorScheme.outline.withValues(alpha: 0.1),
                    width: isSelected ? 2 : 1,
                  ),
                ),
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: () => onChanged(priority['value']),
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        vertical: 12,
                        horizontal: 8,
                      ),
                      child: Column(
                        children: [
                          Icon(
                            priority['icon'],
                            color: isSelected
                                ? priority['color']
                                : colorScheme.onSurface.withValues(alpha: 0.6),
                            size: 24,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            priority['label'],
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: isSelected
                                  ? FontWeight.w700
                                  : FontWeight.w600,
                              color: isSelected
                                  ? priority['color']
                                  : colorScheme.onSurface,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            );
          }).toList(),
        ),
      ],
    );
  }
}
