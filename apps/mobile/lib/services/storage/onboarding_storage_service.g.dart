// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'onboarding_storage_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Provider for [OnboardingStorageService].

@ProviderFor(onboardingStorageService)
const onboardingStorageServiceProvider = OnboardingStorageServiceProvider._();

/// Provider for [OnboardingStorageService].

final class OnboardingStorageServiceProvider
    extends
        $FunctionalProvider<
          OnboardingStorageService,
          OnboardingStorageService,
          OnboardingStorageService
        >
    with $Provider<OnboardingStorageService> {
  /// Provider for [OnboardingStorageService].
  const OnboardingStorageServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'onboardingStorageServiceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$onboardingStorageServiceHash();

  @$internal
  @override
  $ProviderElement<OnboardingStorageService> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  OnboardingStorageService create(Ref ref) {
    return onboardingStorageService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(OnboardingStorageService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<OnboardingStorageService>(value),
    );
  }
}

String _$onboardingStorageServiceHash() =>
    r'0be38fa85f8615db44bebf6bcc6ccae6f225d30d';
