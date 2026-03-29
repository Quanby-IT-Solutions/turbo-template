import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:mobile/features/todos/data/models/todo_model.dart';
import 'package:mobile/features/todos/data/todos_repository.dart';

part 'todos_provider.g.dart';

@riverpod
class TodosList extends _$TodosList {
  @override
  Future<List<TodoModel>> build() async {
    return ref.read(todosRepositoryProvider).fetchAll();
  }

  Future<void> createTodo({
    required String title,
    bool completed = false,
  }) async {
    final repo = ref.read(todosRepositoryProvider);
    final newTodo = await repo.create(title: title, completed: completed);

    final current = state.value ?? <TodoModel>[];
    state = AsyncData([...current, newTodo]);
  }

  Future<void> toggleTodo(TodoModel todo) async {
    final previousState = state;
    final todos = List<TodoModel>.from(state.value ?? <TodoModel>[]);
    final index = todos.indexWhere((t) => t.id == todo.id);
    if (index == -1) return;

    // Optimistic update
    todos[index] = todo.copyWith(completed: !todo.completed);
    state = AsyncData(todos);

    try {
      await ref.read(todosRepositoryProvider).update(
            todo.id,
            completed: !todo.completed,
          );
    } catch (e) {
      // Rollback on failure
      state = previousState;
      rethrow;
    }
  }

  Future<void> updateTodo(int id, {String? title, bool? completed}) async {
    final repo = ref.read(todosRepositoryProvider);
    final updated = await repo.update(id, title: title, completed: completed);

    final todos = List<TodoModel>.from(state.value ?? <TodoModel>[]);
    final index = todos.indexWhere((t) => t.id == id);
    if (index != -1) {
      todos[index] = updated;
      state = AsyncData(todos);
    }
  }

  Future<void> deleteTodo(int id) async {
    final previousState = state;
    final todos = List<TodoModel>.from(state.value ?? <TodoModel>[]);

    // Optimistic removal
    todos.removeWhere((t) => t.id == id);
    state = AsyncData(todos);

    try {
      await ref.read(todosRepositoryProvider).delete(id);
    } catch (e) {
      // Rollback on failure
      state = previousState;
      rethrow;
    }
  }

  Future<void> refresh() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(todosRepositoryProvider).fetchAll(),
    );
  }
}
