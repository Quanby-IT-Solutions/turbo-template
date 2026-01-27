import 'package:flutter/material.dart';

class DateTimePicker extends StatelessWidget {
  final DateTime? selectedDate;
  final TimeOfDay? selectedTime;
  final VoidCallback onSelectDate;
  final VoidCallback onSelectTime;
  final ColorScheme colorScheme;

  const DateTimePicker({
    super.key,
    required this.selectedDate,
    required this.selectedTime,
    required this.onSelectDate,
    required this.onSelectTime,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Date & Time',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: colorScheme.onSurface,
            letterSpacing: -0.2,
          ),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: _buildSelectionCard(
                context: context,
                icon: Icons.calendar_today_rounded,
                label: 'Date',
                value: selectedDate != null
                    ? '${selectedDate!.day}/${selectedDate!.month}/${selectedDate!.year}'
                    : 'Select Date',
                onTap: onSelectDate,
                colorScheme: colorScheme,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildSelectionCard(
                context: context,
                icon: Icons.access_time_rounded,
                label: 'Time',
                value: selectedTime != null
                    ? selectedTime!.format(context)
                    : 'Select Time',
                onTap: onSelectTime,
                colorScheme: colorScheme,
                isDisabled: selectedDate == null,
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSelectionCard({
    required BuildContext context,
    required IconData icon,
    required String label,
    required String value,
    required VoidCallback onTap,
    required ColorScheme colorScheme,
    bool isDisabled = false,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: isDisabled
            ? colorScheme.surfaceContainerLow.withValues(alpha: 0.5)
            : colorScheme.surfaceContainerLow,
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
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          onTap: isDisabled ? null : onTap,
          borderRadius: BorderRadius.circular(16),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  icon,
                  color: isDisabled
                      ? colorScheme.primary.withValues(alpha: 0.4)
                      : colorScheme.primary,
                  size: 24,
                ),
                const SizedBox(height: 8),
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: colorScheme.onSurface.withValues(
                      alpha: isDisabled ? 0.4 : 0.6,
                    ),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: colorScheme.onSurface.withValues(
                      alpha: isDisabled ? 0.4 : 1.0,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}