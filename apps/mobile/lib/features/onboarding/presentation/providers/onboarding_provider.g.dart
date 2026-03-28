// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'onboarding_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Provider that manages onboarding completion state.
///
/// This provider is kept alive to maintain state throughout the app lifecycle.
/// It reads and writes to SharedPreferences via OnboardingStorageService.

@ProviderFor(OnboardingState)
const onboardingStateProvider = OnboardingStateProvider._();

/// Provider that manages onboarding completion state.
///
/// This provider is kept alive to maintain state throughout the app lifecycle.
/// It reads and writes to SharedPreferences via OnboardingStorageService.
final class OnboardingStateProvider
    extends $NotifierProvider<OnboardingState, bool> {
  /// Provider that manages onboarding completion state.
  ///
  /// This provider is kept alive to maintain state throughout the app lifecycle.
  /// It reads and writes to SharedPreferences via OnboardingStorageService.
  const OnboardingStateProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'onboardingStateProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$onboardingStateHash();

  @$internal
  @override
  OnboardingState create() => OnboardingState();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }
}

String _$onboardingStateHash() => r'01e9bb879864890e25b665b7725bd65ab31b45d7';

/// Provider that manages onboarding completion state.
///
/// This provider is kept alive to maintain state throughout the app lifecycle.
/// It reads and writes to SharedPreferences via OnboardingStorageService.

abstract class _$OnboardingState extends $Notifier<bool> {
  bool build();
  @$mustCallSuper
  @override
  void runBuild() {
    final created = build();
    final ref = this.ref as $Ref<bool, bool>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<bool, bool>,
              bool,
              Object?,
              Object?
            >;
    element.handleValue(ref, created);
  }
}

/// Convenience provider to check if onboarding has been completed.

@ProviderFor(hasCompletedOnboarding)
const hasCompletedOnboardingProvider = HasCompletedOnboardingProvider._();

/// Convenience provider to check if onboarding has been completed.

final class HasCompletedOnboardingProvider
    extends $FunctionalProvider<bool, bool, bool>
    with $Provider<bool> {
  /// Convenience provider to check if onboarding has been completed.
  const HasCompletedOnboardingProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'hasCompletedOnboardingProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$hasCompletedOnboardingHash();

  @$internal
  @override
  $ProviderElement<bool> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  bool create(Ref ref) {
    return hasCompletedOnboarding(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }
}

String _$hasCompletedOnboardingHash() =>
    r'e0df33a72bcbc589fdc45e857b17e902278327e6';
