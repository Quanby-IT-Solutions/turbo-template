import 'package:mobile/core/services/http_service.dart';
import 'package:mobile/domain/entities/patient.dart';

/// Patient repository for backend integration
/// Handles all patient-related API calls and data transformation
class PatientRepository {
  /// Get a patient by ID
  Future<Patient> getPatient(String id) async {
    try {
      final response = await HttpService.getPatient(id);
      return Patient.fromMap(response);
    } catch (e) {
      throw Exception('Failed to get patient: ${e.toString()}');
    }
  }

  /// Get list of patients (for doctors/admins)
  Future<List<Patient>> getPatients({
    String? search,
    int? page,
    int? limit,
  }) async {
    try {
      final response = await HttpService.getPatients(
        search: search,
        page: page,
        limit: limit,
      );

      // Backend returns {items: [...], total, page, limit, totalPages}
      final List<dynamic> patientsList = response['items'] as List? ?? [];

      return patientsList
          .map((json) => Patient.fromMap(json as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw Exception('Failed to get patients: ${e.toString()}');
    }
  }

  /// Update patient information
  Future<Patient> updatePatient(
    String id,
    Map<String, dynamic> data,
  ) async {
    try {
      final response = await HttpService.updatePatient(id, data);
      return Patient.fromMap(response);
    } catch (e) {
      throw Exception('Failed to update patient: ${e.toString()}');
    }
  }
}
