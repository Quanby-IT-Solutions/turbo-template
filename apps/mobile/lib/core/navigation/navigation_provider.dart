import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'navigation_provider.g.dart';

/// Provider for the PersistentTabController to manage bottom navigation state.
///
/// This allows other parts of the app to programmatically control navigation,
/// such as switching tabs or getting the current tab index.
@riverpod
class NavigationController extends _$NavigationController {
  @override
  int build() => 0;

  void setTab(int index) {
    state = index;
  }
}
