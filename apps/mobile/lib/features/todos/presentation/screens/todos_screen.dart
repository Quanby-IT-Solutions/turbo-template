import 'package:flutter/material.dart';
import 'package:mobile/core/theme/app_styles.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:toastification/toastification.dart';
import 'package:mobile/core/widgets/tour_item.dart';
import 'package:mobile/features/todos/data/models/todo_model.dart';
import 'package:mobile/features/todos/presentation/providers/todos_provider.dart';
import 'package:mobile/shared/widgets/task_tile.dart';
import 'package:mobile/shared/widgets/app_text_field.dart';
import 'package:mobile/shared/widgets/app_button.dart';

class TodosScreen extends ConsumerWidget {
  const TodosScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final todosAsync = ref.watch(todosListProvider);
    final theme = Theme.of(context);

    return Scaffold(
      appBar: AppBar(
        title: TourItem(
          tabIndex: 1,
          order: 0,
          title: 'Your Todo List',
          description:
              'View, complete, and swipe to delete your tasks here. '
              'Pull down to refresh.',
          child: const Text('Todos'),
        ),
      ),
      body: todosAsync.when(
        data: (todos) {
          if (todos.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.checklist_rounded,
                    size: 48,
                    color: theme.colorScheme.onSurface.withOpacity(0.15),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'No tasks yet',
                    style: theme.textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                      color: theme.colorScheme.onSurface.withOpacity(0.6),
                      letterSpacing: -0.5,
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Tap + to create one',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: theme.colorScheme.onSurface.withOpacity(0.38),
                      height: 1.47,
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.read(todosListProvider.notifier).refresh(),
            child: ListView.separated(
              padding: const EdgeInsets.symmetric(vertical: AppSpacing.s8),
              itemCount: todos.length,
              separatorBuilder: (context, index) => Divider(
                height: 0.5,
                thickness: 0.5,
                color: theme.colorScheme.outlineVariant,
              ),
              itemBuilder: (context, index) {
                final todo = todos[index];
                return _TodoItem(todo: todo);
              },
            ),
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.error_outline,
                size: 48,
                color: theme.colorScheme.error,
              ),
              const SizedBox(height: 16),
              Text(
                'Failed to load todos',
                style: theme.textTheme.titleMedium,
              ),
              const SizedBox(height: 8),
              Text(
                error.toString(),
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurfaceVariant,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              FilledButton.tonal(
                onPressed: () => ref.invalidate(todosListProvider),
                child: const Text('Retry'),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: TourItem(
        tabIndex: 1,
        order: 1,
        title: 'Add Todo',
        description: 'Tap here to create a new task.',
        child: FloatingActionButton(
          onPressed: () => _showCreateDialog(context, ref),
          child: const Icon(Icons.add),
        ),
      ),
    );
  }

  void _showCreateDialog(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final controller = TextEditingController();

    showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(
          'New Todo',
          style: theme.textTheme.titleLarge?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        content: AppTextField(
          controller: controller,
          autofocus: true,
          labelText: 'What needs to be done?',
          textInputAction: TextInputAction.done,
          onFieldSubmitted: (value) {
            if (value.trim().isNotEmpty) {
              Navigator.of(ctx).pop(value.trim());
            }
          },
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: Text(
              'Cancel',
              style: TextStyle(color: theme.colorScheme.onSurface.withOpacity(0.6)),
            ),
          ),
          AppButton(
            onPressed: () {
              final title = controller.text.trim();
              if (title.isNotEmpty) {
                Navigator.of(ctx).pop(title);
              }
            },
            child: const Text('Add'),
          ),
        ],
        shape: RoundedRectangleBorder(
          borderRadius: AppRadii.mediumRadius,
        ),
      ),
    ).then((title) {
      if (title != null && title.isNotEmpty) {
        ref.read(todosListProvider.notifier).createTodo(title: title);
        toastification.show(
          title: const Text('Todo created'),
          type: ToastificationType.success,
          autoCloseDuration: const Duration(seconds: 2),
          style: ToastificationStyle.flat,
        );
      }
    });
  }
}

class _TodoItem extends ConsumerWidget {
  const _TodoItem({required this.todo});

  final TodoModel todo;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return TaskTile(
      tileKey: ValueKey(todo.id),
      title: todo.title,
      isCompleted: todo.completed,
      onToggle: (_) {
        ref.read(todosListProvider.notifier).toggleTodo(todo);
        toastification.show(
          title: Text(
            todo.completed ? 'Todo uncompleted' : 'Todo completed',
          ),
          type: todo.completed
              ? ToastificationType.info
              : ToastificationType.success,
          autoCloseDuration: const Duration(seconds: 2),
          style: ToastificationStyle.flat,
        );
      },
      confirmDismiss: () async {
        return showDialog<bool>(
          context: context,
          builder: (ctx) => AlertDialog(
            title: const Text('Delete Todo'),
            content: Text('Delete "${todo.title}"?'),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(ctx).pop(false),
                child: const Text('Cancel'),
              ),
              AppButton(
                onPressed: () => Navigator.of(ctx).pop(true),
                child: const Text('Delete'),
              ),
            ],
            shape: RoundedRectangleBorder(
              borderRadius: AppRadii.mediumRadius,
            ),
          ),
        );
      },
      onDismissed: () {
        ref.read(todosListProvider.notifier).deleteTodo(todo.id);
        toastification.show(
          title: const Text('Todo deleted'),
          type: ToastificationType.info,
          autoCloseDuration: const Duration(seconds: 2),
          style: ToastificationStyle.flat,
        );
      },
    );
  }
}
