// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'todos_provider.dart';

// **************************************************************************
// RiverpodGenerator
// **************************************************************************

// GENERATED CODE - DO NOT MODIFY BY HAND
// ignore_for_file: type=lint, type=warning

@ProviderFor(TodosList)
const todosListProvider = TodosListProvider._();

final class TodosListProvider
    extends $AsyncNotifierProvider<TodosList, List<TodoModel>> {
  const TodosListProvider._()
    : super(
        from: null,
        argument: null,
        retry: null,
        name: r'todosListProvider',
        isAutoDispose: true,
        dependencies: null,
        $allTransitiveDependencies: null,
      );

  @override
  String debugGetCreateSourceHash() => _$todosListHash();

  @$internal
  @override
  TodosList create() => TodosList();
}

String _$todosListHash() => r'1063d4222ea559eae604dcdff51f003fb1a9e381';

abstract class _$TodosList extends $AsyncNotifier<List<TodoModel>> {
  FutureOr<List<TodoModel>> build();
  @$mustCallSuper
  @override
  void runBuild() {
    final created = build();
    final ref = this.ref as $Ref<AsyncValue<List<TodoModel>>, List<TodoModel>>;
    final element =
        ref.element
            as $ClassProviderElement<
              AnyNotifier<AsyncValue<List<TodoModel>>, List<TodoModel>>,
              AsyncValue<List<TodoModel>>,
              Object?,
              Object?
            >;
    element.handleValue(ref, created);
  }
}
