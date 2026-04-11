import 'package:dio/dio.dart';
import 'package:mobile/core/constants/api_constants.dart';
import 'package:mobile/features/todos/data/models/todo_model.dart';
import 'package:mobile/services/api/api_client.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'todos_repository.g.dart';

/// Repository for the oRPC-based todos endpoints.
///
/// The NestJS backend wraps responses in `{ data: ... }` for the oRPC
/// contract, so we unwrap accordingly.
class TodosRepository {
  TodosRepository(this._dio);

  final Dio _dio;

  Future<List<TodoModel>> fetchAll() async {
    final response = await _dio.get(ApiConstants.todos);
    final list = response.data as List<dynamic>;
    return list
        .map((e) => TodoModel.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<TodoModel> create({
    required String title,
    bool completed = false,
  }) async {
    final response = await _dio.post(
      ApiConstants.todos,
      data: {'title': title, 'completed': completed},
    );
    return TodoModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<TodoModel> update(
    int id, {
    String? title,
    bool? completed,
  }) async {
    final data = <String, dynamic>{};
    if (title != null) data['title'] = title;
    if (completed != null) data['completed'] = completed;

    final response = await _dio.put(
      ApiConstants.todoById(id),
      data: data,
    );
    return TodoModel.fromJson(response.data as Map<String, dynamic>);
  }

  Future<void> delete(int id) async {
    await _dio.delete(ApiConstants.todoById(id));
  }
}

@riverpod
TodosRepository todosRepository(Ref ref) {
  final dio = ref.watch(dioProvider);
  return TodosRepository(dio);
}
