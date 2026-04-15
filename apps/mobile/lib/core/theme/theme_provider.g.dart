// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'theme_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Provider for the theme state with persistence.

@ProviderFor(ThemeController)
const themeControllerProvider = ThemeControllerProvider._();

/// Provider for the theme state with persistence.
final class ThemeControllerProvider
    extends $NotifierProvider<ThemeController, ThemeState> {
  /// Provider for the theme state with persistence.
  const ThemeControllerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'themeControllerProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$themeControllerHash();

  @$internal
  @override
  ThemeController create() => ThemeController();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ThemeState value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ThemeState>(value),
    );
  }
}

String _$themeControllerHash() => r'ff0a04376147d806175952d2fb6da5c1e31ae90d';

/// Provider for the theme state with persistence.

abstract class _$ThemeController extends $Notifier<ThemeState> {
  ThemeState build();
  @$mustCallSuper
  @override
  void runBuild() {
    final created = build();
    final ref = this.ref as $Ref<ThemeState, ThemeState>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<ThemeState, ThemeState>,
              ThemeState,
              Object?,
              Object?
            >;
    element.handleValue(ref, created);
  }
}

/// Provider for the current theme mode.

@ProviderFor(themeMode)
const themeModeProvider = ThemeModeProvider._();

/// Provider for the current theme mode.

final class ThemeModeProvider
    extends $FunctionalProvider<ThemeMode, ThemeMode, ThemeMode>
    with $Provider<ThemeMode> {
  /// Provider for the current theme mode.
  const ThemeModeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'themeModeProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$themeModeHash();

  @$internal
  @override
  $ProviderElement<ThemeMode> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ThemeMode create(Ref ref) {
    return themeMode(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ThemeMode value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ThemeMode>(value),
    );
  }
}

String _$themeModeHash() => r'6571dfbff64abe33db03bbd0c932480da33bd481';

/// Provider for the current color scheme.

@ProviderFor(appColorScheme)
const appColorSchemeProvider = AppColorSchemeProvider._();

/// Provider for the current color scheme.

final class AppColorSchemeProvider
    extends $FunctionalProvider<AppColorScheme, AppColorScheme, AppColorScheme>
    with $Provider<AppColorScheme> {
  /// Provider for the current color scheme.
  const AppColorSchemeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'appColorSchemeProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$appColorSchemeHash();

  @$internal
  @override
  $ProviderElement<AppColorScheme> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  AppColorScheme create(Ref ref) {
    return appColorScheme(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(AppColorScheme value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<AppColorScheme>(value),
    );
  }
}

String _$appColorSchemeHash() => r'716c3d7b85f87bf830a072c0a6d7ad946c16fa2c';

/// Provider for the light theme based on the current color scheme.

@ProviderFor(lightTheme)
const lightThemeProvider = LightThemeProvider._();

/// Provider for the light theme based on the current color scheme.

final class LightThemeProvider
    extends $FunctionalProvider<ThemeData, ThemeData, ThemeData>
    with $Provider<ThemeData> {
  /// Provider for the light theme based on the current color scheme.
  const LightThemeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'lightThemeProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$lightThemeHash();

  @$internal
  @override
  $ProviderElement<ThemeData> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ThemeData create(Ref ref) {
    return lightTheme(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ThemeData value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ThemeData>(value),
    );
  }
}

String _$lightThemeHash() => r'8e201569fa01678786775dee0dd8c6f491b451ac';

/// Provider for the dark theme based on the current color scheme.

@ProviderFor(darkTheme)
const darkThemeProvider = DarkThemeProvider._();

/// Provider for the dark theme based on the current color scheme.

final class DarkThemeProvider
    extends $FunctionalProvider<ThemeData, ThemeData, ThemeData>
    with $Provider<ThemeData> {
  /// Provider for the dark theme based on the current color scheme.
  const DarkThemeProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'darkThemeProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$darkThemeHash();

  @$internal
  @override
  $ProviderElement<ThemeData> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  ThemeData create(Ref ref) {
    return darkTheme(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(ThemeData value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<ThemeData>(value),
    );
  }
}

String _$darkThemeHash() => r'38745035d555ae7192c5a129612f8d08a1ff2be3';

/// Provider that returns a display name for the current theme mode.

@ProviderFor(themeModeDisplayName)
const themeModeDisplayNameProvider = ThemeModeDisplayNameProvider._();

/// Provider that returns a display name for the current theme mode.

final class ThemeModeDisplayNameProvider
    extends $FunctionalProvider<String, String, String>
    with $Provider<String> {
  /// Provider that returns a display name for the current theme mode.
  const ThemeModeDisplayNameProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'themeModeDisplayNameProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$themeModeDisplayNameHash();

  @$internal
  @override
  $ProviderElement<String> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  String create(Ref ref) {
    return themeModeDisplayName(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(String value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<String>(value),
    );
  }
}

String _$themeModeDisplayNameHash() =>
    r'f18b6f607fec9af6106ae8296f392fb573d045fd';
