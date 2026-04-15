import 'package:mobile/services/storage/theme_storage_service.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:shared_preferences/shared_preferences.dart';

part 'onboarding_storage_service.g.dart';

/// Service for persisting the onboarding completion flag to
/// [SharedPreferences].
class OnboardingStorageService {
  OnboardingStorageService(this._prefs);

  final SharedPreferences _prefs;

  static const _completedKey = 'onboarding_completed';

  bool hasCompletedOnboarding() => _prefs.getBool(_completedKey) ?? false;

  Future<void> completeOnboarding() => _prefs.setBool(_completedKey, true);

  Future<void> resetOnboarding() => _prefs.remove(_completedKey);
}

/// Provider for [OnboardingStorageService].
@Riverpod(keepAlive: true)
OnboardingStorageService onboardingStorageService(Ref ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return OnboardingStorageService(prefs);
}

/// Re-export [sharedPreferencesProvider] is defined in theme_storage_service.dart.
/// This file just needs the import for the ref.watch above.
