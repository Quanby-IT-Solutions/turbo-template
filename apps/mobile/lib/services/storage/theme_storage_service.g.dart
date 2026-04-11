// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'theme_storage_service.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Provider for [ThemeStorageService].
///
/// Depends on [sharedPreferencesProvider] which must be overridden in
/// main.dart before use.

@ProviderFor(themeStorageService)
const themeStorageServiceProvider = ThemeStorageServiceProvider._();

/// Provider for [ThemeStorageService].
///
/// Depends on [sharedPreferencesProvider] which must be overridden in
/// main.dart before use.

final class ThemeStorageServiceProvider
    extends
        $FunctionalProvider<
          ThemeStorageService,
          ThemeStorageService,
          ThemeStorageService
        >
    with $Provider<ThemeStorageService> {
  /// Provider for [ThemeStorageService].
  ///
  /// Depends on [sharedPreferencesProvider] which must be overridden in
  /// main.dart before use.
  const ThemeStorageServiceProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'themeStorageServiceProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$themeStorageServiceHash();

  @$internal
  @override
  $ProviderElement<ThemeStorageService> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  ThemeStorageService create(Ref ref) {
    return themeStorageService(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ThemeStorageService value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ThemeStorageService>(value),
    );
  }
}

String _$themeStorageServiceHash() =>
    r'aff517c7baf2f26c983766af9861d9bc21064eb5';

/// Provider for [SharedPreferences].
///
/// Must be overridden in main.dart with an eagerly initialised instance.

@ProviderFor(sharedPreferences)
const sharedPreferencesProvider = SharedPreferencesProvider._();

/// Provider for [SharedPreferences].
///
/// Must be overridden in main.dart with an eagerly initialised instance.

final class SharedPreferencesProvider
    extends
        $FunctionalProvider<
          SharedPreferences,
          SharedPreferences,
          SharedPreferences
        >
    with $Provider<SharedPreferences> {
  /// Provider for [SharedPreferences].
  ///
  /// Must be overridden in main.dart with an eagerly initialised instance.
  const SharedPreferencesProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'sharedPreferencesProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$sharedPreferencesHash();

  @$internal
  @override
  $ProviderElement<SharedPreferences> $createElement(
    $ProviderPointer pointer,
  ) => $ProviderElement(pointer);

  @override
  SharedPreferences create(Ref ref) {
    return sharedPreferences(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(SharedPreferences value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<SharedPreferences>(value),
    );
  }
}

String _$sharedPreferencesHash() => r'98f63376f52c5d86a41d57af2db15810d27f528b';
