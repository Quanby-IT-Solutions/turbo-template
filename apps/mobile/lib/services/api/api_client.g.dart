// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'api_client.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Provider for [Dio].
///
/// Overridden in main.dart with an eagerly created instance so the client
/// is available synchronously via `ref.read`.

@ProviderFor(dio)
const dioProvider = DioProvider._();

/// Provider for [Dio].
///
/// Overridden in main.dart with an eagerly created instance so the client
/// is available synchronously via `ref.read`.

final class DioProvider extends $FunctionalProvider<Dio, Dio, Dio>
    with $Provider<Dio> {
  /// Provider for [Dio].
  ///
  /// Overridden in main.dart with an eagerly created instance so the client
  /// is available synchronously via `ref.read`.
  const DioProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'dioProvider',
        isAutoDispose: false,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$dioHash();

  @$internal
  @override
  $ProviderElement<Dio> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  Dio create(Ref ref) {
    return dio(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(Dio value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<Dio>(value),
    );
  }
}

String _$dioHash() => r'2ef0206054767ce9629e26a8223f386ed0a3475d';
