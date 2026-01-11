import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/domain/entities/weekly_availability.dart';
import 'package:mobile/core/services/http_service.dart';

final weeklyAvailabilityProvider =
    NotifierProvider<WeeklyAvailabilityNotifier, List<WeeklySlot>>(() {
  return WeeklyAvailabilityNotifier();
});

class WeeklyAvailabilityNotifier extends Notifier<List<WeeklySlot>> {
  @override
  List<WeeklySlot> build() => [];

  Future<void> fetchWeeklyAvailability(String doctorId) async {
    try {
      final response = await HttpService.getWeeklyAvailability(doctorId);
      
      if (response['slots'] != null) {
        final slots = (response['slots'] as List<dynamic>)
            .map((slot) => WeeklySlot.fromJson(slot as Map<String, dynamic>))
            .toList();
        state = slots;
      }
    } catch (e) {
      debugPrint('Error fetching weekly availability: $e');
      state = [];
    }
  }

  Future<void> setWeeklyAvailability({
    required String doctorId,
    required List<WeeklySlot> slots,
  }) async {
    try {
      await HttpService.setWeeklyAvailability(
        doctorId: doctorId,
        slots: slots.map((s) => s.toJson()).toList(),
      );
      state = slots;
    } catch (e) {
      debugPrint('Error setting weekly availability: $e');
      rethrow;
    }
  }

  void setSlots(List<WeeklySlot> slots) {
    state = slots;
  }

  void addSlot(WeeklySlot slot) {
    state = [...state, slot];
  }

  void removeSlot(WeeklySlot slot) {
    state = state.where((s) => s != slot).toList();
  }

  void clearSlots() {
    state = [];
  }
}
