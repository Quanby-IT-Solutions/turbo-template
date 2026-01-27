import 'package:flutter/material.dart';

class AppointmentTextField extends StatelessWidget {
  final String label;
  final String hintText;
  final TextEditingController controller;
  final ColorScheme colorScheme;

  const AppointmentTextField({
    super.key,
    required this.label,
    required this.hintText,
    required this.controller,
    required this.colorScheme,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: colorScheme.onSurface,
            letterSpacing: -0.2,
          ),
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: colorScheme.surfaceContainerLow,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: colorScheme.outline.withValues(alpha: 0.1),
            ),
          ),
          child: TextField(
            controller: controller,
            maxLines: 3,
            decoration: InputDecoration(
              hintText: hintText,
              hintStyle: TextStyle(
                color: colorScheme.onSurface.withValues(alpha: 0.4),
              ),
              border: InputBorder.none,
              contentPadding: const EdgeInsets.all(16),
            ),
            style: TextStyle(fontSize: 15, color: colorScheme.onSurface),
          ),
        ),
      ],
    );
  }
}