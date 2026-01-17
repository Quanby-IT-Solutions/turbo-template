import 'package:animated_bottom_navigation_bar/animated_bottom_navigation_bar.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:mobile/presentation/auth/providers/auth_providers.dart';

class SelectedIndexNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void setIndex(int index) => state = index;
}

final selectedIndexProvider = NotifierProvider<SelectedIndexNotifier, int>(
  SelectedIndexNotifier.new,
);

class _DoctorIndexNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void setIndex(int index) => state = index;
}

class _PatientIndexNotifier extends Notifier<int> {
  @override
  int build() => 0;

  void setIndex(int index) => state = index;
}

final _doctorIndexProvider = NotifierProvider<_DoctorIndexNotifier, int>(
  _DoctorIndexNotifier.new,
);
final _patientIndexProvider = NotifierProvider<_PatientIndexNotifier, int>(
  _PatientIndexNotifier.new,
);

class AnimatedNavWrapper extends ConsumerWidget {
  final Widget child;

  const AnimatedNavWrapper({super.key, required this.child});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(currentUserProvider);
    final isDoctor = user?.isDoctor ?? false;

    final doctorDestinations = const [
      _NavDestination(
        icon: Icons.dashboard_rounded,
        route: '/doctor-home',
        semanticLabel: 'Dashboard',
      ),
      _NavDestination(
        icon: Icons.schedule_rounded,
        route: '/appointment-requests',
        semanticLabel: 'Schedule',
      ),
      _NavDestination(
        icon: Icons.people_alt_rounded,
        route: '/doctor-patients',
        semanticLabel: 'Patients',
      ),
      _NavDestination(
        icon: Icons.notifications_rounded,
        route: '/notifications',
        semanticLabel: 'Notifications',
      ),
    ];

    final patientDestinations = const [
      _NavDestination(
        icon: Icons.home_rounded,
        route: '/patient-home',
        semanticLabel: 'Home',
      ),
      _NavDestination(
        icon: Icons.folder_special_rounded,
        route: '/medical-records',
        semanticLabel: 'Records',
      ),
      // Self Check is the FAB in the center, so we have 4 nav items + FAB = 5 total items
      _NavDestination(
        icon: Icons.science_rounded,
        route: '/patient-lab-requests',
        semanticLabel: 'Lab Requests',
      ),
      _NavDestination(
        icon: Icons.notifications_rounded,
        route: '/notifications',
        semanticLabel: 'Notifications',
      ),
    ];

    final destinations = isDoctor ? doctorDestinations : patientDestinations;

    final doctorIndex = ref.watch(_doctorIndexProvider);
    final patientIndex = ref.watch(_patientIndexProvider);
    final navNotifier = ref.read(selectedIndexProvider.notifier);

    final currentIndex = isDoctor ? doctorIndex : patientIndex;
    final currentLocation = GoRouterState.of(context).uri.toString();
    final computedIndex = _resolveIndex(currentLocation, destinations);

    var resolvedIndex = computedIndex ?? currentIndex;
    if (resolvedIndex >= destinations.length || resolvedIndex < 0) {
      resolvedIndex = 0;
    }

    if (computedIndex != null && resolvedIndex != currentIndex) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!context.mounted) {
          return;
        }

        navNotifier.setIndex(resolvedIndex);
        if (isDoctor) {
          ref.read(_doctorIndexProvider.notifier).setIndex(resolvedIndex);
        } else {
          ref.read(_patientIndexProvider.notifier).setIndex(resolvedIndex);
        }
      });
    }

    final fabConfig = isDoctor
        ? const _FabConfig(
            icon: Icons.video_call_rounded,
            route: '/video-call',
            tooltip: 'Start consultation',
          )
        : const _FabConfig(
            icon: Icons.center_focus_strong_rounded,
            route: '/vitals-self-check',
            tooltip: 'Scan Vitals',
          );

    final icons = destinations.map((destination) => destination.icon).toList();
    
    // With 5 patient items, use GapLocation.center which places the gap between items 2 and 3
    // This makes Self Check (item 3) appear next to the FAB, creating a visually centered layout
    // For doctors with 4 items (even), GapLocation.center works perfectly
    final gapLocation = GapLocation.center;
    
    // With GapLocation.center, we can use rounded corners on both sides
    final rightCornerRadius = 32.0;
    
    // FAB location matches gap location (center)
    final fabLocation = FloatingActionButtonLocation.centerDocked;

    return Scaffold(
      body: child,
      floatingActionButton: FloatingActionButton(
        key: ValueKey('fab_${isDoctor ? 'doctor' : 'patient'}'),
        onPressed: () => context.push(fabConfig.route),
        backgroundColor: Theme.of(context).primaryColor,
        tooltip: fabConfig.tooltip,
        child: Icon(fabConfig.icon, color: Colors.white, size: 28),
      ),
      floatingActionButtonLocation: fabLocation,
      bottomNavigationBar: AnimatedBottomNavigationBar(
        icons: icons,
        activeIndex: resolvedIndex,
        gapLocation: gapLocation,
        notchSmoothness: NotchSmoothness.verySmoothEdge,
        leftCornerRadius: 32,
        rightCornerRadius: rightCornerRadius,
        onTap: (index) {
          navNotifier.setIndex(index);
          if (isDoctor) {
            ref.read(_doctorIndexProvider.notifier).setIndex(index);
          } else {
            ref.read(_patientIndexProvider.notifier).setIndex(index);
          }

          final destination = destinations[index];
          final destinationRoute = destination.route;
          if (currentLocation != destinationRoute) {
            context.go(destinationRoute);
          }
        },
        activeColor: Theme.of(context).primaryColor,
        inactiveColor: Colors.grey,
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        splashColor: Theme.of(context).primaryColor.withValues(alpha: 0.1),
        splashSpeedInMilliseconds: 300,
        elevation: 8,
        shadow: BoxShadow(
          offset: const Offset(0, -1),
          blurRadius: 12,
          spreadRadius: 0.5,
          color: Colors.grey.withValues(alpha: 0.3),
        ),
      ),
    );
  }
}

int? _resolveIndex(String currentLocation, List<_NavDestination> destinations) {
  final path = currentLocation.split('?').first;
  for (var i = 0; i < destinations.length; i++) {
    if (path == destinations[i].route) {
      return i;
    }
  }
  return null;
}

class _NavDestination {
  const _NavDestination({
    required this.icon,
    required this.route,
    required this.semanticLabel,
  });

  final IconData icon;
  final String route;
  final String semanticLabel;
}

class _FabConfig {
  const _FabConfig({
    required this.icon,
    required this.route,
    required this.tooltip,
  });

  final IconData icon;
  final String route;
  final String tooltip;
}
