import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/services/storage/theme_storage_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Service for persisting the feature tour completion flag to
/// [SharedPreferences], scoped per user so that each new account
/// sees the tour on first login.
class TourStorageService {
  TourStorageService(this._prefs);

  final SharedPreferences _prefs;

  static const _prefix = 'feature_tour_completed';

  String _keyFor(String userId) => '${_prefix}_$userId';

  bool hasCompletedTour(String userId) =>
      _prefs.getBool(_keyFor(userId)) ?? false;

  Future<void> completeTour(String userId) =>
      _prefs.setBool(_keyFor(userId), true);

  Future<void> resetTour(String userId) =>
      _prefs.remove(_keyFor(userId));
}

/// Provider for [TourStorageService].
final tourStorageServiceProvider = Provider<TourStorageService>((ref) {
  final prefs = ref.watch(sharedPreferencesProvider);
  return TourStorageService(prefs);
});
