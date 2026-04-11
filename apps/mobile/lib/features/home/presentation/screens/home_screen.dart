import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:persistent_bottom_nav_bar_v2/persistent_bottom_nav_bar_v2.dart';
import 'package:mobile/core/navigation/navigation_provider.dart';
import 'package:mobile/features/home/presentation/widgets/dashboard_tab.dart';
import 'package:mobile/features/todos/presentation/screens/todos_screen.dart';
import 'package:mobile/features/home/presentation/widgets/settings_tab.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final currentIndex = ref.watch(navigationControllerProvider);
    final theme = Theme.of(context);

    return PersistentTabView(
      tabs: [
        PersistentTabConfig(
          screen: const DashboardTab(),
          item: ItemConfig(
            icon: const Icon(Icons.home_outlined),
            title: 'Home',
            activeForegroundColor: theme.colorScheme.primary,
            inactiveForegroundColor: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        PersistentTabConfig(
          screen: const TodosScreen(),
          item: ItemConfig(
            icon: const Icon(Icons.checklist_outlined),
            title: 'Todos',
            activeForegroundColor: theme.colorScheme.primary,
            inactiveForegroundColor: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        PersistentTabConfig(
          screen: const SettingsTab(),
          item: ItemConfig(
            icon: const Icon(Icons.settings_outlined),
            title: 'Settings',
            activeForegroundColor: theme.colorScheme.primary,
            inactiveForegroundColor: theme.colorScheme.onSurfaceVariant,
          ),
        ),
      ],
      navBarBuilder: (navBarConfig) => Style1BottomNavBar(
        navBarConfig: navBarConfig,
        navBarDecoration: NavBarDecoration(
          color: theme.colorScheme.surface,
          border: Border(
            top: BorderSide(
              color: theme.colorScheme.outlineVariant,
              width: 0.5,
            ),
          ),
        ),
      ),
      controller: PersistentTabController(initialIndex: currentIndex),
      onTabChanged: (index) {
        ref.read(navigationControllerProvider.notifier).setTab(index);
      },
      backgroundColor: theme.colorScheme.surface,
      handleAndroidBackButtonPress: true,
      stateManagement: true,
      screenTransitionAnimation: const ScreenTransitionAnimation(
        curve: Curves.ease,
        duration: Duration(milliseconds: 200),
      ),
    );
  }
}
