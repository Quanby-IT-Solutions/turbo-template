import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:mobile/features/auth/data/auth_repository.dart';
import 'package:mobile/features/auth/data/models/session_model.dart';
import 'package:mobile/features/auth/data/models/user_model.dart';

part 'auth_provider.g.dart';

@Riverpod(keepAlive: true)
class AuthState extends _$AuthState {
  @override
  Future<SessionModel?> build() async {
    return ref.read(authRepositoryProvider).getSession();
  }

  Future<void> signIn({
    required String email,
    required String password,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(authRepositoryProvider).signIn(
            email: email,
            password: password,
          ),
    );
  }

  Future<void> signUp({
    required String email,
    required String password,
    required String name,
  }) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref.read(authRepositoryProvider).signUp(
            email: email,
            password: password,
            name: name,
          ),
    );
  }

  Future<void> signOut() async {
    state = const AsyncLoading();
    try {
      await ref.read(authRepositoryProvider).signOut();
    } finally {
      // Always clear local session even if the backend call fails,
      // so the user is logged out on the device.
      state = const AsyncData(null);
    }
  }
}

@riverpod
bool isAuthenticated(Ref ref) {
  final authState = ref.watch(authStateProvider);
  return authState.value != null;
}

@riverpod
UserModel? currentUser(Ref ref) {
  final authState = ref.watch(authStateProvider);
  return authState.value?.user;
}
