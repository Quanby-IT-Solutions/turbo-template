import 'package:flutter/material.dart';
import 'package:mobile/services/notifications/notification_service.dart';
import 'package:mobile/shared/widgets/section_header.dart';
import 'package:mobile/shared/widgets/settings_group.dart';

/// A Settings section that links to the OS notification settings, shown only
/// while notifications are off.
///
/// The app asks for permission once (see
/// [NotificationService.requestPermissionIfNeeded]); after a denial this is
/// the only way back to the OS page. The state is re-read when the app
/// resumes, so the section disappears once the user turns notifications on
/// and returns.
class NotificationSettingsTile extends StatefulWidget {
  const NotificationSettingsTile({super.key});

  @override
  State<NotificationSettingsTile> createState() =>
      _NotificationSettingsTileState();
}

class _NotificationSettingsTileState extends State<NotificationSettingsTile>
    with WidgetsBindingObserver {
  bool _allowed = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _refresh();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _refresh();
  }

  Future<void> _refresh() async {
    final allowed = await NotificationService.instance.isAllowed();
    if (mounted) setState(() => _allowed = allowed);
  }

  @override
  Widget build(BuildContext context) {
    if (_allowed) return const SizedBox.shrink();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SectionHeader(title: 'Notifications'),
        SettingsGroup(
          children: [
            // The group paints a card background; a Material lets the tile's
            // tap ink show above it.
            Material(
              type: MaterialType.transparency,
              child: ListTile(
                leading: const Icon(Icons.notifications_off_outlined),
                title: const Text('Turn on notifications'),
                subtitle: const Text('Opens your device settings'),
                trailing: Icon(
                  Icons.chevron_right,
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withValues(alpha: 0.3),
                ),
                onTap: NotificationService.instance.openSystemSettings,
              ),
            ),
          ],
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}
