import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/core/responsive/responsive_config.dart';

class ResponsiveNavigation extends StatelessWidget {
  final Widget child;
  final List<NavigationItem> navigationItems;
  final int currentIndex;
  final Function(int) onItemTapped;

  const ResponsiveNavigation({
    super.key,
    required this.child,
    required this.navigationItems,
    required this.currentIndex,
    required this.onItemTapped,
  });

  @override
  Widget build(BuildContext context) {
    final navigationType = context.navigationType;

    switch (navigationType) {
      case NavigationType.drawer:
        return _buildDrawerNavigation(context);
      case NavigationType.rail:
        return _buildRailNavigation(context);
      case NavigationType.bottom:
        return _buildBottomNavigation(context);
    }
  }

  Widget _buildDrawerNavigation(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('TeleMed')),
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(color: Colors.blue),
              child: Text(
                'TeleMed',
                style: TextStyle(color: Colors.white, fontSize: 24),
              ),
            ),
            ...navigationItems.asMap().entries.map((entry) {
              final index = entry.key;
              final item = entry.value;
              return ListTile(
                leading: Icon(item.icon),
                title: Text(item.label),
                selected: currentIndex == index,
                onTap: () {
                  Navigator.pop(context);
                  onItemTapped(index);
                },
              );
            }),
          ],
        ),
      ),
      body: child,
    );
  }

  Widget _buildRailNavigation(BuildContext context) {
    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            selectedIndex: currentIndex,
            onDestinationSelected: onItemTapped,
            labelType: NavigationRailLabelType.all,
            destinations: navigationItems
                .map(
                  (item) => NavigationRailDestination(
                    icon: Icon(item.icon),
                    label: Text(item.label),
                  ),
                )
                .toList(),
          ),
          const VerticalDivider(thickness: 1, width: 1),
          Expanded(child: child),
        ],
      ),
    );
  }

  Widget _buildBottomNavigation(BuildContext context) {
    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: currentIndex,
        onTap: onItemTapped,
        items: navigationItems
            .map(
              (item) => BottomNavigationBarItem(
                icon: Icon(item.icon),
                label: item.label,
              ),
            )
            .toList(),
      ),
    );
  }
}

class NavigationItem {
  final IconData icon;
  final String label;
  final String route;

  const NavigationItem({
    required this.icon,
    required this.label,
    required this.route,
  });
}

abstract class ResponsiveNavigationHelper {
  static List<NavigationItem> getDoctorNavigationItems() {
    return [
      const NavigationItem(
        icon: Icons.home,
        label: 'Dashboard',
        route: '/doctor-home',
      ),
      const NavigationItem(
        icon: Icons.calendar_today,
        label: 'Schedule',
        route: '/doctor-availability',
      ),
      const NavigationItem(
        icon: Icons.people,
        label: 'Patients',
        route: '/appointment-requests',
      ),
      const NavigationItem(
        icon: Icons.notifications,
        label: 'Notifications',
        route: '/notifications',
      ),
    ];
  }

  static List<NavigationItem> getPatientNavigationItems() {
    return [
      const NavigationItem(
        icon: Icons.home,
        label: 'Home',
        route: '/patient-home',
      ),
      const NavigationItem(
        icon: Icons.calendar_today,
        label: 'Appointments',
        route: '/doctor-search',
      ),
      const NavigationItem(
        icon: Icons.history,
        label: 'Records',
        route: '/consultations-history',
      ),
      const NavigationItem(
        icon: Icons.notifications,
        label: 'Notifications',
        route: '/notifications',
      ),
    ];
  }

  static void handleNavigation(BuildContext context, String route) {
    context.push(route);
  }
}
