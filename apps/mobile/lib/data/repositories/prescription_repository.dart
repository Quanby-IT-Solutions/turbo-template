import 'package:mobile/core/services/http_service.dart';
import 'package:mobile/domain/entities/medical_record.dart';

/// Prescription repository for backend integration
class PrescriptionRepository {
  /// Get prescriptions
  Future<List<Prescription>> getPrescriptions({
    String? patientId,
    String? doctorId,
    bool? isActive,
    int? page,
    int? limit,
  }) async {
    try {
      final response = await HttpService.getPrescriptions(
        patientId: patientId,
        doctorId: doctorId,
        isActive: isActive,
        page: page,
        limit: limit,
      );

      // Backend returns array directly in data
      final List<dynamic> prescriptionsList;
      if (response['items'] != null) {
        prescriptionsList = response['items'] as List<dynamic>;
      } else if (response is List) {
        prescriptionsList = response;
      } else {
        prescriptionsList = [];
      }

      return prescriptionsList
          .map((json) => Prescription.fromMap(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw Exception('Failed to get prescriptions: ${e.toString()}');
    }
  }

  /// Get prescription by ID
  Future<Prescription> getPrescription(String id) async {
    try {
      final response = await HttpService.getPrescription(id);
      return Prescription.fromMap(response as Map<String, dynamic>);
    } catch (e) {
      throw Exception('Failed to get prescription: ${e.toString()}');
    }
  }
}
