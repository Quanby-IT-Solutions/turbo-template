import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:mobile/services/storage/onboarding_storage_service.dart';

part 'onboarding_provider.g.dart';

/// Provider that manages onboarding completion state.
///
/// This provider is kept alive to maintain state throughout the app lifecycle.
/// It reads and writes to SharedPreferences via OnboardingStorageService.
@Riverpod(keepAlive: true)
class OnboardingState extends _$OnboardingState {
  late OnboardingStorageService _storageService;

  @override
  bool build() {
    _storageService = ref.watch(onboardingStorageServiceProvider);
    return _storageService.hasCompletedOnboarding();
  }

  /// Marks onboarding as completed and updates state.
  Future<void> completeOnboarding() async {
    await _storageService.completeOnboarding();
    state = true;
  }

  /// Resets onboarding state (useful for testing or settings).
  Future<void> resetOnboarding() async {
    await _storageService.resetOnboarding();
    state = false;
  }
}

/// Convenience provider to check if onboarding has been completed.
@riverpod
bool hasCompletedOnboarding(Ref ref) {
  return ref.watch(onboardingStateProvider);
}
