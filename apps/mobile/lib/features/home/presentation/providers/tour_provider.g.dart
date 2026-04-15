// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'tour_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning
/// Manages the "Take a Tour" trigger signal.

@ProviderFor(TourTrigger)
const tourTriggerProvider = TourTriggerProvider._();

/// Manages the "Take a Tour" trigger signal.
final class TourTriggerProvider extends $NotifierProvider<TourTrigger, bool> {
  /// Manages the "Take a Tour" trigger signal.
  const TourTriggerProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'tourTriggerProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$tourTriggerHash();

  @$internal
  @override
  TourTrigger create() => TourTrigger();

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(bool value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<bool>(value),
    );
  }
}

String _$tourTriggerHash() => r'96051f15c9e176d7dad51cdaaed94b6a638c738d';

/// Manages the "Take a Tour" trigger signal.

abstract class _$TourTrigger extends $Notifier<bool> {
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
