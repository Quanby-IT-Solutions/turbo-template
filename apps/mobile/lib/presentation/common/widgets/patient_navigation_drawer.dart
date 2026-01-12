import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

class PatientNavigationDrawer extends ConsumerWidget {
  const PatientNavigationDrawer({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final colorScheme = Theme.of(context).colorScheme;
    final user = ref.watch(currentUserProvider);

    return Drawer(
      backgroundColor: colorScheme.surfaceContainerLow,
      child: SafeArea(
        child: Column(
          children: [
            // Header with logo and brand
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: colorScheme.primary.withValues(alpha: 0.1),
                border: Border(
                  bottom: BorderSide(
                    color: colorScheme.outline.withValues(alpha: 0.1),
                  ),
                ),
              ),
              child: Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: colorScheme.primary,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      Icons.medical_services_rounded,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'QHealth',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.w700,
                            color: colorScheme.onSurface,
                            letterSpacing: -0.3,
                          ),
                        ),
                        if (user != null)
                          Text(
                            user.email,
                            style: TextStyle(
                              fontSize: 12,
                              color: colorScheme.onSurface.withValues(alpha: 0.6),
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Main Navigation Items
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(vertical: 8),
                children: [
                  _DrawerItem(
                    icon: Icons.dashboard_rounded,
                    label: 'Dashboard',
                    route: '/patient-home',
                    colorScheme: colorScheme,
                  ),
                  _DrawerItem(
                    icon: Icons.person_rounded,
                    label: 'My Profile',
                    route: '/patient-profile',
                    colorScheme: colorScheme,
                  ),
                  _DrawerItem(
                    icon: Icons.videocam_rounded,
                    label: 'Meet Doctor',
                    route: '/patient-meet-doctor',
                    colorScheme: colorScheme,
                  ),
                  _DrawerItem(
                    icon: Icons.calendar_today_rounded,
                    label: 'Schedule',
                    route: '/patient-schedule',
                    colorScheme: colorScheme,
                  ),
                  _DrawerItem(
                    icon: Icons.folder_rounded,
                    label: 'Medical Records',
                    route: '/medical-records',
                    colorScheme: colorScheme,
                  ),
                  _DrawerItem(
                    icon: Icons.check_circle_rounded,
                    label: 'Self Check',
                    route: '/vitals-self-check',
                    colorScheme: colorScheme,
                  ),
                  _DrawerItem(
                    icon: Icons.science_rounded,
                    label: 'Lab Request Management',
                    route: '/patient-lab-requests',
                    colorScheme: colorScheme,
                  ),
                  _DrawerItem(
                    icon: Icons.notifications_rounded,
                    label: 'Notifications',
                    route: '/notifications',
                    colorScheme: colorScheme,
                  ),

                  // Documents Section Header
                  Padding(
                    padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                    child: Text(
                      'Documents',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: colorScheme.onSurface.withValues(alpha: 0.5),
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),

                  _DrawerItem(
                    icon: Icons.description_rounded,
                    label: 'Medical Records',
                    route: '/medical-records',
                    colorScheme: colorScheme,
                    isSubItem: true,
                  ),
                  _DrawerItem(
                    icon: Icons.science_rounded,
                    label: 'Lab Requests',
                    route: '/patient-lab-requests',
                    colorScheme: colorScheme,
                    isSubItem: true,
                  ),
                ],
              ),
            ),

            // Footer
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                border: Border(
                  top: BorderSide(
                    color: colorScheme.outline.withValues(alpha: 0.1),
                  ),
                ),
              ),
              child: Column(
                children: [
                  ListTile(
                    leading: Icon(
                      Icons.settings_rounded,
                      color: colorScheme.onSurface.withValues(alpha: 0.7),
                    ),
                    title: Text(
                      'Settings',
                      style: TextStyle(
                        color: colorScheme.onSurface.withValues(alpha: 0.7),
                      ),
                    ),
                    onTap: () {
                      Navigator.of(context).pop();
                      context.push('/patient-profile');
                    },
                    contentPadding: EdgeInsets.zero,
                  ),
                  ListTile(
                    leading: Icon(
                      Icons.logout_rounded,
                      color: colorScheme.error,
                    ),
                    title: Text(
                      'Sign Out',
                      style: TextStyle(
                        color: colorScheme.error,
                      ),
                    ),
                    onTap: () {
                      Navigator.of(context).pop();
                      // TODO: Implement logout
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Logout functionality coming soon'),
                        ),
                      );
                    },
                    contentPadding: EdgeInsets.zero,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DrawerItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final String route;
  final ColorScheme colorScheme;
  final bool isSubItem;

  const _DrawerItem({
    required this.icon,
    required this.label,
    required this.route,
    required this.colorScheme,
    this.isSubItem = false,
  });

  @override
  Widget build(BuildContext context) {
    final currentRoute = GoRouterState.of(context).uri.toString();
    final isActive = currentRoute == route || currentRoute.startsWith('$route/');

    return ListTile(
      leading: Icon(
        icon,
        color: isActive
            ? colorScheme.primary
            : colorScheme.onSurface.withValues(alpha: 0.7),
      ),
      title: Text(
        label,
        style: TextStyle(
          fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
          color: isActive
              ? colorScheme.primary
              : colorScheme.onSurface.withValues(alpha: 0.9),
        ),
      ),
      selected: isActive,
      selectedTileColor: colorScheme.primary.withValues(alpha: 0.1),
      contentPadding: EdgeInsets.only(
        left: isSubItem ? 48 : 24,
        right: 16,
        top: 4,
        bottom: 4,
      ),
      onTap: () {
        Navigator.of(context).pop();
        if (currentRoute != route) {
          context.push(route);
        }
      },
    );
  }
}
