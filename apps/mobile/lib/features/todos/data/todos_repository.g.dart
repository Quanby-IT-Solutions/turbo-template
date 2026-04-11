// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'todos_repository.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(todosRepository)
const todosRepositoryProvider = TodosRepositoryProvider._();

final class TodosRepositoryProvider
    extends
        $FunctionalProvider<TodosRepository, TodosRepository, TodosRepository>
    with $Provider<TodosRepository> {
  const TodosRepositoryProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'todosRepositoryProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$todosRepositoryHash();

  @$internal
  @override
  $ProviderElement<TodosRepository> $createElement($ProviderPointer pointer) =>
      $ProviderElement(pointer);

  @override
  TodosRepository create(Ref ref) {
    return todosRepository(ref);
  }

  /// {@macro riverpod.override_with_value}
  Override overrideWithValue(TodosRepository value) {
    return $ProviderOverride(
      origin: this,
      providerOverride: $SyncValueProvider<TodosRepository>(value),
    );
  }
}

String _$todosRepositoryHash() => r'2ba487cc0ff9e4b2226fd13d1c0f421ef80e5836';
