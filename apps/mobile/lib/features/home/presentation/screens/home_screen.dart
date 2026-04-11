import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:persistent_bottom_nav_bar_v2/persistent_bottom_nav_bar_v2.dart';
import 'package:showcaseview/showcaseview.dart';
import 'package:mobile/core/navigation/navigation_provider.dart';
import 'package:mobile/core/widgets/tour_item.dart';
import 'package:mobile/features/home/presentation/providers/tour_provider.dart';
import 'package:mobile/features/home/presentation/widgets/dashboard_tab.dart';
import 'package:mobile/features/profile/presentation/screens/profile_screen.dart';
import 'package:mobile/features/todos/presentation/screens/todos_screen.dart';
import 'package:mobile/features/home/presentation/widgets/settings_tab.dart';
import 'package:mobile/features/auth/presentation/providers/auth_provider.dart';
import 'package:mobile/services/storage/tour_storage_service.dart';

class HomeScreen extends ConsumerStatefulWidget {
  const HomeScreen({super.key});

  @override
  ConsumerState<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends ConsumerState<HomeScreen> {
  bool _checkedFirstRun = false;
  final _showcaseKey = GlobalKey<ShowCaseWidgetState>();
  final _tabController = PersistentTabController(initialIndex: 0);

  /// Number of tabs in the bottom nav. Keep in sync with [_buildBody].
  static const _tabCount = 4;

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  /// Cycle through every tab so that each tab's [TourItem] widgets mount
  /// and register with [TourRegistry], then return to tab 0 and start
  /// the showcase.  Each jump is separated by a frame so the widget tree
  /// has time to build.
  Future<void> _ensureAllTabsMountedThenStart() async {
    for (var i = 0; i < _tabCount; i++) {
      _tabController.jumpToTab(i);
      // Wait one frame so the tab's widget tree builds.
      await Future<void>.delayed(Duration.zero);
      await WidgetsBinding.instance.endOfFrame;
    }
    // Return to first tab before the tour begins.
    _tabController.jumpToTab(0);
    ref.read(navigationControllerProvider.notifier).setTab(0);
    await WidgetsBinding.instance.endOfFrame;

    _showcaseKey.currentState
        ?.startShowCase(TourRegistry.instance.orderedKeys);
  }

  @override
  Widget build(BuildContext context) {
    // Listen for "Take a Tour" trigger from settings.
    ref.listen(tourTriggerProvider, (prev, next) {
      if (next) {
        ref.read(tourTriggerProvider.notifier).reset();
        _ensureAllTabsMountedThenStart();
      }
    });

    return ShowCaseWidget(
      key: _showcaseKey,
      onStart: (index, key) {
        // Auto-navigate to the tab that owns the next showcase target.
        final tabIndex = TourRegistry.instance.tabForKey(key);
        if (tabIndex != null && _tabController.index != tabIndex) {
          _tabController.jumpToTab(tabIndex);
          ref.read(navigationControllerProvider.notifier).setTab(tabIndex);
        }
      },
      onFinish: () {
        final userId = ref.read(currentUserProvider)?.id;
        if (userId != null) {
          ref.read(tourStorageServiceProvider).completeTour(userId);
        }
      },
      builder: (showcaseContext) => _buildBody(),
    );
  }

  Widget _buildBody() {
    final theme = Theme.of(context);

    // Auto-start the tour for first-time users, once.
    if (!_checkedFirstRun) {
      _checkedFirstRun = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        final userId = ref.read(currentUserProvider)?.id;
        if (userId == null) return;
        final hasCompleted =
            ref.read(tourStorageServiceProvider).hasCompletedTour(userId);
        if (!hasCompleted) {
          _ensureAllTabsMountedThenStart();
        }
      });
    }

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
          screen: const ProfileScreen(),
          item: ItemConfig(
            icon: const Icon(Icons.person_outlined),
            title: 'Profile',
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
      navBarBuilder: (navBarConfig) => TourItem(
        tabIndex: null,
        order: 999,
        title: 'Navigation',
        description: 'Switch between Home, Todos, and Settings tabs',
        child: Style1BottomNavBar(
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
      ),
      controller: _tabController,
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
