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
    r'bdee14f8b4e23738ba2c267156c2d18423d9e0f3';

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

/// Provider for the current navigation tab index.

@ProviderFor(currentTabIndex)
const currentTabIndexProvider = CurrentTabIndexProvider._();

/// Provider for the current navigation tab index.

final class CurrentTabIndexProvider extends $FunctionalProvider<int, int, int>
    with $Provider<int> {
  /// Provider for the current navigation tab index.
  const CurrentTabIndexProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'currentTabIndexProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$currentTabIndexHash();

  @$internal
  @override
  $ProviderElement<int> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  int create(Ref ref) {
    return currentTabIndex(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(int value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<int>(value),
    );
  }
}

String _$currentTabIndexHash() => r'34f3ea7de9e179cc1645d860cb8c9457ff3bcb41';
