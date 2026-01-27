import 'package:flutter/material.dart';

class AppointmentTypeSelector extends StatelessWidget {
  final String selectedType;
  final Function(String) onTypeChanged;
  final ColorScheme colorScheme;

  const AppointmentTypeSelector({
    super.key,
    required this.selectedType,
    required this.onTypeChanged,
    required this.colorScheme,
  });

  static final List<Map<String, dynamic>> _appointmentTypes = [
    {
      'value': 'video_call',
      'label': 'Video Call',
      'icon': Icons.videocam_rounded,
      'description': 'Online consultation via video',
      'color': Colors.blue,
    },
    {
      'value': 'phone_call',
      'label': 'Phone Call',
      'icon': Icons.phone_rounded,
      'description': 'Audio consultation via phone',
      'color': Colors.green,
    },
    {
      'value': 'in_person',
      'label': 'In Person',
      'icon': Icons.local_hospital_rounded,
      'description': 'Visit doctor at clinic',
      'color': Colors.purple,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Appointment Type',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: colorScheme.onSurface,
            letterSpacing: -0.2,
          ),
        ),
        const SizedBox(height: 12),
        ..._appointmentTypes.map((type) {
          final isSelected = selectedType == type['value'];
          return Container(
            margin: const EdgeInsets.only(bottom: 12),
            decoration: BoxDecoration(
              color: isSelected
                  ? (type['color'] as Color).withValues(alpha: 0.1)
                  : colorScheme.surfaceContainerLow,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(
                color: isSelected
                    ? (type['color'] as Color)
                    : colorScheme.outline.withValues(alpha: 0.1),
                width: isSelected ? 2 : 1,
              ),
              boxShadow: [
                if (isSelected)
                  BoxShadow(
                    color: (type['color'] as Color).withValues(alpha: 0.2),
                    offset: const Offset(0, 4),
                    blurRadius: 12,
                  ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                onTap: () => onTypeChanged(type['value']),
                borderRadius: BorderRadius.circular(16),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: type['color'],
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: Icon(
                          type['icon'],
                          color: Colors.white,
                          size: 24,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              type['label'],
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: colorScheme.onSurface,
                              ),
                            ),
                            Text(
                              type['description'],
                              style: TextStyle(
                                fontSize: 13,
                                color: colorScheme.onSurface.withValues(
                                  alpha: 0.6,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (isSelected)
                        Icon(
                          Icons.check_circle_rounded,
                          color: type['color'],
                          size: 24,
                        ),
                    ],
                  ),
                ),
              ),
            ),
          );
        }),
      ],
    );
  }
}