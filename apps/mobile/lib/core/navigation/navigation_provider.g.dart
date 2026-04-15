// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'navigation_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Provider for the PersistentTabController to manage bottom navigation state.
///
/// This allows other parts of the app to programmatically control navigation,
/// such as switching tabs or getting the current tab index.

@ProviderFor(NavigationController)
const navigationControllerProvider = NavigationControllerProvider._();

/// Provider for the PersistentTabController to manage bottom navigation state.
///
/// This allows other parts of the app to programmatically control navigation,
/// such as switching tabs or getting the current tab index.
final class NavigationControllerProvider
    extends $NotifierProvider<NavigationController, int> {
  /// Provider for the PersistentTabController to manage bottom navigation state.
  ///
  /// This allows other parts of the app to programmatically control navigation,
  /// such as switching tabs or getting the current tab index.
  const NavigationControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'navigationControllerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$navigationControllerHash();

  @$internal
  @override
  NavigationController create() => NavigationController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(int value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<int>(value),
    );
  }
}

String _$navigationControllerHash() =>
    r'e038a483d8d6065259835c2fdd025d2aca6c33b1';

/// Provider for the PersistentTabController to manage bottom navigation state.
///
/// This allows other parts of the app to programmatically control navigation,
/// such as switching tabs or getting the current tab index.

abstract class _$NavigationController extends $Notifier<int> {
  int build();
  @$mustCallSuper
  @override
  void runBuild() {
    final created = build();
    final ref = this.ref as $Ref<int, int>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<int, int>,
              int,
              Object?,
              Object?
            >;
    element.handleValue(ref, created);
  }
}
