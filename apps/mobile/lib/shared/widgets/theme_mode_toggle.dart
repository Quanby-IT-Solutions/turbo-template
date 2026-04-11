import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/theme/theme_provider.dart';

/// A simple switch widget for toggling between light and dark mode.
///
/// When in system mode, the switch reflects the current effective theme.
/// Toggling switches between light and dark mode (not system mode).
class ThemeModeSwitch extends ConsumerWidget {
  const ThemeModeSwitch({
    super.key,
    this.showLabel = false,
  });

  /// Whether to show a label next to the switch.
  final bool showLabel;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final isDark = _isDarkMode(context, themeMode);

    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (showLabel) ...[
          Icon(
            Icons.light_mode,
            size: 18,
            color: !isDark
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
          ),
          const SizedBox(width: 8),
        ],
        Switch.adaptive(
          value: isDark,
          onChanged: (value) {
            ref.read(themeControllerProvider.notifier).setThemeMode(
                  value ? ThemeMode.dark : ThemeMode.light,
                );
          },
        ),
        if (showLabel) ...[
          const SizedBox(width: 8),
          Icon(
            Icons.dark_mode,
            size: 18,
            color: isDark
                ? Theme.of(context).colorScheme.primary
                : Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
          ),
        ],
      ],
    );
  }

  bool _isDarkMode(BuildContext context, ThemeMode mode) {
    if (mode == ThemeMode.system) {
      return MediaQuery.platformBrightnessOf(context) == Brightness.dark;
    }
    return mode == ThemeMode.dark;
  }
}

/// An icon button that cycles through theme modes: System -> Light -> Dark -> System.
///
/// The icon changes to reflect the current mode:
/// - System: brightness_auto
/// - Light: light_mode
/// - Dark: dark_mode
class ThemeModeIconButton extends ConsumerWidget {
  const ThemeModeIconButton({
    super.key,
    this.size,
    this.showTooltip = true,
  });

  /// The size of the icon. Defaults to 24.0.
  final double? size;

  /// Whether to show a tooltip with the current mode name.
  final bool showTooltip;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final displayName = ref.watch(themeModeDisplayNameProvider);

    final IconData icon;
    final ThemeMode nextMode;

    switch (themeMode) {
      case ThemeMode.system:
        icon = Icons.brightness_auto;
        nextMode = ThemeMode.light;
      case ThemeMode.light:
        icon = Icons.light_mode;
        nextMode = ThemeMode.dark;
      case ThemeMode.dark:
        icon = Icons.dark_mode;
        nextMode = ThemeMode.system;
    }

    final button = IconButton(
      icon: Icon(icon, size: size),
      onPressed: () {
        ref.read(themeControllerProvider.notifier).setThemeMode(nextMode);
      },
    );

    if (showTooltip) {
      return Tooltip(
        message: 'Theme: $displayName\nTap to change',
        child: button,
      );
    }

    return button;
  }
}

/// A segmented button for selecting between System, Light, and Dark modes.
///
/// Provides a clear visual selection for all three theme options.
class ThemeModeSegmentedButton extends ConsumerWidget {
  const ThemeModeSegmentedButton({
    super.key,
    this.showLabels = true,
    this.showIcons = true,
  });

  /// Whether to show text labels on the segments.
  final bool showLabels;

  /// Whether to show icons on the segments.
  final bool showIcons;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return SegmentedButton<ThemeMode>(
      segments: [
        ButtonSegment<ThemeMode>(
          value: ThemeMode.system,
          icon: showIcons ? const Icon(Icons.brightness_auto) : null,
          label: showLabels ? const Text('System') : null,
        ),
        ButtonSegment<ThemeMode>(
          value: ThemeMode.light,
          icon: showIcons ? const Icon(Icons.light_mode) : null,
          label: showLabels ? const Text('Light') : null,
        ),
        ButtonSegment<ThemeMode>(
          value: ThemeMode.dark,
          icon: showIcons ? const Icon(Icons.dark_mode) : null,
          label: showLabels ? const Text('Dark') : null,
        ),
      ],
      selected: {themeMode},
      onSelectionChanged: (Set<ThemeMode> selected) {
        ref.read(themeControllerProvider.notifier).setThemeMode(selected.first);
      },
    );
  }
}

/// A compact dropdown menu for selecting theme mode.
///
/// Useful for tight spaces like app bars or menus.
class ThemeModeDropdown extends ConsumerWidget {
  const ThemeModeDropdown({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    return DropdownButton<ThemeMode>(
      value: themeMode,
      underline: const SizedBox.shrink(),
      icon: const Icon(Icons.arrow_drop_down),
      items: const [
        DropdownMenuItem(
          value: ThemeMode.system,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.brightness_auto, size: 20),
              SizedBox(width: 8),
              Text('System'),
            ],
          ),
        ),
        DropdownMenuItem(
          value: ThemeMode.light,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.light_mode, size: 20),
              SizedBox(width: 8),
              Text('Light'),
            ],
          ),
        ),
        DropdownMenuItem(
          value: ThemeMode.dark,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.dark_mode, size: 20),
              SizedBox(width: 8),
              Text('Dark'),
            ],
          ),
        ),
      ],
      onChanged: (ThemeMode? mode) {
        if (mode != null) {
          ref.read(themeControllerProvider.notifier).setThemeMode(mode);
        }
      },
    );
  }
}

/// A popup menu button for selecting theme mode.
///
/// Displays as a single icon that opens a menu with all theme options.
class ThemeModePopupMenu extends ConsumerWidget {
  const ThemeModePopupMenu({
    super.key,
    this.icon,
  });

  /// Custom icon for the popup button. Defaults to the current mode icon.
  final Widget? icon;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);

    final IconData currentIcon = switch (themeMode) {
      ThemeMode.system => Icons.brightness_auto,
      ThemeMode.light => Icons.light_mode,
      ThemeMode.dark => Icons.dark_mode,
      _ => Icons.brightness_auto,
    };

    return PopupMenuButton<ThemeMode>(
      icon: icon ?? Icon(currentIcon),
      tooltip: 'Theme mode',
      initialValue: themeMode,
      onSelected: (ThemeMode mode) {
        ref.read(themeControllerProvider.notifier).setThemeMode(mode);
      },
      itemBuilder: (BuildContext context) => [
        const PopupMenuItem(
          value: ThemeMode.system,
          child: ListTile(
            leading: Icon(Icons.brightness_auto),
            title: Text('System'),
            contentPadding: EdgeInsets.zero,
            visualDensity: VisualDensity.compact,
          ),
        ),
        const PopupMenuItem(
          value: ThemeMode.light,
          child: ListTile(
            leading: Icon(Icons.light_mode),
            title: Text('Light'),
            contentPadding: EdgeInsets.zero,
            visualDensity: VisualDensity.compact,
          ),
        ),
        const PopupMenuItem(
          value: ThemeMode.dark,
          child: ListTile(
            leading: Icon(Icons.dark_mode),
            title: Text('Dark'),
            contentPadding: EdgeInsets.zero,
            visualDensity: VisualDensity.compact,
          ),
        ),
      ],
    );
  }
}

/// A list tile for theme mode selection, useful in settings screens.
///
/// Shows the current mode and opens a bottom sheet with all options.
class ThemeModeListTile extends ConsumerWidget {
  const ThemeModeListTile({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final themeMode = ref.watch(themeModeProvider);
    final displayName = ref.watch(themeModeDisplayNameProvider);

    final IconData icon = switch (themeMode) {
      ThemeMode.system => Icons.brightness_auto,
      ThemeMode.light => Icons.light_mode,
      ThemeMode.dark => Icons.dark_mode,
      _ => Icons.brightness_auto,
    };

    return ListTile(
      leading: Icon(icon),
      title: const Text('Theme Mode'),
      subtitle: Text(displayName),
      trailing: Icon(
        Icons.chevron_right,
        color: Theme.of(context).colorScheme.onSurface.withOpacity(0.3),
      ),
      onTap: () => _showThemeModeSheet(context, ref, themeMode),
    );
  }

  void _showThemeModeSheet(
    BuildContext context,
    WidgetRef ref,
    ThemeMode currentMode,
  ) {
    showModalBottomSheet<void>(
      context: context,
      builder: (BuildContext context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Select Theme Mode',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
              ),
              const Divider(height: 0.5, thickness: 0.5),
              _buildOption(
                context,
                ref,
                ThemeMode.system,
                'System',
                'Follow device settings',
                Icons.brightness_auto,
                currentMode == ThemeMode.system,
              ),
              _buildOption(
                context,
                ref,
                ThemeMode.light,
                'Light',
                'Always use light theme',
                Icons.light_mode,
                currentMode == ThemeMode.light,
              ),
              _buildOption(
                context,
                ref,
                ThemeMode.dark,
                'Dark',
                'Always use dark theme',
                Icons.dark_mode,
                currentMode == ThemeMode.dark,
              ),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Widget _buildOption(
    BuildContext context,
    WidgetRef ref,
    ThemeMode mode,
    String title,
    String subtitle,
    IconData icon,
    bool isSelected,
  ) {
    final colorScheme = Theme.of(context).colorScheme;

    return ListTile(
      leading: Icon(
        icon,
        color: isSelected ? colorScheme.primary : null,
      ),
      title: Text(
        title,
        style: TextStyle(
          fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
        ),
      ),
      subtitle: Text(subtitle),
      trailing: isSelected
          ? Icon(Icons.check_circle, color: colorScheme.primary)
          : null,
      onTap: () {
        ref.read(themeControllerProvider.notifier).setThemeMode(mode);
        Navigator.pop(context);
      },
    );
  }
}
