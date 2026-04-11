import 'package:flutter/material.dart';
import 'package:mobile/shared/widgets/app_card.dart';

class SettingsGroup extends StatelessWidget {
  final List<Widget> children;
  final EdgeInsetsGeometry margin;

  const SettingsGroup({
    super.key,
    required this.children,
    this.margin = const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final divider = Divider(
      height: 0.5,
      thickness: 0.5,
      color: theme.colorScheme.outlineVariant,
    );

    final groupedChildren = <Widget>[];
    for (int i = 0; i < children.length; i++) {
      groupedChildren.add(children[i]);
      if (i < children.length - 1) {
        groupedChildren.add(divider);
      }
    }

    return AppCard(
      margin: margin,
      padding: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: groupedChildren,
      ),
    );
  }
}
