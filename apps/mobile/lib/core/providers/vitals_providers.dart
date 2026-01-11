import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile/core/services/vitals_api_service.dart';

// Provider for the VitalsApiService
final vitalsApiServiceProvider = Provider<VitalsApiService>((ref) {
  return VitalsApiService();
});

// Provider for streaming vitals for a specific patient
final vitalsStreamProvider =
    StreamProvider.family<Map<String, dynamic>, String>((ref, patientId) {
      final service = ref.watch(vitalsApiServiceProvider);
      return service.streamVitals(patientId);
    });

// Provider for getting latest vitals for a specific patient
final latestVitalsProvider =
    FutureProvider.family<Map<String, dynamic>, String>((ref, patientId) async {
      final service = ref.watch(vitalsApiServiceProvider);
      return service.getLatestVitals(patientId);
    });

// Provider for getting vitals history for a specific patient
final vitalsHistoryProvider =
    FutureProvider.family<List<Map<String, dynamic>>, String>((
      ref,
      patientId,
    ) async {
      final service = ref.watch(vitalsApiServiceProvider);
      return service.getVitalsHistory(patientId);
    });
