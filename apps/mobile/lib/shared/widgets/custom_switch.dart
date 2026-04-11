import 'package:flutter/material.dart';
import '../../core/theme/app_styles.dart';

class CustomSwitch extends StatelessWidget {
  final bool value;
  final ValueChanged<bool> onChanged;

  const CustomSwitch({
    super.key,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return GestureDetector(
      onTap: () => onChanged(!value),
      child: AnimatedContainer(
        duration: AppMotion.durationFast,
        curve: AppMotion.enterCurve,
        width: 48,
        height: 24,
        decoration: BoxDecoration(
          borderRadius: AppRadii.pillRadius,
          color: value ? theme.colorScheme.primary : theme.colorScheme.surfaceContainerHigh,
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            AnimatedPositioned(
              duration: AppMotion.durationFast,
              curve: AppMotion.enterCurve,
              left: value ? 26 : 2,
              right: value ? 2 : 26,
              child: Container(
                width: 20,
                height: 20,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: value ? theme.colorScheme.onPrimary : theme.colorScheme.onSurface,
                  boxShadow: const [
                    BoxShadow(
                      color: Colors.black12,
                      blurRadius: 4,
                      offset: Offset(0, 2),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

